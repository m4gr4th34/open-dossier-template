#!/usr/bin/env node
'use strict';
/*
 * render_backcatalog.js — re-skin every sealed chapter in the CURRENT skin.
 *
 * GitHub Pages serves only the latest commit, so an old chapter's frozen editions
 * (chapters/<tag>/) keep their OLD skin forever — the version of record, immutable
 * and DOI'd. This renderer produces a parallel CURRENT-skin reading view of each
 * chapter under live/<tag>/index.html, so the whole back-catalog re-skins when the
 * template's skin advances, WITHOUT touching the frozen record.
 *
 * For each chapter in lineage.json it does, from the chapter's OWN sealed bytes:
 *   - wrap(source@tag, skin@HEAD)         via renderEdition(SKIN, sealed source, ...)
 *   - bake machinery from sealed data     cards from chapters/<tag>/avenues.json, console
 *                                         verdict from verify_numbers.py --avenues <that file>
 *                                         (cards AND verdict single-sourced from ONE sealed file)
 *   - an HONEST-LABEL banner ({{record_note}}) — the re-skin is NOT the record; it points the
 *     reader at the immutable chapters/<tag>/index.html (with its timestamp + DOI)
 *   - the SAME outward-rewire + release-label bake freeze applies (reused via
 *     freeze_chapter.py --reskin — one rewire implementation, no divergence), so assets/nav
 *     resolve from the live root and the provenance bar reads "release <tag>".
 *
 * Pure Node + python3 subprocesses (the verifier + the shared rewire), exactly like the other
 * render_* tools. Author-local writer; the in-memory renderChapter() export is what CI's
 * verify_backcatalog.js re-derives. Fail-loud on a lineage entry whose sealed files are missing.
 *
 * Empty lineage => writes nothing, prints a visible 0-chapter line, exits 0.
 *
 * Usage:
 *   node render_backcatalog.js     # writes live/<tag>/index.html for every lineage chapter
 *   npm run render-backcatalog
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { renderEdition } = require('./render_edition.js');
const { readAvenues, runVerifier } = require('./render_markdown.js');

const ROOT = __dirname;
const SKIN = path.join(ROOT, 'skin', 'edition.html');
const LINEAGE = path.join(ROOT, 'lineage.json');
const LIVE = path.join(ROOT, 'live');

function die(msg) { process.stderr.write('render_backcatalog: ' + msg + '\n'); process.exit(1); }
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// The HONEST LABEL (doctrine-critical): a back-catalog reader is the current-skin RE-SKIN,
// never the DOI'd record. The banner says so plainly and points at the immutable frozen record
// (chapters/<tag>/index.html), carrying its timestamp and DOI when present in lineage. The label
// must NEVER imply the re-skin IS the record. Styled inline (no skin CSS change) so the empty
// working-draft slot stays byte-identical; the CSS vars resolve from the rendered :root.
function recordBanner(ch) {
  const date = ch.released ? esc(ch.released) : 'the release date';
  const doi = ch.version_doi || ch.concept_doi || '';
  const doiBit = doi ? ' · DOI ' + esc(doi) : '';
  return '\n  <div class="record-note" role="note" style="margin:18px 0;padding:12px 16px;'
    + 'border:1px solid var(--line);border-left:4px solid var(--open);border-radius:var(--r-lg);'
    + 'background:var(--open-soft);color:var(--ink2);font-size:14.5px;line-height:1.55">'
    + '<b style="color:var(--open)">Reading the current edition.</b> '
    + 'The version of record (timestamped ' + date + doiBit + ') is '
    + '<a href="../../chapters/' + esc(ch.tag) + '/index.html">chapters/' + esc(ch.tag) + '/index.html</a>.'
    + '</div>';
}

// Render ONE chapter to its re-skinned HTML (in memory; writes NOTHING). Exported so the gate
// (verify_backcatalog.js) re-derives byte-for-byte. Fail-loud on missing sealed inputs.
function renderChapter(ch) {
  if (!ch || !ch.tag) die('lineage entry missing "tag": ' + JSON.stringify(ch));
  const tag = ch.tag;
  const chDir = path.join(ROOT, 'chapters', tag);
  const source = path.join(chDir, 'editions', 'index.source.html');
  const chAvenues = path.join(chDir, 'avenues.json');
  for (const [label, p] of [['content source', source], ['avenues.json', chAvenues]]) {
    if (!fs.existsSync(p)) {
      die('chapter ' + tag + ': missing sealed ' + label + ' (' + path.relative(ROOT, p)
        + ') — re-freeze the chapter (5b-ii-2a seals avenues.json into chapters/<tag>/).');
    }
  }
  // machinery from the chapter's OWN sealed avenues.json: cards via readAvenues(sealed),
  // verdict via verify_numbers.py --avenues <sealed> — ONE sealed file, so cards and verdict agree.
  const machinery = { avenues: readAvenues(chAvenues).avenues, verdict: runVerifier(chAvenues) };
  let html = renderEdition(SKIN, source, machinery, recordBanner(ch));
  // outward-rewire (../../) + release-label bake — the SAME transform freeze applies, reused
  // (not re-implemented) from freeze_chapter.py so the reading view's chrome matches the record's.
  html = execFileSync('python3', ['verification/freeze_chapter.py', '--reskin', tag],
    { cwd: ROOT, input: html, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return html;
}

// lineage.json -> the ordered chapters array (empty when rootless / missing).
function readLineage() {
  let data;
  try { data = JSON.parse(fs.readFileSync(LINEAGE, 'utf8')); }
  catch (e) { die('cannot read lineage.json: ' + e.message); }
  return Array.isArray(data.chapters) ? data.chapters : [];
}

function renderAll() {
  const chapters = readLineage();
  if (!chapters.length) {
    process.stdout.write('back-catalog: 0 chapters in lineage (nothing to re-skin)\n');
    return [];
  }
  const written = [];
  for (const ch of chapters) {
    const html = renderChapter(ch);
    const outDir = path.join(LIVE, ch.tag);
    fs.mkdirSync(outDir, { recursive: true });
    const out = path.join(outDir, 'index.html');
    fs.writeFileSync(out, html);
    written.push(path.relative(ROOT, out));
  }
  return written;
}

if (require.main === module) {
  const written = renderAll();
  if (written.length) {
    process.stdout.write('render_backcatalog: re-skinned ' + written.length
      + ' chapter(s): ' + written.join(', ') + '\n');
  }
}

module.exports = { renderChapter, readLineage };
