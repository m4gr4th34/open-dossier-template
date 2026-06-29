#!/usr/bin/env node
'use strict';
/*
 * verify_edition.js — the edition ROUND-TRIP GATE for Open Dossier.
 *
 * Asserts each committed edition is exactly what render_edition.js produces
 * from its sources — for every entry in EDITIONS:
 *     <edition>.html  ==  renderEdition(its source, skin/edition.html)
 * If index.html is hand-edited (instead of editing the SOURCE and re-rendering),
 * this fails loud so the partition can't silently rot.
 *
 * Scope: this is the ROUND-TRIP gate only — it proves the rejoin is faithful
 * (each edition == render(its source, skin)). It is NOT the full content-projection
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
const { renderEdition, EDITIONS } = require('./render_edition.js');

function fail(msg) { process.stderr.write('verify_edition: ' + msg + '\n'); process.exit(1); }

// One edition's round-trip: committed bytes must equal a fresh render, and no token may
// leak. relOut/relSource render today's index strings ('index.html' /
// 'editions/index.source.html') and parameterize identically for any future edition.
function checkEdition(ed) {
  const relOut = path.relative(__dirname, ed.out);
  const relSource = path.relative(__dirname, ed.source);
  const onDisk = fs.readFileSync(ed.out, 'utf8');
  const rendered = renderEdition(undefined, ed.source);   // undefined => default skin (the one skin)

  // CHECK 1 — fidelity: committed relOut must equal a fresh render.
  if (rendered !== onDisk) {
    const a = onDisk.split('\n'), b = rendered.split('\n');
    const n = Math.min(a.length, b.length);
    let i = 0; while (i < n && a[i] === b[i]) i++;
    const ctx = s => JSON.stringify((s === undefined ? '<EOF>' : s).slice(0, 80));
    process.stderr.write('verify_edition: first differing line ' + (i + 1) + '\n');
    process.stderr.write('  on-disk : ' + ctx(a[i]) + '\n');
    process.stderr.write('  rendered: ' + ctx(b[i]) + '\n');
    fail(relOut + ' is out of sync with ' + relSource + ' + skin/edition.html.\n' +
         '  Run `npm run render-edition` and commit the result — never hand-edit ' + relOut + '.');
  }

  // CHECK 2 — totality: no unresolved slot/mount/fragment token survived.
  if (/\{\{|<!--mount:|<!--fragment:/.test(rendered)) {
    fail('unresolved slot/mount/fragment token in render output.');
  }

  process.stdout.write('verify_edition: edition round-trip OK — ' + relOut + ' matches source+skin\n');
}

for (const ed of EDITIONS) checkEdition(ed);
process.exit(0);
