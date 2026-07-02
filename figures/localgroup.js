/*
 * localgroup.js — top-down Local Group render module (the galaxy -> Local Group
 * regime) for Open Dossier living figures.
 *
 * WHAT THIS IS
 *   The regime ONE step out from galaxy.js: where the galaxy was a statistical
 *   star field, the Local Group is CATALOG-PRIMARY — a handful of REAL named
 *   galaxies at their TRUE distances from the Milky Way — plus a SEEDED swarm of
 *   the anonymous ~70 dwarf satellites. Vendored, zero-dependency, reader-side.
 *   Loaded after figures.js; extends window.DossierFigures with one entry point:
 *   renderLocalGroup(container, spec).
 *
 * THE COMPOSITION LAW (same as galaxy.js — compose, never re-roll)
 *     - the dwarf swarm   -> DossierFigures.seededScatter(seed, count, fn)
 *     - the ~Mly zoom      -> DossierFigures.logZoom.sliderToScale / scaleToSlider
 *     - scale-aware drift  -> DossierFigures.scaleAwareTime(baseSpeed, scale)
 *     - soft motion (jumps)-> DossierFigures.ease(t)
 *     - SVG nodes          -> DossierFigures.el(tag, attrs)
 *   No PRNG, no log-zoom, no scatter re-implemented here — only geometry (cos/sin/
 *   sqrt on positions) and the catalog/swarm placement. Same discipline as orrery
 *   and galaxy.
 *
 * THE HONEST SPLIT (real catalog vs representative swarm)
 *   REAL CATALOG  — the major named members (Andromeda, Triangulum, the Magellanic
 *     Clouds, M32, NGC 205, NGC 6822, IC 10) at their TRUE distances from the Milky
 *     Way. Every label is true: real name + real distance. The 2D azimuthal layout
 *     (the `dir` angles) is SCHEMATIC for legibility — distances are real, the
 *     top-down arrangement is a diagram, not a sky map. Andromeda is rendered as
 *     the OTHER dominant spiral so the "two big galaxies" reads.
 *   SEEDED SWARM  — the anonymous ~70 dwarf satellites as seededScatter output:
 *     generated from a seed, labelled honestly as "representative", NEVER as
 *     specific named galaxies.
 *
 * "YOU ARE HERE" — the Milky Way, off-centre in the Group
 *   The Local Group barycentre is the origin; the Milky Way sits off-centre (like
 *   the Sun in its spur at galaxy scale), marked by a constant-size overlay dot +
 *   label. focus:"milkyway" falls the view from the barycentre toward the Milky Way
 *   as you zoom IN (mirroring galaxy.js's focus:"sun"), and releases it as you zoom
 *   OUT — the honest inversion "the Milky Way is everything" -> "one of ~80 galaxies,
 *   paired with Andromeda".
 *
 * SUSTAINABILITY LAWS — zero deps, pure vanilla, vendored; never run by CI.
 */
(function (root) {
  "use strict";

  var NS = root && root.DossierFigures;
  if (!NS) {
    if (root && root.console) {
      root.console.error("[localgroup] figures.js runtime not found — load figures.js before localgroup.js");
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
  var LY_PER_MLY = 1e6;            // 1 Mly = 1,000,000 ly — a UNIT label, not a primitive
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function num(v, d) { return (typeof v === "number" && isFinite(v)) ? v : d; }

  function fail(container, msg) {
    if (root && root.console) root.console.error("[localgroup] " + msg);
    if (container && container.appendChild) {
      var p = root.document.createElement("p");
      p.className = "lf-fallback";
      p.textContent = "Figure unavailable: " + msg;
      container.appendChild(p);
    }
    return null;
  }

  // Canvas constants — PIXEL-IDENTICAL to orrery/galaxy so the layers stack and
  // crossfade in the cosmic seam (slab 2b). Do not change.
  var GW = 800, GH = 480, GRAD = Math.min(800, 480) * 0.46, GPAD = 36;
  var SWARM_MAX = 400;   // cull bound for the dwarf-swarm node pool

  // REAL Local Group catalog — distances from the Milky Way, in Mly (well-established
  // values). The `dir` angles are a SCHEMATIC top-down layout for legibility; the
  // NAMES and DISTANCES are real. Overridable via spec.members. M32/NGC 205 are
  // Andromeda's own satellites (placed near it); LMC/SMC near each other (the
  // Magellanic direction).
  var DEFAULT_MEMBERS = [
    { name: "M31 Andromeda",   mly: 2.54,  dir: 6,   kind: "spiral" },
    { name: "M33 Triangulum",  mly: 2.73,  dir: 34,  kind: "spiral" },
    { name: "LMC",             mly: 0.163, dir: 206, kind: "dwarf" },
    { name: "SMC",             mly: 0.206, dir: 224, kind: "dwarf" },
    { name: "M32",             mly: 2.49,  dir: 11,  kind: "dwarf" },
    { name: "NGC 205",         mly: 2.69,  dir: 1,   kind: "dwarf" },
    { name: "NGC 6822",        mly: 1.60,  dir: 120, kind: "dwarf" },
    { name: "IC 10",           mly: 2.20,  dir: 20,  kind: "dwarf" }
  ];

  // ===== SHARED GEOMETRY ====================================================
  // The dwarf swarm: the anonymous ~70, GENERATED from a seed (representative, NOT
  // named). seededScatter is the runtime primitive; the disk placement is geometry.
  function computeSwarm(spec) {
    var sw = spec.swarm || {};
    var seed = sw.seed | 0;
    var count = (sw.count != null ? sw.count : 70) | 0;
    var radLy = num(sw.radiusMly, 1.6) * LY_PER_MLY;
    return seededScatter(seed, count, function (rng) {
      var R = radLy * Math.sqrt(rng());      // uniform-area disk (sqrt = geometry, not a primitive)
      var th = rng() * TAU;
      var b = 0.18 + 0.34 * rng();           // dim
      return [R * Math.cos(th), R * Math.sin(th), b];
    });
  }

  // The PURE per-scale cull (identical contract to galaxy.js): rotate (ca,sa),
  // project, drop off-screen (GPAD), cap at `cap` (0 = uncapped), in generation
  // order. Returns the drawn points [[sx,sy,brightness], …].
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
  // renderLocalGroup(container, spec)
  //   container : <figure class="living-figure"> (or any host node)
  //   spec      : JSON (object or string). If omitted, read from data-figure,
  //               which is LEFT IN PLACE (the source of truth).
  // -------------------------------------------------------------------------
  function renderLocalGroup(container, spec) {
    if (!container) return fail(null, "no container");
    var doc = (root && root.document) || container.ownerDocument;

    if (spec == null && container.getAttribute) spec = container.getAttribute("data-figure");
    if (typeof spec === "string") {
      try { spec = JSON.parse(spec); }
      catch (e) { return fail(container, "data-figure is not valid JSON"); }
    }
    if (!spec) return fail(container, "no spec");

    // A build-time sealed poster (data-poster) may already sit in the container as
    // the JS-off floor. Remove it before rendering live so a JS-on reader ends with
    // exactly ONE (live) <svg>. (Same additive dedup as orrery/galaxy; a no-op when
    // no poster is present — this standalone demo is live-only anyway.)
    if (container.querySelector) {
      var baked = container.querySelector("[data-poster]");
      if (baked && baked.parentNode) baked.parentNode.removeChild(baked);
    }

    var W = 800, H = 480, cx = W / 2, cy = H / 2, RAD = Math.min(W, H) * 0.46;
    var zoom = spec.zoom || {};
    var LO = Math.max(1e-3, num(zoom.lo, 40000));          // ly half-window (strictly positive)
    var HI = Math.max(LO * 1.0001, num(zoom.hi, 8e6));     // out to several Mly
    var tm = spec.time || {};
    var baseSpeed = num(tm.baseSpeed, 0.02);               // gentle — the Group barely turns on human timescales
    var playing = (tm.playing !== false) && !DossierFigures.prefersReducedMotion();

    var slider = clamp01(logZoom.scaleToSlider(num(zoom.start, HI * 0.45), LO, HI));  // RUNTIME inverse
    var startSlider = slider;   // the PUBLISHED start view (what the sealed poster freezes) — Reset restores it
    var panX = 0, panY = 0, lgAngle = 0, viewDirty = true, jump = null;
    var drawnSwarm = 0;

    function scaleLY() { return logZoom.sliderToScale(slider, LO, HI); }  // RUNTIME: slider -> ly window
    function k() { return RAD / scaleLY(); }                             // px per light-year

    // --- SVG scaffold ----------------------------------------------------
    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, width: "100%", "class": "lf-svg",
      role: "img", "aria-label": spec.title || "The Local Group" });
    var defs = el("defs", {});
    var glow = el("radialGradient", { id: "lf-lg-glow", cx: "50%", cy: "50%", r: "50%" });
    glow.appendChild(el("stop", { offset: "0%", "stop-color": "#bcd0ff", "stop-opacity": "0.5" }));
    glow.appendChild(el("stop", { offset: "100%", "stop-color": "#bcd0ff", "stop-opacity": "0" }));
    defs.appendChild(glow);
    svg.appendChild(defs);

    var gSwarm   = el("g", { "class": "lf-swarm" });        // anonymous dwarfs (background)
    var gGlow    = el("g", { "class": "lf-spiralglow" });   // soft glows behind the two big spirals + MW
    var gMembers = el("g", { "class": "lf-members" });      // named catalog galaxies
    var gMark    = el("g", { "class": "lf-youarehere" });   // the Milky Way marker
    svg.appendChild(gSwarm);
    svg.appendChild(gGlow);
    svg.appendChild(gMembers);
    svg.appendChild(gMark);

    // --- GENERATE the swarm via the shared compute + a reusable node pool ---
    var worldSwarm = computeSwarm(spec);
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
    var swarmColor = (spec.swarm && spec.swarm.color) || "#8893ad";
    var swarmNodes = makeNodes(gSwarm, Math.min(worldSwarm.length, SWARM_MAX), swarmColor, 0.7);

    // --- the Milky Way anchor (off-centre, mirrors the Sun's spur) ---------
    var mw = spec.milkyway || { mly: 1.27, dir: 180, label: "Milky Way — you are here" };
    var mwR = num(mw.mly, 1.27) * LY_PER_MLY, mwTh = num(mw.dir, 180) * Math.PI / 180;
    var mwBase = [mwR * Math.cos(mwTh), mwR * Math.sin(mwTh)];

    // --- the REAL catalog: named members at TRUE distances FROM the Milky Way ---
    var catalog = (spec.members && spec.members.length) ? spec.members : DEFAULT_MEMBERS;
    var members = catalog.map(function (m) {
      var d = num(m.mly, 0) * LY_PER_MLY, th = num(m.dir, 0) * Math.PI / 180;
      var base = [mwBase[0] + d * Math.cos(th), mwBase[1] + d * Math.sin(th)];  // radial FROM the MW
      var spiral = m.kind === "spiral";
      var g = el("g", {});
      var dot = el("circle", { r: spiral ? 4.5 : 2.4, fill: spiral ? "#cdd8ff" : "#9aa7c0", "fill-opacity": 0.95 });
      var lbl = el("text", { "class": "lf-label lf-axis", fill: "#bcd0ff",
        dx: spiral ? 9 : 6, dy: 3.5 });
      lbl.appendChild(doc.createTextNode((m.name || "galaxy") + " · " + num(m.mly, 0) + " Mly"));
      g.appendChild(dot); g.appendChild(lbl);
      gMembers.appendChild(g);
      var gl = null;
      if (spiral) { gl = el("circle", { r: 22, fill: "url(#lf-lg-glow)" }); gGlow.appendChild(gl); }  // the two big spirals glow
      return { base: base, dot: dot, lbl: lbl, glow: gl, spiral: spiral };
    });

    // --- "you are here": the Milky Way, constant-size marked dot ----------
    var markGlow = el("circle", { r: 22, fill: "url(#lf-lg-glow)" }); gGlow.appendChild(markGlow);
    var markRing = el("circle", { r: 9, fill: "none", stroke: "#ff7a59", "stroke-width": 1.4, "stroke-opacity": 0.9 });
    var markDot  = el("circle", { r: 3, fill: "#ffd2c4" });
    var markLbl  = el("text", { "class": "lf-label lf-callout", fill: "#ffb9a6", dx: 13, dy: 4 });
    markLbl.appendChild(doc.createTextNode(mw.label || "Milky Way — you are here"));
    gMark.appendChild(markRing); gMark.appendChild(markDot); gMark.appendChild(markLbl);

    // --- default zoom FOCUS = the Milky Way (mirrors galaxy's focus:"sun"). The
    //     bare zoom gesture falls toward HOME: the view centre interpolates from the
    //     Group barycentre (origin) at the opening scale to the Milky Way as you zoom
    //     in. Manual drag or an explicit-centre region hands control back (autoFocus
    //     off). focusMode from zoom.focus ("milkyway" | "center" | [x,y]); defaults
    //     to "milkyway".
    var focusMode = (zoom.focus !== undefined) ? zoom.focus : "milkyway";
    var autoFocus = (focusMode !== "center");
    var sStart = slider;
    var focusDoneScale = num(zoom.focusScale, mwR * 0.5);   // scale by which we are fully on the MW
    var sFocusDone = clamp01(logZoom.scaleToSlider(Math.max(LO, focusDoneScale), LO, HI));

    function focusPoint() {                                 // current (rotated) target, world ly
      if (focusMode === "milkyway") {
        var ca = Math.cos(lgAngle), sa = Math.sin(lgAngle);
        return [mwBase[0] * ca - mwBase[1] * sa, mwBase[0] * sa + mwBase[1] * ca];
      }
      if (focusMode && focusMode.length === 2) return [num(focusMode[0], 0), num(focusMode[1], 0)];
      return [0, 0];
    }
    function applyAutoFocus() {                             // pan falls origin -> focus as you zoom in
      if (!autoFocus) return;
      var span = sStart - sFocusDone;
      var frac = span > 1e-6 ? clamp01((sStart - slider) / span) : 0;
      var f = focusPoint();
      panX = -f[0] * frac; panY = -f[1] * frac;
    }

    // --- the swarm CULL: SHARED math (cullLayer) -> set node attrs ---------
    function projectLayer(worldArr, nodes, cap, ca, sa, kk) {
      var pts = cullLayer(worldArr, cap, ca, sa, kk, cx, cy, panX, panY);
      var j = 0;
      for (; j < pts.length; j++) {
        var n = nodes[j], p = pts[j];
        n.setAttribute("cx", p[0].toFixed(1)); n.setAttribute("cy", p[1].toFixed(1));
        if (n.__b !== p[2]) { n.setAttribute("r", (0.6 + p[2] * 1.4).toFixed(2)); n.__b = p[2]; }
        if (n.__hidden) { n.style.display = ""; n.__hidden = false; }
      }
      for (; j < nodes.length; j++) { var m = nodes[j]; if (!m.__hidden) { m.style.display = "none"; m.__hidden = true; } }
      return pts.length;
    }

    // named members: few (~8), so reposition each frame + show/hide off-screen.
    function positionMember(m, ca, sa, kk) {
      var wx = m.base[0] * ca - m.base[1] * sa, wy = m.base[0] * sa + m.base[1] * ca;
      var sx = cx + (wx + panX) * kk, sy = cy - (wy + panY) * kk;
      var on = sx >= -GPAD && sx <= GW + GPAD && sy >= -GPAD && sy <= GH + GPAD;
      var disp = on ? "" : "none";
      m.dot.style.display = disp; m.lbl.style.display = disp;
      if (m.glow) m.glow.style.display = disp;
      if (on) {
        m.dot.setAttribute("cx", sx.toFixed(1)); m.dot.setAttribute("cy", sy.toFixed(1));
        m.lbl.setAttribute("x", sx.toFixed(1)); m.lbl.setAttribute("y", sy.toFixed(1));
        if (m.glow) { m.glow.setAttribute("cx", sx.toFixed(1)); m.glow.setAttribute("cy", sy.toFixed(1)); }
      }
    }

    function updateMarker(ca, sa, kk) {
      var wx = mwBase[0] * ca - mwBase[1] * sa, wy = mwBase[0] * sa + mwBase[1] * ca;
      var sx = cx + (wx + panX) * kk, sy = cy - (wy + panY) * kk;
      markRing.setAttribute("cx", sx); markRing.setAttribute("cy", sy);
      markDot.setAttribute("cx", sx); markDot.setAttribute("cy", sy);
      markLbl.setAttribute("x", sx); markLbl.setAttribute("y", sy);
      markGlow.setAttribute("cx", sx); markGlow.setAttribute("cy", sy);
    }

    function recompute() {
      applyAutoFocus();
      var ca = Math.cos(lgAngle), sa = Math.sin(lgAngle), kk = k();
      drawnSwarm = projectLayer(worldSwarm, swarmNodes, SWARM_MAX, ca, sa, kk);
      for (var i = 0; i < members.length; i++) positionMember(members[i], ca, sa, kk);
      updateMarker(ca, sa, kk);
    }

    // --- controls (HTML) — skipped when spec.controls === false so a composer
    //     (cosmiczoom.js, slab 2b) can drive this instance from one master bar.
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

      var resolveCenter = function (rg, ca, sa) {
        if (rg.center === "milkyway") {
          return [mwBase[0] * ca - mwBase[1] * sa, mwBase[0] * sa + mwBase[1] * ca];
        }
        if (rg.center && rg.center.length === 2) return rg.center;
        return null;
      };
      var startJump = function (rg) {
        var ca = Math.cos(lgAngle), sa = Math.sin(lgAngle);
        var c = resolveCenter(rg, ca, sa);
        autoFocus = !c;   // explicit-centre -> manual focus; no centre -> auto "fall home"
        jump = {
          fromS: slider, toS: clamp01(logZoom.scaleToSlider(num(rg.scale, scaleLY()), LO, HI)),
          fromPX: panX, toPX: c ? -c[0] : panX,
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
      autoFocus = false;   // manual pan -> the reader takes the wheel
      var kk = k();
      panX += (ev.clientX - lastX) / kk; panY -= (ev.clientY - lastY) / kk;
      lastX = ev.clientX; lastY = ev.clientY; viewDirty = true;
    });

    // --- mount (data-figure left untouched) ------------------------------
    container.appendChild(svg);
    if (controls) container.appendChild(controls);

    // --- animation loop --------------------------------------------------
    // A very slow RIGID drift (the Group is bound, but barely turns on human
    // timescales) — scale-coupled via scaleAwareTime so it reads at every zoom.
    // Re-cull on viewDirty (interaction) and on a slow throttle while playing.
    var SPIN = 0.012, ROT_MS = 16;   // recompute cadence: every frame (60Hz) — swarm recompute is ~0.2ms/batch (tiny); 66ms caused visible 15Hz stepping (0.11.1)
    var perf = (root.performance && root.performance.now) ? root.performance : Date;
    var last = perf.now(), lastRecomp = 0;
    var lfVisible = true, lfRunning = false;   // visibility gate: off-screen -> stop the rAF loop (real CPU savings)
    function frame(now) {
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      var drift = scaleAwareTime(baseSpeed, scaleLY());     // RUNTIME (scale-coupled)
      if (playing && !jump) lgAngle += drift * dt * SPIN;

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
      var scaleTxt = s >= LY_PER_MLY ? (s / LY_PER_MLY).toFixed(2) + " Mly"
        : s >= 1000 ? Math.round(s).toLocaleString() + " ly"
        : s.toFixed(1) + " ly";
      if (readout) readout.textContent = "scale " + scaleTxt + " · " + members.length +
        " named members · ~" + worldSwarm.length + " dwarf swarm (representative)";

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
        return { slider: slider, scaleLY: scaleLY(), angle: lgAngle, playing: playing,
          drawnSwarm: drawnSwarm, swarmTotal: worldSwarm.length, namedMembers: members.length,
          autoFocus: autoFocus, panX: panX, panY: panY,
          viewCenterLY: [-panX, -panY], focusTarget: focusPoint() };
      },
      setSlider: function (v) { jump = null; slider = clamp01(v); syncZoom(); viewDirty = true; }
    };
    container.__lfHandle = handle;
    return handle;
  }

  DossierFigures.renderLocalGroup = renderLocalGroup;
  DossierFigures.registerRenderer("localgroup", renderLocalGroup);   // live-renderer registry (the lightbox dispatches by spec.type)
})(typeof window !== "undefined" ? window : null);
