#!/usr/bin/env node
'use strict';
/*
 * render_markdown.js — the MARKDOWN / llms.txt projection of the front door.
 *
 * text(source): renders editions/index.source.html into clean, skin-free markdown.
 * Machinery is rendered as its DATA and RESULTS, single-sourced:
 *   - the landscape mount  -> a "## Avenues" table read straight from avenues.json,
 *   - the console mount     -> a "## Consistency checks" list whose PASS/FAIL results
 *     come from running verification/verify_numbers.py (NEVER re-implemented here, so
 *     the markdown can't drift from CI / the in-page console),
 *   - cites  -> a "## References" section resolved from the #cites-data JSON,
 *   - terms / math / callouts / go-deeper -> inline content (the gloss, the LaTeX,
 *     the honest label, the depth) survives; the chrome (tap-to-expand, colored box,
 *     collapse) is dropped.
 *
 * Pure Node + ONE Python subprocess (the verifier, for check results). Author-local,
 * exactly like render_math.js / render_edition.js. Fail-loud (nonzero exit) on any
 * unresolved mount, leftover token, unmapped element, or a missing/erroring verifier
 * — it never fabricates an "all pass".
 *
 * Exposes renderMarkdown() -> the index.md string and buildLlmsTxt() -> the llms.txt
 * string (both write nothing); the CLI tail writes index.md + llms.txt.
 *
 * Usage:
 *   node render_markdown.js     # writes index.md and llms.txt from the source
 *   npm run render-markdown
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'editions', 'index.source.html');
const AVENUES = path.join(ROOT, 'avenues.json');
const OUT_MD = path.join(ROOT, 'index.md');
const OUT_LLMS = path.join(ROOT, 'llms.txt');
const LINEAGE = path.join(ROOT, 'lineage.json');

function die(msg) { process.stderr.write('render_markdown: ' + msg + '\n'); process.exit(1); }

function decodeEntities(s) {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
}
const collapseWs = s => s.replace(/\s+/g, ' ').trim();
const stripTags = s => decodeEntities(s.replace(/<[^>]+>/g, ''));

// --- source readers ----------------------------------------------------------
function readSource() { return fs.readFileSync(SOURCE, 'utf8'); }
function frontmatter(source) {
  const fm = source.match(/^<!--edition\n([\s\S]*?)\n-->\n/);
  if (!fm) die('source: missing <!--edition ... --> frontmatter');
  const front = {};
  for (const line of fm[1].split('\n')) {
    const m = line.match(/^(eyebrow|title|byline): ([\s\S]*)$/);
    if (m) front[m[1]] = m[2];
  }
  for (const k of ['eyebrow', 'title', 'byline']) if (!(k in front)) die('source: frontmatter missing "' + k + '"');
  return front;
}
function slot(source, name) {
  const m = source.match(new RegExp('<!--slot:' + name + '-->\\n([\\s\\S]*?)\\n<!--/slot:' + name + '-->'));
  if (!m) die('source: missing <!--slot:' + name + '--> block');
  return m[1];
}
function citesData(source) {
  const block = slot(source, 'cites');
  const j = block.match(/<script[^>]*id="cites-data"[^>]*>([\s\S]*?)<\/script>/);
  if (!j) die('source: cites slot has no #cites-data JSON');
  try { return JSON.parse(j[1]); } catch (e) { die('source: #cites-data is not valid JSON (' + e.message + ')'); }
}

// --- the consistency verifier (subprocess; results are single-sourced) --------
function runVerifier(avenuesPath = null) {
  // avenuesPath null => today's invocation (live root, byte-unchanged); a path => verify a
  // frozen chapter against its OWN sealed avenues.json via verify_numbers.py --avenues (5b-ii-2a).
  const args = ['verification/verify_numbers.py'];
  if (avenuesPath) args.push('--avenues', path.resolve(avenuesPath));
  let out;
  try {
    out = execFileSync('python3', args, { cwd: ROOT, encoding: 'utf8' });
  } catch (e) {
    if (e.code === 'ENOENT') die('python3 not found — refusing to fabricate consistency results.');
    out = (e.stdout != null) ? String(e.stdout) : '';     // nonzero exit (a check failed) still carries stdout
    if (!out.trim()) die('verify_numbers.py produced no stdout (' + (e.message || 'error') + ').');
  }
  const checks = [];
  let tally = null, summary = null;
  const lines = out.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\[(PASS|FAIL)\] \S+ (.+)$/);
    if (m) { checks.push({ status: m[1], label: m[2] }); continue; }
    const t = lines[i].match(/^TOTAL: (.+)$/);
    if (t) { tally = t[1].trim(); summary = (lines[i + 1] || '').trim() || null; }
  }
  if (!checks.length || !tally) die('could not parse verify_numbers.py output — refusing to fabricate consistency results.');
  return { checks, tally, summary };
}

// --- avenues.json reader: the SINGLE source consumed by BOTH the markdown table below
//     AND the HTML static-card baker (bake_machinery.js), so cards and table can't drift. -------
function readAvenues(avenuesPath = AVENUES) {
  const data = JSON.parse(fs.readFileSync(avenuesPath, 'utf8'));
  const avenues = Array.isArray(data.avenues) ? data.avenues : die('avenues.json: no "avenues" array');
  return { avenues, rules: (data.checks || {}) };
}

// --- avenues table (read straight from avenues.json, the single source) -------
function renderAvenuesTable() {
  const { avenues } = readAvenues();
  const esc = s => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
  const rows = avenues.map(a => {
    const fc = (a.status === 'FORECAST' && a.forecast != null)
      ? ('~' + a.forecast + '%' + (a.signpost ? ' by ' + a.signpost : ''))
      : '—';
    const src = (a.cites && a.cites.length) ? a.cites.join(', ') : '—';
    return '| ' + esc(a.name) + ' | ' + esc(a.thesis) + ' | ' + esc(a.status) + ' | ' + esc(fc) + ' | ' + esc(src) + ' |';
  });
  return '## Avenues\n\n'
    + '| Avenue | Thesis | Status | Forecast | Sources |\n'
    + '|---|---|---|---|---|\n'
    + rows.join('\n');
}
function renderConsole() {
  const v = runVerifier();
  return '## Consistency checks\n\n'
    + 'Results from `verification/verify_numbers.py` — the same checks the in-page console runs; CI reruns them on every commit.\n\n'
    + v.checks.map(c => '- [' + c.status + '] ' + c.label).join('\n')
    + '\n\n**TOTAL: ' + v.tally + '**' + (v.summary ? ' — ' + v.summary : '');
}

// --- the projection -----------------------------------------------------------
function renderMarkdown() {
  const source = readSource();
  const front = frontmatter(source);
  const body = slot(source, 'body');
  const cites = citesData(source);
  const usedCites = new Map();          // key -> label, first-use order

  function inlineToMd(s) {
    s = s.replace(/<button class="term" data-d="([^"]*)">([\s\S]*?)<\/button>/g,
      (m, g, t) => t + ' (' + g + ')');
    s = s.replace(/<button class="cite" data-c="([^"]*)">([\s\S]*?)<\/button>/g,
      (m, k, l) => { if (!usedCites.has(k)) usedCites.set(k, l); return '[' + l + ']'; });
    s = s.replace(/<span class="math" data-tex="([^"]*)">[\s\S]*?<\/span>/g, (m, x) => '`' + x + '`');
    s = s.replace(/<span class="mono">([\s\S]*?)<\/span>/g, (m, x) => '`' + x + '`');
    s = s.replace(/<(?:b|strong)>([\s\S]*?)<\/(?:b|strong)>/g, (m, x) => '**' + x + '**');
    s = s.replace(/<(?:em|i)>([\s\S]*?)<\/(?:em|i)>/g, (m, x) => '*' + x + '*');
    s = decodeEntities(s);
    if (/<[a-z/!]/i.test(s)) die('inline: unmapped HTML near ' + JSON.stringify(s.slice(0, 80)));
    return s;
  }

  function tokenize(b) {
    const blocks = [];
    let i = 0; const n = b.length;
    const take = (close) => { const e = b.indexOf(close, i); if (e < 0) die('unterminated ' + close); return e + close.length; };
    while (i < n) {
      while (i < n && /\s/.test(b[i])) i++;
      if (i >= n) break;
      const rest = b.slice(i);
      if (rest.startsWith('<!--mount:')) { const e = b.indexOf('-->', i) + 3; blocks.push({ t: 'mount', name: b.slice(i, e).match(/<!--mount:([a-z]+)-->/)[1] }); i = e; }
      else if (rest.startsWith('<!--'))      { i = b.indexOf('-->', i) + 3; }                                  // drop authoring comment
      else if (rest.startsWith('<h2'))       { const e = take('</h2>'); blocks.push({ t: 'h2', html: b.slice(i, e) }); i = e; }
      else if (rest.startsWith('<h3'))       { const e = take('</h3>'); blocks.push({ t: 'h3', html: b.slice(i, e) }); i = e; }
      else if (rest.startsWith('<details'))  { const e = take('</details>'); blocks.push({ t: 'details', html: b.slice(i, e) }); i = e; }
      else if (rest.startsWith('<figure'))   { const e = take('</figure>'); blocks.push({ t: 'figure', html: b.slice(i, e) }); i = e; }
      else if (rest.startsWith('<div'))      { const e = take('</div>'); blocks.push({ t: 'div', html: b.slice(i, e) }); i = e; }
      else if (rest.startsWith('<p'))        { const e = take('</p>'); blocks.push({ t: 'p', html: b.slice(i, e) }); i = e; }
      else die('unrecognized block near ' + JSON.stringify(rest.slice(0, 60)));
    }
    return blocks;
  }

  function renderDetails(html) {
    const sm = html.match(/<summary>([\s\S]*?)<\/summary>/);
    if (!sm) die('details without <summary>');
    const summary = collapseWs(inlineToMd(sm[1]));
    let rest = html.slice(html.indexOf('</summary>') + '</summary>'.length)
      .replace(/<\/details>\s*$/, '')
      .replace(/^\s*<div class="body">/, '')
      .replace(/<\/div>\s*$/, '');
    const maths = [];
    // \uE000 = Unicode PUA sentinel — cannot occur in real prose/math source; safe split marker
    rest = rest.replace(/<div class="eq" data-tex="([^"]*)">[\s\S]*?<\/div>/g,
      (m, tex) => { maths.push(decodeEntities(tex)); return '\uE000M' + (maths.length - 1) + '\uE000'; });
    const prose = collapseWs(inlineToMd(rest));
    let out = '**' + summary + '**';
    const parts = prose.split(/\uE000M(\d+)\uE000/);
    for (let k = 0; k < parts.length; k++) {
      if (k % 2 === 0) { const txt = parts[k].trim(); if (txt) out += '\n\n' + txt; }
      else { out += '\n\n```math\n' + maths[+parts[k]] + '\n```'; }
    }
    return out;
  }

  function renderCallout(html) {
    // Region kicker (eyebrow label announcing a region). The apparatus kickers live inside the
    // landscape/console mounts (handled there); a CHAPTER kicker is author-written top-level body
    // content, so project it as a bold standalone line — its own new prose atom.
    const km = html.match(/^<div class="kicker\b[^"]*">([\s\S]*?)<\/div>\s*$/);
    if (km) return '**' + collapseWs(inlineToMd(km[1])) + '**';
    const cls = html.match(/^<div class="(openclaim|forecast|reported)"/);
    if (!cls) die('unmapped <div> block near ' + JSON.stringify(html.slice(0, 60)));
    let inner = html.replace(/^<div class="[^"]*">/, '').replace(/<\/div>\s*$/, '');
    const tm = inner.match(/<span class="tag">([\s\S]*?)<\/span>/);
    const tag = tm ? collapseWs(decodeEntities(tm[1])) : cls[1].toUpperCase();
    inner = inner.replace(/<span class="tag">[\s\S]*?<\/span>/, '');
    return '> **' + tag + '** — ' + collapseWs(inlineToMd(inner));
  }

  function renderFigure(html) {
    // A living figure (data-figure) has no <img>; its descriptor is the sealed poster's aria-label.
    // Its caption is the baked <figcaption class="lf-caption"> (single-sourced from spec.caption).
    // Static image figures keep the <img alt> path. Both project the SAME *(figure: label — caption)*
    // form, so a captioned living figure in an edition page stays content-equivalent under verify_projection.
    const living = /\bdata-figure=/.test(html);
    const label = living
      ? ((html.match(/<svg[^>]*\baria-label="([^"]*)"/) || [])[1] || 'living figure')
      : ((html.match(/<img[^>]*\balt="([^"]*)"/) || [])[1] || 'untitled');
    const cap = (html.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/) || [])[1] || '';
    const capMd = collapseWs(inlineToMd(cap));
    return '*(figure: ' + decodeEntities(label) + (capMd ? ' — ' + capMd : '') + ')*';
  }

  function renderBlock(blk) {
    switch (blk.t) {
      case 'mount':
        if (blk.name === 'howto') return null;                 // interaction boilerplate — drop
        if (blk.name === 'landscape') return renderAvenuesTable();
        if (blk.name === 'console') return renderConsole();
        return die('unknown mount: ' + blk.name);
      case 'h2': {
        const inner = blk.html.replace(/^<h2[^>]*>/, '').replace(/<\/h2>$/, '');
        const num = inner.match(/^<span class="num">([^<]*)<\/span>([\s\S]*)$/);
        return num ? '## ' + num[1] + ' ' + collapseWs(inlineToMd(num[2])) : '## ' + collapseWs(inlineToMd(inner));
      }
      case 'h3':
        return '### ' + collapseWs(inlineToMd(blk.html.replace(/^<h3[^>]*>/, '').replace(/<\/h3>$/, '')));
      case 'p': {
        const inner = blk.html.replace(/^<p[^>]*>/, '').replace(/<\/p>$/, '');
        const txt = collapseWs(inlineToMd(inner));
        return /^<p class="punch"/.test(blk.html) ? '*' + txt + '*' : txt;
      }
      case 'details': return renderDetails(blk.html);
      case 'div': return renderCallout(blk.html);
      case 'figure': return renderFigure(blk.html);
    }
    return die('unhandled block type ' + blk.t);
  }

  const parts = [];
  parts.push(collapseWs(inlineToMd(front.eyebrow)));           // kicker line
  parts.push('# ' + collapseWs(inlineToMd(front.title)));
  parts.push('*' + collapseWs(inlineToMd(front.byline)) + '*');
  for (const blk of tokenize(body)) {
    const r = renderBlock(blk);
    if (r != null && r !== '') parts.push(r);
  }
  if (usedCites.size) {
    let ref = '## References';
    for (const [k, label] of usedCites) {
      const c = cites[k];
      if (!c) die('cite "' + k + '" used in body but absent from #cites-data');
      ref += '\n\n- **' + decodeEntities(label) + '** — ' + c.who + '. ' + c.what + ' *' + c.src + '*';
    }
    parts.push(ref);
  }

  const md = parts.join('\n\n') + '\n';
  if (/<!--mount:|<!--slot:|\{\{[a-z]+\}\}/.test(md)) die('output still contains an unresolved token');
  return md;
}

// --- llms.txt: lineage-driven index (H1 + summary + working draft + chapters, newest-first).
//     Chapters are single-sourced from lineage.json — never reads the chapters/ dir, never
//     hand-lists. Empty lineage renders an honest "No chapters frozen yet." ---
function buildLlmsTxt() {
  const source = readSource();
  const front = frontmatter(source);
  const absM = slot(source, 'body').match(/<p class="abstract">([\s\S]*?)<\/p>/);
  const abs = absM ? collapseWs(stripTags(absM[1])) : '';
  const firstSentence = (abs.match(/^.*?\.(?=\s|$)/) || [abs])[0].trim();

  let out = '# ' + collapseWs(stripTags(front.title)) + '\n\n'
    + '> ' + (firstSentence || 'A self-explaining Open Dossier survey.') + '\n\n'
    + '## Working draft\n\n'
    + '- [The paper (front door)](index.md) — the live self-explaining edition: avenue landscape, consistency checks, and the full narrative, projected skin-free from the source.\n';

  let lineage = { chapters: [] };
  try { lineage = JSON.parse(fs.readFileSync(LINEAGE, 'utf8')); } catch (e) { /* no lineage yet -> empty */ }
  const chapters = (Array.isArray(lineage.chapters) ? lineage.chapters : []).slice()
    .sort((a, b) => (b.n || 0) - (a.n || 0));   // newest first
  out += '\n## Chapters\n\n';
  // llms.txt chapter index is NEWEST-FIRST by design — machine-index convention (RSS/
  // sitemap/changelog lead with latest), DISTINCT from lineage.html's oldest-first reading
  // order (human narrative arc). The divergence is intentional; do not "align" them.
  // Each deep-link targets the chapter's SEALED record markdown (chapters/<tag>/index.md),
  // never the live re-skin — the llms index is a stable, citable surface (parallel to the
  // cite-the-record rule); the re-skin is a reading view, not a citable artifact, so it has
  // no .md twin here on purpose. Path uses the freeze-authoritative c.path field.
  out += chapters.length
    ? chapters.map(c => '- [Chapter ' + c.n + ' — ' + collapseWs(stripTags(String(c.title || c.tag || '')))
                        + '](' + (c.path || 'chapters/' + c.tag + '/') + 'index.md)').join('\n') + '\n'
    : 'No chapters frozen yet.\n';
  return out;
}

if (require.main === module) {
  const md = renderMarkdown();
  fs.writeFileSync(OUT_MD, md);
  const llms = buildLlmsTxt();
  fs.writeFileSync(OUT_LLMS, llms);
  process.stdout.write('render_markdown: wrote ' + path.relative(ROOT, OUT_MD) + ' (' + md.length + ' chars) and '
    + path.relative(ROOT, OUT_LLMS) + ' (' + llms.length + ' chars)\n');
}

module.exports = { renderMarkdown, buildLlmsTxt, readAvenues, runVerifier };
