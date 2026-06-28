#!/usr/bin/env node
'use strict';
/*
 * verify_markdown.js — the MARKDOWN PROJECTION GATE for Open Dossier.
 *
 * Asserts the committed markdown projection is exactly what render_markdown.js
 * produces from the source:  index.md == renderMarkdown(editions/index.source.html,
 * avenues.json, verify_numbers.py results).  If index.md is hand-edited instead of
 * re-rendered from the source, this fails loud — the same discipline the edition
 * round-trip gate (verify_edition.js) applies to index.html.
 *
 * Also light-checks llms.txt: it must parse as the minimal standard structure
 * (H1 + a blockquote summary + a "## Editions" list linking index.md) and match
 * buildLlmsTxt().
 *
 * Pure Node (+ the verifier subprocess, via renderMarkdown). Read-only: renders in
 * memory, writes nothing. Runs author-local AND in CI (the verify-claims workflow).
 *
 * Usage:
 *   node verify_markdown.js     # exit 0 = in sync; exit 1 = drift (with a hint)
 *   npm run check-markdown
 */
const fs = require('fs');
const path = require('path');
const { renderMarkdown, buildLlmsTxt } = require('./render_markdown.js');

const OUT_MD = path.join(__dirname, 'index.md');
const OUT_LLMS = path.join(__dirname, 'llms.txt');

function fail(msg) { process.stderr.write('verify_markdown: ' + msg + '\n'); process.exit(1); }

// CHECK 1 — index.md fidelity: committed markdown must equal a fresh render.
const onDisk = fs.readFileSync(OUT_MD, 'utf8');
const rendered = renderMarkdown();
if (rendered !== onDisk) {
  const a = onDisk.split('\n'), b = rendered.split('\n');
  const n = Math.min(a.length, b.length);
  let i = 0; while (i < n && a[i] === b[i]) i++;
  const ctx = s => JSON.stringify((s === undefined ? '<EOF>' : s).slice(0, 80));
  process.stderr.write('verify_markdown: first differing line ' + (i + 1) + '\n');
  process.stderr.write('  on-disk : ' + ctx(a[i]) + '\n');
  process.stderr.write('  rendered: ' + ctx(b[i]) + '\n');
  fail('index.md out of sync with editions/index.source.html.\n' +
       '  Run `npm run render-markdown` and commit the result — never hand-edit index.md.');
}

// CHECK 2 — llms.txt: minimal structure + in sync with the generator.
const llms = fs.readFileSync(OUT_LLMS, 'utf8');
const structure = [
  [/^# .+/m, 'missing an H1 title'],
  [/^> .+/m, 'missing the blockquote summary'],
  [/^## Editions\b/m, 'missing the "## Editions" section'],
  [/\]\(index\.md\)/, 'the Editions list does not link index.md'],
];
for (const [re, msg] of structure) if (!re.test(llms)) fail('llms.txt ' + msg + '.');
if (buildLlmsTxt() !== llms) {
  fail('llms.txt out of sync — run `npm run render-markdown` and commit the result.');
}

process.stdout.write('verify_markdown: markdown projection OK — index.md + llms.txt match the source\n');
process.exit(0);
