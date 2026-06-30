#!/usr/bin/env node
'use strict';
/*
 * verify_projection.js — Content-equivalence gate (BOUNDARY.md step 2b): PROSE + FLOOR + MACHINERY.
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
 * The MACHINERY leg (baked avenue cards + console verdict vs the markdown table/list) is DONE
 * for the working draft (5b-ii-1): index.html now ships STATICALLY BAKED cards + verdict
 * (bake_machinery.js), so they can be compared. Machinery atoms are parsed from each location's
 * own index.md (the gated avenues.json/verify_numbers.py projection), so the check is
 * self-contained and auto-covers every baked chapter once frozen (5b-ii-2). Markdown machinery
 * fidelity to avenues.json / verify_numbers.py is already gated by step 3.
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
//   PROSE leg: every source prose atom present in both renderings.
//   MACHINERY leg: every avenue (name/thesis/status) + console (check label, tally) atom from
//     THIS location's index.md present in its BAKED index.html, normalized (the baked cards'
//     split spans / the table's escaped pipes compare by what they SAY, not markup). Sourced
//     from the location's own index.md — the gated avenues.json/verify_numbers.py projection —
//     so it is self-contained: working draft now, every baked chapter once frozen (5b-ii-2).
//   Returns { label, prose, machinery, misses } (never exits — caller aggregates). ---
//   htmlPath overrides where the baked HTML is read from (default baseDir/index.html). A
//   back-catalog re-skin (5b-ii-2b) lives at live/<tag>/index.html but is gated against its
//   chapter's OWN sealed source + index.md (baseDir = chapters/<tag>/), so a re-skin that lost
//   or altered prose/machinery vs its frozen record bites here.
function checkLocation(baseDir, label, htmlPath) {
  // Projection is index-scoped by design. It guards the content-equivalence triangle
  // (source prose+machinery == live HTML == markdown projection), which only the index edition
  // has: index alone carries baked machinery and a markdown twin (index.md). dossier/verify are
  // machinery-free with no .md projection, so there is nothing to triangulate — their correct
  // gate is verify_backcatalog's byte-for-byte round-trip (live/<tag>/*.html == render_backcatalog
  // output), not projection. Extending projection to them would invent a check with no second
  // representation to compare against.
  const atoms = extractAtoms(path.join(baseDir, 'editions', 'index.source.html'));
  if (!atoms.length) die('[' + label + '] no content atoms extracted — almost certainly an extraction bug, not an empty paper.');

  const htmlRaw = fs.readFileSync(htmlPath || path.join(baseDir, 'index.html'), 'utf8');
  // data-d (term glosses) and data-tex (math) are CONTENT that lives only in attributes;
  // surface them so a tag-strip haystack still carries them.
  const attrDump = [...htmlRaw.matchAll(/\bdata-(?:d|tex)="([^"]*)"/g)].map(x => x[1]).join('\n');
  const hayHtml = normalize(htmlRaw) + ' ' + normalize(attrDump);
  const mdRaw = fs.readFileSync(path.join(baseDir, 'index.md'), 'utf8');
  const hayMd = normalize(mdRaw);
  const misses = [];

  // --- PROSE leg ---
  const seen = new Set();
  const prose = [];
  for (const a of atoms) {
    const na = normalize(a.text);
    if (!na || !/[a-z0-9]/i.test(na)) continue;                    // skip empty / punctuation-only runs
    if (seen.has(na)) continue;
    seen.add(na);
    prose.push({ cat: a.cat, na });
  }
  for (const c of prose) {
    if (!hayHtml.includes(c.na)) misses.push('MISSING from live: ' + c.na.slice(0, 80));
    if (!hayMd.includes(c.na)) misses.push('MISSING from markdown: ' + c.na.slice(0, 80));
  }

  // --- MACHINERY leg: avenue + console atoms parsed from this location's index.md ---
  const mach = [];
  let mm;
  const rowRe = /^\| (.+?) \| (.+?) \| (.+?) \| (.+?) \| (.+?) \|$/gm;     // ## Avenues table rows
  while ((mm = rowRe.exec(mdRaw))) {
    if (mm[1] === 'Avenue' || /^-+$/.test(mm[1].trim())) continue;        // skip header / separator
    mach.push(['avenue-name', mm[1]], ['avenue-thesis', mm[2]], ['avenue-status', mm[3]]);
  }
  const labelRe = /^- \[(?:PASS|FAIL)\] (.+)$/gm;                          // ## Consistency checks rows
  while ((mm = labelRe.exec(mdRaw))) mach.push(['check-label', mm[1]]);
  const tallyM = mdRaw.match(/\*\*TOTAL: ([^*]+)\*\*/);                    // the verdict tally line
  if (tallyM) mach.push(['tally', 'TOTAL: ' + tallyM[1].trim()]);

  const machChecks = [];
  for (const [cat, text] of mach) {
    const na = normalize(text);
    if (!na) continue;
    machChecks.push({ cat, na });
    if (!hayHtml.includes(na)) misses.push('machinery MISSING from live: [' + cat + '] ' + na.slice(0, 80));
    if (!hayMd.includes(na)) misses.push('machinery MISSING from markdown: [' + cat + '] ' + na.slice(0, 80));
  }

  if (process.argv.includes('--list')) {
    process.stderr.write('--- [' + label + '] ' + prose.length + ' prose + ' + machChecks.length + ' machinery atoms ---\n');
    for (const c of prose) process.stderr.write('[' + c.cat + '] ' + c.na.slice(0, 100) + '\n');
    for (const c of machChecks) process.stderr.write('[machinery:' + c.cat + '] ' + c.na.slice(0, 100) + '\n');
  }
  return { label, prose: prose.length, machinery: machChecks.length, misses };
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

// A live/<tag>/ back-catalog re-skin (5b-ii-2b) is content-checkable iff its sealed chapter
// (source + index.md, under chapters/<tag>/) exists to compare against.
function reskinnedChapters() {
  const dir = path.join(ROOT, 'live');
  if (!fs.existsSync(dir)) return [];
  const sealed = new Set(sealedChapters());
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isDirectory() && fs.existsSync(path.join(dir, d.name, 'index.html')))
    .map(d => d.name)
    .filter(name => sealed.has(name))
    .sort();
}

// --- driver: the working draft, every sealed chapter (floor leg), AND every back-catalog
//     re-skin (its live/<tag>/index.html vs the chapter's OWN sealed source + index.md) -------
const results = [checkLocation(ROOT, 'working draft')];
const chapters = sealedChapters();
if (!chapters.length) {
  process.stdout.write('verify_projection: floor leg: 0 frozen chapters on disk (gate in place; bites on first freeze)\n');
} else {
  for (const tag of chapters) results.push(checkLocation(path.join(ROOT, 'chapters', tag), 'chapters/' + tag));
}
for (const tag of reskinnedChapters()) {
  results.push(checkLocation(path.join(ROOT, 'chapters', tag), 'live/' + tag, path.join(ROOT, 'live', tag, 'index.html')));
}

const totalMisses = results.reduce((s, r) => s + r.misses.length, 0);
if (totalMisses) {
  for (const r of results) for (const x of r.misses) process.stderr.write('verify_projection: [' + r.label + '] ' + x + '\n');
  process.stderr.write('verify_projection: ' + totalMisses + ' content atom(s) not present in both renderings — fix the renderer/source, never the gate.\n');
  process.exit(1);
}

process.stdout.write('verify_projection: content-equivalence (prose + machinery) OK — '
  + results.map(r => '[' + r.label + '] ' + r.prose + ' prose + ' + r.machinery + ' machinery').join(', ')
  + ' atoms present in both renderings\n');
process.exit(0);
