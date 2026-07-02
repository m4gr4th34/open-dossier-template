/*
 * cosmiczoom.js — ONE continuous zoom from Mercury (~0.4 AU) to the Milky Way
 * (~10^9 AU), built by COMPOSING the existing render modules: it CALLS
 * DossierFigures.renderOrrery and DossierFigures.renderGalaxy (it does NOT
 * refactor or reimplement them — they stay working standalone) and stitches
 * their two pixel-identical SVG canvases into one seamless fall.
 *
 * COMPOSITION (one level up — render modules composing render modules)
 *   - the inner regime  -> DossierFigures.renderOrrery(layerA, orrerySpec{controls:false})
 *   - the outer regime  -> DossierFigures.renderGalaxy(layerB, galaxySpec{controls:false})
 *   - zoom mapping      -> DossierFigures.logZoom (master AU range + per-module slider)
 *   - soft crossfade    -> DossierFigures.ease
 *   - SVG nodes         -> DossierFigures.el
 *   NO Kepler, NO spiral, NO PRNG, NO scatter here — those live INSIDE the two
 *   composed modules. The only "new" math is the UNIT BRIDGE (1 ly = 63,241 AU,
 *   owned here) and the opacity crossfade/void blends.
 *
 * THE SEAM
 *   Both modules render identical 800x480 canvases (cx,cy=400,240, RAD=220.8),
 *   so the two layers stack absolutely and CROSS-FADE by opacity — no geometric
 *   reconciliation. A master "cosmic scale" (AU) drives both: orrery via
 *   setSlider(scaleToSlider(scaleAU,...)), galaxy via setSlider(scaleToSlider(
 *   scaleAU/63241,...)). Inside the overlap band [~0.63 AU .. 6000 AU] the orrery
 *   fades out as the galaxy fades in.
 *
 * THE ANCHOR (Sun-frame inversion held automatically)
 *   The orrery is Sun-centred (its origin (0,0) IS the Sun, at screen centre).
 *   The galaxy spec uses focus:"sun", so at the deep end of its range its
 *   auto-focus centres on the Sun too — so through the whole crossfade BOTH Suns
 *   sit at screen centre and stay registered. Only when the master zooms well
 *   PAST the seam does the galaxy's auto-focus release the Sun toward the
 *   galactic centre — the honest inversion from "Sun is the centre of everything"
 *   to "Sun is one dot in a spur". We hold the anchor purely by composing the
 *   galaxy's own focus machinery (driving setSlider only) — no pan injection.
 *
 * THE HONEST VOID
 *   Between the Oort outer edge (~0.073 ly) and the nearest stars, a thin
 *   waypoint layer renders a tiny REAL catalog (Proxima 4.2 ly, ... Sirius 8.6 ly)
 *   as labelled points radiating from the Sun at their true distances — the
 *   Powers-of-Ten payload: the vast emptiness, honestly labelled, not a blank gap.
 *
 * Vendored, zero-dependency, reader-side; never run by CI.
 */
(function (root) {
  "use strict";

  var NS = root && root.DossierFigures;
  if (!NS) {
    if (root && root.console) root.console.error("[cosmiczoom] figures.js runtime not found — load it (and orrery.js + galaxy.js) first");
    return;
  }
  var DossierFigures = NS;
  var logZoom = DossierFigures.logZoom;     // RUNTIME (zoom mapping)
  var ease    = DossierFigures.ease;        // RUNTIME (crossfade easing)
  var el      = DossierFigures.el;          // RUNTIME (SVG nodes)

  var AU_PER_LY = 63241;                    // THE UNIT BRIDGE (owned here): 1 ly = 63,241 AU

  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function num(v, d) { return (typeof v === "number" && isFinite(v)) ? v : d; }
  function merge(a, b) {
    var o = {}, k;
    for (k in a) if (Object.prototype.hasOwnProperty.call(a, k)) o[k] = a[k];
    for (k in b) if (Object.prototype.hasOwnProperty.call(b, k)) o[k] = b[k];
    return o;
  }
  function fail(container, msg) {
    if (root && root.console) root.console.error("[cosmiczoom] " + msg);
    if (container && container.appendChild) {
      var p = root.document.createElement("p");
      p.className = "lf-fallback"; p.textContent = "Figure unavailable: " + msg;
      container.appendChild(p);
    }
    return null;
  }

  // Real values — the one bit of real DATA in the scaffold (overridable via spec).
  var DEFAULT_NEAREST = [
    { name: "Proxima Centauri", ly: 4.247, dir: 18 },
    { name: "Alpha Centauri AB", ly: 4.37, dir: 26 },
    { name: "Barnard's Star", ly: 5.96, dir: 142 },
    { name: "Wolf 359", ly: 7.86, dir: 250 },
    { name: "Sirius", ly: 8.6, dir: 318 }
  ];

  function renderCosmicZoom(container, spec) {
    if (!container) return fail(null, "no container");
    var doc = (root && root.document) || container.ownerDocument;

    if (spec == null && container.getAttribute) spec = container.getAttribute("data-figure");
    if (typeof spec === "string") {
      try { spec = JSON.parse(spec); } catch (e) { return fail(container, "data-figure is not valid JSON"); }
    }
    if (!spec || !spec.orrery || !spec.galaxy) return fail(container, "spec needs both orrery and galaxy blocks");

    // A build-time sealed poster (data-poster) may already sit in the container
    // as the JS-off floor. Remove it before mounting the live stack so a JS-on
    // reader ends with exactly ONE live figure — the floor upgrades to the
    // ceiling. (Same additive dedup as renderOrrery/renderGalaxy; no-op when
    // no poster is present.)
    if (container.querySelector) {
      var baked = container.querySelector("[data-poster]");
      if (baked && baked.parentNode) baked.parentNode.removeChild(baked);
    }

    var W = 800, H = 480, cx = W / 2, cy = H / 2, RAD = Math.min(W, H) * 0.46;
    var seam = spec.seam || {};

    // master cosmic scale range, in AU (Mercury inner -> Milky Way)
    var MLO = Math.max(1e-3, num(seam.lo, 0.35));
    var MHI = Math.max(MLO * 1.0001, num(seam.hi, 4e9));       // ~63,000 ly
    var sliderM = clamp01(logZoom.scaleToSlider(num(seam.start, 5), MLO, MHI)); // open on the inner solar system
    var startSliderM = sliderM;   // the PUBLISHED start view (the frame the sealed poster freezes) — Reset restores it
    function scaleAU() { return logZoom.sliderToScale(sliderM, MLO, MHI); }      // RUNTIME

    // crossfade band (AU) — MUST hand off in the EMPTY VOID BEYOND the Oort, not
    // on top of it. The Oort (orrery.oort.rMax) only FITS IN FRAME once the view
    // scale reaches its outer radius, so the orrery has to stay opaque until then;
    // a fade that completes inside the Oort radius renders it invisibly. Default
    // the band to start well past the framed Oort and finish out in the void.
    var oortMax = (spec.orrery.oort && num(spec.orrery.oort.rMax, 0)) ||
                  (num((spec.orrery.zoom || {}).hi, 6000) * 0.8);
    var fadeLo = num(seam.fadeLoAU, oortMax * 2.5);   // start fade past the framed Oort
    var fadeHi = num(seam.fadeHiAU, oortMax * 18);    // finish in the empty void beyond
    // void band (ly)
    var vInLo = num(seam.voidInLoLy, 4), vInHi = num(seam.voidInHiLy, 12);
    var vOutLo = num(seam.voidOutLoLy, 300), vOutHi = num(seam.voidOutHiLy, 1500);

    // child zoom ranges (to convert the master scale into each regime's slider)
    var oz = spec.orrery.zoom || {}, oLO = Math.max(1e-6, num(oz.lo, 0.3)), oHI = Math.max(oLO * 1.0001, num(oz.hi, 6000));
    var gz = spec.galaxy.zoom || {}, gLO = Math.max(1e-9, num(gz.lo, 1e-5)), gHI = Math.max(gLO * 1.0001, num(gz.hi, 200000));
    var lz = (spec.localgroup && spec.localgroup.zoom) || {}, lgLO = Math.max(1e-3, num(lz.lo, 40000)), lgHI = Math.max(lgLO * 1.0001, num(lz.hi, 8e6));
    var cw = (spec.cosmicweb && spec.cosmicweb.zoom) || {}, cwLO = Math.max(1e-3, num(cw.lo, 1e6)), cwHI = Math.max(cwLO * 1.0001, num(cw.hi, 1e9));
    var ou = (spec.observableuniverse && spec.observableuniverse.zoom) || {}, ouLO = Math.max(1e-3, num(ou.lo, 1e8)), ouHI = Math.max(ouLO * 1.0001, num(ou.hi, 4.65e10));

    // --- the REGIME STACK (ordered INNER -> OUTER) + the boundary bands between
    //     adjacent regimes. Generalizes the old hardwired 2-layer crossfade: every
    //     regime is a pixel-identical 800x480 child, and each ADJACENT PAIR shares
    //     ONE [fadeLo,fadeHi] band (identical in shape to the single band before).
    //     A regime fades IN across its inner boundary and OUT across its outer one;
    //     the innermost has no inner boundary, the outermost no outer one -> with
    //     N=2 this reduces byte-for-byte to orrery(1->0)/galaxy(0->1). Adding an
    //     outer regime later is "append a regime + a boundary," not a crossfade
    //     rewrite. `unit` converts the master AU scale into the regime's own unit
    //     (the AU_PER_LY bridge for the galaxy). The void overlay stays a
    //     per-boundary overlay (orrery->galaxy for now), NOT a regime.
    var regimes = [
      { name: "orrery", childSpec: spec.orrery, render: DossierFigures.renderOrrery, unit: 1,         lo: oLO, hi: oHI },
      { name: "galaxy", childSpec: spec.galaxy, render: DossierFigures.renderGalaxy, unit: AU_PER_LY, lo: gLO, hi: gHI }
    ];
    var boundaries = [
      { fadeLo: fadeLo, fadeHi: fadeHi }   // orrery -> galaxy (the existing band; hands off in the void beyond the Oort)
    ];
    // SLAB 2b: append the Local Group regime + the galaxy->LG boundary band, ONLY when
    // the spec carries a localgroup block (back-compat: a 2-block cosmic spec still falls
    // Mercury->Milky Way). The band is derived from the galaxy's outer ly edge and FLOORED
    // strictly beyond the full-galaxy frame — the Oort lesson again: hand off in the VOID
    // BEYOND the galaxy (the whole Milky Way framed/readable at fadeLo2, THEN it recedes).
    // The 4e9 floor also keeps fadeLo2 > the largest slab-1 continuity sample (3.82e9 AU),
    // so the orrery<->galaxy seam stays byte-identical below the band.
    var fadeLo2 = Infinity, fadeHi2 = Infinity;   // hoisted for regime(); Infinity = no LG regime
    if (spec.localgroup) {
      var galaxyEdgeAU = gHI * AU_PER_LY;          // galaxy.zoom.hi (ly) -> AU
      fadeLo2 = Math.max(num(seam.fadeLoLGAU, galaxyEdgeAU * 0.6), 4e9);
      fadeHi2 = Math.max(num(seam.fadeHiLGAU, galaxyEdgeAU * 6), fadeLo2 * 6);
      regimes.push({ name: "localgroup", childSpec: spec.localgroup, render: DossierFigures.renderLocalGroup, unit: AU_PER_LY, lo: lgLO, hi: lgHI });
      boundaries.push({ fadeLo: fadeLo2, fadeHi: fadeHi2 });
    }
    // SLAB 3b: append the Cosmic Web regime + the LG->CW boundary band, ONLY when the
    // spec carries a cosmicweb block (same conditional/back-compat pattern as 2b). The
    // band is derived from the LG's outer ly edge and FLOORED beyond the framed Local
    // Group (Oort lesson: the whole Group framed/readable at fadeLo3, THEN it recedes).
    // The 2.5e11 floor keeps fadeLo3 > the largest slab-2 sample (Local Group 2.2e11 AU),
    // so the orrery<->galaxy<->LG seam stays byte-identical below the band.
    var fadeLo3 = Infinity, fadeHi3 = Infinity;   // hoisted for regime(); Infinity = no CW regime
    if (spec.cosmicweb) {
      var lgEdgeAU = lgHI * AU_PER_LY;             // localgroup.zoom.hi (ly) -> AU
      fadeLo3 = Math.max(num(seam.fadeLoCWAU, lgEdgeAU * 0.6), 2.5e11);
      fadeHi3 = Math.max(num(seam.fadeHiCWAU, lgEdgeAU * 6), fadeLo3 * 6);
      regimes.push({ name: "cosmicweb", childSpec: spec.cosmicweb, render: DossierFigures.renderCosmicWeb, unit: AU_PER_LY, lo: cwLO, hi: cwHI });
      boundaries.push({ fadeLo: fadeLo3, fadeHi: fadeHi3 });
    }
    // SLAB 4b: append the TERMINAL regime (observable universe) + the CW->OU boundary
    // band — THE ENDING. Same conditional/back-compat pattern. NOTE the FLOOR is
    // LOAD-BEARING here, unlike the earlier bands: cwEdgeAU*0.6 = 3.79e13 AU is BELOW
    // the largest slab-3 sample (Cosmic web 4.4e13 AU), so without the 5e13 floor the
    // "Cosmic web" view would already be fading. 5e13 (> 4.4e13) keeps slab-3 byte-
    // identical AND sits past the framed cosmic web (520 Mly) so the whole web is seen
    // before it dissolves into uniformity. Beyond fadeHi4: the homogeneous, isotropic
    // observable universe, bounded by the horizon — there is nothing bigger.
    var fadeLo4 = Infinity, fadeHi4 = Infinity;   // hoisted for regime(); Infinity = no terminal regime
    if (spec.observableuniverse) {
      var cwEdgeAU = cwHI * AU_PER_LY;            // cosmicweb.zoom.hi (ly) -> AU
      fadeLo4 = Math.max(num(seam.fadeLoOUAU, cwEdgeAU * 0.6), 5e13);
      fadeHi4 = Math.max(num(seam.fadeHiOUAU, cwEdgeAU * 6), fadeLo4 * 6);
      regimes.push({ name: "observableuniverse", childSpec: spec.observableuniverse, render: DossierFigures.renderObservableUniverse, unit: AU_PER_LY, lo: ouLO, hi: ouHI });
      boundaries.push({ fadeLo: fadeLo4, fadeHi: fadeHi4 });
    }
    var N = regimes.length;

    // --- mount: OUTERMOST regime IN FLOW (gives the stage its height), inner
    //     regimes absolute on top, inner = HIGHER z (fades out to reveal the next
    //     regime out); the void overlay sits above all. DOM-identical to the old
    //     layB/layA/voidSvg stack when N=2. -----------------------------------
    var stage = doc.createElement("div");
    stage.style.cssText = "position:relative;";
    for (var mi = N - 1; mi >= 0; mi--) {            // append OUTER -> INNER (in-flow base first)
      var lay = doc.createElement("div");
      lay.style.cssText = (mi === N - 1)
        ? "position:relative;z-index:" + (N - mi) + ";pointer-events:none;"           // outermost: in flow
        : "position:absolute;inset:0;z-index:" + (N - mi) + ";pointer-events:none;";  // inner: absolute on top
      stage.appendChild(lay);
      regimes[mi].layer = lay;
    }
    var voidSvg = el("svg", { viewBox: "0 0 " + W + " " + H, width: "100%", height: "100%",
      "class": "lf-void", preserveAspectRatio: "xMidYMid meet" });
    voidSvg.style.cssText = "position:absolute;inset:0;z-index:" + (N + 1) + ";pointer-events:none;";
    stage.appendChild(voidSvg);

    // COMPOSE: call each regime's existing render module, controls off (the master
    // bar drives them). Still renderOrrery/renderGalaxy — composition, not rewrite.
    for (var ci = 0; ci < N; ci++) {
      var rg = regimes[ci];
      rg.handle = rg.render(rg.layer, merge(rg.childSpec, { controls: false }));   // <-- composition
      if (!rg.handle) return fail(container, "a composed module failed to render");
    }
    var hOrr = regimes[0].handle, hGal = regimes[1].handle;   // named handles (anchor proof + return)
    var layA = regimes[0].layer,  layB = regimes[1].layer;    // aliases keep getState/return unchanged

    function driveChildren() {                          // master AU -> each regime's own slider
      var aAU = scaleAU();
      for (var i = 0; i < N; i++) {
        var r = regimes[i];
        r.handle.setSlider(clamp01(logZoom.scaleToSlider(aAU / r.unit, r.lo, r.hi)));
      }
    }
    // INNER regime's REMAINING opacity across a boundary: 1 below the band, eased
    // 1->0 across it, 0 above (exactly the old `fa`). The OUTER regime's fade-IN is
    // the complement (1 - this) — exactly the old `1 - fa`.
    function bandOut(aAU, b) {
      if (aAU <= b.fadeLo) return 1;
      if (aAU >= b.fadeHi) return 0;
      return 1 - ease(clamp01(logZoom.scaleToSlider(aAU, b.fadeLo, b.fadeHi)));
    }
    function crossfade() {
      var aAU = scaleAU();
      for (var i = 0; i < N; i++) {
        var inner = (i === 0)     ? 1 : (1 - bandOut(aAU, boundaries[i - 1]));   // faded IN across inner boundary
        var outer = (i === N - 1) ? 1 : bandOut(aAU, boundaries[i]);             // not yet OUT across outer boundary
        regimes[i].layer.style.opacity = Math.min(inner, outer).toFixed(3);
      }
    }

    // --- the honest void: nearest-star waypoints (radial from the Sun) ----
    var catalog = (seam.nearestStars && seam.nearestStars.length) ? seam.nearestStars : DEFAULT_NEAREST;
    var voidNodes = catalog.map(function (st, i) {
      var g = el("g", {});
      var dot = el("circle", { r: 2.6, fill: "#ffe6b0", "fill-opacity": 0.95 });
      var lbl = el("text", { "class": "lf-label lf-tick", fill: "#cfe0ff", dx: 7, dy: 3.5 });
      lbl.appendChild(doc.createTextNode((st.name || "star") + " · " + num(st.ly, 5) + " ly"));
      g.appendChild(dot); g.appendChild(lbl);
      voidSvg.appendChild(g);
      return { dot: dot, lbl: lbl, ly: num(st.ly, 5), dir: num(st.dir, i * 72) * Math.PI / 180 };
    });
    function voidBump(ly) {                                   // 0 outside the void band, 1 across it (log ramps)
      if (ly <= vInLo || ly >= vOutHi) return 0;
      if (ly < vInHi) return clamp01(logZoom.scaleToSlider(ly, vInLo, vInHi));
      if (ly <= vOutLo) return 1;
      return clamp01(1 - logZoom.scaleToSlider(ly, vOutLo, vOutHi));
    }
    function updateVoid() {
      var ly = scaleAU() / AU_PER_LY, op = voidBump(ly);
      voidSvg.style.opacity = op.toFixed(3);
      if (op < 0.01) return;
      var kly = RAD / ly;                                    // px per ly (Sun at screen centre)
      for (var i = 0; i < voidNodes.length; i++) {
        var v = voidNodes[i], off = v.ly * kly;              // px from centre at the star's true distance
        var sx = cx + off * Math.cos(v.dir), sy = cy - off * Math.sin(v.dir);
        v.dot.setAttribute("cx", sx.toFixed(1)); v.dot.setAttribute("cy", sy.toFixed(1));
        v.lbl.setAttribute("x", sx.toFixed(1)); v.lbl.setAttribute("y", sy.toFixed(1));
      }
    }

    // --- ONE master control bar (the only visible controls) --------------
    var bar = doc.createElement("div");
    bar.className = "lf-controls lf-cosmic";

    var journeyPlaying = seam.playing === true && !DossierFigures.prefersReducedMotion();   // default paused (calm open); reduced-motion keeps it paused
    var jdir = 1, masterJump = null;
    var playBtn = doc.createElement("button");
    playBtn.type = "button"; playBtn.className = "lf-btn lf-play";
    function playLabel() { return journeyPlaying ? "❚❚ Pause" : "▶ Journey"; }
    playBtn.textContent = playLabel();
    playBtn.addEventListener("click", function () { journeyPlaying = !journeyPlaying; masterJump = null; playBtn.textContent = playLabel(); });
    bar.appendChild(playBtn);

    var zWrap = doc.createElement("label"); zWrap.className = "lf-field";
    zWrap.appendChild(doc.createTextNode("Cosmic zoom"));
    var zIn = doc.createElement("input");
    zIn.type = "range"; zIn.min = "0"; zIn.max = "1"; zIn.step = "0.0005";
    zIn.value = String(1 - sliderM); zIn.className = "lf-range";   // presentation flip: right = zoom IN (internal sliderM unchanged; wheel already scroll-up=in)
    zIn.addEventListener("input", function () { masterJump = null; journeyPlaying = false; playBtn.textContent = playLabel(); sliderM = clamp01(1 - parseFloat(zIn.value)); });
    zWrap.appendChild(zIn); bar.appendChild(zWrap);

    function jumpTo(scaleAUtarget) { masterJump = { from: sliderM, to: clamp01(logZoom.scaleToSlider(scaleAUtarget, MLO, MHI)), p: 0, dur: 1.4 }; journeyPlaying = false; playBtn.textContent = playLabel(); }
    (seam.regions || []).forEach(function (rg) {
      var btn = doc.createElement("button");
      btn.type = "button"; btn.className = "lf-btn lf-region";
      btn.textContent = rg.name;
      btn.addEventListener("click", function () { jumpTo(num(rg.scale, scaleAU())); });
      bar.appendChild(btn);
    });

    // Reset: re-derive the PUBLISHED start view (the master slider the poster freezes) and restore the
    // journey play state, re-consulting reduced-motion so Reset returns to the paused published frame.
    var resetBtn = doc.createElement("button");
    resetBtn.type = "button"; resetBtn.className = "lf-btn";
    resetBtn.textContent = "Reset";
    resetBtn.addEventListener("click", function () {
      masterJump = null; sliderM = startSliderM; syncMaster();
      journeyPlaying = seam.playing === true && !DossierFigures.prefersReducedMotion();
      playBtn.textContent = playLabel();
    });
    bar.appendChild(resetBtn);

    var readout = doc.createElement("span"); readout.className = "lf-readout";
    bar.appendChild(readout);

    function syncMaster() { zIn.value = String(1 - sliderM); }   // presentation flip (see input wiring)
    function fmtScale(aAU) {
      if (aAU < AU_PER_LY) {
        if (aAU < 1) return aAU.toFixed(3) + " AU";
        if (aAU < 1000) return aAU.toFixed(1) + " AU";
        return Math.round(aAU).toLocaleString() + " AU";
      }
      var ly = aAU / AU_PER_LY;
      return (ly < 1000 ? (ly < 10 ? ly.toFixed(2) : Math.round(ly)) : Math.round(ly).toLocaleString()) + " ly";
    }
    function regime(aAU) {
      if (aAU <= fadeLo) return "solar system";
      if (aAU < fadeHi) return "seam (orrery ↔ galaxy)";
      if ((aAU / AU_PER_LY) < vOutLo) return "interstellar void";
      if (aAU < fadeLo2) return "the galaxy";                  // identical for aAU < fadeLo2 (the 7 slab-1 names)
      if (aAU < fadeHi2) return "seam (galaxy ↔ Local Group)";
      if (aAU < fadeLo3) return "the Local Group";             // identical for aAU < fadeLo3 (the slab-2 names)
      if (aAU < fadeHi3) return "seam (Local Group ↔ Cosmic Web)";
      if (aAU < fadeLo4) return "the cosmic web";              // identical for aAU < fadeLo4 (the slab-3 names)
      if (aAU < fadeHi4) return "seam (Cosmic Web ↔ observable universe)";
      return "the observable universe";
    }
    var horizonGly = num((spec.observableuniverse && spec.observableuniverse.horizon || {}).gly, 46.5);
    function updateReadout() {
      // At the wall (the observable horizon) the master bar speaks the honest line —
      // never "edge of the universe". This is the master version of the OU child's label.
      if (spec.observableuniverse && sliderM > 0.999) {
        readout.textContent = "observable horizon (~" + horizonGly + " Gly) — we cannot see beyond this";
        return;
      }
      var a = scaleAU(); readout.textContent = "cosmic scale " + fmtScale(a) + " · " + regime(a);
    }

    // master scroll-to-zoom (children are pointer-events:none, so this owns it)
    stage.addEventListener("wheel", function (ev) {
      ev.preventDefault(); masterJump = null; journeyPlaying = false; playBtn.textContent = playLabel();
      sliderM = clamp01(sliderM + (ev.deltaY < 0 ? -0.03 : 0.03)); syncMaster();
    }, { passive: false });

    // --- mount (data-figure left untouched) ------------------------------
    container.style.position = container.style.position || "relative";
    container.appendChild(stage);
    container.appendChild(bar);

    // --- master loop: only act when the cosmic scale changes (children run
    //     their own loops; we just steer their zoom + the crossfade + the void) -
    var JR = num(seam.journeyRate, 0.05);   // slider units / second (Powers-of-Ten travel)
    var perf = (root.performance && root.performance.now) ? root.performance : Date;
    var last = perf.now(), lastDriven = null;
    var lfVisible = true, lfRunning = false;   // visibility gate: off-screen -> stop the rAF tick (real CPU savings)
    function tick(now) {
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (masterJump) {
        masterJump.p += dt / masterJump.dur;
        sliderM = masterJump.from + (masterJump.to - masterJump.from) * ease(clamp01(masterJump.p));
        if (masterJump.p >= 1) masterJump = null;
        syncMaster();
      } else if (journeyPlaying) {
        sliderM += jdir * JR * dt;            // ping-pong the cosmic journey
        if (sliderM >= 1) { sliderM = 1; jdir = -1; } else if (sliderM <= 0) { sliderM = 0; jdir = 1; }
        syncMaster();
      }
      if (sliderM !== lastDriven) { driveChildren(); crossfade(); updateVoid(); updateReadout(); lastDriven = sliderM; }
      if (lfVisible) root.requestAnimationFrame(tick); else lfRunning = false;   // stop rescheduling when off-screen
    }
    // Resume from the FROZEN sliderM (no jump): reset the clock so dt is one frame, not the paused span.
    function lfResume() { if (!lfRunning) { lfRunning = true; last = perf.now(); root.requestAnimationFrame(tick); } }
    lfRunning = true; root.requestAnimationFrame(tick);
    // Visibility gate (child-side IntersectionObserver fires on parent-scroll, even inside an iframe).
    // Node-safe: renderX is browser-only; absent IO -> figure just always animates. Children carry their own gates.
    if (root.IntersectionObserver) {
      new root.IntersectionObserver(function (es) { lfVisible = es[0].isIntersecting; if (lfVisible) lfResume(); }, { root: null, threshold: 0 }).observe(container);
    }

    var handle = {
      runtimeVersion: DossierFigures.FIGURES_RUNTIME_VERSION,
      orrery: hOrr, galaxy: hGal, localgroup: regimes[2] && regimes[2].handle, cosmicweb: regimes[3] && regimes[3].handle, observableuniverse: regimes[4] && regimes[4].handle,
      getState: function () {
        var a = scaleAU();
        return { sliderM: sliderM, scaleAU: a, scaleLY: a / AU_PER_LY,
          orreryOpacity: parseFloat(layA.style.opacity || "1"),
          galaxyOpacity: parseFloat(layB.style.opacity || "1"),
          localgroupOpacity: regimes[2] ? parseFloat(regimes[2].layer.style.opacity || "0") : 0,
          cosmicwebOpacity: regimes[3] ? parseFloat(regimes[3].layer.style.opacity || "0") : 0,
          observableuniverseOpacity: regimes[4] ? parseFloat(regimes[4].layer.style.opacity || "0") : 0,
          regimeOpacities: regimes.map(function (r, i) { return parseFloat(r.layer.style.opacity || (i === 0 ? "1" : "0")); }),
          voidOpacity: parseFloat(voidSvg.style.opacity || "0"),
          journeyPlaying: journeyPlaying, regime: regime(a) };
      },
      setMaster: function (v) { masterJump = null; sliderM = clamp01(v); syncMaster(); }
    };
    container.__lfHandle = handle;
    return handle;
  }

  // -------------------------------------------------------------------------
  // renderCosmicZoomPosterSVG(spec) -> the SEALED FLOOR: a DETERMINISTIC <svg>
  // STRING for the galaxy-scale "you are here" frame. PURE DELEGATION — at the
  // galaxy-scale frame the live orrery opacity is 0 and the void opacity is 0,
  // so the floor frame IS the galaxy layer alone. So we COMPOSE the existing
  // galaxy poster path (one level up), exactly as live renderCosmicZoom composes
  // live renderGalaxy at galaxy scale. No compositing, no reimplementation.
  // The poster carries the galaxy's own title ("Milky Way") — correct, because
  // the floor IS the Milky Way view; no aria rewrite needed.
  // -------------------------------------------------------------------------
  function renderCosmicZoomPosterSVG(spec) {
    if (typeof spec === "string") { try { spec = JSON.parse(spec); } catch (e) { return ""; } }
    if (!spec || !spec.galaxy) return "";
    return DossierFigures.renderGalaxyPosterSVG(spec.galaxy);
  }

  DossierFigures.renderCosmicZoom = renderCosmicZoom;
  DossierFigures.renderCosmicZoomPosterSVG = renderCosmicZoomPosterSVG;   // back-compat (direct callers)
  DossierFigures.registerPoster("cosmic", renderCosmicZoomPosterSVG);     // registry (the sealer dispatches by spec.type)
  DossierFigures.registerRenderer("cosmic", renderCosmicZoom);            // live-renderer registry (the lightbox dispatches by spec.type)
})(typeof window !== "undefined" ? window : null);
