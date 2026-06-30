#!/usr/bin/env node
'use strict';
/*
 * run_tests.js — author-local test runner: discovers and runs every author-local
 * test by naming convention, with NO list to maintain.
 *
 * Walks the repo from this file's directory, finds every *.test.js / *.test.py
 * (skipping node_modules and dotdirs), dispatches by extension (.test.js -> node,
 * .test.py -> python3), streams each test's own PASS/FAIL output, and aggregates
 * by EXIT CODE: a non-zero child is a failure. New tests register simply by being
 * named *.test.{js,py} — the runner finds them; nothing here to edit.
 *
 * Author-local convenience aggregator, the same doctrine as the tests it
 * discovers: stdlib/built-ins only, zero npm deps, fail-loud. It is NOT run by CI — CI calls the
 * individual verify gates directly; the stdlib-only verify floor stays untouched.
 *
 *   node run_tests.js        # or: npm test
 *
 * Exit 0 if every discovered test passes (or none exist — an empty test set is a
 * clean state); exit 1 if any test fails or cannot be run.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const TEST_RE = /\.test\.(js|py)$/;

// Recursive discovery from ROOT. Skips node_modules and any dotdir (.git etc) so
// the walk stays inside the project's own source. Returns repo-relative paths, sorted.
function discover(dir, found) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const name = entry.name;
    if (entry.isDirectory()) {
      if (name === 'node_modules' || name.startsWith('.')) continue;
      discover(path.join(dir, name), found);
    } else if (TEST_RE.test(name)) {
      found.push(path.relative(ROOT, path.join(dir, name)));
    }
  }
  return found;
}

// Runtime per extension. A .test.py that can't run because python3 is missing is a
// FAILURE, not a silent skip — a test that cannot run must not read as a pass.
function runnerFor(file) {
  return file.endsWith('.py') ? 'python3' : 'node';
}

function main() {
  const tests = discover(ROOT, []).sort();

  if (tests.length === 0) {
    console.log('run_tests: no *.test.{js,py} found — empty test set is a clean state.');
    return 0;
  }

  console.log('run_tests: discovered ' + tests.length + ' test file(s):');
  for (const t of tests) console.log('  - ' + t + '  (' + runnerFor(t) + ')');

  const results = [];
  for (const t of tests) {
    const runner = runnerFor(t);
    console.log('\n' + '='.repeat(70) + '\n# ' + runner + ' ' + t + '\n' + '='.repeat(70));
    try {
      execFileSync(runner, [path.join(ROOT, t)], { cwd: ROOT, stdio: 'inherit' });
      results.push({ test: t, ok: true });
    } catch (e) {
      // Non-zero exit (test failed) OR the runner binary is missing (ENOENT) — both
      // are failures. Surface which, so a missing python3 isn't mistaken for a pass.
      const why = e && e.code === 'ENOENT'
        ? 'cannot run — "' + runner + '" not found on PATH'
        : 'exit ' + (e && e.status != null ? e.status : '?');
      console.error('run_tests: ' + t + ' FAILED (' + why + ')');
      results.push({ test: t, ok: false, why });
    }
  }

  const passed = results.filter(r => r.ok).length;
  const failed = results.length - passed;
  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY: ' + passed + ' passed, ' + failed + ' failed');
  for (const r of results) {
    console.log('  ' + (r.ok ? 'PASS' : 'FAIL') + '  ' + r.test + (r.ok ? '' : '  (' + r.why + ')'));
  }
  return failed ? 1 : 0;
}

process.exit(main());
