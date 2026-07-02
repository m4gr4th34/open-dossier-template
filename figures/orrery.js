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

  // COMPOSITION: every GENERAL primitive below IS the runtime's — never re-rolled.
  var DossierFigures = NS;
  var seededScatter  = DossierFigures.seededScatter;
  var logZoom        = DossierFigures.logZoom;
  var scaleAwareTime = DossierFigures.scaleAwareTime;
  var ease           = DossierFigures.ease;
  var el             = DossierFigures.el;
  var r2             = DossierFigures.r2;       // string-emit helpers (poster path)
  var escAttr        = DossierFigures.escAttr;
  var escTxt         = DossierFigures.escTxt;

  var TAU = Math.PI * 2;
  var ORBIT_SAMPLES = 96;   // single source for BOTH the live path and the poster

  // solveKepler(M, e) — Kepler's equation solver (Newton's method). Solves
  // E - e*sin(E) = M for the eccentric anomaly E, the per-frame physics core of an
  // orbiting body. This is the orrery's ONE domain-specific primitive — it lives
  // HERE, not in the general runtime, because only orbital mechanics needs it (a
  // galaxy / cosmic web / uniform field is statistical structure, not an n-body
  // integration). Six Newton iterations is plenty across all bound eccentricities
  // (0 <= e < 1). Pure function; for e = 0, E === M exactly.
  function solveKepler(M, e) {
    var E = M; // good initial guess for low/moderate e
    for (var i = 0; i < 6; i++) {
      E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    }
    return E;
  }

  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function num(v, d) { return (typeof v === "number" && isFinite(v)) ? v : d; }

  // Rotate a point in the orbital plane by longitude of periapsis `om`.
  // (Pure geometry on solveKepler's OUTPUT — not a physics primitive.)
  function rot(x, y, om) {
    var c = Math.cos(om), s = Math.sin(om);
    return [x * c - y * s, x * s + y * c];
  }

  // ===== SHARED GEOMETRY ====================================================
  // Computed ONCE here and consumed by BOTH emitters — the live el() path AND
  // the poster string path — so the sealed floor can never drift from the live
  // ceiling. There is NO second copy of the Kepler/scatter/projection math:
  // solveKepler / seededScatter / logZoom are STILL the runtime primitives;
  // only the final emit (DOM node vs SVG string) differs.

  // Eccentric anomaly E -> world (AU) on ellipse (a,e), rotated by periapsis om.
  function ellipseXY(a, e, E, om) {
    return rot(a * (Math.cos(E) - e), a * Math.sqrt(1 - e * e) * Math.sin(E), om);
  }

  // Orbital-element body -> world (AU) position at time t (years).
  function bodyXY(b, t) {
    var e = b.e || 0;
    var M = num(b.M0, 0) + TAU * (t / (b.period || 1));   // mean anomaly
    return ellipseXY(b.a, e, solveKepler(M, e), num(b.omega, 0));  // RUNTIME: Kepler solve
  }

  // Static world points of a body's orbit ellipse (independent of t/zoom/pan).
  function orbitWorldPoints(b, samples) {
    var e = b.e || 0, om = num(b.omega, 0), pts = [];
    for (var i = 0; i <= samples; i++) pts.push(ellipseXY(b.a, e, (i / samples) * TAU, om));
    return pts;
  }
  // SVG path "d" for an orbit, projected by projectFn (identical both emitters).
  function orbitPathD(worldPts, projectFn) {
    var d = "";
    for (var i = 0; i < worldPts.length; i++) {
      var p = projectFn(worldPts[i][0], worldPts[i][1]);
      d += (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1);
    }
    return d + "Z";
  }

  // Belt / Oort point clouds — GENERATED by the runtime PRNG (seededScatter) +
  // solveKepler, in the SAME rng() call order as the live build, so the points
  // are byte-identical. Returned as plain data either emitter consumes.
  function computeBeltPoints(b) {
    var meanR = (b.aMin + b.aMax) / 2;
    var pts = seededScatter(b.seed | 0, b.count | 0, function (rng) {
      var a = b.aMin + rng() * (b.aMax - b.aMin);   // rng #1
      var e = (b.eMax || 0.12) * rng();             // rng #2
      var M = rng() * TAU;                          // rng #3
      var om = rng() * TAU;                         // rng #4  (solveKepler consumes none)
      return ellipseXY(a, e, solveKepler(M, e), om);
    });
    return { points: pts, meanR: meanR, color: b.color || "#8a8f96", baseOpacity: 0.85, dotR: meanR * 0.013, shimmer: false };
  }
  function computeOortPoints(o) {
    var meanR = (o.rMin + o.rMax) / 2;
    var pts = seededScatter(o.seed | 0, o.count | 0, function (rng) {
      var r = o.rMin + rng() * (o.rMax - o.rMin);   // rng #1
      var th = rng() * TAU;                          // rng #2
      var rr = r * (0.85 + 0.15 * rng());            // rng #3
      return [rr * Math.cos(th), rr * Math.sin(th), rng() * TAU];   // rng #4 (twinkle phase)
    });
    return { points: pts, meanR: meanR, color: o.color || "#5d6b7a", baseOpacity: 0.7, dotR: meanR * 0.012, shimmer: true };
  }

  // The belt group transform (projection folded with rigid rotation) — one
  // string, used by the live per-frame update AND the poster.
  function beltTransform(cx, cy, kk, panX, panY, deg) {
    return "translate(" + cx + "," + cy + ") scale(" + kk + "," + (-kk) + ") translate(" + panX + "," + panY + ") rotate(" + deg.toFixed(3) + ")";
  }
  function makeProject(cx, cy, kk, panX, panY) {
    return function (x, y) { return [cx + (x + panX) * kk, cy - (y + panY) * kk]; };
  }

  // The DEFAULT opening frame as plain data (slider=scaleToSlider(start), pan=0,
  // t=0). This is exactly what the live first paint draws; the poster emits it
  // as a string. Belts at rotation 0; Oort opacity left at its FIXED base.
  function computeFrame(spec) {
    var W = 800, H = 480, cx = W / 2, cy = H / 2, RAD = Math.min(W, H) * 0.46;
    var zoom = spec.zoom || {};
    var LO = Math.max(1e-6, num(zoom.lo, 0.3));
    var HI = Math.max(LO * 1.0001, num(zoom.hi, 6000));
    var slider = clamp01(logZoom.scaleToSlider(num(zoom.start, HI * 0.2), LO, HI)); // RUNTIME
    var scaleAU = logZoom.sliderToScale(slider, LO, HI);                            // RUNTIME
    var kk = RAD / scaleAU, panX = 0, panY = 0, t = 0;
    var project = makeProject(cx, cy, kk, panX, panY);

    var orbits = (spec.bodies || []).map(function (b) {
      return { d: orbitPathD(orbitWorldPoints(b, ORBIT_SAMPLES), project), color: b.color || "#9aa" };
    });
    var planets = (spec.bodies || []).map(function (b) {
      var w = bodyXY(b, t), p = project(w[0], w[1]);   // t=0 -> M0 phase
      return { cx: p[0], cy: p[1], r: num(b.r, 3), color: b.color || "#ddd", name: b.name || "" };
    });
    // Poster-density lever (POSTER-ONLY — computeFrame is never called by the live
    // path). spec.poster.{beltCount,oortCount} cap each cloud to a lighter DETERMINISTIC
    // PREFIX of the already-scattered array (slice, NOT a re-scatter — seededScatter's
    // i-th point is count-independent, so a prefix is a true representative subset).
    // Absent cap -> no slice -> full density -> byte-identical to a poster-less spec.
    var pc = spec.poster || {};
    var clouds = [];
    (spec.belts || []).forEach(function (b) { clouds.push({ bd: computeBeltPoints(b), cap: pc.beltCount }); });
    if (spec.oort) clouds.push({ bd: computeOortPoints(spec.oort), cap: pc.oortCount });
    var beltLayers = clouds.map(function (c) {
      var bd = c.bd;
      var pts = (c.cap != null) ? bd.points.slice(0, c.cap) : bd.points;  // dotR is count-independent
      return { transform: beltTransform(cx, cy, kk, panX, panY, 0),   // t=0 -> rotation 0
        points: pts, color: bd.color, dotR: bd.dotR, baseOpacity: bd.baseOpacity };
    });
    var sun = project(0, 0);
    return { W: W, H: H, scaleAU: scaleAU, ariaLabel: spec.title || "Zoom-orrery",
      orbits: orbits, planets: planets, beltLayers: beltLayers, sun: { cx: sun[0], cy: sun[1] } };
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

    // Phase 3b: a build-time sealed poster (data-poster) may already sit in the
    // container as the JS-off floor. Remove it before rendering live so a JS-on
    // reader ends with exactly ONE (live) <svg> — the floor upgrades to the ceiling.
    if (container.querySelector) {
      var baked = container.querySelector("[data-poster]");
      if (baked && baked.parentNode) baked.parentNode.removeChild(baked);
    }

    // --- view geometry ---------------------------------------------------
    var W = 800, H = 480, cx = W / 2, cy = H / 2, RAD = Math.min(W, H) * 0.46;
    var zoom = spec.zoom || {};
    var LO = Math.max(1e-6, num(zoom.lo, 0.3));            // strictly positive (logZoom needs >0)
    var HI = Math.max(LO * 1.0001, num(zoom.hi, 6000));
    var tm = spec.time || {};
    var baseSpeed = num(tm.baseSpeed, 0.45);
    var playing = (tm.playing !== false) && !DossierFigures.prefersReducedMotion();

    // RUNTIME: start slider derived from a start SCALE via the inverse map.
    var slider = clamp01(logZoom.scaleToSlider(num(zoom.start, HI * 0.2), LO, HI));
    var startSlider = slider;   // the PUBLISHED start view (what the sealed poster freezes) — Reset restores it
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

    // Belt + Oort point clouds come from the SHARED compute (computeBeltPoints /
    // computeOortPoints) — the same deterministic seededScatter+solveKepler the
    // poster uses; only the emit (el() below) differs.
    (spec.belts || []).forEach(function (b) {
      var bd = computeBeltPoints(b);
      addBeltLayer(bd.points, bd.color, bd.baseOpacity, bd.dotR, bd.meanR);
    });

    if (spec.oort) {
      // The Oort's ~10^5-yr period keeps it visually static; rather than fake a
      // spin, each shell point gets a gentle per-point opacity SHIMMER (alive,
      // honest). The poster freezes this at the fixed base opacity (deterministic).
      var bd = computeOortPoints(spec.oort);
      var oortLayer = addBeltLayer(bd.points, bd.color, bd.baseOpacity, bd.dotR, bd.meanR);
      shimmerLayers.push({ nodes: oortLayer.nodes, phases: bd.points.map(function (p) { return p[2]; }), base: bd.baseOpacity });
    }

    // --- orbits + bodies -------------------------------------------------
    var bodies = spec.bodies.map(function (b) {
      var path = el("path", { "class": "lf-orbit", fill: "none", stroke: b.color || "#9aa", "stroke-opacity": 0.32, "stroke-width": 1 });
      gOrbits.appendChild(path);
      var dot = el("circle", { r: num(b.r, 3), fill: b.color || "#ddd", "class": "lf-planet" });
      var label = el("text", { "class": "lf-label lf-axis", fill: "var(--lf-label, #5a6b70)", dx: num(b.r, 3) + 3, dy: 3 });
      label.appendChild(doc.createTextNode(b.name || ""));
      gBodies.appendChild(dot);
      gBodies.appendChild(label);
      // orbit world points precomputed once via the SHARED helper (same as poster)
      return { spec: b, path: path, dot: dot, label: label, orbit: orbitWorldPoints(b, ORBIT_SAMPLES) };
    });

    // Sun (glow + core), in screen space, recentred each frame.
    var sunGlow = el("circle", { r: 16, fill: "url(#lf-sun-glow)" });
    var sunCore = el("circle", { r: 5, fill: "#ffd98a" });
    gBodies.appendChild(sunGlow);
    gBodies.appendChild(sunCore);

    function rebuildOrbits() {
      bodies.forEach(function (o) { o.path.setAttribute("d", orbitPathD(o.orbit, project)); });
    }

    // Belts: ONE transform per layer per frame = projection (zoom+pan) folded
    // with a time-driven rigid rotation about the Sun. Cheap (a few setAttribute)
    // and smooth; it also reflects zoom/pan even while paused.
    function updateBelts() {
      var kk = k();
      for (var i = 0; i < beltLayers.length; i++) {
        var L = beltLayers[i];
        L.g.setAttribute("transform", beltTransform(cx, cy, kk, panX, panY, (t / L.period) * 360));
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

    // --- controls (HTML) — skipped when spec.controls === false so a composer
    //     (e.g. cosmiczoom.js) can drive this instance from one master bar.
    //     ADDITIVE + default-preserving: default builds controls as before.
    var controls = null, zoomInput = null, readout = null;
    if (spec.controls !== false) {
      controls = doc.createElement("div");
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
      zoomInput = doc.createElement("input");
      zoomInput.type = "range"; zoomInput.min = "0"; zoomInput.max = "1"; zoomInput.step = "0.001";
      zoomInput.value = String(1 - slider); zoomInput.className = "lf-range";   // presentation flip: right = zoom IN (internal slider unchanged)
      zoomInput.addEventListener("input", function () { jump = null; slider = clamp01(1 - parseFloat(zoomInput.value)); viewDirty = true; });
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

      var startJump = function (targetScale) {
        jump = { from: slider, to: clamp01(logZoom.scaleToSlider(targetScale, LO, HI)), p: 0, dur: 0.7 };
      };
      (spec.regions || []).forEach(function (rg) {
        var btn = doc.createElement("button");
        btn.type = "button"; btn.className = "lf-btn lf-region";
        btn.textContent = rg.name;
        btn.addEventListener("click", function () { startJump(num(rg.scale, scaleAU())); });
        controls.appendChild(btn);
      });

      // Reset: re-derive the PUBLISHED start view from the spec (the same frame the sealed poster
      // freezes). Restores zoom AND play state, re-consulting reduced-motion so Reset returns to the
      // paused published frame when the reader prefers reduced motion.
      var resetBtn = doc.createElement("button");
      resetBtn.type = "button"; resetBtn.className = "lf-btn";
      resetBtn.textContent = "Reset";
      resetBtn.addEventListener("click", function () {
        jump = null; slider = startSlider; syncZoomInput(); viewDirty = true;
        playing = (tm.playing !== false) && !DossierFigures.prefersReducedMotion();
        playBtn.textContent = playing ? "❚❚ Pause" : "▶ Play";
      });
      controls.appendChild(resetBtn);

      readout = doc.createElement("span");
      readout.className = "lf-readout";
      controls.appendChild(readout);
    }

    function syncZoomInput() { if (zoomInput) zoomInput.value = String(1 - slider); }   // presentation flip (see input wiring)

    // --- interaction: scroll-to-zoom + drag-to-pan ----------------------
    svg.addEventListener("wheel", function (ev) {
      ev.preventDefault();
      jump = null;
      slider = clamp01(slider + (ev.deltaY < 0 ? -0.05 : 0.05));   // scroll-up = zoom IN (agrees with the flipped slider)
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
    if (controls) container.appendChild(controls);

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
    var lfVisible = true, lfRunning = false;   // visibility gate: off-screen -> stop the rAF loop (real CPU savings)
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

      if (readout) readout.textContent = "scale " + scaleAU().toFixed(scaleAU() < 10 ? 2 : 0) +
        " AU · t " + t.toFixed(1) + " yr · play-speed " + spd.toFixed(2) + " yr/s";

      if (lfVisible) root.requestAnimationFrame(frame); else lfRunning = false;   // stop rescheduling when off-screen
    }
    // Resume from the FROZEN t/slider (no jump): reset the clock so dt is one frame, not the paused span.
    function lfResume() { if (!lfRunning) { lfRunning = true; last = perf.now(); root.requestAnimationFrame(frame); } }
    lfRunning = true; root.requestAnimationFrame(frame);
    // Visibility gate (child-side IntersectionObserver fires on parent-scroll, even inside an iframe).
    // Node-safe: renderX is browser-only; absent IO -> figure just always animates.
    if (root.IntersectionObserver) {
      new root.IntersectionObserver(function (es) { lfVisible = es[0].isIntersecting; if (lfVisible) lfResume(); }, { root: null, threshold: 0 }).observe(svg);
    }

    // small handle for tests / external control; also stashed on the container so the lightbox can
    // read the reader's current view (getState) and hand it off to the overlay mount (setSlider).
    var handle = {
      runtimeVersion: DossierFigures.FIGURES_RUNTIME_VERSION,
      getState: function () { return { slider: slider, scaleAU: scaleAU(), t: t, playSpeed: scaleAwareTime(baseSpeed, scaleAU()), playing: playing }; },
      setSlider: function (v) { jump = null; slider = clamp01(v); syncZoomInput(); viewDirty = true; }
    };
    container.__lfHandle = handle;
    return handle;
  }

  // -------------------------------------------------------------------------
  // renderOrreryPosterSVG(spec) -> the SEALED FLOOR: a DETERMINISTIC <svg> STRING
  // for the DEFAULT opening frame. PURE — no DOM, no headless browser, no
  // animation-phase sampling: it is GENERATED from the spec via the SAME shared
  // compute (computeFrame) the live path uses, so floor == ceiling by construction.
  // The Oort shell is emitted at its FIXED base opacity (defined, not sampled).
  // Mirrors render_math.js's pure-string discipline (katex.renderToString).
  // -------------------------------------------------------------------------
  function renderOrreryPosterSVG(spec) {
    if (typeof spec === "string") { try { spec = JSON.parse(spec); } catch (e) { return ""; } }
    if (!spec || !spec.bodies || !spec.bodies.length) return "";
    var f = computeFrame(spec);
    var s = '<svg viewBox="0 0 ' + f.W + ' ' + f.H + '" width="100%" class="lf-svg" role="img" aria-label="' + escAttr(f.ariaLabel) + '">';
    s += '<defs><radialGradient id="lf-sun-glow" cx="50%" cy="50%" r="50%">';
    s += '<stop offset="0%" stop-color="#ffe9a8" stop-opacity="0.95"></stop>';
    s += '<stop offset="100%" stop-color="#f4a73b" stop-opacity="0"></stop>';
    s += '</radialGradient></defs>';

    s += '<g class="lf-orbits">';
    f.orbits.forEach(function (o) {
      s += '<path class="lf-orbit" fill="none" stroke="' + escAttr(o.color) + '" stroke-opacity="0.32" stroke-width="1" d="' + o.d + '"></path>';
    });
    s += '</g>';

    s += '<g class="lf-belts">';
    f.beltLayers.forEach(function (L) {
      s += '<g transform="' + escAttr(L.transform) + '">';
      for (var i = 0; i < L.points.length; i++) {
        var pt = L.points[i];
        s += '<circle cx="' + r2(pt[0]) + '" cy="' + r2(pt[1]) + '" r="' + r2(L.dotR) + '" fill="' + escAttr(L.color) + '" fill-opacity="' + L.baseOpacity + '"></circle>';
      }
      s += '</g>';
    });
    s += '</g>';

    s += '<g class="lf-bodies">';
    f.planets.forEach(function (p) {
      s += '<circle class="lf-planet" cx="' + r2(p.cx) + '" cy="' + r2(p.cy) + '" r="' + r2(p.r) + '" fill="' + escAttr(p.color) + '"></circle>';
      s += '<text class="lf-label lf-axis" fill="var(--lf-label, #5a6b70)" dx="' + r2(p.r + 3) + '" dy="3" x="' + r2(p.cx) + '" y="' + r2(p.cy) + '">' + escTxt(p.name) + '</text>';
    });
    s += '<circle r="16" fill="url(#lf-sun-glow)" cx="' + r2(f.sun.cx) + '" cy="' + r2(f.sun.cy) + '"></circle>';
    s += '<circle r="5" fill="#ffd98a" cx="' + r2(f.sun.cx) + '" cy="' + r2(f.sun.cy) + '"></circle>';
    s += '</g></svg>';
    return s;
  }

  DossierFigures.renderOrrery = renderOrrery;
  DossierFigures.renderOrreryPosterSVG = renderOrreryPosterSVG;   // back-compat (direct callers)
  DossierFigures.registerPoster("orrery", renderOrreryPosterSVG); // registry (the sealer dispatches by spec.type)
  DossierFigures.registerRenderer("orrery", renderOrrery);        // live-renderer registry (the lightbox dispatches by spec.type)
})(typeof window !== "undefined" ? window : null);
