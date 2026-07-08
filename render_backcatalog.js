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
const { readAvenues } = require('./render_markdown.js');

const ROOT = __dirname;
const SKIN = path.join(ROOT, 'skin', 'edition.html');
const LINEAGE = path.join(ROOT, 'lineage.json');
const LIVE = path.join(ROOT, 'live');

function die(msg) { process.stderr.write('render_backcatalog: ' + msg + '\n'); process.exit(1); }
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// The HONEST LABEL (doctrine-critical) + the CITE-THE-RECORD affordance: a back-catalog reader
// is the current-skin RE-SKIN, never the DOI'd record. The banner (a) labels it the current
// edition and says plainly it is NOT the record, (b) gives a "Cite this chapter" line with the
// version DOI (and the concept/all-versions DOI when distinct) as the citable identifier, and
// (c) links to the immutable version of record (chapters/<tag>/index.html). The DOI is the
// citation; the record door is the bytes. It must NEVER imply the re-skin IS the record — it
// points AT it. Styled inline (no skin CSS change) so the EMPTY working-draft slot stays
// byte-identical; the CSS vars resolve from the rendered :root.
function recordBanner(ch, recordFile) {
  const tag = esc(ch.tag);
  const date = ch.released ? esc(ch.released) : 'the release date';
  const vdoi = ch.version_doi || '', cdoi = ch.concept_doi || '';
  const doiLink = (id, label) => '<a href="https://doi.org/' + esc(id) + '" target="_blank" rel="noopener">' + label + '</a>';
  let cite;
  if (vdoi) {
    cite = 'DOI ' + doiLink(vdoi, esc(vdoi) + ' ↗')
      + ((cdoi && cdoi !== vdoi) ? ' · ' + doiLink(cdoi, 'all versions ↗') : '');
  } else if (cdoi) {
    cite = 'DOI (all versions) ' + doiLink(cdoi, esc(cdoi) + ' ↗');
  } else {
    cite = 'the version of record (no DOI registered yet)';
  }
  return '\n  <div class="record-note" role="note" style="margin:18px 0;padding:13px 16px;'
    + 'border:1px solid var(--line);border-left:4px solid var(--open);border-radius:var(--r-lg);'
    + 'background:var(--open-soft);color:var(--ink2);font-size:14px;line-height:1.55">'
    + '<div><b style="color:var(--open)">Reading the current edition.</b> '
    + 'A current-skin reading view of a sealed chapter (released ' + date + ') — not the version of record.</div>'
    + '<div style="margin-top:6px"><b>Cite this chapter:</b> ' + cite + '</div>'
    + '<div style="margin-top:4px"><a href="../../chapters/' + tag + '/' + recordFile + '" target="_blank" rel="noopener">View the version of record ↗</a>'
    + ' <span style="opacity:.85">— the immutable, DOI\'d bytes (chapters/' + tag + '/' + recordFile + ').</span></div>'
    + '</div>';
}

// The editions a chapter reskins, mirroring render_edition.js EDITIONS but for sealed sources.
// index BAKES machinery (3 mounts) from the chapter's OWN sealed avenues.json; dossier/verify
// are machinery-free (0 mounts -> bakeMachinery never runs -> no avenues read needed). Each
// edition's record-banner points at its OWN sealed record (dossier reskin -> dossier record).
const RESKIN_EDITIONS = [
  { src: 'index.source.html',   out: 'index.html',   bakes: true  },
  { src: 'dossier.source.html', out: 'dossier.html', bakes: false },
  { src: 'verify.source.html',  out: 'verify.html',  bakes: false },
];

// Render ONE chapter to its three re-skinned editions: returns { 'index.html': html, ... }
// (in memory; writes NOTHING). Exported so the gate (verify_backcatalog.js) re-derives
// byte-for-byte. Fail-loud on missing sealed inputs.
function renderChapter(ch) {
  if (!ch || !ch.tag) die('lineage entry missing "tag": ' + JSON.stringify(ch));
  const tag = ch.tag;
  const chDir = path.join(ROOT, 'chapters', tag);
  const editionsDir = path.join(chDir, 'editions');
  const out = {};
  for (const ed of RESKIN_EDITIONS) {
    const source = path.join(editionsDir, ed.src);
    if (!fs.existsSync(source)) {
      die('chapter ' + tag + ': missing sealed source ' + path.relative(ROOT, source)
        + ' — re-freeze the chapter (CAPTURE_VERBATIM seals all edition sources).');
    }
    // machinery ONLY for the baking edition (index): cards via readAvenues(sealed avenues.json),
    // verdict via verify_numbers.py --avenues <sealed>. dossier/verify (no mounts) skip baking
    // entirely, so they need no avenues read.
    let machinery = null;
    if (ed.bakes) {
      const chAvenues = path.join(chDir, 'avenues.json');
      if (!fs.existsSync(chAvenues)) {
        die('chapter ' + tag + ': missing sealed avenues.json (' + path.relative(ROOT, chAvenues)
          + ') — re-freeze the chapter (seals avenues.json into chapters/<tag>/).');
      }
      // Verdict is READ from the chapter's sealed verdict.json, never recomputed. The console
      // verdict depends on avenues.json AND the verifier code, and only avenues.json is sealed, so
      // re-running the CURRENT verifier against OLD avenues would bake the wrong check-set onto an
      // old chapter (a false label). freeze seals verdict.json; verification/seal_verdicts.py
      // backfills pre-existing chapters. Sealed data => the re-skin reproduces the record's verdict
      // by construction, and verify_numbers.py no longer determines live/ bytes.
      const chVerdict = path.join(chDir, 'verdict.json');
      if (!fs.existsSync(chVerdict)) {
        die('chapter ' + tag + ': missing sealed verdict.json (' + path.relative(ROOT, chVerdict)
          + ') — run `python3 verification/seal_verdicts.py` to backfill it from the sealed index.md.');
      }
      machinery = { avenues: readAvenues(chAvenues).avenues, verdict: JSON.parse(fs.readFileSync(chVerdict, 'utf8')) };
    }
    let html = renderEdition(SKIN, source, machinery, recordBanner(ch, ed.out));
    // outward-rewire (../../) + release-label bake — the SAME transform freeze applies, reused
    // from freeze_chapter.py --reskin (now collapsed to rewire+label; sibling-bare nav). One
    // implementation, so the reading view's chrome matches the record's.
    // forward the chapter's OWN DOI state (from its lineage entry) so --reskin bakes the same
    // #pv-doi chip freeze did: a real version_doi -> the doi.org link; doi_archived:false ->
    // the honest "not DOI-archived". Same one bake_doi_chip -> live/ view can't drift from the record.
    html = execFileSync('python3', ['verification/freeze_chapter.py', '--reskin', tag,
      ch.version_doi || '', ch.doi_archived === false ? 'false' : ''],
      { cwd: ROOT, input: html, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    out[ed.out] = html;
  }
  return out;
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
    const editions = renderChapter(ch);                 // { 'index.html': html, 'dossier.html': html, ... }
    const outDir = path.join(LIVE, ch.tag);
    fs.mkdirSync(outDir, { recursive: true });
    for (const [filename, html] of Object.entries(editions)) {
      const out = path.join(outDir, filename);
      fs.writeFileSync(out, html);
      written.push(path.relative(ROOT, out));
    }
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
