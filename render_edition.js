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
    const m = line.match(/^(eyebrow|title|byline|active): ([\s\S]*)$/);
    if (m) front[m[1]] = m[2];
  }
  for (const k of ['eyebrow', 'title', 'byline']) {
    if (!(k in front)) die('source: frontmatter missing "' + k + '"');
  }
  const active = front.active || 'index.html';   // optional; sealed/old sources default to index

  // --- source: body + cites slots ---
  function readSlot(name) {
    const re = new RegExp('<!--slot:' + name + '-->\\n([\\s\\S]*?)\\n<!--/slot:' + name + '-->');
    const m = source.match(re);
    if (!m) die('source: missing <!--slot:' + name + '--> ... <!--/slot:' + name + '--> block');
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

  // --- fail loud on any unresolved token leaking into the output ([a-z_]+ also catches record_note) ---
  const leak = out.match(/\{\{[a-z_]+\}\}|<!--mount:|<!--fragment:/);
  if (leak) die('output still contains an unresolved token: ' + JSON.stringify(leak[0]));

  // --- bake the machinery (avenue cards + console verdict) into the static floor,
  //     so the front door ships readable with JS off (the JS ceiling re-renders identically).
  //     machinery null => live root readers (working draft); { avenues, verdict } => sealed data. ---
  if (hasMounts) out = bakeMachinery(out, machinery || undefined);

  return out;
}

if (require.main === module) {
  const html = renderEdition();
  fs.writeFileSync(OUT, html);
  process.stdout.write('render_edition: wrote ' + path.relative(ROOT, OUT) + ' (' + html.length + ' bytes)\n');
}

module.exports = { renderEdition };
