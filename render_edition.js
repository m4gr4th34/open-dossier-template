#!/usr/bin/env node
'use strict';
/*
 * render_edition.js — rejoin the partitioned front door into index.html.
 *
 * Reads the skin-free content source (editions/index.source.html) and the skin
 * wrapper (skin/edition.html), then
 *   - substitutes {{eyebrow}}/{{title}}/{{byline}} from the source frontmatter,
 *   - substitutes {{body}} with the source body (mounts expanded from skin
 *     fragments) and {{cites}} with the source's inert cite-data block,
 *   - strips the skin-internal <!--fragment:X--> definitions,
 *   - bakes the avenue cards + console verdict into the static floor (bake_machinery.js),
 *     so the front door ships readable with JS off (the JS ceiling re-renders identically).
 * Idempotent; fail-loud (nonzero exit) on any missing slot / mount / fragment
 * or any leftover {{ }} / <!--mount: / <!--fragment: in the output.
 *
 * Exposes renderEdition(skinPath?, sourcePath?) -> the rendered HTML string (writes NOTHING);
 * paths default to the live root; pass them to render a back-catalog chapter. The CLI
 * tail writes index.html. The CLI write path is author-local, exactly like
 * render_math.js / render_figures.js — readers need nothing and the writer is
 * never run in CI. The renderEdition() export IS used in CI, by verify_edition.js
 * (the round-trip gate), which only renders in memory.
 *
 * Usage:
 *   node render_edition.js     # writes index.html from source + skin
 *   npm run render-edition
 */
const fs = require('fs');
const path = require('path');
const { bakeMachinery } = require('./bake_machinery.js');

const ROOT = __dirname;
const SKIN = path.join(ROOT, 'skin', 'edition.html');
const SOURCE = path.join(ROOT, 'editions', 'index.source.html');
const OUT = path.join(ROOT, 'index.html');
const DOSSIER_SOURCE = path.join(ROOT, 'editions', 'dossier.source.html');
const DOSSIER_OUT = path.join(ROOT, 'dossier.html');
const VERIFY_SOURCE = path.join(ROOT, 'editions', 'verify.source.html');
const VERIFY_OUT = path.join(ROOT, 'verify.html');
const LINEAGE_SOURCE = path.join(ROOT, 'editions', 'lineage.source.html');
const LINEAGE_OUT = path.join(ROOT, 'lineage.html');
// The editions this template renders + gates: index, dossier, verify, lineage (all under the one skin).
// lineage renders with chrome: index (no provenance bar / lineage strip) and is machinery-free
// (no mounts -> no bake), exactly like dossier/verify but for the series-level chapter index.
// Single-sourced here because verify_edition.js already imports from this module —
// the writer (below) and the gate (there) loop the SAME list, so they can't drift.
const EDITIONS = [
  { source: SOURCE, out: OUT },
  { source: DOSSIER_SOURCE, out: DOSSIER_OUT },
  { source: VERIFY_SOURCE, out: VERIFY_OUT },
  { source: LINEAGE_SOURCE, out: LINEAGE_OUT },
];

function die(msg) { process.stderr.write('render_edition: ' + msg + '\n'); process.exit(1); }
const sub = (hay, token, value, label) => {
  if (hay.indexOf(token) < 0) die('missing slot ' + label + ' (' + token + ')');
  return hay.replace(token, () => value);          // function form: no $-pattern interpretation
};

// Read source + skin, substitute every slot/mount, bake the machinery, and RETURN the
// rendered index.html as a string. Writes nothing. Fail-loud on any missing piece.
// Paths default to the live root; pass them to render a back-catalog chapter (5b-ii-2).
function renderEdition(skinPath = SKIN, sourcePath = SOURCE, machinery = null, recordNote = '') {
  const skin = fs.readFileSync(skinPath, 'utf8');
  const source = fs.readFileSync(sourcePath, 'utf8');

  // --- source: frontmatter ---
  const fm = source.match(/^<!--edition\n([\s\S]*?)\n-->\n/);
  if (!fm) die('source: missing <!--edition ... --> frontmatter header');
  const front = {};
  for (const line of fm[1].split('\n')) {
    const m = line.match(/^(eyebrow|title|byline|active|chrome|self): ([\s\S]*)$/);
    if (m) front[m[1]] = m[2];
  }
  for (const k of ['eyebrow', 'title', 'byline']) {
    if (!(k in front)) die('source: frontmatter missing "' + k + '"');
  }
  const active = front.active || 'index.html';   // optional; sealed/old sources default to index
  // chrome: which header/companion chrome the wrapper ships. 'reading' (default) = full
  // reading-surface chrome (provenance bar + lineage strip + their fetch scripts), for an
  // archivable edition. 'index' = a navigation/index surface (lineage.html) with no provenance
  // bar at all. Undeclared -> 'reading', so the trinity render byte-identically. Unknown -> die.
  const chrome = front.chrome || 'reading';
  if (chrome !== 'reading' && chrome !== 'index') {
    die('source: chrome must be "reading" or "index" (got ' + JSON.stringify(chrome) + ')');
  }
  // self: this edition's own output filename (e.g. 'verify.html'). Optional — declared ONLY by
  // an edition whose provenance bar contains a pv-item linking to itself. When set, that one
  // self-pointing anchor is degraded at render to a non-link "this page" span (a link to the
  // page you're on is a false affordance). Undeclared -> '' -> no degrade (index/dossier have no
  // self-pointing pv-item; lineage has chrome:index so no bar at all). The general fix asked by
  // ROADMAP item 3: keyed on the page's own identity, not special-cased to verify.
  const self = front.self || '';

  // --- source: body + cites slots ---
  function readSlot(name, fallback) {
    const re = new RegExp('<!--slot:' + name + '-->\\n([\\s\\S]*?)\\n<!--/slot:' + name + '-->');
    const m = source.match(re);
    if (!m) {
      // Optional slot: a 2-arg call supplying a fallback renders without the block
      // (a future {{head_extra}}/{{foot}} on a source that omits it). A 1-arg call
      // (body/cites) passes fallback=undefined and still die()s — those stay required.
      if (fallback !== undefined) return fallback;
      die('source: missing <!--slot:' + name + '--> ... <!--/slot:' + name + '--> block');
    }
    return m[1];
  }
  let body = readSlot('body');
  const cites = readSlot('cites');

  // --- skin: split wrapper from the fragment definitions ---
  const cut = skin.indexOf('<!--fragment:');
  if (cut < 0) die('skin: no <!--fragment:...--> definitions found');
  const wrapper = skin.slice(0, cut);          // the document with {{...}} slots
  const fragsSection = skin.slice(cut);        // the skin-internal fragment library
  function readFragment(name) {
    const re = new RegExp('<!--fragment:' + name + '-->\\n([\\s\\S]*?)\\n<!--/fragment:' + name + '-->');
    const m = fragsSection.match(re);
    if (!m) die('skin: missing <!--fragment:' + name + '--> ... <!--/fragment:' + name + '--> block');
    return m[1];
  }

  // --- expand the mounts inside the body with the skin fragments ---
  // Machinery-optional: a source carrying NONE of the three mounts (a future dossier.source /
  // verify.source) renders without them instead of die()-ing at sub(). All-or-nothing — a source
  // with ANY mount still expands the full set, so a partial/typo'd source still die()s (sub() here,
  // the leak check below, or bakeMachinery's shell asserts). Only a genuinely mount-free source skips.
  const MOUNTS = ['howto', 'landscape', 'console'];
  const hasMounts = MOUNTS.some(name => body.indexOf('<!--mount:' + name + '-->') >= 0);
  if (hasMounts) {
    for (const name of MOUNTS) {
      body = sub(body, '<!--mount:' + name + '-->', readFragment(name), 'mount:' + name);
    }
  }

  // --- fill the wrapper slots ---
  let out = wrapper;
  out = sub(out, '{{eyebrow}}', front.eyebrow, 'eyebrow');
  out = sub(out, '{{title}}', front.title, 'title');
  out = sub(out, '{{byline}}', front.byline, 'byline');
  out = sub(out, '{{body}}', body, 'body');
  out = sub(out, '{{cites}}', cites, 'cites');
  out = sub(out, '{{head_extra}}', readSlot('head_extra', ''), 'head_extra');
  out = sub(out, '{{foot}}', readSlot('foot', ''), 'foot');
  // {{record_note}}: EMPTY for the working draft (no frozen record to point at — byte-identical
  // output), the honest-label banner for a back-catalog re-skin (render_backcatalog.js).
  out = sub(out, '{{record_note}}', recordNote, 'record_note');

  // Active-nav: mark exactly the .cta button whose href === active as primary.
  // 'none' marks nothing (an edition not in the 4-button nav). A non-'none' active
  // that matches no nav button is a typo -> die (same disposition as a missing mount).
  if (active !== 'none') {
    const navOld = 'class="btn" href="' + active + '"';
    const navNew = 'class="btn primary" href="' + active + '"';
    if (out.indexOf(navOld) < 0) die('active: "' + active + '" matches no .cta nav button');
    out = out.replace(navOld, () => navNew);   // function form: no $-pattern interpretation
  }

  // --- provenance self-link degrade: an <a class="pv-item" href="SELF"> that points at the
  //     page being rendered is rewritten to a non-link <span class="pv-item pv-here"> with a
  //     locative "this page" value (no href/target/rel, no up-arrow (U+2197) — a non-link must not wear a
  //     navigation affordance). Fail-loud: when `self` is declared it MUST match exactly one such
  //     anchor (zero = a no-op that only looks done; two = a corrupted bar). Editions without a
  //     self-pointing pv-item leave `self` empty and skip this entirely. ---
  if (self) {
    const reSelf = new RegExp(
      '<a class="pv-item" href="' + self.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
      '"[^>]*>([\\s\\S]*?)<\\/a>', 'g');
    const matches = out.match(reSelf);
    if (!matches) die('self: "' + self + '" matches no self-linking pv-item anchor (nothing to degrade)');
    if (matches.length > 1) die('self: "' + self + '" matches ' + matches.length + ' pv-item anchors (expected exactly 1)');
    out = out.replace(reSelf, (m, inner) => {
      // keep the inner pv-k/pv-v structure; replace the value text with the locative "this page".
      const degraded = inner.replace(
        /<span class="pv-v">[\s\S]*?<\/span>/,
        '<span class="pv-v">this page</span>');
      return '<span class="pv-item pv-here">' + degraded + '</span>';
    });
  }

  // --- resolve the reading-chrome regions (<!--chrome-reading-->...<!--/chrome-reading-->).
  //     'reading' (trinity default): strip ONLY the marker lines, keeping the chrome -> output is
  //     byte-identical to a marker-free wrapper. 'index' (lineage): strip the whole region,
  //     markers included, so a navigation surface ships with no provenance bar/strip or their
  //     scripts. Markers are standalone lines; the line-anchored strip leaves all else untouched. ---
  if (chrome === 'index') {
    out = out.replace(/^[ \t]*<!--chrome-reading-->\n[\s\S]*?^[ \t]*<!--\/chrome-reading-->\n/gm, '');
  } else {
    out = out.replace(/^[ \t]*<!--\/?chrome-reading-->\n/gm, '');
  }

  // --- fail loud on any unresolved token leaking into the output ([a-z_]+ also catches record_note) ---
  const leak = out.match(/\{\{[a-z_]+\}\}|<!--mount:|<!--fragment:|<!--\/?chrome-reading-->/);
  if (leak) die('output still contains an unresolved token: ' + JSON.stringify(leak[0]));

  // --- bake the machinery (avenue cards + console verdict) into the static floor,
  //     so the front door ships readable with JS off (the JS ceiling re-renders identically).
  //     machinery null => live root readers (working draft); { avenues, verdict } => sealed data. ---
  if (hasMounts) out = bakeMachinery(out, machinery || undefined);

  return out;
}

if (require.main === module) {
  for (const ed of EDITIONS) {
    const html = renderEdition(SKIN, ed.source);
    fs.writeFileSync(ed.out, html);
    process.stdout.write('render_edition: wrote ' + path.relative(ROOT, ed.out) + ' (' + html.length + ' bytes)\n');
  }
}

module.exports = { renderEdition, EDITIONS };
