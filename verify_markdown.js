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
 * Also checks llms.txt: it must parse as the minimal structure (H1 + a blockquote
 * summary + a "## Working draft" entry linking index.md + a "## Chapters" section)
 * AND equal buildLlmsTxt() — which is lineage-driven, so the index can't go stale.
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

// CHECK 2 — llms.txt: minimal structure + byte-equality with the (lineage-driven) generator.
const llms = fs.readFileSync(OUT_LLMS, 'utf8');
const structure = [
  [/^# .+/m, 'missing an H1 title'],
  [/^> .+/m, 'missing the blockquote summary'],
  [/^## Working draft\b/m, 'missing the "## Working draft" section'],
  [/^## Chapters\b/m, 'missing the "## Chapters" section'],
  [/\]\(index\.md\)/, 'the working-draft entry does not link index.md'],
];
for (const [re, msg] of structure) if (!re.test(llms)) fail('llms.txt ' + msg + '.');
const llmsFresh = buildLlmsTxt();
if (llmsFresh !== llms) {
  const a = llms.split('\n'), b = llmsFresh.split('\n');
  const n = Math.min(a.length, b.length);
  let i = 0; while (i < n && a[i] === b[i]) i++;
  const ctx = s => JSON.stringify((s === undefined ? '<EOF>' : s).slice(0, 80));
  process.stderr.write('verify_markdown: llms.txt first differing line ' + (i + 1) + '\n');
  process.stderr.write('  on-disk : ' + ctx(a[i]) + '\n');
  process.stderr.write('  rendered: ' + ctx(b[i]) + '\n');
  fail('llms.txt out of sync with lineage.json + source — run `npm run render-markdown` and commit the result.');
}

process.stdout.write('verify_markdown: markdown projection OK — index.md + llms.txt match the source\n');
process.exit(0);
