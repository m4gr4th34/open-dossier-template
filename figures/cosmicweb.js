/*
 * cosmicweb.js — top-down Cosmic Web render module (the Local Group -> Cosmic Web
 * regime) for Open Dossier living figures.
 *
 * WHAT THIS IS
 *   The regime ONE step out from localgroup.js: where the Local Group was a
 *   handful of real galaxies, the Cosmic Web is the large-scale FOAM — galaxies
 *   and clusters strung along FILAMENTS that wrap empty VOIDS, with a few REAL
 *   named clusters as anchors. Vendored, zero-dependency, reader-side. Loaded
 *   after figures.js; extends window.DossierFigures with one entry point:
 *   renderCosmicWeb(container, spec).
 *
 * THE COMPOSITION LAW (same as galaxy.js / localgroup.js — compose, never re-roll)
 *     - the web nodes + foam -> DossierFigures.seededScatter(seed, count, fn)
 *       (the STRUCTURE — filament intersections, strands between them — lives in
 *        the fn; the PRNG is the runtime's. Same generator the spiral/swarm use.)
 *     - the Mly..Gly zoom      -> DossierFigures.logZoom.sliderToScale / scaleToSlider
 *     - scale-aware drift      -> DossierFigures.scaleAwareTime(baseSpeed, scale)
 *     - soft motion (jumps)    -> DossierFigures.ease(t)
 *     - SVG nodes              -> DossierFigures.el(tag, attrs)
 *   No PRNG, no log-zoom, no scatter re-implemented here — only geometry (cos/sin/
 *   sqrt/lerp on positions). seededScatter is used a NEW way (nodes, then galaxies
 *   placed along strands between paired nodes), but it is still the primitive.
 *
 * THE FILAMENT FOAM (structure in the fn)
 *   computeWebNodes  — a seeded set of anonymous cluster centres (filament knots).
 *   computeWebGalaxies — foam galaxies placed ALONG strands between deterministically
 *     paired nodes, interpolated by t with PERPENDICULAR jitter (thin filaments,
 *     not boxes). Galaxies cluster on the strands; the gaps read as voids.
 *   gFilaments — faint <line>s between NEARBY node pairs (within a threshold), the
 *     web's visual signature (its spiral-arms moment) — so the network reads as a
 *     web, not just clumped dots.
 *
 * THE HONEST SPLIT (real catalog vs representative foam)
 *   REAL CATALOG  — the major named clusters/superclusters at TRUE distances from
 *     the Local Group (Virgo, Coma, the Great Attractor, …). Every label is true:
 *     real name + real distance. The 2D bearings are SCHEMATIC for legibility —
 *     distances are real, the top-down arrangement is a diagram, not a sky map.
 *   SEEDED FOAM   — the ~1400 filament galaxies from seededScatter: REPRESENTATIVE,
 *     labelled as such, NEVER claimed as the actual measured distribution.
 *
 * "YOU ARE HERE" — the Local Group, one knot in the foam
 *   The Local Group sits off-centre, marked by a constant-size overlay dot + label.
 *   focus:"localgroup" falls the view from the field centre toward the Local Group
 *   as you zoom IN (mirroring localgroup.js's focus:"milkyway"), and releases it as
 *   you zoom OUT — the honest inversion "the Local Group is everything" -> "one knot
 *   in the cosmic web, near Virgo, inside Laniakea".
 *
 * SUSTAINABILITY LAWS — zero deps, pure vanilla, vendored; never run by CI.
 */
(function (root) {
  "use strict";

  var NS = root && root.DossierFigures;
  if (!NS) {
    if (root && root.console) {
      root.console.error("[cosmicweb] figures.js runtime not found — load figures.js before cosmicweb.js");
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
    if (root && root.console) root.console.error("[cosmicweb] " + msg);
    if (container && container.appendChild) {
      var p = root.document.createElement("p");
      p.className = "lf-fallback";
      p.textContent = "Figure unavailable: " + msg;
      container.appendChild(p);
    }
    return null;
  }

  // Canvas constants — PIXEL-IDENTICAL to orrery/galaxy/localgroup so the layers
  // stack and crossfade in the cosmic seam (slab 3b). Do not change.
  var GW = 800, GH = 480, GRAD = Math.min(800, 480) * 0.46, GPAD = 36;
  var FOAM_MAX = 1800;   // cull bound for the foam-galaxy node pool

  // REAL cluster/supercluster catalog — distances from the Local Group, in Mly
  // (established values). `dir` angles are a SCHEMATIC top-down layout; the NAMES
  // and DISTANCES are real. `region:true` = a structure we are INSIDE / that spans
  // (label as a region, not a point "over there"). Overridable via spec.clusters.
  var DEFAULT_CLUSTERS = [
    { name: "Virgo Cluster",        mly: 54,  dir: 10,  kind: "cluster" },
    { name: "Fornax Cluster",       mly: 62,  dir: 196, kind: "cluster" },
    { name: "Centaurus Cluster",    mly: 155, dir: 230, kind: "cluster" },
    { name: "Great Attractor",      mly: 220, dir: 248, kind: "attractor" },
    { name: "Perseus Cluster",      mly: 240, dir: 70,  kind: "cluster" },
    { name: "Coma Cluster",         mly: 321, dir: 24,  kind: "cluster" },
    { name: "Shapley Supercluster", mly: 650, dir: 256, kind: "supercluster" }
  ];

  // ===== SHARED GEOMETRY ====================================================
  // The filament knots: a seeded set of anonymous cluster centres. seededScatter is
  // the runtime primitive; the disk placement is geometry.
  function computeWebNodes(spec) {
    var nd = spec.nodes || {};
    var seed = nd.seed | 0;
    var count = (nd.count != null ? nd.count : 18) | 0;
    var radLy = num(nd.radiusMly, 520) * LY_PER_MLY;
    return seededScatter(seed, count, function (rng) {
      var R = radLy * Math.sqrt(rng());      // uniform-area disk (sqrt = geometry)
      var th = rng() * TAU;
      var prom = 0.4 + 0.6 * rng();          // node prominence (knot weight)
      return [R * Math.cos(th), R * Math.sin(th), prom];
    });
  }

  // The foam galaxies: placed ALONG strands between deterministically-paired nodes,
  // interpolated by t with PERPENDICULAR jitter -> thin filaments + voids EMERGE.
  // Structure lives in the fn; seededScatter is unchanged.
  function computeWebGalaxies(spec, nodes) {
    var fm = spec.foam || {};
    var seed = fm.seed | 0;
    var count = (fm.count != null ? fm.count : 1400) | 0;
    var spread = num(fm.spreadMly, 9) * LY_PER_MLY;   // filament half-thickness
    var n = nodes.length || 1;
    return seededScatter(seed, count, function (rng, i) {
      var a = nodes[i % n], b = nodes[(i * 7 + 3) % n];     // a deterministic strand
      var ax = a[0], ay = a[1], bx = b[0], by = b[1];
      var t = rng();                                         // position along the strand
      var px = ax + (bx - ax) * t, py = ay + (by - ay) * t;
      var dx = bx - ax, dy = by - ay, len = Math.sqrt(dx * dx + dy * dy) || 1;
      var nx = -dy / len, ny = dx / len;                    // unit perpendicular
      var j = (rng() - 0.5) * 2 * spread;                   // perpendicular jitter (thin filament)
      var bright = 0.14 + 0.30 * rng();
      return [px + nx * j, py + ny * j, bright];
    });
  }

  // Nearby node pairs -> faint filament strands (the web's visual signature).
  // Deterministic: between the seeded nodes, pairs within `threshLy`.
  function computeFilaments(nodes, threshLy) {
    var out = [];
    for (var i = 0; i < nodes.length; i++) {
      for (var j = i + 1; j < nodes.length; j++) {
        var dx = nodes[j][0] - nodes[i][0], dy = nodes[j][1] - nodes[i][1];
        if (Math.sqrt(dx * dx + dy * dy) <= threshLy) out.push([nodes[i], nodes[j]]);
      }
    }
    return out;
  }

  // The PURE per-scale cull (identical contract to galaxy/localgroup): rotate (ca,sa),
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
  // renderCosmicWeb(container, spec)
  //   container : <figure class="living-figure"> (or any host node)
  //   spec      : JSON (object or string). If omitted, read from data-figure,
  //               which is LEFT IN PLACE (the source of truth).
  // -------------------------------------------------------------------------
  function renderCosmicWeb(container, spec) {
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
    // exactly ONE (live) <svg>. (Same additive dedup as galaxy/localgroup; a no-op
    // when no poster is present — this standalone demo is live-only anyway.)
    if (container.querySelector) {
      var baked = container.querySelector("[data-poster]");
      if (baked && baked.parentNode) baked.parentNode.removeChild(baked);
    }

    var W = 800, H = 480, cx = W / 2, cy = H / 2, RAD = Math.min(W, H) * 0.46;
    var zoom = spec.zoom || {};
    var LO = Math.max(1e-3, num(zoom.lo, 1e6));            // ly half-window (strictly positive)
    var HI = Math.max(LO * 1.0001, num(zoom.hi, 1e9));     // out to ~1 Gly
    var tm = spec.time || {};
    var baseSpeed = num(tm.baseSpeed, 0.02);               // the web barely evolves on human timescales
    var playing = (tm.playing !== false) && !DossierFigures.prefersReducedMotion();

    var slider = clamp01(logZoom.scaleToSlider(num(zoom.start, 3e8), LO, HI));  // RUNTIME inverse
    var startSlider = slider;   // the PUBLISHED start view (what the sealed poster freezes) — Reset restores it
    var panX = 0, panY = 0, webAngle = 0, viewDirty = true, jump = null;
    var drawnFoam = 0;

    function scaleLY() { return logZoom.sliderToScale(slider, LO, HI); }  // RUNTIME: slider -> ly window
    function k() { return RAD / scaleLY(); }                             // px per light-year

    // --- SVG scaffold ----------------------------------------------------
    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, width: "100%", "class": "lf-svg",
      role: "img", "aria-label": spec.title || "The Cosmic Web" });
    var defs = el("defs", {});
    var glow = el("radialGradient", { id: "lf-cw-glow", cx: "50%", cy: "50%", r: "50%" });
    glow.appendChild(el("stop", { offset: "0%", "stop-color": "#cdb8ff", "stop-opacity": "0.5" }));
    glow.appendChild(el("stop", { offset: "100%", "stop-color": "#cdb8ff", "stop-opacity": "0" }));
    defs.appendChild(glow);
    svg.appendChild(defs);

    var gFil      = el("g", { "class": "lf-filaments" });   // faint strands (behind)
    var gFoam     = el("g", { "class": "lf-foam" });        // pooled galaxy dots
    var gClusters = el("g", { "class": "lf-clusters" });    // named real catalog
    var gMark     = el("g", { "class": "lf-youarehere" });  // the Local Group marker
    svg.appendChild(gFil);
    svg.appendChild(gFoam);
    svg.appendChild(gClusters);
    svg.appendChild(gMark);

    // --- GENERATE the foam via the shared compute -------------------------
    var worldNodes = computeWebNodes(spec);
    var worldFoam  = computeWebGalaxies(spec, worldNodes);
    var threshLy = num((spec.foam || {}).filamentMly, 360) * LY_PER_MLY;
    var filaments = computeFilaments(worldNodes, threshLy);

    // filament <line>s — one per nearby node pair (repositioned each frame)
    var filColor = (spec.foam && spec.foam.filamentColor) || "#5b6b9e";
    var filLines = filaments.map(function (pair) {
      var ln = el("line", { stroke: filColor, "stroke-width": 0.8, "stroke-opacity": 0.45 });
      gFil.appendChild(ln);
      return { a: pair[0], b: pair[1], ln: ln };
    });

    // foam node pool
    function makeNodes(parent, nn, color, opacity) {
      var arr = new Array(nn), frag = doc.createDocumentFragment();
      for (var i = 0; i < nn; i++) {
        var c = el("circle", { r: 1, fill: color, "fill-opacity": opacity });
        c.style.display = "none"; c.__hidden = true;
        arr[i] = c; frag.appendChild(c);
      }
      parent.appendChild(frag);
      return arr;
    }
    var foamColor = (spec.foam && spec.foam.color) || "#9fb0d8";
    var foamNodes = makeNodes(gFoam, Math.min(worldFoam.length, FOAM_MAX), foamColor, 0.72);

    // --- the Local Group anchor (off-centre, mirrors the MW's spur) -------
    var lg = spec.localgroup || { mly: 90, dir: 30, label: "Local Group — you are here" };
    var lgR = num(lg.mly, 90) * LY_PER_MLY, lgTh = num(lg.dir, 30) * Math.PI / 180;
    var lgBase = [lgR * Math.cos(lgTh), lgR * Math.sin(lgTh)];

    // --- the REAL catalog: named clusters at TRUE distances FROM the Local Group ---
    var catalog = (spec.clusters && spec.clusters.length) ? spec.clusters : DEFAULT_CLUSTERS;
    var clusters = catalog.map(function (c) {
      var d = num(c.mly, 0) * LY_PER_MLY, th = num(c.dir, 0) * Math.PI / 180;
      var base = [lgBase[0] + d * Math.cos(th), lgBase[1] + d * Math.sin(th)];  // radial FROM the LG
      var big = c.kind === "supercluster" || c.kind === "attractor";
      var g = el("g", {});
      var dot = el("circle", { r: big ? 4.2 : 3, fill: big ? "#e7d6ff" : "#cdd8ff", "fill-opacity": 0.95 });
      var lbl = el("text", { "class": "lf-label lf-axis", fill: "#cdb8ff",
        dx: big ? 9 : 6, dy: 3.5 });
      lbl.appendChild(doc.createTextNode((c.name || "cluster") + " · " + num(c.mly, 0) + " Mly"));
      g.appendChild(dot); g.appendChild(lbl);
      gClusters.appendChild(g);
      var gl = null;
      if (big) { gl = el("circle", { r: 20, fill: "url(#lf-cw-glow)" }); gFil.appendChild(gl); }
      return { base: base, dot: dot, lbl: lbl, glow: gl, big: big };
    });

    // --- "you are here": the Local Group, constant-size marked dot --------
    var markGlow = el("circle", { r: 20, fill: "url(#lf-cw-glow)" }); gFil.appendChild(markGlow);
    var markRing = el("circle", { r: 9, fill: "none", stroke: "#ff7a59", "stroke-width": 1.4, "stroke-opacity": 0.9 });
    var markDot  = el("circle", { r: 3, fill: "#ffd2c4" });
    var markLbl  = el("text", { "class": "lf-label lf-callout", fill: "#ffb9a6", dx: 13, dy: 4 });
    markLbl.appendChild(doc.createTextNode(lg.label || "Local Group — you are here"));
    gMark.appendChild(markRing); gMark.appendChild(markDot); gMark.appendChild(markLbl);

    // --- default zoom FOCUS = the Local Group (mirrors localgroup's focus:"milkyway").
    //     The bare zoom gesture falls toward HOME: the view centre interpolates from
    //     the field centre at the opening scale to the Local Group as you zoom in.
    //     Manual drag / explicit-centre region hands control back. focusMode from
    //     zoom.focus ("localgroup" | "center" | [x,y]); defaults to "localgroup".
    var focusMode = (zoom.focus !== undefined) ? zoom.focus : "localgroup";
    var autoFocus = (focusMode !== "center");
    var sStart = slider;
    var focusDoneScale = num(zoom.focusScale, lgR * 0.5);   // scale by which we are fully on the LG
    var sFocusDone = clamp01(logZoom.scaleToSlider(Math.max(LO, focusDoneScale), LO, HI));

    function focusPoint() {                                 // current (rotated) target, world ly
      if (focusMode === "localgroup") {
        var ca = Math.cos(webAngle), sa = Math.sin(webAngle);
        return [lgBase[0] * ca - lgBase[1] * sa, lgBase[0] * sa + lgBase[1] * ca];
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

    // --- the foam CULL: SHARED math (cullLayer) -> set node attrs ---------
    function projectLayer(worldArr, nodes, cap, ca, sa, kk) {
      var pts = cullLayer(worldArr, cap, ca, sa, kk, cx, cy, panX, panY);
      var j = 0;
      for (; j < pts.length; j++) {
        var n = nodes[j], p = pts[j];
        n.setAttribute("cx", p[0].toFixed(1)); n.setAttribute("cy", p[1].toFixed(1));
        if (n.__b !== p[2]) { n.setAttribute("r", (0.5 + p[2] * 1.2).toFixed(2)); n.__b = p[2]; }
        if (n.__hidden) { n.style.display = ""; n.__hidden = false; }
      }
      for (; j < nodes.length; j++) { var m = nodes[j]; if (!m.__hidden) { m.style.display = "none"; m.__hidden = true; } }
      return pts.length;
    }

    function projectPoint(wxRaw, wyRaw, ca, sa, kk) {
      var wx = wxRaw * ca - wyRaw * sa, wy = wxRaw * sa + wyRaw * ca;
      return [cx + (wx + panX) * kk, cy - (wy + panY) * kk];
    }

    function positionCluster(c, ca, sa, kk) {
      var s = projectPoint(c.base[0], c.base[1], ca, sa, kk), sx = s[0], sy = s[1];
      var on = sx >= -GPAD && sx <= GW + GPAD && sy >= -GPAD && sy <= GH + GPAD;
      var disp = on ? "" : "none";
      c.dot.style.display = disp; c.lbl.style.display = disp;
      if (c.glow) c.glow.style.display = disp;
      if (on) {
        c.dot.setAttribute("cx", sx.toFixed(1)); c.dot.setAttribute("cy", sy.toFixed(1));
        c.lbl.setAttribute("x", sx.toFixed(1)); c.lbl.setAttribute("y", sy.toFixed(1));
        if (c.glow) { c.glow.setAttribute("cx", sx.toFixed(1)); c.glow.setAttribute("cy", sy.toFixed(1)); }
      }
    }

    function updateFilaments(ca, sa, kk) {
      for (var i = 0; i < filLines.length; i++) {
        var f = filLines[i];
        var pa = projectPoint(f.a[0], f.a[1], ca, sa, kk), pb = projectPoint(f.b[0], f.b[1], ca, sa, kk);
        f.ln.setAttribute("x1", pa[0].toFixed(1)); f.ln.setAttribute("y1", pa[1].toFixed(1));
        f.ln.setAttribute("x2", pb[0].toFixed(1)); f.ln.setAttribute("y2", pb[1].toFixed(1));
      }
    }

    function updateMarker(ca, sa, kk) {
      var s = projectPoint(lgBase[0], lgBase[1], ca, sa, kk), sx = s[0], sy = s[1];
      markRing.setAttribute("cx", sx); markRing.setAttribute("cy", sy);
      markDot.setAttribute("cx", sx); markDot.setAttribute("cy", sy);
      markLbl.setAttribute("x", sx); markLbl.setAttribute("y", sy);
      markGlow.setAttribute("cx", sx); markGlow.setAttribute("cy", sy);
    }

    function recompute() {
      applyAutoFocus();
      var ca = Math.cos(webAngle), sa = Math.sin(webAngle), kk = k();
      updateFilaments(ca, sa, kk);
      drawnFoam = projectLayer(worldFoam, foamNodes, FOAM_MAX, ca, sa, kk);
      for (var i = 0; i < clusters.length; i++) positionCluster(clusters[i], ca, sa, kk);
      updateMarker(ca, sa, kk);
    }

    // --- controls (HTML) — skipped when spec.controls === false so a composer
    //     (cosmiczoom.js, slab 3b) can drive this instance from one master bar.
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
        if (rg.center === "localgroup") {
          return [lgBase[0] * ca - lgBase[1] * sa, lgBase[0] * sa + lgBase[1] * ca];
        }
        if (rg.center && rg.center.length === 2) return rg.center;
        return null;
      };
      var startJump = function (rg) {
        var ca = Math.cos(webAngle), sa = Math.sin(webAngle);
        var c = resolveCenter(rg, ca, sa);
        autoFocus = !c;
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
    // A very slow RIGID drift (the web barely evolves on human timescales) —
    // scale-coupled via scaleAwareTime so it reads at every zoom. Re-cull on
    // viewDirty (interaction) and on a slow throttle while playing.
    var SPIN = 0.010, ROT_MS = 16;   // recompute cadence: every frame (60Hz) — foam recompute is ~0.9ms/batch, well under budget; 66ms caused visible 15Hz stepping (0.11.1)
    var perf = (root.performance && root.performance.now) ? root.performance : Date;
    var last = perf.now(), lastRecomp = 0;
    var lfVisible = true, lfRunning = false;   // visibility gate: off-screen -> stop the rAF loop (real CPU savings)
    function frame(now) {
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      var drift = scaleAwareTime(baseSpeed, scaleLY());     // RUNTIME (scale-coupled)
      if (playing && !jump) webAngle += drift * dt * SPIN;

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
      var scaleTxt = s >= 1e9 ? (s / 1e9).toFixed(2) + " Gly"
        : s >= LY_PER_MLY ? (s / LY_PER_MLY).toFixed(1) + " Mly"
        : Math.round(s).toLocaleString() + " ly";
      if (readout) readout.textContent = "scale " + scaleTxt + " · " + clusters.length +
        " named clusters · ~" + worldFoam.length + " representative galaxies on the web";

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
        return { slider: slider, scaleLY: scaleLY(), angle: webAngle, playing: playing,
          drawnFoam: drawnFoam, foamTotal: worldFoam.length, nodes: worldNodes.length,
          filaments: filLines.length, namedClusters: clusters.length,
          autoFocus: autoFocus, panX: panX, panY: panY,
          viewCenterLY: [-panX, -panY], focusTarget: focusPoint() };
      },
      setSlider: function (v) { jump = null; slider = clamp01(v); syncZoom(); viewDirty = true; }
    };
    container.__lfHandle = handle;
    return handle;
  }

  DossierFigures.renderCosmicWeb = renderCosmicWeb;
  DossierFigures.registerRenderer("cosmicweb", renderCosmicWeb);   // live-renderer registry (the lightbox dispatches by spec.type)
})(typeof window !== "undefined" ? window : null);
