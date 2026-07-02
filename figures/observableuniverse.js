/*
 * observableuniverse.js — the TERMINAL render module (cosmic web -> the observable
 * horizon) for Open Dossier living figures. THE ENDING.
 *
 * WHAT THIS IS — and why it is different from every regime before it
 *   Every regime inward handed off to a BIGGER structure (a planet -> the solar
 *   system -> the galaxy -> the Local Group -> the cosmic web). This one does NOT,
 *   because there is nothing bigger: beyond ~300 Mly the universe is statistically
 *   HOMOGENEOUS and ISOTROPIC (the cosmological principle). The cosmic web is the
 *   largest structure there is. So the terminal makes two honest statements and
 *   then STOPS:
 *     1) HOMOGENEITY — a uniform, isotropic field: same density everywhere, no
 *        clustering, no filaments, no preferred direction, no centre. Self-similar
 *        under zoom-out (more of the same) — the visual proof there is nothing
 *        bigger. Structure would be a lie here; uniformity is the truth.
 *     2) THE OBSERVABLE HORIZON — a ring at ~46.5 Gly (the comoving particle
 *        horizon / last-scattering surface, the CMB). The zoom STOPS here. This is
 *        the limit of what we can SEE, NOT the edge of what EXISTS: the universe
 *        extends beyond, as far as we know — we just cannot observe it.
 *
 * THE HONEST LABEL (the most important words in the whole figure)
 *   The horizon is labelled "observable horizon · last-scattering surface (~46.5
 *   Gly)" with the note "we cannot see beyond this — the limit of the observable,
 *   not the edge of what exists. The universe extends beyond." It is NEVER "the
 *   edge of the universe". Every-label-true applied to cosmology: the OBSERVABLE
 *   part has an edge; the universe (as far as we know) does not.
 *
 * NO AUTO-FOCUS (the Copernican honesty)
 *   "You are here" is marked at centre — because the observable universe is centred
 *   on the OBSERVER (by light-travel-time), not because we are special. There is no
 *   focus pulling toward a structure (there is none), and the view is the same in
 *   every direction. Every observer has their own horizon centred on them.
 *
 * NO FABRICATED NESTING — no supercluster-of-superclusters, no multiverse, no
 *   invented bigness. Structure genuinely ends at the cosmic web. Same discipline as
 *   the Sun staying a constant-size dot with no invented sub-structure.
 *
 * THE COMPOSITION LAW (same as the regimes inward — compose, never re-roll)
 *     - the uniform field -> DossierFigures.seededScatter(seed, count, fn)
 *     - the Gly zoom       -> DossierFigures.logZoom.sliderToScale / scaleToSlider
 *     - scale-aware drift  -> DossierFigures.scaleAwareTime(baseSpeed, scale)
 *     - soft motion        -> DossierFigures.ease(t)
 *     - SVG nodes          -> DossierFigures.el(tag, attrs)
 *   No PRNG / log-zoom / scatter re-implemented — only geometry (cos/sin/sqrt).
 *
 * SUSTAINABILITY LAWS — zero deps, pure vanilla, vendored; never run by CI.
 */
(function (root) {
  "use strict";

  var NS = root && root.DossierFigures;
  if (!NS) {
    if (root && root.console) {
      root.console.error("[observableuniverse] figures.js runtime not found — load figures.js first");
    }
    return;
  }

  // COMPOSITION: every primitive below IS the runtime's — never re-rolled.
  var DossierFigures = NS;
  var seededScatter  = DossierFigures.seededScatter;
  var logZoom        = DossierFigures.logZoom;
  var scaleAwareTime = DossierFigures.scaleAwareTime;
  var ease           = DossierFigures.ease;
  var el             = DossierFigures.el;

  var TAU = Math.PI * 2;
  var LY_PER_GLY = 1e9;            // 1 Gly = 1,000,000,000 ly — a UNIT label, not a primitive
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function num(v, d) { return (typeof v === "number" && isFinite(v)) ? v : d; }

  function fail(container, msg) {
    if (root && root.console) root.console.error("[observableuniverse] " + msg);
    if (container && container.appendChild) {
      var p = root.document.createElement("p");
      p.className = "lf-fallback";
      p.textContent = "Figure unavailable: " + msg;
      container.appendChild(p);
    }
    return null;
  }

  // Canvas constants — PIXEL-IDENTICAL to every other regime so the terminal stacks
  // and crossfades in the cosmic seam (slab 4b). Do not change.
  var GW = 800, GH = 480, GRAD = Math.min(800, 480) * 0.46, GPAD = 36;
  var FIELD_MAX = 3200;   // cull bound for the uniform-field node pool

  // The exact label strings (the most carefully-worded text in the figure).
  // Overridable via spec.horizon.*, but these defaults are the honest baseline.
  var DEFAULT_HORIZON_LABEL = "observable horizon · last-scattering surface (~46.5 Gly)";
  var DEFAULT_HORIZON_NOTE  = "we cannot see beyond this — the limit of the observable, not the edge of what exists; the universe extends beyond";
  var DEFAULT_MARKER_LABEL  = "you are here · the view is the same in every direction";

  // ===== SHARED GEOMETRY ====================================================
  // The UNIFORM ISOTROPIC field: galaxies scattered with EVEN density across a disk
  // out to the horizon — NO nodes, NO filaments, NO clustering, NO preferred
  // direction. The cosmological principle made visual. seededScatter is the runtime
  // primitive; the uniform-area placement (sqrt) is geometry.
  function computeField(spec, horizonLy) {
    var fd = spec.field || {};
    var seed = fd.seed | 0;
    var count = (fd.count != null ? fd.count : 2600) | 0;
    var radLy = num(fd.radiusLy, horizonLy);   // fill out to the horizon, evenly
    return seededScatter(seed, count, function (rng) {
      var R = radLy * Math.sqrt(rng());        // UNIFORM-area disk -> even density, no centre, no clumps
      var th = rng() * TAU;
      var b = 0.12 + 0.22 * rng();             // faint, even — no bright knots
      return [R * Math.cos(th), R * Math.sin(th), b];
    });
  }

  // The PURE per-scale cull (identical contract to the other regimes): rotate (ca,sa),
  // project, drop off-screen (GPAD), cap at `cap` (0 = uncapped), in generation order.
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

  // -------------------------------------------------------------------------
  // renderObservableUniverse(container, spec)
  //   container : <figure class="living-figure"> (or any host node)
  //   spec      : JSON (object or string). If omitted, read from data-figure,
  //               which is LEFT IN PLACE (the source of truth).
  // -------------------------------------------------------------------------
  function renderObservableUniverse(container, spec) {
    if (!container) return fail(null, "no container");
    var doc = (root && root.document) || container.ownerDocument;

    if (spec == null && container.getAttribute) spec = container.getAttribute("data-figure");
    if (typeof spec === "string") {
      try { spec = JSON.parse(spec); }
      catch (e) { return fail(container, "data-figure is not valid JSON"); }
    }
    if (!spec) return fail(container, "no spec");

    // Remove any build-time sealed poster before rendering live (dedup; a no-op
    // here — this regime is live-only and the cosmic floor stays the Milky Way).
    if (container.querySelector) {
      var baked = container.querySelector("[data-poster]");
      if (baked && baked.parentNode) baked.parentNode.removeChild(baked);
    }

    var W = 800, H = 480, cx = W / 2, cy = H / 2, RAD = Math.min(W, H) * 0.46;
    var hz = spec.horizon || {};
    var horizonGly = num(hz.gly, 46.5);                 // comoving particle horizon (~46.5 Gly)
    var horizonLy = horizonGly * LY_PER_GLY;
    var zoom = spec.zoom || {};
    var LO = Math.max(1e-3, num(zoom.lo, 1e8));         // ly half-window
    var HI = Math.max(LO * 1.0001, num(zoom.hi, horizonLy));  // the HORIZON is the max zoom-out (hard stop)
    var tm = spec.time || {};
    var baseSpeed = num(tm.baseSpeed, 0.01);            // the universe is not spinning — keep it near-still
    var playing = (tm.playing !== false) && !DossierFigures.prefersReducedMotion();

    var slider = clamp01(logZoom.scaleToSlider(num(zoom.start, HI * 0.45), LO, HI));
    var startSlider = slider;   // the PUBLISHED start view (what the sealed poster freezes) — Reset restores it
    var panX = 0, panY = 0, uAngle = 0, viewDirty = true, jump = null;
    var drawnField = 0;

    function scaleLY() { return logZoom.sliderToScale(slider, LO, HI); }  // RUNTIME: slider -> ly window
    function k() { return RAD / scaleLY(); }                             // px per light-year

    // --- SVG scaffold ----------------------------------------------------
    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, width: "100%", "class": "lf-svg",
      role: "img", "aria-label": spec.title || "The observable universe" });
    var defs = el("defs", {});
    // a very subtle warm "CMB" haze at the horizon ring (the last-scattering surface)
    var cmb = el("radialGradient", { id: "lf-cmb", cx: "50%", cy: "50%", r: "50%" });
    cmb.appendChild(el("stop", { offset: "0%", "stop-color": "#c98a5a", "stop-opacity": "0" }));
    cmb.appendChild(el("stop", { offset: "88%", "stop-color": "#c98a5a", "stop-opacity": "0" }));
    cmb.appendChild(el("stop", { offset: "100%", "stop-color": "#d2966a", "stop-opacity": "0.22" }));
    defs.appendChild(cmb);
    svg.appendChild(defs);

    var gField   = el("g", { "class": "lf-field" });        // the uniform isotropic galaxies
    var gHorizon = el("g", { "class": "lf-horizon" });      // the CMB / observable-horizon ring + label
    var gMark    = el("g", { "class": "lf-youarehere" });   // "you are here" (centred, no focus pull)
    var gNote    = el("g", { "class": "lf-honestnote" });   // the honest "extends beyond" note (always shown)
    svg.appendChild(gField);
    svg.appendChild(gHorizon);
    svg.appendChild(gMark);
    svg.appendChild(gNote);

    // --- GENERATE the uniform field via the shared compute + a node pool ---
    var worldField = computeField(spec, horizonLy);
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
    var fieldColor = (spec.field && spec.field.color) || "#aab4cf";
    var fieldNodes = makeNodes(gField, Math.min(worldField.length, FIELD_MAX), fieldColor, 0.62);

    // --- the observable-horizon ring (the CMB / last-scattering surface) --
    var cmbHaze = el("circle", { fill: "url(#lf-cmb)" });
    var horizonRing = el("circle", { fill: "none", stroke: "#d2966a", "stroke-width": 1.2, "stroke-opacity": 0.55 });
    var horizonLbl = el("text", { "class": "lf-label lf-tick", fill: "#e0b896",
      "text-anchor": "middle" });
    horizonLbl.appendChild(doc.createTextNode(hz.label || DEFAULT_HORIZON_LABEL));
    gHorizon.appendChild(cmbHaze); gHorizon.appendChild(horizonRing); gHorizon.appendChild(horizonLbl);

    // --- "you are here" — centred, NO focus pull (isotropy; we are the observer) --
    var markRing = el("circle", { r: 7, fill: "none", stroke: "#ff7a59", "stroke-width": 1.3, "stroke-opacity": 0.9, cx: cx, cy: cy });
    var markDot  = el("circle", { r: 2.6, fill: "#ffd2c4", cx: cx, cy: cy });
    // Split the fused marker on " · ": the identity ("you are here") is the callout; the
    // isotropy note ("the view is the same in every direction") drops to its own tick line
    // below, so the long note no longer rides the callout size and clip the right edge.
    var markerParts = (hz.markerLabel || DEFAULT_MARKER_LABEL).split(" · ");
    var markLbl  = el("text", { "class": "lf-label lf-callout", fill: "#ffb9a6", dx: 11, dy: 3.5, x: cx, y: cy });
    markLbl.appendChild(doc.createTextNode(markerParts[0]));
    gMark.appendChild(markRing); gMark.appendChild(markDot); gMark.appendChild(markLbl);
    if (markerParts.length > 1) {
      var markSub = el("text", { "class": "lf-label lf-tick", fill: "#ffb9a6", "fill-opacity": 0.85, dx: 11, dy: 19, x: cx, y: cy });
      markSub.appendChild(doc.createTextNode(markerParts.slice(1).join(" · ")));
      gMark.appendChild(markSub);
    }

    // --- the honest note (always visible — the thesis of the ending) ------
    var noteTxt = el("text", { "class": "lf-label lf-tick", fill: "#8fa0bf", x: 18, y: H - 18 });
    noteTxt.appendChild(doc.createTextNode(hz.note || DEFAULT_HORIZON_NOTE));
    gNote.appendChild(noteTxt);

    // --- the field CULL: SHARED math (cullLayer) -> set node attrs --------
    function projectLayer(worldArr, nodes, cap, ca, sa, kk) {
      var pts = cullLayer(worldArr, cap, ca, sa, kk, cx, cy, panX, panY);
      var j = 0;
      for (; j < pts.length; j++) {
        var n = nodes[j], p = pts[j];
        n.setAttribute("cx", p[0].toFixed(1)); n.setAttribute("cy", p[1].toFixed(1));
        if (n.__b !== p[2]) { n.setAttribute("r", (0.5 + p[2] * 0.9).toFixed(2)); n.__b = p[2]; }
        if (n.__hidden) { n.style.display = ""; n.__hidden = false; }
      }
      for (; j < nodes.length; j++) { var m = nodes[j]; if (!m.__hidden) { m.style.display = "none"; m.__hidden = true; } }
      return pts.length;
    }

    // The horizon ring sits at the observer-centred radius = horizonLy * k. It comes
    // into frame as you approach the horizon; at max zoom-out (scaleLY -> horizonLy)
    // it rests near the frame edge — the whole observable universe framed, and the
    // hard wall the zoom cannot pass.
    function updateHorizon(kk) {
      var rPx = horizonLy * kk;                 // observer is at screen centre (pan ~ 0)
      var ccx = cx + panX * kk, ccy = cy - panY * kk;
      var show = rPx < RAD * 3.2;               // hide when far off-frame (deep zoom-in)
      gHorizon.style.display = show ? "" : "none";
      if (!show) return;
      cmbHaze.setAttribute("cx", ccx.toFixed(1)); cmbHaze.setAttribute("cy", ccy.toFixed(1)); cmbHaze.setAttribute("r", rPx.toFixed(1));
      horizonRing.setAttribute("cx", ccx.toFixed(1)); horizonRing.setAttribute("cy", ccy.toFixed(1)); horizonRing.setAttribute("r", rPx.toFixed(1));
      // label rides the top of the ring, clamped into view
      var ly = ccy - rPx - 6; if (ly < 12) ly = 12;
      horizonLbl.setAttribute("x", ccx.toFixed(1)); horizonLbl.setAttribute("y", ly.toFixed(1));
    }

    function updateMarker(kk) {
      // the observer is at the origin -> screen centre (pan ~ 0). No focus pull.
      var sx = cx + panX * kk, sy = cy - panY * kk;
      markRing.setAttribute("cx", sx); markRing.setAttribute("cy", sy);
      markDot.setAttribute("cx", sx); markDot.setAttribute("cy", sy);
      markLbl.setAttribute("x", sx); markLbl.setAttribute("y", sy);
    }

    function recompute() {
      var ca = Math.cos(uAngle), sa = Math.sin(uAngle), kk = k();
      drawnField = projectLayer(worldField, fieldNodes, FIELD_MAX, ca, sa, kk);
      updateHorizon(kk);
      updateMarker(kk);
    }

    // --- controls (HTML) — skipped when spec.controls === false so a composer
    //     (cosmiczoom.js, slab 4b) can drive this instance from one master bar.
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

      // NO "center" resolver toward a structure — there is none. Regions are pure
      // zoom targets (scale only); the view stays observer-centred.
      var startJump = function (rg) {
        jump = { fromS: slider, toS: clamp01(logZoom.scaleToSlider(num(rg.scale, scaleLY()), LO, HI)), p: 0, dur: 1.1 };
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

    // --- interaction: scroll-to-zoom + drag-to-pan (exploration; still no auto-focus) --
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
      var kk = k();
      panX += (ev.clientX - lastX) / kk; panY -= (ev.clientY - lastY) / kk;
      lastX = ev.clientX; lastY = ev.clientY; viewDirty = true;
    });

    // --- mount (data-figure left untouched) ------------------------------
    container.appendChild(svg);
    if (controls) container.appendChild(controls);

    // --- animation loop --------------------------------------------------
    // The universe is not spinning; the drift is near-zero (isotropy means there is
    // nothing to track turning). Re-cull on viewDirty + a slow throttle while playing.
    var SPIN = 0.006, ROT_MS = 16;   // recompute cadence: every frame (60Hz) — field recompute is ~1.0ms/batch; 80ms caused visible ~12Hz stepping (0.11.1)
    var perf = (root.performance && root.performance.now) ? root.performance : Date;
    var last = perf.now(), lastRecomp = 0;
    var lfVisible = true, lfRunning = false;   // visibility gate: off-screen -> stop the rAF loop (real CPU savings)
    function frame(now) {
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      var drift = scaleAwareTime(baseSpeed, scaleLY());     // RUNTIME (scale-coupled)
      if (playing && !jump) uAngle += drift * dt * SPIN;

      if (jump) {
        jump.p += dt / jump.dur; var e = ease(clamp01(jump.p)); // RUNTIME: soft motion
        slider = jump.fromS + (jump.toS - jump.fromS) * e;
        syncZoom(); viewDirty = true;
        if (jump.p >= 1) jump = null;
      }
      if (playing && (now - lastRecomp > ROT_MS)) viewDirty = true;
      if (viewDirty) { recompute(); viewDirty = false; lastRecomp = now; }

      var s = scaleLY();
      var atHorizon = slider > 0.999;
      var scaleTxt = atHorizon ? "observable horizon (~" + horizonGly + " Gly)"
        : s >= LY_PER_GLY ? (s / LY_PER_GLY).toFixed(2) + " Gly"
        : (s / 1e6).toFixed(0) + " Mly";
      if (readout) readout.textContent = "scale " + scaleTxt + " · uniform & isotropic · ~" +
        worldField.length + " representative galaxies";

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
        return { slider: slider, scaleLY: scaleLY(), scaleGly: scaleLY() / LY_PER_GLY,
          angle: uAngle, playing: playing,
          drawnField: drawnField, fieldTotal: worldField.length,
          horizonGly: horizonGly, horizonRingPx: horizonLy * k(),
          atHorizon: slider > 0.999, panX: panX, panY: panY,
          markerCentred: (Math.abs(panX) < 1e-9 && Math.abs(panY) < 1e-9),
          horizonLabel: hz.label || DEFAULT_HORIZON_LABEL,
          horizonNote: hz.note || DEFAULT_HORIZON_NOTE,
          markerLabel: hz.markerLabel || DEFAULT_MARKER_LABEL };
      },
      setSlider: function (v) { jump = null; slider = clamp01(v); syncZoom(); viewDirty = true; }
    };
    container.__lfHandle = handle;
    return handle;
  }

  DossierFigures.renderObservableUniverse = renderObservableUniverse;
  DossierFigures.registerRenderer("observableuniverse", renderObservableUniverse);   // live-renderer registry (the lightbox dispatches by spec.type)
})(typeof window !== "undefined" ? window : null);
