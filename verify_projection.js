#!/usr/bin/env node
'use strict';
/*
 * verify_projection.js — Content-equivalence gate (BOUNDARY.md step 2b), PROSE + FLOOR legs.
 *
 * For EACH location — the live working draft AND every sealed chapter under chapters/<tag>/ —
 * asserts every prose content atom of that location's source (editions/index.source.html)
 * appears in BOTH of its renderings (index.html, index.md). With the round-trip gates bounding
 * each rendering (verify_edition.js: index.html == render(source, skin); verify_markdown.js:
 * index.md == text(source)), this proves the two projections carry identical prose content —
 * for the working draft and, once frozen, for every chapter of the lineage (the FLOOR leg).
 *
 * A frozen chapter's index.html is rewired (../../) and pv-state-baked at freeze time while its
 * index.md is sealed verbatim; normalize() strips tags / paths / md markers, so those
 * chrome/path differences never leak into the content comparison.
 *
 * The MACHINERY leg (baked avenue cards vs the markdown avenue table) is still deferred to
 * 5b-ii: a frozen index.html still ships EMPTY card shells (runtime-filled from avenues.json),
 * so there are no baked cards to compare yet. Markdown machinery fidelity to avenues.json /
 * verify_numbers.py is already gated by step 3.
 *
 * Pure Node, read-only (renders nothing, writes nothing). Author-local AND in CI.
 *
 * Usage:
 *   node verify_projection.js          # exit 0 = prose present in both, every location
 *   node verify_projection.js --list   # also dump the extracted atoms per location to stderr
 *   npm run check-projection
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

function die(msg) { process.stderr.write('verify_projection: ' + msg + '\n'); process.exit(1); }

function decodeEntities(s) {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
}
// One normalizer for atoms AND both haystacks: decode entities, strip HTML tags, strip
// markdown syntax markers (leading #/>/-/*, and inline ` * _ | [ ] ( )), collapse ws.
// Hyphens and em-dashes are preserved (they are content: "OPEN-UNVERIFIED", "self-explaining").
function normalize(s) {
  s = decodeEntities(s);
  s = s.replace(/<[^>]+>/g, ' ');                                  // strip HTML tags
  s = s.replace(/^[ \t]*(?:#{1,6}\s+|>\s?|[-*]\s+)/gm, ' ');       // strip leading md block markers
  s = s.replace(/[`*_|[\]()]/g, ' ');                              // strip inline md markers (to a space:
                                                                   // a stripped marker leaves a word boundary,
                                                                   // matching how an HTML tag strips to a space)
  return s.replace(/\s+/g, ' ').trim();
}

// --- source readers ----------------------------------------------------------
function frontmatter(src) {
  const fm = src.match(/^<!--edition\n([\s\S]*?)\n-->\n/);
  if (!fm) die('source: missing <!--edition ... --> frontmatter');
  const front = {};
  for (const line of fm[1].split('\n')) {
    const m = line.match(/^(eyebrow|title|byline): ([\s\S]*)$/);
    if (m) front[m[1]] = m[2];
  }
  for (const k of ['eyebrow', 'title', 'byline']) if (!(k in front)) die('source: frontmatter missing "' + k + '"');
  return front;
}
function slot(src, name) {
  const m = src.match(new RegExp('<!--slot:' + name + '-->\\n([\\s\\S]*?)\\n<!--/slot:' + name + '-->'));
  if (!m) die('source: missing <!--slot:' + name + '--> block');
  return m[1];
}
function citesData(src) {
  const j = slot(src, 'cites').match(/<script[^>]*id="cites-data"[^>]*>([\s\S]*?)<\/script>/);
  if (!j) die('source: cites slot has no #cites-data JSON');
  try { return JSON.parse(j[1]); } catch (e) { die('source: #cites-data is not valid JSON (' + e.message + ')'); }
}

// Prose runs: split inner at term buttons — the one inline element whose markdown
// rendering INSERTS text ("term (gloss)"), which would break a contiguous substring.
// (Cites bracket the label, b/mono/em keep their text — normalize handles those.)
function proseRuns(inner) {
  // \uE000 = Unicode PUA sentinel — cannot occur in real prose/math source; safe split marker
  return inner.replace(/<button class="term"[^>]*>[\s\S]*?<\/button>/g, '\uE000').split('\uE000');
}

function extractAtoms(sourcePath) {
  const src = fs.readFileSync(sourcePath, 'utf8');
  const front = frontmatter(src);
  const cites = citesData(src);
  const body = slot(src, 'body').replace(/<!--[\s\S]*?-->/g, ' ');   // drop mounts + authoring comments
  const atoms = [];
  const add = (cat, text) => { if (text != null) atoms.push({ cat, text: String(text) }); };
  let m;

  add('title', front.title);
  add('byline', front.byline);
  add('eyebrow', front.eyebrow);

  const reH2 = /<h2\b[^>]*>([\s\S]*?)<\/h2>/g;
  while ((m = reH2.exec(body))) add('h2', m[1].replace(/^<span class="num">[\s\S]*?<\/span>/, ''));
  const reH3 = /<h3\b[^>]*>([\s\S]*?)<\/h3>/g;
  while ((m = reH3.exec(body))) add('h3', m[1]);

  const reP = /<p\b[^>]*>([\s\S]*?)<\/p>/g;
  while ((m = reP.exec(body))) for (const r of proseRuns(m[1])) add('p', r);

  const reTerm = /<button class="term" data-d="([^"]*)">([\s\S]*?)<\/button>/g;
  while ((m = reTerm.exec(body))) { add('term', m[2]); add('term-gloss', m[1]); }

  const reCite = /<button class="cite" data-c="([^"]*)">[\s\S]*?<\/button>/g;
  const seenK = new Set();
  while ((m = reCite.exec(body))) {
    const k = m[1];
    if (seenK.has(k)) continue;
    seenK.add(k);
    const c = cites[k];
    if (!c) continue;                                              // skip keys not in #cites-data (e.g. skin 'demo')
    add('cite-who', c.who); add('cite-what', c.what); add('cite-src', c.src);
  }

  const reTex = /data-tex="([^"]*)"/g;
  while ((m = reTex.exec(body))) add('math', m[1]);

  const reDet = /<details\b[^>]*>([\s\S]*?)<\/details>/g;
  while ((m = reDet.exec(body))) {
    const sm = m[1].match(/<summary>([\s\S]*?)<\/summary>/);
    if (sm) add('details-summary', sm[1]);
    const afterS = m[1].replace(/<summary>[\s\S]*?<\/summary>/, '')
                       .replace(/<div class="eq"[^>]*>[\s\S]*?<\/div>/g, ' ');   // drop the baked eq (its tex is a math atom)
    for (const r of proseRuns(afterS)) add('details-body', r);
  }

  const reCall = /<div class="(openclaim|forecast|reported)">([\s\S]*?)<\/div>/g;
  while ((m = reCall.exec(body))) {
    const tg = m[2].match(/<span class="tag">([\s\S]*?)<\/span>/);
    if (tg) add('callout-tag', tg[1]);
    for (const r of proseRuns(m[2].replace(/<span class="tag">[\s\S]*?<\/span>/, ''))) add('callout-body', r);
  }

  return atoms;
}

// --- check ONE location: a dir holding editions/index.source.html + index.html + index.md.
//     Returns { label, atoms: <checked count>, misses: [...] } (never exits — caller aggregates). ---
function checkLocation(baseDir, label) {
  const atoms = extractAtoms(path.join(baseDir, 'editions', 'index.source.html'));
  if (!atoms.length) die('[' + label + '] no content atoms extracted — almost certainly an extraction bug, not an empty paper.');

  const htmlRaw = fs.readFileSync(path.join(baseDir, 'index.html'), 'utf8');
  // data-d (term glosses) and data-tex (math) are CONTENT that lives only in attributes;
  // surface them so a tag-strip haystack still carries them.
  const attrDump = [...htmlRaw.matchAll(/\bdata-(?:d|tex)="([^"]*)"/g)].map(x => x[1]).join('\n');
  const hayHtml = normalize(htmlRaw) + ' ' + normalize(attrDump);
  const hayMd = normalize(fs.readFileSync(path.join(baseDir, 'index.md'), 'utf8'));

  const seen = new Set();
  const checks = [];
  for (const a of atoms) {
    const na = normalize(a.text);
    if (!na || !/[a-z0-9]/i.test(na)) continue;                    // skip empty / punctuation-only runs
    if (seen.has(na)) continue;
    seen.add(na);
    checks.push({ cat: a.cat, na });
  }
  if (process.argv.includes('--list')) {
    process.stderr.write('--- [' + label + '] ' + checks.length + ' content atoms ---\n');
    for (const c of checks) process.stderr.write('[' + c.cat + '] ' + c.na.slice(0, 100) + '\n');
  }
  const misses = [];
  for (const c of checks) {
    if (!hayHtml.includes(c.na)) misses.push('MISSING from live: ' + c.na.slice(0, 80));
    if (!hayMd.includes(c.na)) misses.push('MISSING from markdown: ' + c.na.slice(0, 80));
  }
  return { label, atoms: checks.length, misses };
}

// A well-formed sealed chapter (5a) carries all three of these; partial dirs are skipped.
function sealedChapters() {
  const dir = path.join(ROOT, 'chapters');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .filter(name => fs.existsSync(path.join(dir, name, 'index.html'))
                 && fs.existsSync(path.join(dir, name, 'index.md'))
                 && fs.existsSync(path.join(dir, name, 'editions', 'index.source.html')))
    .sort();
}

// --- driver: the working draft AND every sealed chapter (floor leg) ----------
const results = [checkLocation(ROOT, 'working draft')];
const chapters = sealedChapters();
if (!chapters.length) {
  process.stdout.write('verify_projection: floor leg: 0 frozen chapters on disk (gate in place; bites on first freeze)\n');
} else {
  for (const tag of chapters) results.push(checkLocation(path.join(ROOT, 'chapters', tag), 'chapters/' + tag));
}

const totalMisses = results.reduce((s, r) => s + r.misses.length, 0);
if (totalMisses) {
  for (const r of results) for (const x of r.misses) process.stderr.write('verify_projection: [' + r.label + '] ' + x + '\n');
  process.stderr.write('verify_projection: ' + totalMisses + ' content atom(s) not present in both renderings — fix the renderer/source, never the gate.\n');
  process.exit(1);
}

process.stdout.write('verify_projection: content-equivalence (prose) OK — '
  + results.map(r => '[' + r.label + '] ' + r.atoms).join(', ') + ' atoms present in both renderings\n');
process.exit(0);
