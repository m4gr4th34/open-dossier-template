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
  var r2             = DossierFigures.r2;       // string-emit helpers (poster path)
  var escAttr        = DossierFigures.escAttr;
  var escTxt         = DossierFigures.escTxt;

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

  // ===== SHARED GEOMETRY ====================================================
  // Computed ONCE here, consumed by BOTH emitters — the live el() path AND the
  // poster string path — so the sealed floor can never drift from the live
  // ceiling. seededScatter / logZoom are STILL the runtime primitives; only the
  // final emit (DOM node vs SVG string) differs. Canvas constants are fixed.
  var GW = 800, GH = 480, GRAD = Math.min(800, 480) * 0.46, GPAD = 36;

  // GENERATE structure (PURE — seededScatter; structure lives in the fn). Same
  // rng() call order as the original inline build => byte-identical point sets.
  function computeGalaxyStars(spec) {
    var disk = spec.disk;
    var arms = Math.max(1, disk.arms | 0 || 4);
    var rMinD = num(disk.rMin, 1500), rMaxD = num(disk.rMax, 48000);
    var pitch = num(disk.pitch, 4.3), spread = num(disk.spread, 0.5);
    return seededScatter(disk.seed | 0, disk.count | 0, function (rng, i) {
      var arm = i % arms;
      var u = rng();
      var R = rMinD + (rMaxD - rMinD) * u * u;                 // denser toward center
      var theta = (arm * TAU / arms) + pitch * Math.log(R) + spread * (rng() - 0.5);
      var b = 0.35 + 0.65 * rng();
      return [R * Math.cos(theta), R * Math.sin(theta), b];
    });
  }
  function computeGalaxyBulge(spec) {
    var bsp = spec.bulge || { seed: 7, count: 1200, radius: 9000 };
    return seededScatter(bsp.seed | 0, bsp.count | 0, function (rng) {
      var u = rng();
      var R = num(bsp.radius, 9000) * u * u;                   // dense core
      var th = rng() * TAU;
      return [R * Math.cos(th), R * Math.sin(th), 0.5 + 0.5 * rng()];
    });
  }
  function computeGalaxyHalo(spec) {
    var hsp = spec.halo || { seed: 9, count: 800, rMin: 20000, rMax: 85000 };
    return seededScatter(hsp.seed | 0, hsp.count | 0, function (rng) {
      var R = num(hsp.rMin, 20000) + rng() * (num(hsp.rMax, 85000) - num(hsp.rMin, 20000));
      var th = rng() * TAU;
      return [R * Math.cos(th), R * Math.sin(th), 0.2 + 0.4 * rng()];
    });
  }

  // The PURE per-scale cull: rotate (ca,sa), project, drop off-screen (GPAD),
  // cap at `cap` (MAX_STAR_NODES for stars; 0 = uncapped), in generation order.
  // Returns the drawn points [[sx,sy,brightness], …]. The live path sets node
  // attrs from this; the poster emits <circle> strings from it — SAME set.
  function cullLayer(worldArr, cap, ca, sa, kk, cx, cy, panX, panY) {
    var out = [], j = 0;
    for (var i = 0; i < worldArr.length; i++) {
      if (cap && j >= cap) break;
      var p = worldArr[i];
      var wx = p[0] * ca - p[1] * sa, wy = p[0] * sa + p[1] * ca;   // rigid rotation
      var sx = cx + (wx + panX) * kk, sy = cy - (wy + panY) * kk;
      if (sx < -GPAD || sx > GW + GPAD || sy < -GPAD || sy > GH + GPAD) continue;
      out.push([sx, sy, p[2]]); j++;
    }
    return out;
  }

  // The DEFAULT (start) frame as plain data: slider=scaleToSlider(zoom.start),
  // pan=0 (auto-focus frac=0 at the start slider -> galactic-centre framed, the
  // Sun marked OFF-centre in its spur), galaxyAngle=0 (ca=1,sa=0). The whole-
  // galaxy "you are here" view — what the poster freezes.
  function computeGalaxyFrame(spec) {
    var cx = GW / 2, cy = GH / 2;
    var zoom = spec.zoom || {};
    var LO = Math.max(1e-9, num(zoom.lo, 1e-5));
    var HI = Math.max(LO * 1.0001, num(zoom.hi, 200000));
    var slider = clamp01(logZoom.scaleToSlider(num(zoom.start, HI * 0.4), LO, HI)); // RUNTIME
    var scaleLY = logZoom.sliderToScale(slider, LO, HI);                            // RUNTIME
    var kk = GRAD / scaleLY, panX = 0, panY = 0, ca = 1, sa = 0;                    // start frame

    var disk = spec.disk, bsp = spec.bulge || {}, hsp = spec.halo || {};
    // Poster-density lever (POSTER-ONLY — computeGalaxyFrame is never called by the
    // live path). spec.poster.{starCount,bulgeCount,haloCount} feed cullLayer's existing
    // cap: a lighter DETERMINISTIC prefix of the same seeded scatter (cullLayer keeps the
    // first-N visible in generation order). Absent -> today's exact caps (MAX_STAR_NODES /
    // 0 / 0; 0 = uncapped) -> byte-identical to a poster-less spec.
    var pc = spec.poster || {};
    var starCap  = (pc.starCount  != null) ? pc.starCount  : MAX_STAR_NODES;
    var bulgeCap = (pc.bulgeCount != null) ? pc.bulgeCount : 0;
    var haloCap  = (pc.haloCount  != null) ? pc.haloCount  : 0;
    var stars = cullLayer(computeGalaxyStars(spec), starCap, ca, sa, kk, cx, cy, panX, panY);
    var bulge = cullLayer(computeGalaxyBulge(spec), bulgeCap, ca, sa, kk, cx, cy, panX, panY);
    var halo  = cullLayer(computeGalaxyHalo(spec), haloCap, ca, sa, kk, cx, cy, panX, panY);

    var sun = spec.sun || { r: 26000, theta: 2.1, label: "You are here" };
    var sbx = num(sun.r, 26000) * Math.cos(num(sun.theta, 2.1));
    var sby = num(sun.r, 26000) * Math.sin(num(sun.theta, 2.1));

    return {
      W: GW, H: GH, scaleLY: scaleLY, ariaLabel: spec.title || "Spiral galaxy",
      coreGlow: { cx: cx + panX * kk, cy: cy - panY * kk },
      stars: stars, starColor: disk.color || "#cdd8ff", starOpacity: 0.85,
      bulge: bulge, bulgeColor: bsp.color || "#ffe6b0", bulgeOpacity: 0.8,
      halo: halo, haloColor: hsp.color || "#8a93a8", haloOpacity: 0.5,
      marker: { x: cx + (sbx + panX) * kk, y: cy - (sby + panY) * kk, label: sun.label || "You are here" }
    };
  }

  // -------------------------------------------------------------------------
  // renderGalaxyPosterSVG(spec) -> the SEALED FLOOR: a DETERMINISTIC <svg> STRING
  // for the whole-galaxy start frame. PURE (no DOM, no browser, no sampling) —
  // generated from the spec via the SAME computeGalaxyFrame the live path uses,
  // so floor == ceiling by construction. The galaxy has no shimmer, so there is
  // NO expected difference. Mirrors render_math.js's pure-string discipline.
  // -------------------------------------------------------------------------
  function emitLayer(cls, pts, color, opacity) {
    var s = '<g class="' + cls + '">';
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      s += '<circle cx="' + r2(p[0]) + '" cy="' + r2(p[1]) + '" r="' + r2(0.5 + p[2] * 1.1) + '" fill="' + escAttr(color) + '" fill-opacity="' + opacity + '"></circle>';
    }
    return s + '</g>';
  }
  function renderGalaxyPosterSVG(spec) {
    if (typeof spec === "string") { try { spec = JSON.parse(spec); } catch (e) { return ""; } }
    if (!spec || !spec.disk) return "";
    var f = computeGalaxyFrame(spec);
    var s = '<svg viewBox="0 0 ' + f.W + ' ' + f.H + '" width="100%" class="lf-svg" role="img" aria-label="' + escAttr(f.ariaLabel) + '">';
    s += '<defs><radialGradient id="lf-core-glow" cx="50%" cy="50%" r="50%">';
    s += '<stop offset="0%" stop-color="#fff2cc" stop-opacity="0.9"></stop>';
    s += '<stop offset="100%" stop-color="#ffcf7a" stop-opacity="0"></stop>';
    s += '</radialGradient></defs>';
    s += '<g class="lf-core"><circle r="34" fill="url(#lf-core-glow)" cx="' + r2(f.coreGlow.cx) + '" cy="' + r2(f.coreGlow.cy) + '"></circle></g>';
    s += emitLayer("lf-halo", f.halo, f.haloColor, f.haloOpacity);
    s += emitLayer("lf-stars", f.stars, f.starColor, f.starOpacity);
    s += emitLayer("lf-bulge", f.bulge, f.bulgeColor, f.bulgeOpacity);
    s += '<g class="lf-youarehere">';
    s += '<circle r="9" fill="none" stroke="#ff7a59" stroke-width="1.4" stroke-opacity="0.9" cx="' + r2(f.marker.x) + '" cy="' + r2(f.marker.y) + '"></circle>';
    s += '<circle r="2.2" fill="#ffd2c4" cx="' + r2(f.marker.x) + '" cy="' + r2(f.marker.y) + '"></circle>';
    s += '<text class="lf-label lf-callout" fill="#ffb9a6" dx="13" dy="4" x="' + r2(f.marker.x) + '" y="' + r2(f.marker.y) + '">' + escTxt(f.marker.label) + '</text>';
    s += '</g></svg>';
    return s;
  }

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

    // A build-time sealed poster (data-poster) may already sit in the container
    // as the JS-off floor. Remove it before rendering live so a JS-on reader ends
    // with exactly ONE (live) <svg> — the floor upgrades to the ceiling. (Same
    // additive dedup as renderOrrery; a no-op when no poster is present.)
    if (container.querySelector) {
      var baked = container.querySelector("[data-poster]");
      if (baked && baked.parentNode) baked.parentNode.removeChild(baked);
    }

    var W = 800, H = 480, cx = W / 2, cy = H / 2, RAD = Math.min(W, H) * 0.46;
    var zoom = spec.zoom || {};
    var LO = Math.max(1e-9, num(zoom.lo, 1e-5));          // strictly positive (logZoom needs >0)
    var HI = Math.max(LO * 1.0001, num(zoom.hi, 200000)); // light-year half-window range
    var tm = spec.time || {};
    var baseSpeed = num(tm.baseSpeed, 0.05);
    var playing = (tm.playing !== false) && !DossierFigures.prefersReducedMotion();

    var slider = clamp01(logZoom.scaleToSlider(num(zoom.start, HI * 0.4), LO, HI));  // RUNTIME inverse
    var startSlider = slider;   // the PUBLISHED start view (what the sealed poster freezes) — Reset restores it
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

    // --- GENERATE structure via the SHARED compute (same point sets the poster
    //     path uses; only the emit below — el() — differs). ------------------
    var disk = spec.disk;
    var bsp = spec.bulge || { seed: 7, count: 1200, radius: 9000 };
    var hsp = spec.halo || { seed: 9, count: 800, rMin: 20000, rMax: 85000 };
    var worldStars = computeGalaxyStars(spec);
    var worldBulge = computeGalaxyBulge(spec);
    var worldHalo  = computeGalaxyHalo(spec);

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
    var markLbl  = el("text", { "class": "lf-label lf-callout", fill: "#ffb9a6", dx: 13, dy: 4 });
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

    // --- the CULL: SHARED math (cullLayer) -> set node attrs from the result --
    function projectLayer(worldArr, nodes, cap, ca, sa, kk) {
      var pts = cullLayer(worldArr, cap, ca, sa, kk, cx, cy, panX, panY);
      var j = 0;
      for (; j < pts.length; j++) {
        var n = nodes[j], p = pts[j];
        n.setAttribute("cx", p[0].toFixed(1)); n.setAttribute("cy", p[1].toFixed(1));
        if (n.__b !== p[2]) { n.setAttribute("r", (0.5 + p[2] * 1.1).toFixed(2)); n.__b = p[2]; }
        if (n.__hidden) { n.style.display = ""; n.__hidden = false; }
      }
      for (; j < nodes.length; j++) { var m = nodes[j]; if (!m.__hidden) { m.style.display = "none"; m.__hidden = true; } }
      return pts.length;
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
      playBtn.addEventListener("click", function () { playing = !playing; playBtn.textContent = playing ? "❚❚ Pause" : "▶ Play"; });
      controls.appendChild(playBtn);

      var zoomWrap = doc.createElement("label"); zoomWrap.className = "lf-field";
      zoomWrap.appendChild(doc.createTextNode("Zoom"));
      zoomInput = doc.createElement("input");
      zoomInput.type = "range"; zoomInput.min = "0"; zoomInput.max = "1"; zoomInput.step = "0.0005";
      zoomInput.value = String(1 - slider); zoomInput.className = "lf-range";   // presentation flip: right = zoom IN (internal slider unchanged)
      zoomInput.addEventListener("input", function () { jump = null; slider = clamp01(1 - parseFloat(zoomInput.value)); viewDirty = true; });
      zoomWrap.appendChild(zoomInput); controls.appendChild(zoomWrap);

      var spdWrap = doc.createElement("label"); spdWrap.className = "lf-field";
      spdWrap.appendChild(doc.createTextNode("Spin"));
      var spdInput = doc.createElement("input");
      spdInput.type = "range"; spdInput.min = "0"; spdInput.max = "0.3"; spdInput.step = "0.005";
      spdInput.value = String(baseSpeed); spdInput.className = "lf-range";
      spdInput.addEventListener("input", function () { baseSpeed = parseFloat(spdInput.value); });
      spdWrap.appendChild(spdInput); controls.appendChild(spdWrap);

      var resolveCenter = function (rg, ca, sa) {
        if (rg.center === "sun") {
          return [sunBase[0] * ca - sunBase[1] * sa, sunBase[0] * sa + sunBase[1] * ca];
        }
        if (rg.center && rg.center.length === 2) return rg.center;
        return null;
      };
      var startJump = function (rg) {
        var ca = Math.cos(galaxyAngle), sa = Math.sin(galaxyAngle);
        var c = resolveCenter(rg, ca, sa);
        // Explicit-centre region -> manual focus (autoFocus off); no centre -> auto "fall home".
        autoFocus = !c;
        jump = {
          fromS: slider, toS: clamp01(logZoom.scaleToSlider(num(rg.scale, scaleLY()), LO, HI)),
          fromPX: panX, toPX: c ? -c[0] : panX,   // pan so the target centers (project(c)=center)
          fromPY: panY, toPY: c ? -c[1] : panY,
          p: 0, dur: 1.1
        };
      };
      (spec.regions || []).forEach(function (rg) {
        var btn = doc.createElement("button");
        btn.type = "button"; btn.className = "lf-btn lf-region";
        btn.textContent = rg.name;
        btn.addEventListener("click", function () { startJump(rg); });
        controls.appendChild(btn);
      });

      // Reset: restore the PUBLISHED start view (zoom + play state), re-consulting reduced-motion.
      var resetBtn = doc.createElement("button");
      resetBtn.type = "button"; resetBtn.className = "lf-btn";
      resetBtn.textContent = "Reset";
      resetBtn.addEventListener("click", function () {
        jump = null; slider = startSlider; syncZoom(); viewDirty = true;
        playing = (tm.playing !== false) && !DossierFigures.prefersReducedMotion();
        playBtn.textContent = playing ? "❚❚ Pause" : "▶ Play";
      });
      controls.appendChild(resetBtn);

      readout = doc.createElement("span"); readout.className = "lf-readout";
      controls.appendChild(readout);
    }
    function syncZoom() { if (zoomInput) zoomInput.value = String(1 - slider); }   // presentation flip (see input wiring)

    // --- interaction: scroll-to-zoom + drag-to-pan ----------------------
    svg.addEventListener("wheel", function (ev) {
      ev.preventDefault(); jump = null;
      slider = clamp01(slider + (ev.deltaY < 0 ? -0.04 : 0.04));   // scroll-up = zoom IN (agrees with the flipped slider)
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
    if (controls) container.appendChild(controls);

    // --- animation loop --------------------------------------------------
    // RIGID slow spin (one galaxyAngle applied to all layers in projection),
    // scale-coupled via scaleAwareTime so the spin reads at every zoom. Star
    // positions re-cull on viewDirty (interaction) and on a throttle while playing
    // (30 Hz re-cull — measured 2.5ms/batch at default density, the heaviest module;
    // the other per-node modules run at frame rate, keeping per-frame DOM writes bounded).
    var SPIN = 0.018, ROT_MS = 33;   // recompute cadence: 30Hz — galaxy's recompute is the heaviest (~2.5ms writes over ~6k nodes + a ~9000-star cull), so it stays at 30Hz while the lighter modules run every frame (0.11.1)
    var perf = (root.performance && root.performance.now) ? root.performance : Date;
    var last = perf.now(), lastRecomp = 0;
    var lfVisible = true, lfRunning = false;   // visibility gate: off-screen -> stop the rAF loop (real CPU savings)
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
      if (readout) readout.textContent = "scale " + scaleTxt + " · stars " + drawnStars + "/" + worldStars.length +
        " (cap " + MAX_STAR_NODES + ") · spin " + spin.toFixed(2);

      if (lfVisible) root.requestAnimationFrame(frame); else lfRunning = false;   // stop rescheduling when off-screen
    }
    // Resume from the FROZEN angle (no jump): reset the clock so dt is one frame, not the paused span.
    function lfResume() { if (!lfRunning) { lfRunning = true; last = perf.now(); root.requestAnimationFrame(frame); } }
    lfRunning = true; root.requestAnimationFrame(frame);
    // Visibility gate (child-side IntersectionObserver fires on parent-scroll, even inside an iframe).
    // Node-safe: renderX is browser-only; absent IO -> figure just always animates.
    if (root.IntersectionObserver) {
      new root.IntersectionObserver(function (es) { lfVisible = es[0].isIntersecting; if (lfVisible) lfResume(); }, { root: null, threshold: 0 }).observe(svg);
    }

    var handle = {
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
    container.__lfHandle = handle;
    return handle;
  }

  DossierFigures.renderGalaxy = renderGalaxy;
  DossierFigures.renderGalaxyPosterSVG = renderGalaxyPosterSVG;   // back-compat (direct callers)
  DossierFigures.registerPoster("galaxy", renderGalaxyPosterSVG); // registry (the sealer dispatches by spec.type)
  DossierFigures.registerRenderer("galaxy", renderGalaxy);        // live-renderer registry (the lightbox dispatches by spec.type)
})(typeof window !== "undefined" ? window : null);
