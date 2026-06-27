#!/usr/bin/env node
"use strict";
/*
 * render_math.js — author-local, build-time math prerenderer for Open Dossier.
 *
 * Scans HTML for elements carrying a data-tex attribute and renders each with
 * KaTeX (the vendored, pinned package — see package.json) INTO the element,
 * leaving data-tex in place as the permanent LaTeX source of truth.
 *
 *   <div  class="eq"   data-tex="E = mc^2"></div>   -> display mode (block)
 *   <span class="math" data-tex="x_i"></span>       -> inline mode
 *
 * The committed HTML therefore contains the rendered math (HTML + MathML), so
 * READERS NEED NO JAVASCRIPT and CI never renders math. matplotlib-style:
 * author-local only (requires Node); see AUTHORING.md.
 *
 * Idempotent: each run regenerates the inner HTML from data-tex (discarding any
 * previous render), so an agent edits data-tex and re-runs cleanly. Elements
 * without data-tex are never touched. Re-running with no data-tex change is a
 * no-op (the file is not rewritten).
 *
 * Usage:
 *   node render_math.js                 # defaults to index.html
 *   node render_math.js index.html a.html b.html
 *   npm run render-math
 */

const fs = require("fs");
const path = require("path");
const katex = require("katex");

// --- tiny HTML helpers (no parser dependency; controlled markup only) --------

// Decode the five predefined XML/HTML entities so an attribute value becomes raw
// LaTeX (e.g. data-tex="a &lt; b" -> "a < b"). &amp; is decoded last.
function decodeEntities(s) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&amp;/g, "&");
}
function escHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escAttr(s) {
  return escHtml(s).replace(/"/g, "&quot;");
}

// Index of the '>' that closes the opening tag beginning at `lt` ('<'),
// skipping any '>' that sits inside a quoted attribute value.
function endOfOpenTag(html, lt) {
  let quote = null;
  for (let j = lt; j < html.length; j++) {
    const c = html[j];
    if (quote) {
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === ">") {
      return j;
    }
  }
  return -1;
}

// The data-tex attribute value (as authored, still entity-encoded), or null.
function getDataTex(openTag) {
  const m = /\sdata-tex\s*=\s*("([^"]*)"|'([^']*)')/i.exec(openTag);
  if (!m) return null;
  return m[2] !== undefined ? m[2] : m[3];
}

// Find the matching close tag for `tag`, depth-counting nested same-name tags
// (KaTeX output is full of nested <span>s). Returns {start,end} of the close
// tag, or null if unbalanced. `from` is the index just past the open tag's '>'.
function findMatchingClose(html, tag, from) {
  const re = new RegExp("<" + tag + "(?=[\\s/>])|</" + tag + "\\s*>", "gi");
  re.lastIndex = from;
  let depth = 1, m;
  while ((m = re.exec(html))) {
    if (m[0][1] === "/") {
      depth--;
      if (depth === 0) return { start: m.index, end: re.lastIndex };
    } else {
      depth++;
    }
  }
  return null;
}

// --- core --------------------------------------------------------------------

function renderHtml(html) {
  let out = "", i = 0, count = 0, errors = 0;
  const openRe = /<(div|span)\b/gi;

  while (true) {
    openRe.lastIndex = i;
    const m = openRe.exec(html);
    if (!m) { out += html.slice(i); break; }

    const tag = m[1].toLowerCase();
    const lt = m.index;
    const gt = endOfOpenTag(html, lt);
    if (gt < 0) { out += html.slice(i); break; } // malformed; copy rest verbatim

    const openTag = html.slice(lt, gt + 1);
    const dt = getDataTex(openTag);
    if (dt === null) {
      // Not a math element — copy through (incl. this open tag) and continue.
      out += html.slice(i, gt + 1);
      i = gt + 1;
      continue;
    }

    const close = findMatchingClose(html, tag, gt + 1);
    if (!close) { out += html.slice(i); i = html.length; break; } // unbalanced; bail safely

    const latex = decodeEntities(dt);
    const displayMode = tag === "div"; // div.eq -> display; span.math -> inline

    // KaTeX renders an invalid expression as red errorColor text (NOT a
    // katex-error class), so sniffing the output is unreliable. A throwOnError
    // probe tells us truthfully whether the LaTeX parses, for an accurate count.
    let hadError = false;
    try {
      katex.renderToString(latex, { displayMode: displayMode, throwOnError: true, output: "htmlAndMathml" });
    } catch (e) {
      hadError = true;
    }

    let rendered;
    try {
      // Actual output: throwOnError:false -> a bad expression renders visibly
      // (red) instead of crashing. output:"htmlAndMathml" -> accessible MathML.
      rendered = katex.renderToString(latex, {
        displayMode: displayMode,
        throwOnError: false,
        output: "htmlAndMathml",
      });
    } catch (e) {
      // Should not occur with throwOnError:false, but never crash the build.
      hadError = true;
      rendered =
        '<span class="katex-error" title="' +
        escAttr(String((e && e.message) || e)) +
        '">' + escHtml(latex) + "</span>";
    }
    if (hadError) errors++;

    // openTag is preserved verbatim -> data-tex stays exactly as authored.
    out += html.slice(i, lt) + openTag + rendered + html.slice(close.start, close.end);
    i = close.end;
    count++;
  }

  return { html: out, count: count, errors: errors };
}

// --- CLI ---------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  const files = args.length ? args : ["index.html"];
  let grandEq = 0, grandErr = 0, changed = 0;

  for (const f of files) {
    const p = path.resolve(process.cwd(), f);
    if (!fs.existsSync(p)) {
      console.error("  skip (not found): " + f);
      continue;
    }
    const src = fs.readFileSync(p, "utf8");
    const res = renderHtml(src);
    if (res.html !== src) {
      fs.writeFileSync(p, res.html);
      changed++;
    }
    const errNote = res.errors ? " (" + res.errors + " with errors!)" : "";
    console.log("  " + f + ": " + res.count + " equation(s) rendered" + errNote);
    grandEq += res.count;
    grandErr += res.errors;
  }

  console.log(
    "done — " + grandEq + " equation(s) across " + files.length + " file(s); " +
    changed + " file(s) rewritten" + (grandErr ? "; " + grandErr + " render error(s)" : "") + "."
  );
  // Non-zero exit if any expression failed, so an author/agent notices.
  process.exit(grandErr ? 1 : 0);
}

main();
