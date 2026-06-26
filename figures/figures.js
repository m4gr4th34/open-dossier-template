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

  var FIGURES_RUNTIME_VERSION = "0.1.0";

  // -------------------------------------------------------------------------
  // 1) solveKepler(M, e) — Kepler's equation solver (Newton's method).
  //    Solves  E - e*sin(E) = M  for the eccentric anomaly E, the per-frame
  //    physics core of any orbiting body. Six Newton iterations is plenty for
  //    figure-grade accuracy across all bound eccentricities (0 <= e < 1).
  //    Pure function. (Proven by the orrery.)
  //      M : mean anomaly (radians)
  //      e : eccentricity (0 = circle)
  //    Returns the eccentric anomaly E (radians). For e = 0, E === M exactly.
  // -------------------------------------------------------------------------
  function solveKepler(M, e) {
    var E = M; // good initial guess for low/moderate e
    for (var i = 0; i < 6; i++) {
      E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    }
    return E;
  }

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
  // Public namespace. Attached to window in the browser; also exposed for the
  // author-local Node test (no third-party loader, just a plain object).
  // -------------------------------------------------------------------------
  var API = {
    FIGURES_RUNTIME_VERSION: FIGURES_RUNTIME_VERSION,
    solveKepler: solveKepler,
    mulberry32: mulberry32,
    seededScatter: seededScatter,
    logZoom: logZoom,
    scaleAwareTime: scaleAwareTime,
    ease: ease,
    el: el
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = API; // author-local Node test
  }
  if (typeof root !== "undefined" && root) {
    root.DossierFigures = API; // browser global
  }
})(typeof window !== "undefined" ? window : null);
