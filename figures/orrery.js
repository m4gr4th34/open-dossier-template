/*
 * orrery.js — Keplerian zoom-orrery render module for Open Dossier living figures.
 *
 * WHAT THIS IS
 *   A vendored, zero-dependency, reader-side render module that draws an
 *   interactive zoom-orrery into an SVG. It is built ENTIRELY on the Phase-1
 *   runtime primitives in figures.js — it COMPOSES them, it never re-rolls
 *   them. Loaded after figures.js; extends the same window.DossierFigures
 *   namespace with one entry point: renderOrrery(container, spec).
 *
 * THE COMPOSITION LAW (the whole point of the scaffold)
 *   Every hard primitive comes from the runtime, never duplicated here:
 *     - orbital positions  -> DossierFigures.solveKepler(M, e)
 *     - procedural belts   -> DossierFigures.seededScatter(seed, count, fn)
 *     - log-scale zoom     -> DossierFigures.logZoom.sliderToScale / scaleToSlider
 *     - scale-aware time   -> DossierFigures.scaleAwareTime(baseSpeed, scale)
 *     - soft motion        -> DossierFigures.ease(t)
 *     - SVG nodes          -> DossierFigures.el(tag, attrs)
 *   This module supplies only orbital GEOMETRY (turning an eccentric anomaly
 *   into x,y) and the rendering/interaction shell — not the physics core.
 *
 * THE data-figure CONVENTION (parallel to data-tex for math)
 *   A living figure is authored as:
 *
 *     <figure class="living-figure" data-figure='{ ...spec json... }'>
 *       <!-- Phase 3 prerenders a sealed <svg> poster here; for now JS renders -->
 *     </figure>
 *
 *   data-figure carries a tiny JSON spec — the visible, AI-editable SOURCE OF
 *   TRUTH — exactly as data-tex carries LaTeX. renderOrrery reads the attribute,
 *   renders INTO the element, and LEAVES data-figure in place (never destroys
 *   the source). See figures/README.md for the full spec schema.
 *
 *   Spec shape (orbital elements + belt seeds):
 *     {
 *       "title": "…",
 *       "zoom":  { "lo": 0.3, "hi": 6000, "start": 34 },   // AU half-window range
 *       "time":  { "baseSpeed": 0.45, "playing": true },   // years/sec at scale 1
 *       "bodies":[ { "name","a","e","period","r","color","M0","omega" }, … ],
 *       "belts": [ { "name","seed","count","aMin","aMax","eMax","color" }, … ],
 *       "oort":  { "seed","count","rMin","rMax","color" },
 *       "regions":[ { "name","scale" }, … ]                 // zoom-to targets (AU)
 *     }
 *
 * SUSTAINABILITY LAWS (same as the runtime)
 *   Zero external dependencies, pure vanilla, vendored first-party. Reader-side
 *   only; NEVER executed by CI (the stdlib-only verify floor stays untouched).
 */
(function (root) {
  "use strict";

  var NS = root && root.DossierFigures;
  if (!NS) {
    if (root && root.console) {
      root.console.error("[orrery] figures.js runtime not found — load figures.js before orrery.js");
    }
    return;
  }

  // COMPOSITION: every primitive below IS the Phase-1 runtime's — never re-rolled.
  var DossierFigures = NS;
  var solveKepler    = DossierFigures.solveKepler;
  var seededScatter  = DossierFigures.seededScatter;
  var logZoom        = DossierFigures.logZoom;
  var scaleAwareTime = DossierFigures.scaleAwareTime;
  var ease           = DossierFigures.ease;
  var el             = DossierFigures.el;

  var TAU = Math.PI * 2;

  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function num(v, d) { return (typeof v === "number" && isFinite(v)) ? v : d; }

  // Rotate a point in the orbital plane by longitude of periapsis `om`.
  // (Pure geometry on solveKepler's OUTPUT — not a physics primitive.)
  function rot(x, y, om) {
    var c = Math.cos(om), s = Math.sin(om);
    return [x * c - y * s, x * s + y * c];
  }

  // Orbital-element body -> world (AU) position at time t (years).
  function bodyXY(b, t) {
    var M = num(b.M0, 0) + TAU * (t / (b.period || 1));   // mean anomaly
    var E = solveKepler(M, b.e || 0);                     // RUNTIME: Kepler solve
    var a = b.a, e = b.e || 0;
    var xp = a * (Math.cos(E) - e);
    var yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
    return rot(xp, yp, num(b.omega, 0));
  }

  function fail(container, msg) {
    if (root && root.console) root.console.error("[orrery] " + msg);
    if (container && container.appendChild) {
      var p = root.document.createElement("p");
      p.className = "lf-fallback";
      p.textContent = "Figure unavailable: " + msg;
      container.appendChild(p);
    }
    return null;
  }

  // -------------------------------------------------------------------------
  // renderOrrery(container, spec) — the single public entry point.
  //   container : the <figure class="living-figure"> element (or any host node)
  //   spec      : the JSON spec (object or string). If omitted, it is read from
  //               container's data-figure attribute, which is LEFT IN PLACE.
  // -------------------------------------------------------------------------
  function renderOrrery(container, spec) {
    if (!container) return fail(null, "no container");
    var doc = (root && root.document) || (container.ownerDocument);

    if (spec == null && container.getAttribute) spec = container.getAttribute("data-figure");
    if (typeof spec === "string") {
      try { spec = JSON.parse(spec); }
      catch (e) { return fail(container, "data-figure is not valid JSON"); }
    }
    if (!spec || !spec.bodies || !spec.bodies.length) return fail(container, "spec has no bodies");

    // --- view geometry ---------------------------------------------------
    var W = 800, H = 480, cx = W / 2, cy = H / 2, RAD = Math.min(W, H) * 0.46;
    var zoom = spec.zoom || {};
    var LO = Math.max(1e-6, num(zoom.lo, 0.3));            // strictly positive (logZoom needs >0)
    var HI = Math.max(LO * 1.0001, num(zoom.hi, 6000));
    var tm = spec.time || {};
    var baseSpeed = num(tm.baseSpeed, 0.45);
    var playing = tm.playing !== false;

    // RUNTIME: start slider derived from a start SCALE via the inverse map.
    var slider = clamp01(logZoom.scaleToSlider(num(zoom.start, HI * 0.2), LO, HI));
    var panX = 0, panY = 0, t = 0, viewDirty = true, jump = null;

    function scaleAU() { return logZoom.sliderToScale(slider, LO, HI); } // RUNTIME: slider -> AU window
    function k() { return RAD / scaleAU(); }                            // pixels per AU
    function project(x, y) { var kk = k(); return [cx + (x + panX) * kk, cy - (y + panY) * kk]; }

    // --- SVG scaffold ----------------------------------------------------
    var svg = el("svg", {
      viewBox: "0 0 " + W + " " + H, width: "100%", "class": "lf-svg",
      role: "img", "aria-label": spec.title || "Zoom-orrery"
    });
    var defs = el("defs", {});
    var grad = el("radialGradient", { id: "lf-sun-glow", cx: "50%", cy: "50%", r: "50%" });
    grad.appendChild(el("stop", { offset: "0%", "stop-color": "#ffe9a8", "stop-opacity": "0.95" }));
    grad.appendChild(el("stop", { offset: "100%", "stop-color": "#f4a73b", "stop-opacity": "0" }));
    defs.appendChild(grad);
    svg.appendChild(defs);

    var gOrbits = el("g", { "class": "lf-orbits" });
    var gBelts  = el("g", { "class": "lf-belts" });
    var gBodies = el("g", { "class": "lf-bodies" });
    svg.appendChild(gOrbits);
    svg.appendChild(gBelts);
    svg.appendChild(gBodies);

    // --- belts: GENERATED once (seededScatter), ROTATED each frame ---------
    // The scatter is deterministic from the seed and built ONCE; the belt then
    // turns as a rigid procedural ring by advancing ONE group transform per
    // frame (rotation about the Sun, folded with zoom+pan). It visibly revolves
    // with no per-point redraw and no re-seeding. Rotation is driven by the
    // SCALE-COUPLED t, so the belt slows when zoomed in and speeds up when
    // zoomed out, in step with the planets. Composition intact: every point
    // still comes from seededScatter + solveKepler; only a transform advances.
    var beltLayers = [];
    var shimmerLayers = [];   // layers given a per-point opacity twinkle (the Oort shell)
    function addBeltLayer(points, color, opacity, dotR, meanR) {
      var g = el("g", {});
      var frag = doc.createDocumentFragment();
      var nodes = new Array(points.length);
      for (var i = 0; i < points.length; i++) {
        nodes[i] = el("circle", { cx: points[i][0], cy: points[i][1], r: dotR, fill: color, "fill-opacity": opacity });
        frag.appendChild(nodes[i]);
      }
      g.appendChild(frag);
      gBelts.appendChild(g);
      // Rigid-rotation period from the belt's mean radius (Kepler's 3rd law,
      // P = a^1.5 yr) via sqrt — orbital geometry, not a runtime primitive.
      var layer = { g: g, period: meanR * Math.sqrt(meanR), nodes: nodes };
      beltLayers.push(layer);
      return layer;
    }

    (spec.belts || []).forEach(function (b) {
      // fn(rng, i): rng FIRST (the live PRNG, called as rng()), index second.
      var pts = seededScatter(b.seed | 0, b.count | 0, function (rng, i) {
        var a = b.aMin + rng() * (b.aMax - b.aMin);
        var e = (b.eMax || 0.12) * rng();
        var M = rng() * TAU;
        var E = solveKepler(M, e);                          // RUNTIME: Kepler solve per particle
        var om = rng() * TAU;
        var xp = a * (Math.cos(E) - e), yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
        return rot(xp, yp, om);
      });
      var meanR = (b.aMin + b.aMax) / 2;
      addBeltLayer(pts, b.color || "#8a8f96", 0.85, meanR * 0.013, meanR);
    });

    if (spec.oort) {
      var o = spec.oort;
      var oBase = 0.7;
      var opts = seededScatter(o.seed | 0, o.count | 0, function (rng) {
        var r = o.rMin + rng() * (o.rMax - o.rMin);
        var th = rng() * TAU;
        var rr = r * (0.85 + 0.15 * rng());                 // shell thickness jitter
        return [rr * Math.cos(th), rr * Math.sin(th), rng() * TAU];   // 3rd value = twinkle phase
      });
      var omR = (o.rMin + o.rMax) / 2;
      // Same rigid-rotation law; the Oort's huge mean radius gives a ~10^5-yr
      // period, so it stays visually static. It is NOT spun to fake motion;
      // instead each shell point gets a gentle, per-point opacity SHIMMER so the
      // shell reads as ALIVE without faking a rotation it does not physically have.
      var oortLayer = addBeltLayer(opts, o.color || "#5d6b7a", oBase, omR * 0.012, omR);
      shimmerLayers.push({ nodes: oortLayer.nodes, phases: opts.map(function (p) { return p[2]; }), base: oBase });
    }

    // --- orbits + bodies -------------------------------------------------
    var ORBIT_SAMPLES = 96;
    var bodies = spec.bodies.map(function (b) {
      var path = el("path", { "class": "lf-orbit", fill: "none", stroke: b.color || "#9aa", "stroke-opacity": 0.32, "stroke-width": 1 });
      gOrbits.appendChild(path);
      var dot = el("circle", { r: num(b.r, 3), fill: b.color || "#ddd", "class": "lf-planet" });
      var label = el("text", { "class": "lf-label", "font-size": 10, fill: "var(--lf-label, #5a6b70)", dx: num(b.r, 3) + 3, dy: 3 });
      label.appendChild(doc.createTextNode(b.name || ""));
      gBodies.appendChild(dot);
      gBodies.appendChild(label);
      return { spec: b, path: path, dot: dot, label: label };
    });

    // Sun (glow + core), in screen space, recentred each frame.
    var sunGlow = el("circle", { r: 16, fill: "url(#lf-sun-glow)" });
    var sunCore = el("circle", { r: 5, fill: "#ffd98a" });
    gBodies.appendChild(sunGlow);
    gBodies.appendChild(sunCore);

    function rebuildOrbits() {
      bodies.forEach(function (o) {
        var b = o.spec, d = "";
        for (var i = 0; i <= ORBIT_SAMPLES; i++) {
          var E = (i / ORBIT_SAMPLES) * TAU;
          var xp = b.a * (Math.cos(E) - (b.e || 0));
          var yp = b.a * Math.sqrt(1 - (b.e || 0) * (b.e || 0)) * Math.sin(E);
          var w = rot(xp, yp, num(b.omega, 0));
          var p = project(w[0], w[1]);
          d += (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1);
        }
        o.path.setAttribute("d", d + "Z");
      });
    }

    // Belts: ONE transform per layer per frame = projection (zoom+pan) folded
    // with a time-driven rigid rotation about the Sun. Cheap (a few setAttribute)
    // and smooth; it also reflects zoom/pan even while paused.
    function updateBelts() {
      var kk = k();
      var pre = "translate(" + cx + "," + cy + ") scale(" + kk + "," + (-kk) + ") translate(" + panX + "," + panY + ") rotate(";
      for (var i = 0; i < beltLayers.length; i++) {
        var L = beltLayers[i];
        var deg = (t / L.period) * 360;   // revolutions -> degrees, advancing with the scale-coupled t
        L.g.setAttribute("transform", pre + deg.toFixed(3) + ")");
      }
    }

    function updateView() { rebuildOrbits(); }   // belts ride their own per-frame transform now

    function updateBodies() {
      var s = project(0, 0);
      sunGlow.setAttribute("cx", s[0]); sunGlow.setAttribute("cy", s[1]);
      sunCore.setAttribute("cx", s[0]); sunCore.setAttribute("cy", s[1]);
      bodies.forEach(function (o) {
        var w = bodyXY(o.spec, t);
        var p = project(w[0], w[1]);
        o.dot.setAttribute("cx", p[0]); o.dot.setAttribute("cy", p[1]);
        o.label.setAttribute("x", p[0]); o.label.setAttribute("y", p[1]);
      });
    }

    // --- controls (HTML, themed by the host page) ------------------------
    var controls = doc.createElement("div");
    controls.className = "lf-controls";

    var playBtn = doc.createElement("button");
    playBtn.type = "button"; playBtn.className = "lf-btn lf-play";
    playBtn.textContent = playing ? "❚❚ Pause" : "▶ Play";
    playBtn.addEventListener("click", function () {
      playing = !playing; playBtn.textContent = playing ? "❚❚ Pause" : "▶ Play";
    });
    controls.appendChild(playBtn);

    var zoomWrap = doc.createElement("label");
    zoomWrap.className = "lf-field";
    zoomWrap.appendChild(doc.createTextNode("Zoom"));
    var zoomInput = doc.createElement("input");
    zoomInput.type = "range"; zoomInput.min = "0"; zoomInput.max = "1"; zoomInput.step = "0.001";
    zoomInput.value = String(slider); zoomInput.className = "lf-range";
    zoomInput.addEventListener("input", function () { jump = null; slider = clamp01(parseFloat(zoomInput.value)); viewDirty = true; });
    zoomWrap.appendChild(zoomInput);
    controls.appendChild(zoomWrap);

    var spdWrap = doc.createElement("label");
    spdWrap.className = "lf-field";
    spdWrap.appendChild(doc.createTextNode("Speed"));
    var spdInput = doc.createElement("input");
    spdInput.type = "range"; spdInput.min = "0"; spdInput.max = "2"; spdInput.step = "0.01";
    spdInput.value = String(baseSpeed); spdInput.className = "lf-range";
    spdInput.addEventListener("input", function () { baseSpeed = parseFloat(spdInput.value); });
    spdWrap.appendChild(spdInput);
    controls.appendChild(spdWrap);

    function startJump(targetScale) {
      jump = { from: slider, to: clamp01(logZoom.scaleToSlider(targetScale, LO, HI)), p: 0, dur: 0.7 };
    }
    (spec.regions || []).forEach(function (rg) {
      var btn = doc.createElement("button");
      btn.type = "button"; btn.className = "lf-btn lf-region";
      btn.textContent = rg.name;
      btn.addEventListener("click", function () { startJump(num(rg.scale, scaleAU())); });
      controls.appendChild(btn);
    });

    var readout = doc.createElement("span");
    readout.className = "lf-readout";
    controls.appendChild(readout);

    function syncZoomInput() { zoomInput.value = String(slider); }

    // --- interaction: scroll-to-zoom + drag-to-pan ----------------------
    svg.addEventListener("wheel", function (ev) {
      ev.preventDefault();
      jump = null;
      slider = clamp01(slider + (ev.deltaY < 0 ? 0.05 : -0.05));
      syncZoomInput(); viewDirty = true;
    }, { passive: false });

    var dragging = false, lastX = 0, lastY = 0;
    svg.addEventListener("mousedown", function (ev) { dragging = true; lastX = ev.clientX; lastY = ev.clientY; });
    root.addEventListener("mouseup", function () { dragging = false; });
    root.addEventListener("mousemove", function (ev) {
      if (!dragging) return;
      var kk = k();
      panX += (ev.clientX - lastX) / kk;
      panY -= (ev.clientY - lastY) / kk;
      lastX = ev.clientX; lastY = ev.clientY; viewDirty = true;
    });

    // --- mount (leaves data-figure attribute untouched) -----------------
    container.appendChild(svg);
    container.appendChild(controls);

    // Oort shimmer: a gentle per-point opacity twinkle (throttled ~12 Hz). The
    // shell is physically static, so this conveys "alive" WITHOUT faking a spin.
    // Math.sin is geometry, not a new primitive.
    var SHIMMER_MS = 80, lastShimmer = 0;
    function updateShimmer(now) {
      if (now - lastShimmer < SHIMMER_MS) return;
      lastShimmer = now;
      var ph = now * 0.0016;
      for (var L = 0; L < shimmerLayers.length; L++) {
        var sl = shimmerLayers[L], ns = sl.nodes, phs = sl.phases, base = sl.base;
        for (var i = 0; i < ns.length; i++) {
          var tw = 0.55 + 0.45 * Math.sin(ph + phs[i]);
          ns[i].setAttribute("fill-opacity", (base * tw).toFixed(2));
        }
      }
    }

    // --- animation loop --------------------------------------------------
    var perf = (root.performance && root.performance.now) ? root.performance : Date;
    var last = perf.now();
    function frame(now) {
      var dt = Math.min(0.05, (now - last) / 1000); last = now;

      // THE SCALE-AWARE-TIME FIX: play-speed couples to the zoom scale, so
      // zoomed IN (small AU window) -> slow time -> inner planets legible;
      // zoomed OUT (large AU window) -> fast time -> giants visibly move.
      var spd = scaleAwareTime(baseSpeed, scaleAU());       // RUNTIME
      if (playing && !jump) t += spd * dt;

      if (jump) {
        jump.p += dt / jump.dur;
        slider = jump.from + (jump.to - jump.from) * ease(clamp01(jump.p)); // RUNTIME: soft motion
        syncZoomInput(); viewDirty = true;
        if (jump.p >= 1) jump = null;
      }

      if (viewDirty) { updateView(); viewDirty = false; }
      updateBelts();   // every frame: rotation advances + zoom/pan reflected
      updateBodies();
      updateShimmer(now);   // gentle Oort twinkle (throttled; static shell, alive)

      readout.textContent = "scale " + scaleAU().toFixed(scaleAU() < 10 ? 2 : 0) +
        " AU · t " + t.toFixed(1) + " yr · play-speed " + spd.toFixed(2) + " yr/s";

      root.requestAnimationFrame(frame);
    }
    root.requestAnimationFrame(frame);

    // small handle for tests / external control
    return {
      runtimeVersion: DossierFigures.FIGURES_RUNTIME_VERSION,
      getState: function () { return { slider: slider, scaleAU: scaleAU(), t: t, playSpeed: scaleAwareTime(baseSpeed, scaleAU()), playing: playing }; },
      setSlider: function (v) { jump = null; slider = clamp01(v); syncZoomInput(); viewDirty = true; }
    };
  }

  DossierFigures.renderOrrery = renderOrrery;
})(typeof window !== "undefined" ? window : null);
