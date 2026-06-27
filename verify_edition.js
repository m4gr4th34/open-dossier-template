#!/usr/bin/env node
'use strict';
/*
 * verify_edition.js — the edition ROUND-TRIP GATE for Open Dossier.
 *
 * Asserts the committed front door is exactly what render_edition.js produces
 * from its sources:
 *     index.html  ==  renderEdition(editions/index.source.html, skin/edition.html)
 * If index.html is hand-edited (instead of editing the SOURCE and re-rendering),
 * this fails loud so the partition can't silently rot.
 *
 * Scope: this is the ROUND-TRIP gate only — it proves the rejoin is faithful
 * (index.html == render(source, skin)). It is NOT the full content-projection
 * equivalence gate (floor == live == markdown); that lands at step 4, once a
 * live reader (skin@HEAD) and a markdown projection exist to compare. See
 * BOUNDARY.md.
 *
 * Pure Node, no browser. Safe to run anytime: it renders in memory and writes
 * NOTHING (read-only). Runs author-local AND in CI (the verify-claims workflow).
 *
 * Usage:
 *   node verify_edition.js     # exit 0 = in sync; exit 1 = drift (with a hint)
 *   npm run check-edition
 */
const fs = require('fs');
const path = require('path');
const { renderEdition } = require('./render_edition.js');

const OUT = path.join(__dirname, 'index.html');

function fail(msg) { process.stderr.write('verify_edition: ' + msg + '\n'); process.exit(1); }

const onDisk = fs.readFileSync(OUT, 'utf8');
const rendered = renderEdition();

// CHECK 1 — fidelity: committed index.html must equal a fresh render.
if (rendered !== onDisk) {
  const a = onDisk.split('\n'), b = rendered.split('\n');
  const n = Math.min(a.length, b.length);
  let i = 0; while (i < n && a[i] === b[i]) i++;
  const ctx = s => JSON.stringify((s === undefined ? '<EOF>' : s).slice(0, 80));
  process.stderr.write('verify_edition: first differing line ' + (i + 1) + '\n');
  process.stderr.write('  on-disk : ' + ctx(a[i]) + '\n');
  process.stderr.write('  rendered: ' + ctx(b[i]) + '\n');
  fail('index.html is out of sync with editions/index.source.html + skin/edition.html.\n' +
       '  Run `npm run render-edition` and commit the result — never hand-edit index.html.');
}

// CHECK 2 — totality: no unresolved slot/mount/fragment token survived.
if (/\{\{|<!--mount:|<!--fragment:/.test(rendered)) {
  fail('unresolved slot/mount/fragment token in render output.');
}

process.stdout.write('verify_edition: edition round-trip OK — index.html matches source+skin\n');
process.exit(0);
