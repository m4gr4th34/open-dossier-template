#!/usr/bin/env node
"use strict";
/*
 * figures.test.js — author-local test for the living-figures runtime.
 *
 * Exercises every figures.js primitive WITHOUT a browser (pure math/logic), the
 * same author-local discipline as render_math.js: run it on your machine with
 * Node; it is NEVER run by CI (the stdlib-only verify floor stays untouched).
 *
 *   node figures/figures.test.js
 *
 * Prints PASS/FAIL per primitive and exits non-zero on ANY failure (fail-loud).
 *
 * The SVG el() helper is DOM-only and is NOT exercised here (no document in
 * Node); it is covered when a real figure is wired into a page in a later phase.
 */

var F = require("./figures.js");

var fails = 0;
function check(name, cond) {
  console.log((cond ? "  PASS  " : "  FAIL  ") + name);
  if (!cond) fails++;
}
function approx(a, b, eps) {
  return Math.abs(a - b) <= (eps === undefined ? 1e-9 : eps);
}
function arrEq(a, b) {
  if (a.length !== b.length) return false;
  for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

console.log("figures runtime v" + F.FIGURES_RUNTIME_VERSION + " — primitive tests\n");

// --- solveKepler RELOCATED to figures/orrery.js (v0.2.0): the runtime is now
//     domain-general, so its primitive test no longer covers orbital mechanics —
//     Kepler's equation belongs to the orrery, its only consumer. ---

// --- 1) seededScatter ---------------------------------------------------------
console.log("\nseededScatter(seed, count, fn):");
(function () {
  var draw = function (s) { return F.seededScatter(s, 5, function (rng) { return rng(); }); };
  var a = draw(42), b = draw(42), c = draw(43);
  check("same seed -> identical sequence (archival determinism)", arrEq(a, b));
  check("different seed -> different sequence", !arrEq(a, c));
  check("correct count", F.seededScatter(7, 1000, function () { return 0; }).length === 1000);
  check("rng yields floats in [0,1)", a.every(function (x) { return x >= 0 && x < 1; }));
})();

// --- 3) logZoom ---------------------------------------------------------------
console.log("\nlogZoom.sliderToScale / scaleToSlider:");
(function () {
  var lo = 1, hi = 1e5;
  check("sliderToScale(0) === lo", approx(F.logZoom.sliderToScale(0, lo, hi), lo));
  check("sliderToScale(1) === hi", approx(F.logZoom.sliderToScale(1, lo, hi), hi));
  var mono = true, prev = -Infinity;
  for (var s = 0; s <= 1.0000001; s += 0.1) {
    var v = F.logZoom.sliderToScale(s, lo, hi);
    if (v <= prev) mono = false;
    prev = v;
  }
  check("monotonic increasing in s", mono);
  var inv = true;
  for (var t = 0; t <= 1.0000001; t += 0.1) {
    var back = F.logZoom.scaleToSlider(F.logZoom.sliderToScale(t, lo, hi), lo, hi);
    if (!approx(back, t, 1e-9)) inv = false;
  }
  check("scaleToSlider is the exact inverse", inv);
})();

// --- 4) scaleAwareTime --------------------------------------------------------
console.log("\nscaleAwareTime(baseSpeed, scale):");
(function () {
  var base = 2;
  check("positive for positive inputs", F.scaleAwareTime(base, 5) > 0);
  check("zoomed out (larger scale) is faster", F.scaleAwareTime(base, 100) > F.scaleAwareTime(base, 1));
  var mono = true, prev = -Infinity;
  for (var sc = 1; sc <= 1e5; sc *= 10) {
    var spd = F.scaleAwareTime(base, sc);
    if (spd <= prev) mono = false;
    prev = spd;
  }
  check("monotonic increasing in scale", mono);
})();

// --- 5) ease ------------------------------------------------------------------
console.log("\nease(t) — easeInOutCubic:");
check("ease(0) === 0", approx(F.ease(0), 0));
check("ease(1) === 1", approx(F.ease(1), 1));
check("ease(0.5) ≈ 0.5", approx(F.ease(0.5), 0.5, 1e-9));
(function () {
  var bounded = true;
  for (var t = 0; t <= 1.0000001; t += 0.05) {
    var v = F.ease(t);
    if (v < -1e-12 || v > 1 + 1e-12) bounded = false;
  }
  check("output bounded in [0,1] for t in [0,1]", bounded);
})();

// --- el() — DOM-only, skipped -------------------------------------------------
console.log("\nel(tag, attrs): SKIPPED (DOM-only; covered when wired into a page)");

console.log("\n" + (fails ? fails + " FAILURE(S)" : "all primitives passed") + ".");
process.exit(fails ? 1 : 0);
