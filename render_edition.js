#!/usr/bin/env node
'use strict';
/*
 * render_edition.js — rejoin the partitioned front door into index.html.
 *
 * Pure Node, no browser, never run in CI. Reads the skin-free content source
 * (editions/index.source.html) and the skin wrapper (skin/edition.html), then
 *   - substitutes {{eyebrow}}/{{title}}/{{byline}} from the source frontmatter,
 *   - substitutes {{body}} with the source body (mounts expanded from skin
 *     fragments) and {{cites}} with the source's inert cite-data block,
 *   - strips the skin-internal <!--fragment:X--> definitions,
 *   - writes index.html.
 * Idempotent; fail-loud (nonzero exit) on any missing slot / mount / fragment
 * or any leftover {{ }} / <!--mount: / <!--fragment: in the output.
 *
 * This is author-local tooling, exactly like render_math.js / render_figures.js;
 * readers need nothing and CI never runs it.
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SKIN = path.join(ROOT, 'skin', 'edition.html');
const SOURCE = path.join(ROOT, 'editions', 'index.source.html');
const OUT = path.join(ROOT, 'index.html');

function die(msg) { process.stderr.write('render_edition: ' + msg + '\n'); process.exit(1); }
const sub = (hay, token, value, label) => {
  if (hay.indexOf(token) < 0) die('missing slot ' + label + ' (' + token + ')');
  return hay.replace(token, () => value);          // function form: no $-pattern interpretation
};

const skin = fs.readFileSync(SKIN, 'utf8');
const source = fs.readFileSync(SOURCE, 'utf8');

// --- source: frontmatter ---
const fm = source.match(/^<!--edition\n([\s\S]*?)\n-->\n/);
if (!fm) die('source: missing <!--edition ... --> frontmatter header');
const front = {};
for (const line of fm[1].split('\n')) {
  const m = line.match(/^(eyebrow|title|byline): ([\s\S]*)$/);
  if (m) front[m[1]] = m[2];
}
for (const k of ['eyebrow', 'title', 'byline']) {
  if (!(k in front)) die('source: frontmatter missing "' + k + '"');
}

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
for (const name of ['howto', 'landscape', 'console']) {
  body = sub(body, '<!--mount:' + name + '-->', readFragment(name), 'mount:' + name);
}

// --- fill the wrapper slots ---
let out = wrapper;
out = sub(out, '{{eyebrow}}', front.eyebrow, 'eyebrow');
out = sub(out, '{{title}}', front.title, 'title');
out = sub(out, '{{byline}}', front.byline, 'byline');
out = sub(out, '{{body}}', body, 'body');
out = sub(out, '{{cites}}', cites, 'cites');

// --- fail loud on any unresolved token leaking into the output ---
const leak = out.match(/\{\{[a-z]+\}\}|<!--mount:|<!--fragment:/);
if (leak) die('output still contains an unresolved token: ' + JSON.stringify(leak[0]));

fs.writeFileSync(OUT, out);
process.stdout.write('render_edition: wrote ' + path.relative(ROOT, OUT) + ' (' + out.length + ' bytes)\n');
