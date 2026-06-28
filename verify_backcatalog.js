#!/usr/bin/env node
'use strict';
/*
 * verify_backcatalog.js — gate: every committed live/<tag>/index.html equals what
 * render_backcatalog.js would produce for that chapter RIGHT NOW.
 *
 * The back-catalog re-skins are GENERATED (live/<tag>/index.html = re-skin of the chapter's
 * sealed source in skin@HEAD, machinery baked from its sealed avenues.json). This is the
 * render_backcatalog twin of verify_edition's round-trip gate: it regenerates each chapter in
 * memory and asserts byte-equality with the committed file, so a stale live/ (skin advanced but
 * the back-catalog wasn't re-rendered) goes red instead of shipping an out-of-date reading view.
 *
 * Pure Node + the same python3 subprocesses render_backcatalog uses (read-only here: renders in
 * memory, writes nothing). Empty lineage -> visible 0-chapter pass.
 *
 * Usage:
 *   node verify_backcatalog.js     # exit 0 = every live/<tag> matches its render
 *   npm run check-backcatalog
 */
const fs = require('fs');
const path = require('path');
const { renderChapter, readLineage } = require('./render_backcatalog.js');

const ROOT = __dirname;

function fail(msg) { process.stderr.write('verify_backcatalog: ' + msg + '\n'); process.exit(1); }

const chapters = readLineage();
if (!chapters.length) {
  process.stdout.write('verify_backcatalog: 0 chapters in lineage (nothing to verify)\n');
  process.exit(0);
}

let checked = 0;
for (const ch of chapters) {
  if (!ch.tag) fail('lineage entry missing "tag": ' + JSON.stringify(ch));
  const out = path.join(ROOT, 'live', ch.tag, 'index.html');
  if (!fs.existsSync(out)) {
    fail('live/' + ch.tag + '/index.html missing — run npm run render-backcatalog');
  }
  const committed = fs.readFileSync(out, 'utf8');
  const expected = renderChapter(ch);       // re-derive in memory (fail-loud on missing sealed inputs)
  if (committed !== expected) {
    fail('live/' + ch.tag + ' out of sync (' + committed.length + ' committed vs '
      + expected.length + ' rendered bytes) — run npm run render-backcatalog');
  }
  checked++;
}

process.stdout.write('verify_backcatalog: ' + checked
  + ' chapter(s) in sync (live/<tag>/index.html == render_backcatalog output)\n');
process.exit(0);
