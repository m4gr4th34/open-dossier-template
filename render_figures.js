#!/usr/bin/env node
"use strict";
/*
 * render_figures.js — author-local, build-time SEALER for living figures.
 *
 * Mirrors render_math.js's IO / invocation shape: pure Node, no browser, NEVER
 * run by CI. The render STEP differs — instead of katex.renderToString it calls
 * our PURE poster function DossierFigures.renderOrreryPosterSVG(spec), reachable
 * in Node because the Phase-3a poster path touches no DOM (that is the whole 3a
 * payoff). For each <figure ... data-figure='...'> it bakes the sealed <svg>
 * poster INSIDE the figure as the JS-OFF floor, keeping the figure's OPEN TAG
 * (and thus data-figure) byte-identical as the source of truth — exactly how
 * render_math keeps data-tex. The poster <svg> is marked data-poster="1" so the
 * live runtime removes it before rendering (one <svg> JS-ON; the floor upgrades
 * to the ceiling).
 *
 * Usage:
 *   node render_figures.js                 # defaults to orrery-demo.html
 *   node render_figures.js a.html b.html
 *   npm run render-figures
 *
 * Idempotent: re-running regenerates the poster from data-figure (discarding the
 * prior <svg data-poster>), so a second run is a no-op (result === src). Figures
 * without data-figure are never touched. Fail-loud: non-zero exit on any error.
 */

const fs = require("fs");
const path = require("path");

// Load the runtime + every figure module into Node WITHOUT a browser. The vendored
// modules attach to window.DossierFigures (UMD-lite); shim a minimal window so
// require() registers them, then the PURE poster paths are reachable.
//
// AUTO-LOAD (so a downstream project drops in its OWN module — e.g. qc-frontier.js —
// and registers a poster WITHOUT editing this file): require figures.js FIRST (it
// defines DossierFigures + the registry), then EVERY other figures/*.js. Load order
// among the modules does NOT matter — a composer's poster (e.g. cosmiczoom delegating
// to the galaxy poster) resolves at SEAL time, by which point all modules are loaded;
// nothing cross-references another module at require/IIFE time. figures.test.js is
// skipped (it is a test, not a module).
global.window = global.window || {};
const FIG_DIR = path.join(__dirname, "figures");
require(path.join(FIG_DIR, "figures.js"));   // -> window.DossierFigures (runtime + registry) — MUST be first
fs.readdirSync(FIG_DIR)
  .filter((f) => f.endsWith(".js") && f !== "figures.js" && f !== "figures.test.js")
  .sort()
  .forEach((f) => require(path.join(FIG_DIR, f)));   // each module self-registers its poster (if any)
const DossierFigures = global.window.DossierFigures;

// Dispatch by the spec's declared `type`, via the runtime poster REGISTRY that each
// module populates (registerPoster). NO hardcoded figure names, NO domain-key sniff —
// a downstream project's type works as soon as its module registers an emitter.
// THREE outcomes:
//   - type set + emitter registered -> seal with it          (.poster non-empty)
//   - type set + NO emitter          -> live-ceiling-only      (.live = copy through, NOT an error)
//   - type ABSENT (or bad spec)      -> FAIL LOUD              (.error; left unchanged)
function posterFor(spec) {
  if (!spec || typeof spec.type !== "string" || !spec.type) {
    return { poster: "", live: false, error: 'figure spec has no "type" — cannot dispatch a poster emitter' };
  }
  var emit = DossierFigures.posterEmitters[spec.type];
  if (!emit) return { poster: "", live: true, error: null };           // declared type, no emitter -> live-only
  var poster = emit(spec) || "";
  return { poster: poster, live: false, error: poster ? null : ('poster emitter for type "' + spec.type + '" returned empty') };
}

// Decode the predefined entities so a data-figure value becomes raw JSON
// (e.g. Barnard&#39;s -> Barnard's). &amp; last. (mirrors render_math.)
function decodeEntities(s) {
  return s
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'").replace(/&amp;/g, "&");
}

// Encode the predefined entities for baking a spec string into HTML (the inverse of
// decodeEntities; the live overlay uses textContent, but the sealer builds strings, so
// spec.caption must be escaped here). &amp; FIRST so it doesn't double-encode the others.
function escHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// The data-figure attribute value (as authored, still entity-encoded), or null.
function getDataFigure(openTag) {
  var m = /\sdata-figure\s*=\s*("([^"]*)"|'([^']*)')/i.exec(openTag);
  if (!m) return null;
  return m[2] !== undefined ? m[2] : m[3];
}

// Index of the '>' that closes the open tag at lt, respecting quoted attributes
// (data-figure='…' carries JSON; never let a quoted char end the tag early).
function endOfOpenTag(html, lt) {
  var quote = null;
  for (var j = lt; j < html.length; j++) {
    var c = html[j];
    if (quote) { if (c === quote) quote = null; }
    else if (c === '"' || c === "'") quote = c;
    else if (c === ">") return j;
  }
  return -1;
}

// Matching </figure>, depth-counting nested <figure>. Returns {start,end} of the
// close tag, or null if unbalanced.
function findMatchingClose(html, tag, from) {
  var re = new RegExp("<" + tag + "(?=[\\s/>])|</" + tag + "\\s*>", "gi");
  re.lastIndex = from;
  var depth = 1, m;
  while ((m = re.exec(html))) {
    if (m[0][1] === "/") { depth--; if (depth === 0) return { start: m.index, end: re.lastIndex }; }
    else depth++;
  }
  return null;
}

function renderHtml(html) {
  var out = "", i = 0, count = 0, errors = 0;
  var openRe = /<figure\b/gi;

  while (true) {
    openRe.lastIndex = i;
    var m = openRe.exec(html);
    if (!m) { out += html.slice(i); break; }

    var lt = m.index;
    var gt = endOfOpenTag(html, lt);
    if (gt < 0) { out += html.slice(i); break; }       // malformed; copy rest verbatim

    var openTag = html.slice(lt, gt + 1);
    var df = getDataFigure(openTag);
    if (df === null) {                                  // not a living figure — copy through
      out += html.slice(i, gt + 1); i = gt + 1; continue;
    }

    var close = findMatchingClose(html, "figure", gt + 1);
    if (!close) { out += html.slice(i); i = html.length; break; }  // unbalanced; bail safely

    // Generate the sealed poster from the SAME spec (pure, deterministic),
    // dispatched by the spec's declared `type` via the runtime poster REGISTRY.
    // THREE outcomes (see posterFor): seal | live-only copy-through | fail loud.
    var disp;
    try {
      var spec = JSON.parse(decodeEntities(df));
      disp = posterFor(spec);
    } catch (e) { disp = { poster: "", live: false, error: "data-figure is not valid JSON" }; }

    // Caption single-source: bake <figcaption class="lf-caption"> from spec.caption for ANY figure
    // with a parseable spec (poster-sealed AND live-only alike), as the LAST child of the <figure>.
    // The page, the JS-off floor, and the lightbox all render from this ONE field -- prose drift is
    // unrepresentable. Escaped (the sealer builds strings). Idempotent: strip any prior baked caption
    // before regenerating (discard-and-regen, mirroring the poster/tier-style strip). No caption ->
    // bake nothing and strip any stale one.
    var figcapRe = /\s*<figcaption\b[^>]*\blf-caption\b[\s\S]*?<\/figcaption>/i;
    var capStr = (spec && typeof spec.caption === "string" && spec.caption) ? spec.caption : "";
    var capFrag = capStr ? ('\n    <figcaption class="lf-caption">' + escHtml(capStr) + "</figcaption>") : "";
    // Insert the caption BEFORE the figure's trailing indentation (the whitespace before </figure>),
    // not after it. This is the idempotency fixpoint: on re-seal, figcapRe's leading \s* then removes
    // exactly the caption's own "\n    " prefix (restBody ends non-whitespace), leaving rest unchanged.
    // Appending after the trailing whitespace would let the greedy \s* swallow that indentation on the
    // SECOND pass, so pass1 != pass2. No caption -> return rest untouched (uncaptioned figures unchanged).
    function withCaption(rest) {
      if (!capFrag) return rest;
      var trail = (rest.match(/\s*$/) || [""])[0];
      return rest.slice(0, rest.length - trail.length) + capFrag + trail;
    }

    if (disp.poster) {
      // Mark the poster <svg> so the live runtime removes it before appending.
      var tagged = disp.poster.replace(/^<svg /, '<svg data-poster="1" ');
      // The JS-OFF floor needs a static size source: the tier sizing (.lf-tick/.lf-axis/.lf-callout)
      // is otherwise INJECTED by the runtime and so exists only when JS runs. Bake a static tier
      // stylesheet as a SIBLING of the poster (NOT inside it -- the live renderer removes [data-poster]
      // but leaves this <style>, so it persists into the JS-on path). WITHOUT the counter-scale calc:
      // the floor renders at true tier sizes (11/13/15). Specificity is engineered so the runtime's
      // injected rule wins when JS is on: the injected `.lf-svg text:not(.lf-scale-with-art)` scores
      // (0,2,1); the baked tier selectors are class-only `.lf-svg .lf-tick` -> (0,2,0), a notch below,
      // so injected's counter-scaled calc overrides live; JS-off, the tier (0,2,0) still beats the
      // baked default `.lf-svg text` (0,1,1). Idempotent: strip any prior lf-tier <style> (like the poster).
      var tierStyle = '<style class="lf-tier-style">' +
        '.lf-svg text{font-size:13px}' +
        '.lf-svg .lf-tick{font-size:11px}' +
        '.lf-svg .lf-axis{font-size:13px}' +
        '.lf-svg .lf-callout{font-size:15px}' +
        '.lf-caption{font:12.5px/1.5 ui-monospace,Menlo,Consolas,monospace;color:#586a6f;margin:10px 14px 0;max-width:78ch;}' +
        '</style>';
      // New inner = tier <style> + the sealed poster + the existing inner MINUS any prior poster,
      // prior tier <style>, AND prior baked caption (idempotent), then the fresh caption LAST. The
      // figure's OPEN TAG is preserved verbatim, so data-figure stays the source of truth.
      var inner = html.slice(gt + 1, close.start);
      var rest = inner
        .replace(/\s*<svg\b[^>]*\bdata-poster\b[\s\S]*?<\/svg>/i, "")
        .replace(/\s*<style\b[^>]*\blf-tier-style\b[\s\S]*?<\/style>/i, "")
        .replace(figcapRe, "");
      out += html.slice(i, lt) + openTag + "\n    " + tierStyle + "\n    " + tagged + withCaption(rest) + html.slice(close.start, close.end);
      count++;
    } else if (disp.live) {
      // type is declared but registers NO poster emitter -> a live-ceiling-only figure (localgroup /
      // cosmicweb / observableuniverse, or any future live-only type). No poster/tier-style to bake,
      // but the caption is single-sourced here too: strip any prior baked caption and re-append the
      // fresh one (no caption -> byte-identical copy-through, so uncaptioned live figures are unchanged).
      var innerL = html.slice(gt + 1, close.start);
      var restL = innerL.replace(figcapRe, "");
      out += html.slice(i, lt) + openTag + withCaption(restL) + html.slice(close.start, close.end);
    } else {
      // type ABSENT, bad JSON, or an emitter that returned empty -> FAIL LOUD.
      errors++;
      if (disp.error) console.error("  ! " + disp.error);
      out += html.slice(i, close.end);   // left UNCHANGED — never rewritten with an empty poster
    }
    i = close.end;
  }

  return { html: out, count: count, errors: errors };
}

function main() {
  var args = process.argv.slice(2);
  var files = args.length ? args : ["orrery-demo.html"];
  var grandFig = 0, grandErr = 0, changed = 0;

  for (var n = 0; n < files.length; n++) {
    var f = files[n];
    var p = path.resolve(process.cwd(), f);
    if (!fs.existsSync(p)) { console.error("  skip (not found): " + f); continue; }
    var src = fs.readFileSync(p, "utf8");
    var res = renderHtml(src);
    if (res.html !== src) { fs.writeFileSync(p, res.html); changed++; }
    var errNote = res.errors ? " (" + res.errors + " with errors!)" : "";
    console.log("  " + f + ": " + res.count + " figure(s) sealed" + errNote);
    grandFig += res.count; grandErr += res.errors;
  }

  console.log(
    "done — " + grandFig + " figure(s) across " + files.length + " file(s); " +
    changed + " file(s) rewritten" + (grandErr ? "; " + grandErr + " error(s)" : "") + "."
  );
  // Non-zero exit if any figure failed, so an author/agent notices.
  process.exit(grandErr ? 1 : 0);
}

main();
