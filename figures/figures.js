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

  var FIGURES_RUNTIME_VERSION = "0.11.1";  // 0.2.0: +registry (registerPoster/posterEmitters) + dedupPoster; solveKepler relocated to orrery.js (additive + one relocation; live render back-compat intact); 0.3.0: +self-contained text-fit (annotation labels render at fixed px regardless of display width; browser-only, Node-safe); 0.4.0: +text tiers (lf-tick/lf-axis/lf-callout set --lf-text-size; additive, unclassed text unchanged); 0.5.0: +self-contained live-SVG lightbox (tap a living figure -> re-mount fresh, full-viewport, live; browser-only, Node-safe); 0.6.0: lightbox v2 — registerRenderer registry (reaches any figure type, not just the demos), postMessage breakout (full-viewport overlay from inside iframes), legible trigger; 0.7.0: overlay backdrop solid (no blur veiling the live figure) + self-injected control-bar CSS (controls styled in any breakout host) + zoom slider direction flipped (right = zoom IN; presentation-only, scale byte-identical) + IntersectionObserver visibility gate (off-screen figures stop animating); 0.8.0: registerRenderer is the sole lightbox dispatch contract — drop the initialism-fragile render<Cap(type)> fallback, warn (not silently skip) on an unregistered figure type, document registerRenderer as a required adoption step; 0.9.0: adaptive lightbox mat (figure declares data-figure.stage; overlay derives a luminance-separated backdrop, dark-default so astronomy is unchanged) + reserved-header expand trigger (docked in a reserved top band, never over figure content); 0.10.0: presentation mount — the overlay shows the figure AS PUBLISHED: spec.stage now paints the mounted figure's own background (mat derived from it), optional spec.caption renders under the figure, mat-aware Close chip; chip band gets a containment floor (embed-safe); the three live-only demos declare their type; 0.10.1: modules migrated to text tiers (lf-tick/lf-axis/lf-callout by ROLE on both emit paths; zero inline font-size); edge-anchored labels budgeted for the counter-scale factor; the sealed poster carries a static tier stylesheet so the JS-off floor renders at true tier sizes (11/13/15) -- the tier CSS was previously JS-injected only; fail-closed font-size gate in figures.test.js; 0.10.2: caption single-source — the sealer bakes <figcaption> from spec.caption (page + JS-off floor + lightbox all render from one field); controls get a horizontal inset when the host strips side padding (embed hug fix); 0.11.0: lightbox opens at the reader's current zoom (state-handoff via module handles), figures honor prefers-reduced-motion (start paused), and every figure gets a Reset control that re-derives the published start view from the spec; 0.11.1: rotation recompute runs at frame rate — the per-node spin throttle drops to ROT_MS 16 (60Hz) on the light modules (localgroup/cosmicweb/observableuniverse, <=1ms/batch) and 33 (30Hz) on galaxy (heaviest recompute, ~2.5ms + a ~9000-star cull), removing the visible 15Hz stepping at a measured sub-frame cost; the throttle knob stays, only the value changes

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
  // Live-renderer registry — the sibling of posterEmitters. A module registers its
  // interactive renderX under the SAME type key its spec uses, so the lightbox (and
  // any consumer) can reach ANY figure type by data, with no hardcoded per-type list.
  var renderers = {};
  function registerRenderer(type, fn) { renderers[type] = fn; }
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
    renderers: renderers,
    registerRenderer: registerRenderer,
    dedupPoster: dedupPoster,
    // Reader accessibility: figures start paused when the OS requests reduced motion. Node-safe
    // (no matchMedia -> false). Modules AND the Reset control consult this at (re)start.
    prefersReducedMotion: function () {
      return !!(root && root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches);
    }
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

    function specOf(host) {
      var raw = host.getAttribute("data-figure");
      if (!raw) return null;
      try { return JSON.parse(raw); } catch (e) { return null; }
    }
    // Resolve a figure type to its live renderer through the registry ONLY: a module registers its
    // renderer with DossierFigures.registerRenderer("<type>", fn) under the exact spec.type string.
    // No name-based fallback -- an earlier render<Cap(type)> convention title-cased each segment
    // ("qc-frontier" -> "renderQcFrontier"), which could never match an initialism-cased renderer
    // (renderQCFrontier / renderMLModel), silently dropping the lightbox. The registry is exact, so
    // the fn name is the author's to choose; it just has to be registered under the type string.
    function renderFnFor(spec, host) {
      var t = (spec && spec.type) || (host && host.getAttribute("data-figure-type")) || "";
      var fn = t && API.renderers[t];
      return (typeof fn === "function") ? fn : null;
    }

    // ---- adaptive lightbox mat (0.9.0) ----
    // The overlay mats the live figure. A figure's visible field is a HOST CSS gradient the runtime
    // cannot sample (getComputedStyle(svg).backgroundColor is transparent), so the figure DECLARES its
    // backdrop via spec.stage and the overlay derives a luminance-separated mat: a light figure gets a
    // slightly darker mat, a dark figure a slightly lighter one, so it reads as sitting ON a stage
    // rather than marooned. No stage -> DEFAULT_MAT (today's dark), so astronomy is byte-unchanged.
    // Pure + Node-safe (string math only; never touches the DOM).
    var DEFAULT_MAT = "#0d1117";
    function parseHex(hex) {
      if (typeof hex !== "string") return null;
      var m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.replace(/^\s+|\s+$/g, ""));
      if (!m) return null;
      var h = m[1];
      if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
      return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
    }
    function clamp255(n) { n = Math.round(n); return n < 0 ? 0 : (n > 255 ? 255 : n); }
    function hex2(n) { var s = clamp255(n).toString(16); return s.length === 1 ? "0" + s : s; }
    // Relative luminance, standard Rec.709 coefficients, per-channel 0-255 (no gamma decode -- this is
    // only a light/dark branch threshold, not a contrast computation): L = (0.2126R + 0.7152G + 0.0722B)/255.
    function luminance(c) { return (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255; }
    function deriveMat(stageHex) {
      var c = parseHex(stageHex);
      if (!c) return DEFAULT_MAT;            // unparseable -> safe dark default
      var L = luminance(c), f, r, g, b;
      if (L >= 0.5) {                        // light stage -> slightly darker mat (mix ~4.5% toward black)
        f = 0.045;
        r = c.r * (1 - f); g = c.g * (1 - f); b = c.b * (1 - f);
      } else {                               // dark stage  -> slightly lighter mat (mix ~4% toward white)
        f = 0.04;
        r = c.r + (255 - c.r) * f; g = c.g + (255 - c.g) * f; b = c.b + (255 - c.b) * f;
      }
      return "#" + hex2(r) + hex2(g) + hex2(b);
    }
    // Is a resolved mat/color light? (drives the mat-aware Close chip + caption color in the overlay.)
    function isLightHex(hex) { var c = parseHex(hex); return !!c && luminance(c) >= 0.5; }

    function injectStyle() {
      if (doc.getElementById(STYLE_ID)) return;
      var st = doc.createElement("style");
      st.id = STYLE_ID;
      st.textContent =
        "#" + OVERLAY_ID + "{position:fixed;inset:0;z-index:10001;display:none;" +
          "align-items:center;justify-content:center;background:#0d1117;" +
          "padding:24px;}" +
        "#" + OVERLAY_ID + ".open{display:flex;}" +
        "#" + OVERLAY_ID + " .lf-lightbox-stage{width:min(1200px,94vw);max-height:92vh;}" +
        "#" + OVERLAY_ID + " .lf-lightbox-stage .lf-svg{max-height:82vh;}" +
        // Control-bar CSS shipped by the runtime, scoped to the overlay -- a breakout host (e.g. the
        // showcase top doc) may lack the demos' .lf-controls styles, so the mounted controls would
        // otherwise fall back to native browser chrome. Concrete values (not var tokens) so it works
        // on any host. Only affects broken-out figures; the demos keep their own inline control CSS.
        "#lf-lightbox .lf-controls{display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;" +
          "margin-top:12px;font:12.5px/1.4 ui-monospace,Menlo,Consolas,monospace;color:#586a6f;}" +
        "#lf-lightbox .lf-btn{font:600 12.5px/1 ui-monospace,Menlo,Consolas,monospace;" +
          "padding:7px 12px;border:1.5px solid #17262c;background:#fff;color:#17262c;" +
          "border-radius:10px;cursor:pointer;-webkit-appearance:none;appearance:none;}" +
        "#lf-lightbox .lf-btn:hover{box-shadow:0 2px 12px rgba(23,38,44,.12);}" +
        "#lf-lightbox .lf-region{border-color:#0c8f86;color:#0c8f86;}" +
        "#lf-lightbox .lf-play{border-color:#0c8f86;background:#0c8f86;color:#fff;}" +
        "#lf-lightbox .lf-field{display:flex;align-items:center;gap:7px;letter-spacing:.06em;" +
          "text-transform:uppercase;font-size:11px;}" +
        "#lf-lightbox .lf-range{accent-color:#0c8f86;cursor:pointer;}" +
        "#lf-lightbox .lf-readout{margin-left:auto;font-size:11.5px;color:#586a6f;white-space:nowrap;}" +
        "#lf-lightbox .lf-cosmic{cursor:default;}" +
        // lf-fallback: the "runtime not found" message; can't appear in a breakout (the renderer IS
        // the runtime), covered for completeness so the whole emitted control family is host-independent.
        "#lf-lightbox .lf-fallback{font:12.5px/1.4 ui-monospace,Menlo,Consolas,monospace;color:#cf5d36;}" +
        "#" + OVERLAY_ID + " .lf-lightbox-close{position:absolute;top:16px;right:20px;" +
          "font:600 13px/1 ui-monospace,Menlo,monospace;color:#fff;background:rgba(0,0,0,.35);" +
          "border:1.5px solid rgba(255,255,255,.5);border-radius:8px;padding:8px 12px;cursor:pointer;}" +
        // Caption travels with the figure (spec.caption). Color is set inline at open time (mat-aware);
        // font/spacing only here. Lives in the stage, under the mounted figure.
        "#lf-lightbox .lf-lightbox-caption{font:12.5px/1.5 ui-monospace,Menlo,Consolas,monospace;" +
          "margin:10px 4px 0;max-width:78ch;}" +
        ".lf-expand{position:absolute;top:8px;right:14px;z-index:6;" +
          "font:600 11px/1 ui-monospace,Menlo,monospace;color:#fff;" +
          "background:rgba(15,20,24,.92);border:1px solid rgba(255,255,255,.75);" +
          "border-radius:6px;padding:6px 9px;cursor:zoom-in;opacity:1;" +
          "box-shadow:0 1px 6px rgba(0,0,0,.4);transition:background .15s ease,transform .12s ease;}" +
        ".lf-expand:hover,.lf-expand:focus-visible{background:rgba(30,40,48,.98);transform:translateY(-1px);" +
          "outline:2px solid #fff;outline-offset:1px;}";
      (doc.head || doc.documentElement).appendChild(st);
    }

    var overlay, stageWrap, closeBtn, lastFocus = null, mounted = null, caption = null;

    // Mat-aware Close chip: the one dark-assuming control. Light mat -> ink-on-white; dark mat ->
    // clear the inline overrides so the injected CSS dark default shows through. Clearing (not
    // re-setting) means repeated opens with different stages never leak styles.
    function setCloseTheme(light) {
      if (!closeBtn) return;
      if (light) {
        closeBtn.style.color = "#17262c";
        closeBtn.style.background = "rgba(255,255,255,.9)";
        closeBtn.style.border = "1px solid rgba(23,38,44,.35)";
      } else {
        closeBtn.style.color = "";
        closeBtn.style.background = "";
        closeBtn.style.border = "";
      }
    }

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

    // Mount a spec into the top-hosted overlay -- the shared core: BOTH a local open and a
    // breakout message land here. No host needed; dispatch is purely by spec.type.
    function openSpec(spec, view) {
      var fn = renderFnFor(spec); if (!fn) return;
      buildOverlay();
      // Presentation mount: show the figure AS PUBLISHED. spec.stage is the figure's declared backdrop;
      // the overlay mat is DERIVED from it (0.9.0), and the figure now paints its OWN field with it too
      // (below, after mount). No stage -> DEFAULT_MAT dark, so every astronomy figure is byte-unchanged.
      var stage = spec && typeof spec.stage === "string" ? spec.stage : null;
      var mat = stage ? deriveMat(stage) : DEFAULT_MAT;
      var lightMat = isLightHex(mat);
      overlay.style.background = mat;
      setCloseTheme(lightMat);            // mat-aware Close chip; dark mat clears back to the CSS default
      lastFocus = doc.activeElement;
      // fresh container each open; controls stay ON (it's the live, interactive copy)
      mounted = doc.createElement("div");
      stageWrap.appendChild(mounted);
      var handle;
      try { handle = fn(mounted, spec); } catch (e) { close(); return; }
      // State-handoff: re-mount at the reader's view (passed from the trigger / breakout message).
      // setMaster for the composed master slider, setSlider for a single figure. No view / no handle
      // -> the module's published start (today's behavior; graceful for adopters returning no handle).
      if (view && handle) {
        if (view.sliderM != null && handle.setMaster) handle.setMaster(view.sliderM);
        else if (view.slider != null && handle.setSlider) handle.setSlider(view.slider);
      }
      // The figure carries its own field into the overlay: paint the declared stage onto the mounted
      // .lf-svg layer(s) inline (querySelectorAll -- the cosmic composer mounts several stacked layers).
      // Inline beats the host's .lf-svg gradient; no module code sets an .lf-svg background to fight it.
      // No stage -> untouched, so the figure keeps whatever the host CSS gives it (today's behavior).
      if (stage) {
        var svgs = mounted.querySelectorAll("svg.lf-svg");
        for (var i = 0; i < svgs.length; i++) svgs[i].style.background = stage;
      }
      // Optional caption travels with the figure -- rendered under it so a reader never closes the
      // lightbox to read what the figure shows. textContent (never innerHTML); color is mat-aware.
      if (spec && typeof spec.caption === "string" && spec.caption) {
        caption = doc.createElement("p");
        caption.className = "lf-lightbox-caption";
        caption.textContent = spec.caption;
        caption.style.color = lightMat ? "#17262c" : "#c9d4d2";
        stageWrap.appendChild(caption);
      }
      overlay.classList.add("open");
      overlay.setAttribute("aria-hidden", "false");
      closeBtn.focus();
      doc.addEventListener("keydown", onKey, true);
    }
    function open(host) {
      var spec = specOf(host); if (!spec) return;
      // State-handoff: read the reader's CURRENT view off the live handle the module stashed on the
      // host (container.__lfHandle). The overlay re-mounts at this zoom instead of the published start,
      // so "expand" continues from where the reader is. No handle (e.g. an adopter that returns none)
      // -> null -> the published start (today's behavior). Minimal payload: {slider} or {sliderM}.
      var h = host.__lfHandle, st = h && h.getState ? h.getState() : null;
      var view = st ? (st.sliderM != null ? { sliderM: st.sliderM } : { slider: st.slider }) : null;
      // CHILD role: an iframed figure hands its spec + view UP to the top document, which hosts a
      // full-viewport overlay (escapes the iframe cap). Same-origin is the live path; if top is
      // unreachable (cross-origin throws) or we ARE the top (not iframed), fall back to a local overlay.
      try {
        if (root.top && root.top !== root.self) {
          root.top.postMessage({ source: "lf-lightbox", type: "open", spec: spec, view: view }, "*");
          return;
        }
      } catch (e) { /* cross-origin or blocked -> local fallback below */ }
      openSpec(spec, view);
    }
    function close() {
      if (!overlay) return;
      overlay.classList.remove("open");
      overlay.setAttribute("aria-hidden", "true");
      if (mounted && mounted.parentNode) mounted.parentNode.removeChild(mounted);  // discard the live copy
      mounted = null;
      if (caption && caption.parentNode) caption.parentNode.removeChild(caption);  // discard the caption
      caption = null;
      setCloseTheme(false);                                                         // reset chip to dark default
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
      if (!renderFnFor(spec, host)) {
        // A declared-but-unregistered type is almost always a forgotten registerRenderer, not intent.
        // Warn (once per host -- wire runs once per host) naming the type + the fix, instead of a
        // silent drop. A spec with NO type at all stays a silent skip; console guarded for Node-safety.
        var t = (spec && spec.type) || host.getAttribute("data-figure-type") || "";
        if (t && root.console && root.console.warn) {
          root.console.warn('[figures] no live renderer registered for figure type "' + t +
            '" -- call DossierFigures.registerRenderer("' + t + '", <yourRenderFn>) so the lightbox can open it.');
        }
        return;   // still no trigger, but now the author is TOLD why
      }
      host.__lfLightbox = true;
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      // Reserve a header band for the trigger so the chip never sits over figure content. A tappable
      // chip can't fit the host's top padding without straddling the card or covering the canvas, so
      // ADD ~20px to whatever padding-top the host already has (additive -> any host padding composes),
      // with a FLOOR of 34px: embed mode (?embed=1) strips host padding to 0, where pt+20=20 left a
      // 20px band under a 25px chip (chip spans 33px) -> 13px canvas overlap on every showcase card.
      // max(pt+20, 34) contains the chip in embed; standalone (14+20=34) is unchanged.
      // Only wired hosts (a dispatchable spec) are touched; type-less/unwired figures keep their layout.
      var cs = root.getComputedStyle(host);
      var pt = parseFloat(cs.paddingTop) || 0;
      host.style.paddingTop = Math.max(pt + 20, 34) + "px";
      // Embed hosts (?embed=1) strip the card's SIDE padding to 0, so the controls readout hugs the
      // edge. If the host lost its horizontal padding, inset the controls ROW itself (14px L/R). The
      // canvas stays full-bleed (the inset is on .lf-controls, a sibling, not on the host). wire()
      // runs on DOMContentLoaded, after the demo's render created the controls, so they're present.
      if ((parseFloat(cs.paddingLeft) || 0) < 10) {
        var ctrls = host.querySelector(".lf-controls");
        if (ctrls) { ctrls.style.paddingLeft = "14px"; ctrls.style.paddingRight = "14px"; }
      }
      var btn = doc.createElement("button");
      btn.className = "lf-expand";
      btn.type = "button";
      btn.textContent = "\u21F1 expand";
      btn.setAttribute("aria-label", "Open figure full size");
      btn.addEventListener("click", function (e) { e.stopPropagation(); open(host); });
      host.appendChild(btn);
      // The sealed <figcaption class="lf-caption"> was baked as the figure's LAST child, but the live
      // render appended the svg + controls AFTER it (dedupPoster removes only the poster svg, not the
      // caption). Move the caption back to last so it stays BELOW the figure on the JS-on page; the
      // JS-off floor keeps it last natively (no live render). wire() runs post-render (DOMContentLoaded).
      var figcap = host.querySelector("figcaption.lf-caption");
      if (figcap) host.appendChild(figcap);
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
    // HOST role: any document that loads figures.js also listens for breakout messages from
    // child iframes and mounts them into ITS OWN top-level overlay (the same openSpec path).
    // So the showcase, loading figures.js at top level, hosts full-viewport overlays for the
    // figures living in its iframes.
    root.addEventListener("message", function (ev) {
      var d = ev.data;
      if (!d || d.source !== "lf-lightbox" || d.type !== "open" || !d.spec) return;
      openSpec(d.spec, d.view);
    });
    if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", boot);
    else boot();
  })();
})(typeof window !== "undefined" ? window : null);
