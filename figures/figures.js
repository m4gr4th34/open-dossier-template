/*
 * figures.js — Open Dossier living-figures runtime (vendored, first-party).
 *
 * WHAT THIS IS
 *   The shared, reader-side runtime for "living figures": small, self-contained
 *   interactive/animated SVG figures embedded in a dossier's editions. It ships
 *   to the browser as static JavaScript and provides the handful of primitives
 *   that the prototype figures (the fold, the orrery, the zoom-orrery) proved
 *   are needed again and again. Figures themselves stay tiny because the math
 *   and the procedural generation live here, once.
 *
 * THE MODEL (floor / source / ceiling)
 *   - FLOOR  : this vendored runtime — primitives every figure leans on.
 *   - SOURCE : each figure authors its parameters as data (the source of truth),
 *              the same discipline as data-tex for math.
 *   - CEILING: the rendered, committed figure a reader sees — no live fetches.
 *
 * SUSTAINABILITY LAWS (non-negotiable)
 *   - ZERO external dependencies. Pure vanilla JavaScript, first-party only,
 *     vendored exactly like katex/ — no remote scripts, no hosted bundles, no
 *     third-party packages pulled at runtime.
 *   - Primitives are pure functions / stateless math wherever possible. This is
 *     a box of tools, NOT a framework: figures call in; nothing calls back.
 *   - Reader-side static code: it runs in the browser. It is NEVER executed by
 *     CI — the stdlib-only verify floor stays untouched.
 *
 * VERSIONING (how we pin our OWN code)
 *   FIGURES_RUNTIME_VERSION below is the pin for this runtime, recorded in the
 *   file itself so a frozen chapter permanently records which runtime rendered
 *   its figures — the same way package.json pins katex@0.16.47 for the vendored
 *   math. Bump it on any behavioural change to a primitive.
 *
 * USAGE (browser)
 *   <script src="figures/figures.js"></script>
 *   const { solveKepler, seededScatter, logZoom, ease, el } = window.DossierFigures;
 */
(function (root) {
  "use strict";

  var FIGURES_RUNTIME_VERSION = "0.5.0";  // 0.2.0: +registry (registerPoster/posterEmitters) + dedupPoster; solveKepler relocated to orrery.js (additive + one relocation; live render back-compat intact); 0.3.0: +self-contained text-fit (annotation labels render at fixed px regardless of display width; browser-only, Node-safe); 0.4.0: +text tiers (lf-tick/lf-axis/lf-callout set --lf-text-size; additive, unclassed text unchanged); 0.5.0: +self-contained live-SVG lightbox (tap a living figure -> re-mount fresh, full-viewport, live; browser-only, Node-safe)

  // (solveKepler — Kepler's-equation solver — was relocated to figures/orrery.js,
  //  its ONLY consumer. A galaxy / cosmic-web / uniform-field figure is statistical
  //  structure, not orbital mechanics, so the CORE runtime now carries NO domain-
  //  specific physics — it is a fully general figure engine: PRNG, seeded scatter,
  //  log-zoom, scale-aware time, easing, SVG node/string emit, and the poster
  //  registry below. Any project registers its own figure type on top.)

  // -------------------------------------------------------------------------
  // 2) Deterministic procedural generation.
  //    mulberry32(seed) — a tiny, fast, fully deterministic PRNG returning a
  //    function that yields floats in [0, 1). Same seed => same stream, always
  //    and everywhere (the archival guarantee: a belt regenerates identically
  //    from a single integer seed instead of storing thousands of points).
  //    seededScatter(seed, count, fn) — seed a PRNG and call fn(rng, i) `count`
  //    times, collecting the results. This is how belts / fields / populations
  //    are GENERATED, not stored. (Proven by the zoom-orrery: ~12k points from
  //    a 99-byte parameter set.)
  // -------------------------------------------------------------------------
  function mulberry32(seed) {
    var a = seed | 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function seededScatter(seed, count, fn) {
    var rng = mulberry32(seed);
    var out = [];
    for (var i = 0; i < count; i++) {
      out.push(fn(rng, i));
    }
    return out;
  }

  // -------------------------------------------------------------------------
  // 3) logZoom — log-scale zoom mapping. Lets one 0..1 slider travel many
  //    orders of magnitude smoothly (the "5 orders of magnitude on one slider"
  //    primitive). Exponential interpolation, with an exact inverse.
  //      sliderToScale(s, lo, hi) : s in [0,1] -> scale in [lo, hi]
  //                                 s=0 -> lo, s=1 -> hi, monotonic increasing
  //      scaleToSlider(scale, lo, hi) : the exact inverse
  //    Needs lo > 0 and hi > 0 (log space). (Proven by the zoom-orrery.)
  // -------------------------------------------------------------------------
  var logZoom = {
    sliderToScale: function (s, lo, hi) {
      return lo * Math.pow(hi / lo, s);
    },
    scaleToSlider: function (scale, lo, hi) {
      return Math.log(scale / lo) / Math.log(hi / lo);
    }
  };

  // -------------------------------------------------------------------------
  // 4) scaleAwareTime(baseSpeed, scale) — couple play-speed to zoom scale so
  //    inner bodies stay legible when zoomed in (small scale -> slower) and
  //    giants visibly move when zoomed out (large scale -> faster). Fixes the
  //    inner-planet-blur problem. Monotonic increasing in scale, always > 0
  //    for baseSpeed > 0 and scale > 0.
  //    TIME_SCALE_EXP is the single tunable: 0 = no coupling (constant speed),
  //    1 = linear coupling; ~0.35 keeps both ends readable.
  // -------------------------------------------------------------------------
  var TIME_SCALE_EXP = 0.35;
  function scaleAwareTime(baseSpeed, scale) {
    return baseSpeed * Math.pow(scale, TIME_SCALE_EXP);
  }

  // -------------------------------------------------------------------------
  // 5) ease(t) — easeInOutCubic. Soft, crafted ("Prometheus-grade") motion
  //    instead of janky-linear. ease(0)=0, ease(1)=1, ease(0.5)=0.5, and the
  //    output stays within [0,1] for t in [0,1]. Pure function.
  // -------------------------------------------------------------------------
  function ease(t) {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // -------------------------------------------------------------------------
  // 6) el(tag, attrs) — minimal SVG element builder. createElementNS shorthand
  //    so figures can assemble SVG without ceremony. DOM-only (browser); it is
  //    never exercised by the author-local Node test.
  //      el("circle", { cx: 10, cy: 10, r: 4, fill: "currentColor" })
  // -------------------------------------------------------------------------
  var SVG_NS = "http://www.w3.org/2000/svg";
  function el(tag, attrs) {
    var node = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      for (var k in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, k)) {
          node.setAttribute(k, attrs[k]);
        }
      }
    }
    return node;
  }

  // -------------------------------------------------------------------------
  // 7) String-emit helpers — the siblings of el(): where el() emits a live DOM
  //    node, these emit safe SVG-string pieces for the build-time POSTER path
  //    (renderXPosterSVG). DOM-free, so they run in pure Node too.
  //      r2(n)     -> round a coordinate to 2 dp (compact poster output)
  //      escAttr/escTxt -> escape a value for an attribute / text node
  // -------------------------------------------------------------------------
  function r2(n) { return Math.round(n * 100) / 100; }
  function escAttr(s) { return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function escTxt(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  // -------------------------------------------------------------------------
  // 8) Figure-type REGISTRY — lets ANY project register a poster emitter under a
  //    spec `type`, so the build-time sealer (render_figures.js) dispatches by
  //    convention, NOT by hardcoded figure names. A downstream (non-astronomy)
  //    project drops in its module, calls registerPoster("its-type", itsPosterFn),
  //    and the sealer seals it — no fork of the template machinery. Live-only
  //    figures register nothing. dedupPoster centralises the one snippet every live
  //    renderer repeats: drop a sealed [data-poster] floor before rendering the
  //    live ceiling (additive — modules may adopt it).
  // -------------------------------------------------------------------------
  var posterEmitters = {};
  function registerPoster(type, fn) { posterEmitters[type] = fn; }
  function dedupPoster(container) {
    if (container && container.querySelector) {
      var baked = container.querySelector("[data-poster]");
      if (baked && baked.parentNode) baked.parentNode.removeChild(baked);
    }
  }

  // -------------------------------------------------------------------------
  // Public namespace. Attached to window in the browser; also exposed for the
  // author-local Node test (no third-party loader, just a plain object).
  // -------------------------------------------------------------------------
  var API = {
    FIGURES_RUNTIME_VERSION: FIGURES_RUNTIME_VERSION,
    mulberry32: mulberry32,
    seededScatter: seededScatter,
    logZoom: logZoom,
    scaleAwareTime: scaleAwareTime,
    ease: ease,
    el: el,
    r2: r2,
    escAttr: escAttr,
    escTxt: escTxt,
    posterEmitters: posterEmitters,
    registerPoster: registerPoster,
    dedupPoster: dedupPoster
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = API; // author-local Node test
  }
  if (typeof root !== "undefined" && root) {
    root.DossierFigures = API; // browser global
  }

  // -------------------------------------------------------------------------
  // TEXT-FIT — annotation legibility at the scaffold, browser-only + Node-safe.
  //
  //   A living-figure <svg> uses viewBox + width:100%, so ALL geometry — text
  //   included — scales by (clientWidth / viewBoxWidth). The SAME figure renders
  //   labels bigger on a wide page, smaller in a narrow column (authored "12" ~=
  //   14px on the 1000px showcase, ~9-11px in an 820px paper column). Labels are
  //   ANNOTATIONS (ticks, names, readouts) that should read at a fixed size like
  //   any UI text, NOT ride the art's zoom. SVG has no native non-scaling text
  //   (unlike vector-effect for strokes), so cancel the scale here: a
  //   ResizeObserver writes --lf-text-factor = viewBoxW/clientW on each .lf-svg,
  //   and an injected rule sizes figure text as calc(var(--lf-text-factor) *
  //   target). rendered = authored * (clientW/viewBoxW) * factor = target, at ANY
  //   width. The rule outranks inline font-size="..." presentation attrs, so EVERY
  //   figure (live ceiling + JS-on floor) is fixed with zero page/module edits,
  //   and it travels with the vendored runtime — every dossier inherits it on sync.
  //   JS-off floor shows at authored size (archival; accepted). Node sealer:
  //   guarded on document/ResizeObserver -> a no-op. Opt one <text> OUT with
  //   class "lf-scale-with-art".
  //   Tiers: text.lf-tick ~11px / .lf-axis ~13px / .lf-callout ~15px set --lf-text-size;
  //   unclassed (incl. .lf-label) uses the 13px default. All counter-scaled to px.
  // -------------------------------------------------------------------------
  (function initTextFit() {
    if (!root || !root.document || typeof root.ResizeObserver !== "function") return;
    var doc = root.document, STYLE_ID = "lf-textfit-style";

    function injectStyle() {
      if (doc.getElementById(STYLE_ID)) return;
      var st = doc.createElement("style");
      st.id = STYLE_ID;
      st.textContent =
        ".lf-svg text:not(.lf-scale-with-art){" +
        "font-size:calc(var(--lf-text-factor,1) * var(--lf-text-size,13px));}" +
        ".lf-svg text.lf-tick{--lf-text-size:11px;}" +
        ".lf-svg text.lf-axis{--lf-text-size:13px;}" +
        ".lf-svg text.lf-callout{--lf-text-size:15px;}";
      (doc.head || doc.documentElement).appendChild(st);
    }

    function setFactor(svg) {
      var vb = (svg.getAttribute("viewBox") || "").split(/[\s,]+/);
      var vbw = parseFloat(vb[2]) || 0;
      var cw = svg.clientWidth || (svg.getBoundingClientRect && svg.getBoundingClientRect().width) || 0;
      if (vbw > 0 && cw > 0) svg.style.setProperty("--lf-text-factor", vbw / cw);
    }

    var ro = new root.ResizeObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) setFactor(entries[i].target);
    });

    function observe(svg) {
      if (!svg || svg.__lfTextFit) return;
      svg.__lfTextFit = true;
      setFactor(svg);            // set once now to avoid a first-paint flash
      ro.observe(svg);
    }
    function scan(node) {
      if (!node || node.nodeType !== 1) return;
      if (node.matches && node.matches("svg.lf-svg")) observe(node);
      if (node.querySelectorAll) {
        var list = node.querySelectorAll("svg.lf-svg");
        for (var i = 0; i < list.length; i++) observe(list[i]);
      }
    }

    function boot() {
      injectStyle();
      scan(doc.documentElement);
      if (typeof root.MutationObserver === "function") {
        new root.MutationObserver(function (muts) {
          for (var i = 0; i < muts.length; i++) {
            var added = muts[i].addedNodes;
            for (var j = 0; j < added.length; j++) scan(added[j]);
          }
        }).observe(doc.documentElement, { childList: true, subtree: true });
      }
    }

    if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", boot);
    else boot();
  })();

  // -------------------------------------------------------------------------
  // LIGHTBOX — tap a living figure to open it large, LIVE. Browser-only + Node-safe.
  //
  //   Living figures render as inline <svg.lf-svg>, so the skin's image lightbox
  //   (which binds `figure img`) never sees them. Give them their own: because a
  //   figure stores a GENERATOR not output, "open large" is just re-mounting the
  //   same spec into a fresh full-viewport container via its renderX(container,
  //   spec) — fully live (slider + play come along), not a static blow-up (the
  //   sealed floor already IS the static version). Self-contained in the runtime:
  //   it injects its own style + overlay and wires triggers on load, so every
  //   dossier and every future edition inherits it on sync with zero page/skin
  //   edits — same pattern as the text-fit self-init above.
  //
  //   Re-mount FRESH (opens at the figure's default view; the inline instance
  //   underneath is untouched). renderX appends without clearing, so we mount into
  //   a NEW empty div each open and discard it on close — never re-call renderX on
  //   a live container. The figure's <figure data-figure> host carries the spec +
  //   a data-figure-type (or spec.type); we dispatch to DossierFigures["render" +
  //   Cap(type)]. Node-safe: guarded on document; the sealer never sees this.
  //
  //   Mirrors the skin lightbox (aria-modal dialog, Escape, backdrop-click,
  //   focus save/restore) and ADDS what it lacks: a real focus trap (Tab loops
  //   inside the overlay's live controls) and stopPropagation on the figure stage
  //   (clicking the figure's own slider must not close the overlay).
  // -------------------------------------------------------------------------
  (function initLightbox() {
    if (!root || !root.document) return;
    var doc = root.document, STYLE_ID = "lf-lightbox-style", OVERLAY_ID = "lf-lightbox";

    // type -> renderX fn name: "cosmic" -> renderCosmicZoom, else render<Cap(type)>.
    var TYPE_FN = {
      orrery: "renderOrrery", galaxy: "renderGalaxy", cosmic: "renderCosmicZoom",
      localgroup: "renderLocalGroup", cosmicweb: "renderCosmicWeb",
      observableuniverse: "renderObservableUniverse"
    };

    function specOf(host) {
      var raw = host.getAttribute("data-figure");
      if (!raw) return null;
      try { return JSON.parse(raw); } catch (e) { return null; }
    }
    function renderFnFor(spec, host) {
      var t = (spec && spec.type) || host.getAttribute("data-figure-type") || "";
      var name = TYPE_FN[t];
      var fn = name && API[name];
      return (typeof fn === "function") ? fn : null;
    }

    function injectStyle() {
      if (doc.getElementById(STYLE_ID)) return;
      var st = doc.createElement("style");
      st.id = STYLE_ID;
      st.textContent =
        "#" + OVERLAY_ID + "{position:fixed;inset:0;z-index:10001;display:none;" +
          "align-items:center;justify-content:center;background:rgba(23,38,44,.82);" +
          "padding:24px;-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px);}" +
        "#" + OVERLAY_ID + ".open{display:flex;}" +
        "#" + OVERLAY_ID + " .lf-lightbox-stage{width:min(1200px,94vw);max-height:92vh;}" +
        "#" + OVERLAY_ID + " .lf-lightbox-stage .lf-svg{max-height:82vh;}" +
        "#" + OVERLAY_ID + " .lf-lightbox-close{position:absolute;top:16px;right:20px;" +
          "font:600 13px/1 ui-monospace,Menlo,monospace;color:#fff;background:rgba(0,0,0,.35);" +
          "border:1.5px solid rgba(255,255,255,.5);border-radius:8px;padding:8px 12px;cursor:pointer;}" +
        ".lf-expand{position:absolute;top:10px;right:10px;z-index:3;" +
          "font:600 11px/1 ui-monospace,Menlo,monospace;color:#fff;background:rgba(0,0,0,.35);" +
          "border:1px solid rgba(255,255,255,.4);border-radius:6px;padding:5px 8px;cursor:zoom-in;" +
          "opacity:.75;transition:opacity .15s ease;}" +
        ".lf-expand:hover,.lf-expand:focus-visible{opacity:1;outline:2px solid #fff;outline-offset:1px;}";
      (doc.head || doc.documentElement).appendChild(st);
    }

    var overlay, stageWrap, closeBtn, lastFocus = null, mounted = null;

    function buildOverlay() {
      if (overlay) return;
      overlay = doc.createElement("div");
      overlay.id = OVERLAY_ID;
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.setAttribute("aria-label", "Figure, full size");
      overlay.setAttribute("aria-hidden", "true");
      closeBtn = doc.createElement("button");
      closeBtn.className = "lf-lightbox-close";
      closeBtn.type = "button";
      closeBtn.textContent = "Close \u2715";
      closeBtn.addEventListener("click", close);
      stageWrap = doc.createElement("div");
      stageWrap.className = "lf-lightbox-stage";
      // clicks INSIDE the live figure must not bubble to the backdrop-close
      stageWrap.addEventListener("click", function (e) { e.stopPropagation(); });
      overlay.appendChild(closeBtn);
      overlay.appendChild(stageWrap);
      overlay.addEventListener("click", close);   // backdrop
      (doc.body || doc.documentElement).appendChild(overlay);
    }

    function open(host) {
      var spec = specOf(host); if (!spec) return;
      var fn = renderFnFor(spec, host); if (!fn) return;
      buildOverlay();
      lastFocus = doc.activeElement;
      // fresh container each open; controls stay ON (it's the live, interactive copy)
      mounted = doc.createElement("div");
      stageWrap.appendChild(mounted);
      try { fn(mounted, spec); } catch (e) { close(); return; }
      overlay.classList.add("open");
      overlay.setAttribute("aria-hidden", "false");
      closeBtn.focus();
      doc.addEventListener("keydown", onKey, true);
    }
    function close() {
      if (!overlay) return;
      overlay.classList.remove("open");
      overlay.setAttribute("aria-hidden", "true");
      if (mounted && mounted.parentNode) mounted.parentNode.removeChild(mounted);  // discard the live copy
      mounted = null;
      doc.removeEventListener("keydown", onKey, true);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key === "Tab") {                                   // focus trap
        var f = overlay.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
        if (!f.length) { e.preventDefault(); closeBtn.focus(); return; }
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }

    // Add an "expand" trigger to each living-figure host that has a dispatchable spec.
    function wire(host) {
      if (!host || host.__lfLightbox) return;
      var spec = specOf(host); if (!spec) return;
      if (!renderFnFor(spec, host)) return;      // no live renderer -> no trigger
      host.__lfLightbox = true;
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      var btn = doc.createElement("button");
      btn.className = "lf-expand";
      btn.type = "button";
      btn.textContent = "\u21F1 expand";
      btn.setAttribute("aria-label", "Open figure full size");
      btn.addEventListener("click", function (e) { e.stopPropagation(); open(host); });
      host.appendChild(btn);
    }
    function scan(node) {
      if (!node || node.nodeType !== 1) return;
      if (node.matches && node.matches(".living-figure[data-figure]")) wire(node);
      if (node.querySelectorAll) {
        var list = node.querySelectorAll(".living-figure[data-figure]");
        for (var i = 0; i < list.length; i++) wire(list[i]);
      }
    }
    function boot() {
      injectStyle();
      scan(doc.documentElement);
      if (typeof root.MutationObserver === "function") {
        new root.MutationObserver(function (muts) {
          for (var i = 0; i < muts.length; i++) {
            var added = muts[i].addedNodes;
            for (var j = 0; j < added.length; j++) scan(added[j]);
          }
        }).observe(doc.documentElement, { childList: true, subtree: true });
      }
    }
    if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", boot);
    else boot();
  })();
})(typeof window !== "undefined" ? window : null);
