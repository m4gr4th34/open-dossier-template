/*
 * galaxy.js — top-down spiral-galaxy render module for Open Dossier living figures.
 *
 * WHAT THIS IS
 *   The regime-proof that the runtime extends from DETERMINISTIC n-body (the
 *   orrery) to STATISTICAL STRUCTURE (a spiral galaxy) WITHOUT new primitives.
 *   Vendored, zero-dependency, reader-side. Loaded after figures.js; extends
 *   window.DossierFigures with one entry point: renderGalaxy(container, spec).
 *
 * THE COMPOSITION LAW (same as orrery.js — compose, never re-roll)
 *     - star field / bulge / halo -> DossierFigures.seededScatter(seed, count, fn)
 *       (the STRUCTURE — log-spiral arms, density gradient — lives in fn; the
 *        PRNG is uniform. Same generator the orrery's belt uses.)
 *     - ~10-orders-of-magnitude zoom -> DossierFigures.logZoom.sliderToScale / scaleToSlider
 *     - scale-aware spin -> DossierFigures.scaleAwareTime(baseSpeed, scale)
 *     - soft motion (region jumps) -> DossierFigures.ease(t)
 *     - SVG nodes -> DossierFigures.el(tag, attrs)
 *   solveKepler is NOT used here: a galaxy is statistical structure, not an
 *   n-body integration — that is exactly the regime the runtime now spans.
 *   This module supplies only GEOMETRY (log-spiral placement on seededScatter
 *   output) + a per-scale CULL + the render/interaction shell. No new primitive.
 *
 * PER-SCALE CULL (lives HERE, not in the runtime)
 *   The galaxy generates far more stars than can be drawn. A fixed pool of
 *   MAX_STAR_NODES reusable nodes is filled each recompute from the stars that
 *   fall inside the padded viewport; the rest stay hidden. So wide zoom shows a
 *   representative sample (first MAX_STAR_NODES visible, arm-interleaved =
 *   spatially uniform) and a zoomed region draws only its local stars — bounded
 *   node count at every scale. Bulge/halo are smaller layers (no cap; off-screen
 *   points hidden).
 *
 * "YOU ARE HERE" — honest sub-pixel scaling
 *   The Sun sits ~26,000 ly out in a spur, marked by a constant-size overlay dot
 *   + label. At galaxy scale the whole Solar System is correctly ONE dot; zoomed
 *   in, it stays a single point (no fabricated sub-structure to "reveal"). Honest.
 *
 * SUSTAINABILITY LAWS — zero deps, pure vanilla, vendored; never run by CI.
 */
(function (root) {
  "use strict";

  var NS = root && root.DossierFigures;
  if (!NS) {
    if (root && root.console) {
      root.console.error("[galaxy] figures.js runtime not found — load figures.js before galaxy.js");
    }
    return;
  }

  // COMPOSITION: every primitive below IS the Phase-1 runtime's — never re-rolled.
  var DossierFigures = NS;
  var seededScatter  = DossierFigures.seededScatter;
  var logZoom        = DossierFigures.logZoom;
  var scaleAwareTime = DossierFigures.scaleAwareTime;
  var ease           = DossierFigures.ease;
  var el             = DossierFigures.el;

  var TAU = Math.PI * 2;
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function num(v, d) { return (typeof v === "number" && isFinite(v)) ? v : d; }

  function fail(container, msg) {
    if (root && root.console) root.console.error("[galaxy] " + msg);
    if (container && container.appendChild) {
      var p = root.document.createElement("p");
      p.className = "lf-fallback";
      p.textContent = "Figure unavailable: " + msg;
      container.appendChild(p);
    }
    return null;
  }

  var MAX_STAR_NODES = 4000;   // hard cap on stars drawn per frame (the cull bound)

  // -------------------------------------------------------------------------
  // renderGalaxy(container, spec)
  //   container : <figure class="living-figure"> (or any host node)
  //   spec      : JSON (object or string). If omitted, read from data-figure,
  //               which is LEFT IN PLACE (the source of truth).
  // -------------------------------------------------------------------------
  function renderGalaxy(container, spec) {
    if (!container) return fail(null, "no container");
    var doc = (root && root.document) || container.ownerDocument;

    if (spec == null && container.getAttribute) spec = container.getAttribute("data-figure");
    if (typeof spec === "string") {
      try { spec = JSON.parse(spec); }
      catch (e) { return fail(container, "data-figure is not valid JSON"); }
    }
    if (!spec || !spec.disk) return fail(container, "spec has no disk");

    var W = 800, H = 480, cx = W / 2, cy = H / 2, RAD = Math.min(W, H) * 0.46;
    var zoom = spec.zoom || {};
    var LO = Math.max(1e-9, num(zoom.lo, 1e-5));          // strictly positive (logZoom needs >0)
    var HI = Math.max(LO * 1.0001, num(zoom.hi, 200000)); // light-year half-window range
    var tm = spec.time || {};
    var baseSpeed = num(tm.baseSpeed, 0.05);
    var playing = tm.playing !== false;

    var slider = clamp01(logZoom.scaleToSlider(num(zoom.start, HI * 0.4), LO, HI));  // RUNTIME inverse
    var panX = 0, panY = 0, galaxyAngle = 0, viewDirty = true, jump = null;
    var drawnStars = 0, drawnBulge = 0, drawnHalo = 0;

    function scaleLY() { return logZoom.sliderToScale(slider, LO, HI); }  // RUNTIME: slider -> ly window
    function k() { return RAD / scaleLY(); }                             // px per light-year

    // --- SVG scaffold ----------------------------------------------------
    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, width: "100%", "class": "lf-svg",
      role: "img", "aria-label": spec.title || "Spiral galaxy" });
    var defs = el("defs", {});
    var glow = el("radialGradient", { id: "lf-core-glow", cx: "50%", cy: "50%", r: "50%" });
    glow.appendChild(el("stop", { offset: "0%", "stop-color": "#fff2cc", "stop-opacity": "0.9" }));
    glow.appendChild(el("stop", { offset: "100%", "stop-color": "#ffcf7a", "stop-opacity": "0" }));
    defs.appendChild(glow);
    svg.appendChild(defs);

    var gCore  = el("g", { "class": "lf-core" });
    var gHalo  = el("g", { "class": "lf-halo" });
    var gStars = el("g", { "class": "lf-stars" });
    var gBulge = el("g", { "class": "lf-bulge" });
    var gMark  = el("g", { "class": "lf-youarehere" });
    svg.appendChild(gCore);   // core glow behind everything
    svg.appendChild(gHalo);
    svg.appendChild(gStars);
    svg.appendChild(gBulge);
    svg.appendChild(gMark);

    var coreGlow = el("circle", { r: 34, fill: "url(#lf-core-glow)" });
    gCore.appendChild(coreGlow);

    // --- GENERATE structure (seededScatter; structure lives in fn) --------
    var disk = spec.disk;
    var arms = Math.max(1, disk.arms | 0 || 4);
    var rMinD = num(disk.rMin, 1500), rMaxD = num(disk.rMax, 48000);
    var pitch = num(disk.pitch, 4.3), spread = num(disk.spread, 0.5);
    // Log-spiral arms with a center-dense radial gradient. Math.log/cos/sin are
    // GEOMETRY on seededScatter's uniform output — not a reimplemented primitive.
    // The density gradient is quadratic (u*u), deliberately avoiding Math.pow so
    // the composition grep stays unambiguous.
    var worldStars = seededScatter(disk.seed | 0, disk.count | 0, function (rng, i) {
      var arm = i % arms;
      var u = rng();
      var R = rMinD + (rMaxD - rMinD) * u * u;                 // denser toward center
      var theta = (arm * TAU / arms) + pitch * Math.log(R) + spread * (rng() - 0.5);
      var b = 0.35 + 0.65 * rng();                             // brightness for texture
      return [R * Math.cos(theta), R * Math.sin(theta), b];
    });

    var bsp = spec.bulge || { seed: 7, count: 1200, radius: 9000 };
    var worldBulge = seededScatter(bsp.seed | 0, bsp.count | 0, function (rng) {
      var u = rng();
      var R = num(bsp.radius, 9000) * u * u;                   // dense core (Oort-shell pattern)
      var th = rng() * TAU;
      return [R * Math.cos(th), R * Math.sin(th), 0.5 + 0.5 * rng()];
    });

    var hsp = spec.halo || { seed: 9, count: 800, rMin: 20000, rMax: 85000 };
    var worldHalo = seededScatter(hsp.seed | 0, hsp.count | 0, function (rng) {
      var R = num(hsp.rMin, 20000) + rng() * (num(hsp.rMax, 85000) - num(hsp.rMin, 20000));
      var th = rng() * TAU;
      return [R * Math.cos(th), R * Math.sin(th), 0.2 + 0.4 * rng()];
    });

    // --- node pools ------------------------------------------------------
    function makeNodes(parent, n, color, opacity) {
      var arr = new Array(n), frag = doc.createDocumentFragment();
      for (var i = 0; i < n; i++) {
        var c = el("circle", { r: 1, fill: color, "fill-opacity": opacity });
        c.style.display = "none"; c.__hidden = true;
        arr[i] = c; frag.appendChild(c);
      }
      parent.appendChild(frag);
      return arr;
    }
    var starColor = disk.color || "#cdd8ff";
    var bulgeColor = bsp.color || "#ffe6b0";
    var haloColor = hsp.color || "#8a93a8";
    var starNodes  = makeNodes(gStars, MAX_STAR_NODES, starColor, 0.85);
    var bulgeNodes = makeNodes(gBulge, worldBulge.length, bulgeColor, 0.8);
    var haloNodes  = makeNodes(gHalo, worldHalo.length, haloColor, 0.5);

    // --- you-are-here marker (Sun's galactic position) -------------------
    var sun = spec.sun || { r: 26000, theta: 2.1, label: "You are here" };
    var sunR = num(sun.r, 26000), sunTh = num(sun.theta, 2.1);
    var sunBase = [sunR * Math.cos(sunTh), sunR * Math.sin(sunTh)];
    var markRing = el("circle", { r: 9, fill: "none", stroke: "#ff7a59", "stroke-width": 1.4, "stroke-opacity": 0.9 });
    var markDot  = el("circle", { r: 2.2, fill: "#ffd2c4" });
    var markLbl  = el("text", { "class": "lf-label", "font-size": 11, fill: "#ffb9a6", dx: 13, dy: 4 });
    markLbl.appendChild(doc.createTextNode(sun.label || "You are here"));
    gMark.appendChild(markRing); gMark.appendChild(markDot); gMark.appendChild(markLbl);

    // --- default zoom FOCUS = "you are here" (the Sun), NOT the galactic centre.
    // The bare zoom gesture should fall toward HOME: we interpolate the view
    // centre from the galactic centre (origin) at the opening scale to the Sun's
    // spur as you zoom in, so pulling the slider travels to the Solar System and
    // the cull then pulls stars from the Sun's neighbourhood (the spur resolves
    // — no more "empty centre"). Manual drag or an explicit-centre region hands
    // control back (autoFocus off). focusMode comes from zoom.focus in the spec
    // ("sun" | "center" | [x,y]); defaults to "sun" when the spec has a Sun.
    var focusMode = (zoom.focus !== undefined) ? zoom.focus : (spec.sun ? "sun" : "center");
    var autoFocus = (focusMode !== "center");
    var sStart = slider;                                      // the opening (galaxy-scale) slider
    // Complete the focus at a fairly wide scale (~half the Sun's radius) so the
    // Sun centres SMOOTHLY early in the zoom, before the exponential magnification
    // can fling its off-centre offset toward the edge (no overshoot-then-snap).
    var focusDoneScale = num(zoom.focusScale, sunR * 0.5);    // scale by which we are fully on the Sun
    var sFocusDone = clamp01(logZoom.scaleToSlider(Math.max(LO, focusDoneScale), LO, HI));

    function focusPoint() {                                   // current (rotated) target, world ly
      if (focusMode === "sun" && spec.sun) {
        var ca = Math.cos(galaxyAngle), sa = Math.sin(galaxyAngle);
        return [sunBase[0] * ca - sunBase[1] * sa, sunBase[0] * sa + sunBase[1] * ca];
      }
      if (focusMode && focusMode.length === 2) return [num(focusMode[0], 0), num(focusMode[1], 0)];
      return [0, 0];
    }
    function applyAutoFocus() {                               // pan falls origin -> focus as you zoom in
      if (!autoFocus) return;
      var span = sStart - sFocusDone;
      var frac = span > 1e-6 ? clamp01((sStart - slider) / span) : 0;
      var f = focusPoint();
      panX = -f[0] * frac; panY = -f[1] * frac;
    }

    // --- the CULL: project a world layer into its node pool --------------
    var PAD = 36;
    function projectLayer(worldArr, nodes, cap, ca, sa, kk) {
      var j = 0;
      for (var i = 0; i < worldArr.length; i++) {
        if (cap && j >= cap) break;
        var p = worldArr[i];
        var wx = p[0] * ca - p[1] * sa, wy = p[0] * sa + p[1] * ca;   // rigid rotation
        var sx = cx + (wx + panX) * kk, sy = cy - (wy + panY) * kk;
        if (sx < -PAD || sx > W + PAD || sy < -PAD || sy > H + PAD) continue;   // CULL off-screen
        var n = nodes[j++];
        n.setAttribute("cx", sx.toFixed(1)); n.setAttribute("cy", sy.toFixed(1));
        if (n.__b !== p[2]) { n.setAttribute("r", (0.5 + p[2] * 1.1).toFixed(2)); n.__b = p[2]; }
        if (n.__hidden) { n.style.display = ""; n.__hidden = false; }
      }
      var drawn = j;
      for (; j < nodes.length; j++) { var m = nodes[j]; if (!m.__hidden) { m.style.display = "none"; m.__hidden = true; } }
      return drawn;
    }

    function updateMarker(ca, sa, kk) {
      var wx = sunBase[0] * ca - sunBase[1] * sa, wy = sunBase[0] * sa + sunBase[1] * ca;
      var sx = cx + (wx + panX) * kk, sy = cy - (wy + panY) * kk;
      markRing.setAttribute("cx", sx); markRing.setAttribute("cy", sy);
      markDot.setAttribute("cx", sx); markDot.setAttribute("cy", sy);
      markLbl.setAttribute("x", sx); markLbl.setAttribute("y", sy);
    }

    function recompute() {
      applyAutoFocus();   // zoom focus = the Sun by default (pan tracks it as you zoom in)
      var ca = Math.cos(galaxyAngle), sa = Math.sin(galaxyAngle), kk = k();
      coreGlow.setAttribute("cx", cx + panX * kk); coreGlow.setAttribute("cy", cy - panY * kk);
      drawnHalo  = projectLayer(worldHalo, haloNodes, 0, ca, sa, kk);
      drawnBulge = projectLayer(worldBulge, bulgeNodes, 0, ca, sa, kk);
      drawnStars = projectLayer(worldStars, starNodes, MAX_STAR_NODES, ca, sa, kk);
      updateMarker(ca, sa, kk);
    }

    // --- controls (HTML, themed by the host page) ------------------------
    var controls = doc.createElement("div");
    controls.className = "lf-controls";

    var playBtn = doc.createElement("button");
    playBtn.type = "button"; playBtn.className = "lf-btn lf-play";
    playBtn.textContent = playing ? "❚❚ Pause" : "▶ Play";
    playBtn.addEventListener("click", function () { playing = !playing; playBtn.textContent = playing ? "❚❚ Pause" : "▶ Play"; });
    controls.appendChild(playBtn);

    var zoomWrap = doc.createElement("label"); zoomWrap.className = "lf-field";
    zoomWrap.appendChild(doc.createTextNode("Zoom"));
    var zoomInput = doc.createElement("input");
    zoomInput.type = "range"; zoomInput.min = "0"; zoomInput.max = "1"; zoomInput.step = "0.0005";
    zoomInput.value = String(slider); zoomInput.className = "lf-range";
    zoomInput.addEventListener("input", function () { jump = null; slider = clamp01(parseFloat(zoomInput.value)); viewDirty = true; });
    zoomWrap.appendChild(zoomInput); controls.appendChild(zoomWrap);

    var spdWrap = doc.createElement("label"); spdWrap.className = "lf-field";
    spdWrap.appendChild(doc.createTextNode("Spin"));
    var spdInput = doc.createElement("input");
    spdInput.type = "range"; spdInput.min = "0"; spdInput.max = "0.3"; spdInput.step = "0.005";
    spdInput.value = String(baseSpeed); spdInput.className = "lf-range";
    spdInput.addEventListener("input", function () { baseSpeed = parseFloat(spdInput.value); });
    spdWrap.appendChild(spdInput); controls.appendChild(spdWrap);

    function syncZoom() { zoomInput.value = String(slider); }
    function resolveCenter(rg, ca, sa) {
      if (rg.center === "sun") {
        return [sunBase[0] * ca - sunBase[1] * sa, sunBase[0] * sa + sunBase[1] * ca];
      }
      if (rg.center && rg.center.length === 2) return rg.center;
      return null;
    }
    function startJump(rg) {
      var ca = Math.cos(galaxyAngle), sa = Math.sin(galaxyAngle);
      var c = resolveCenter(rg, ca, sa);
      // Explicit-centre region -> manual focus (autoFocus off). A region with NO
      // centre hands control back to the "fall toward home" auto-focus (pan is
      // then driven by applyAutoFocus from the zoom level), so e.g. "Whole galaxy"
      // returns to the default origin-at-wide / Sun-on-zoom-in behaviour.
      autoFocus = !c;
      jump = {
        fromS: slider, toS: clamp01(logZoom.scaleToSlider(num(rg.scale, scaleLY()), LO, HI)),
        fromPX: panX, toPX: c ? -c[0] : panX,   // pan so the target centers (project(c)=center)
        fromPY: panY, toPY: c ? -c[1] : panY,
        p: 0, dur: 1.1
      };
    }
    (spec.regions || []).forEach(function (rg) {
      var btn = doc.createElement("button");
      btn.type = "button"; btn.className = "lf-btn lf-region";
      btn.textContent = rg.name;
      btn.addEventListener("click", function () { startJump(rg); });
      controls.appendChild(btn);
    });

    var readout = doc.createElement("span"); readout.className = "lf-readout";
    controls.appendChild(readout);

    // --- interaction: scroll-to-zoom + drag-to-pan ----------------------
    svg.addEventListener("wheel", function (ev) {
      ev.preventDefault(); jump = null;
      slider = clamp01(slider + (ev.deltaY < 0 ? 0.04 : -0.04));
      syncZoom(); viewDirty = true;
    }, { passive: false });
    var dragging = false, lastX = 0, lastY = 0;
    svg.addEventListener("mousedown", function (ev) { dragging = true; lastX = ev.clientX; lastY = ev.clientY; });
    root.addEventListener("mouseup", function () { dragging = false; });
    root.addEventListener("mousemove", function (ev) {
      if (!dragging) return;
      autoFocus = false;   // manual pan -> the reader takes the wheel (explore freely)
      var kk = k();
      panX += (ev.clientX - lastX) / kk; panY -= (ev.clientY - lastY) / kk;
      lastX = ev.clientX; lastY = ev.clientY; viewDirty = true;
    });

    // --- mount (data-figure left untouched) ------------------------------
    container.appendChild(svg);
    container.appendChild(controls);

    // --- animation loop --------------------------------------------------
    // RIGID slow spin (one galaxyAngle applied to all layers in projection),
    // scale-coupled via scaleAwareTime so the spin reads at every zoom. Star
    // positions re-cull on viewDirty (interaction) and on a slow throttle while
    // playing (the galaxy turns slowly, so ~15 Hz re-cull looks continuous and
    // keeps per-frame DOM writes bounded).
    var SPIN = 0.018, ROT_MS = 66;
    var perf = (root.performance && root.performance.now) ? root.performance : Date;
    var last = perf.now(), lastRecomp = 0;
    function frame(now) {
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      var spin = scaleAwareTime(baseSpeed, scaleLY());     // RUNTIME (scale-coupled)
      if (playing && !jump) galaxyAngle += spin * dt * SPIN;

      if (jump) {
        jump.p += dt / jump.dur; var e = ease(clamp01(jump.p)); // RUNTIME: soft motion
        slider = jump.fromS + (jump.toS - jump.fromS) * e;
        panX = jump.fromPX + (jump.toPX - jump.fromPX) * e;
        panY = jump.fromPY + (jump.toPY - jump.fromPY) * e;
        syncZoom(); viewDirty = true;
        if (jump.p >= 1) jump = null;
      }
      if (playing && (now - lastRecomp > ROT_MS)) viewDirty = true;
      if (viewDirty) { recompute(); viewDirty = false; lastRecomp = now; }

      var s = scaleLY();
      var scaleTxt = s >= 1000 ? Math.round(s).toLocaleString() + " ly"
        : s >= 0.1 ? s.toFixed(2) + " ly"
        : "~" + (s * 63241).toFixed(2) + " AU";   // 1 ly = 63,241 AU
      readout.textContent = "scale " + scaleTxt + " · stars " + drawnStars + "/" + worldStars.length +
        " (cap " + MAX_STAR_NODES + ") · spin " + spin.toFixed(2);

      root.requestAnimationFrame(frame);
    }
    root.requestAnimationFrame(frame);

    return {
      runtimeVersion: DossierFigures.FIGURES_RUNTIME_VERSION,
      getState: function () {
        return { slider: slider, scaleLY: scaleLY(), angle: galaxyAngle, playing: playing,
          drawnStars: drawnStars, drawnBulge: drawnBulge, drawnHalo: drawnHalo,
          maxStarNodes: MAX_STAR_NODES, totalStars: worldStars.length,
          autoFocus: autoFocus, panX: panX, panY: panY,
          viewCenterLY: [-panX, -panY], focusTarget: focusPoint() };
      },
      setSlider: function (v) { jump = null; slider = clamp01(v); syncZoom(); viewDirty = true; }
    };
  }

  DossierFigures.renderGalaxy = renderGalaxy;
})(typeof window !== "undefined" ? window : null);
