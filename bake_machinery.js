#!/usr/bin/env node
'use strict';
/*
 * bake_machinery.js — the static-card baker (the HTML twin of the markdown machinery).
 *
 * bakeMachinery(html) -> html: replaces the EMPTY runtime shells the renderer leaves
 *   - the landscape mount's empty grid  <div class="av-grid" id="av-grid"></div>
 *   - the console's IDLE  <div id="log">…</div>  and  <span id="ncheck">N</span>
 * with STATIC baked content, so the front door is readable with JS off and there are
 * baked cards/console for the machinery-leg equivalence gate to compare.
 *
 * Single-sourced (cannot drift from the markdown projection):
 *   - CARDS come from readAvenues() — the same avenues.json reader render_markdown's
 *     `## Avenues` table uses — and reproduce the runtime renderCards markup EXACTLY
 *     (av-card / av-top / av-name / s-chip / av-thesis / av-meta + forecast/sources cells),
 *     so the existing CSS styles the baked floor identically to the JS ceiling.
 *   - CONSOLE verdict comes from runVerifier() — verify_numbers.py's PASS/FAIL rows + tally,
 *     NOT a re-implementation of the in-page buildChecks(); the same results the md console shows.
 *
 * The baked #av-grid / #log carry data-baked="1" so the skin loader skips re-fetching and
 * never overwrites the baked floor (progressive enhancement; see skin/edition.html guard).
 *
 * Fail-loud on a missing shell / missing avenues.json / verifier error — never bakes a fake verdict.
 *
 * Usage:
 *   node bake_machinery.js     # bake the live index.html in place (if not already baked)
 * (Canonical path: render_edition.js calls bakeMachinery() as part of renderEdition().)
 */
const fs = require('fs');
const path = require('path');
const { readAvenues, runVerifier } = require('./render_markdown.js');

function die(msg) { process.stderr.write('bake_machinery: ' + msg + '\n'); process.exit(1); }

function bakeMachinery(html, source) {
  // source defaults to the LIVE root readers (today's behavior). The back-catalog renderer
  // (render_backcatalog.js) passes { avenues, verdict } read from a chapter's OWN sealed
  // avenues.json, so a re-skin bakes from sealed data, not the live root.
  const src = source || { avenues: readAvenues().avenues, verdict: runVerifier() };
  const avenues = src.avenues;
  const v = src.verdict;

  // --- CARDS: reproduce the runtime renderCards() markup EXACTLY (skin/edition.html) ---
  const STATUS = {
    'ESTABLISHED':     { cls: 's-est',      tcls: 't-est' },
    'OPEN-UNVERIFIED': { cls: 's-open',     tcls: 't-open' },
    'FORECAST':        { cls: 's-forecast', tcls: 't-forecast' },
    'REPORTED':        { cls: 's-reported', tcls: 't-reported' },
  };
  const statusMeta = s => STATUS[s] || { cls: 's-default', tcls: '' };
  const chip = s => '<span class="s-chip ' + statusMeta(s).cls + '">' + s + '</span>';
  const forecastCell = a => {
    if (a.status !== 'FORECAST') return '';
    if (!a.signpost) return '<span class="fc missing">⚠ forecast needs a dated signpost</span>';
    const pct = (a.forecast == null) ? '?' : a.forecast + '%';
    return '<span class="fc"><span class="pct">~' + pct + '</span> <span class="by">by ' + a.signpost + '</span></span>';
  };
  const sourcesCell = a => (!a.cites || !a.cites.length)
    ? '<span class="srcs"><span class="none">no sources</span></span>'
    : '<span class="srcs">' + a.cites.map(c => '<span class="ref">' + c + '</span>').join('') + '</span>';
  const cards = avenues.map(a =>
    '<div class="av-card ' + statusMeta(a.status).tcls + '">' +
      '<div class="av-top"><span class="av-name">' + a.name + '</span>' + chip(a.status) + '</div>' +
      '<p class="av-thesis">' + a.thesis + '</p>' +
      '<div class="av-meta">' + forecastCell(a) + sourcesCell(a) + '</div>' +
    '</div>'
  ).join('');

  const GRID_SHELL = '<div class="av-grid" id="av-grid"></div>';
  if (html.indexOf(GRID_SHELL) < 0) die('shell not found: empty #av-grid (' + GRID_SHELL + ')');
  html = html.replace(GRID_SHELL, () => '<div class="av-grid" id="av-grid" data-baked="1">' + cards + '</div>');

  // --- CONSOLE: bake the verifier verdict (rows + tally) into #log; set #ncheck ---
  const rows = v.checks.map((c, i) =>
    '<div class="row"><span class="badge ' + (c.status === 'PASS' ? 'p' : 'f') + '">' + c.status + '</span>' +
    '<span class="what">' + String(i + 1).padStart(2, '0') + ' · ' + c.label + '</span></div>'
  ).join('\n      ');
  const tally = '<div class="tally">TOTAL: ' + v.tally + (v.summary ? ' — ' + v.summary : '') + '</div>';
  const bakedLog = '<div id="log" aria-live="polite" data-baked="1">\n      ' + rows + '\n      ' + tally + '\n    </div>';

  const LOG_RE = /<div id="log"[^>]*>\s*<div class="row">[\s\S]*?<\/div>\s*<\/div>/;
  if (!LOG_RE.test(html)) die('shell not found: console #log IDLE row');
  html = html.replace(LOG_RE, () => bakedLog);

  const NCHECK_SHELL = '<span id="ncheck">N</span>';
  if (html.indexOf(NCHECK_SHELL) < 0) die('shell not found: #ncheck (' + NCHECK_SHELL + ')');
  html = html.replace(NCHECK_SHELL, () => '<span id="ncheck">' + v.checks.length + '</span>');

  return html;
}

if (require.main === module) {
  const p = path.join(__dirname, 'index.html');
  const html = fs.readFileSync(p, 'utf8');
  if (html.indexOf('id="av-grid" data-baked') >= 0) {
    process.stdout.write('bake_machinery: index.html already baked (no-op)\n');
  } else {
    fs.writeFileSync(p, bakeMachinery(html));
    process.stdout.write('bake_machinery: baked machinery into ' + path.relative(__dirname, p) + '\n');
  }
}

module.exports = { bakeMachinery };
