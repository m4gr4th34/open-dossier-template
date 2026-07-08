#!/usr/bin/env python3
"""verdict_extractor.test.py — pin verdict_from_index_md() to render_markdown's console format.

The re-skin bakes each chapter's console from its sealed verdict.json, which freeze/backfill
EXTRACT from the chapter's index.md '## Consistency checks' section. That extractor is therefore
coupled to the exact format render_markdown.renderConsole() emits. This template is rootless (no
chapters), so nothing here would otherwise exercise that seam — this test does, on the template's
OWN emitted index.md plus synthetic edge cases a real dossier will hit (FAIL rows, no summary,
awkward labels). If the emitter's format ever drifts, this fails LOUD instead of a live freeze
silently sealing a wrong (or unparseable) verdict.

Author-local, stdlib-only, fail-loud — same doctrine as the gates. Discovered by run_tests.js.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from freeze_chapter import verdict_from_index_md

fails = []
def check(name, cond, detail=""):
    print(("PASS" if cond else "FAIL") + "  " + name + (("  — " + detail) if (detail and not cond) else ""))
    if not cond:
        fails.append(name)

# --- Test 1: round-trip on the template's OWN emitted index.md -------------------------------
md = open(os.path.join(REPO_ROOT, "index.md"), encoding="utf-8").read()
v = verdict_from_index_md(md)
check("extracts >=1 check from real index.md", len(v["checks"]) >= 1, "got %d" % len(v["checks"]))
check("tally is non-empty", bool(v["tally"]), repr(v["tally"]))
# Re-serialize the extracted verdict and assert EVERY emitted line appears verbatim in index.md.
# This pins the coupling to render_markdown's exact format without assuming the console section
# contains nothing but the verdict (in practice narrative follows it with no intervening heading).
md_lines = set(md.split("\n"))
for c in v["checks"]:
    line = "- [" + c["status"] + "] " + c["label"]
    check("check line present verbatim: " + c["label"][:40], line in md_lines, repr(line))
total_line = "**TOTAL: " + v["tally"] + "**" + ((" — " + v["summary"]) if v["summary"] else "")
check("TOTAL line present verbatim", total_line in md_lines, repr(total_line))

# --- Test 2: synthetic edge cases a real dossier will hit ------------------------------------
mixed = ("## Consistency checks\n\nResults from `verification/verify_numbers.py` — x.\n\n"
         "- [PASS] Consistency: at least one avenue\n"
         "- [FAIL] Arithmetic: budget = line items (off by 3)\n"
         "- [PASS] Range: p in [0,100] — includes the — dash\n\n"
         "**TOTAL: 3 checks · 2 pass · 1 fail** — FAILURES FOUND — fix the paper.\n")
mv = verdict_from_index_md(mixed)
check("mixed: 3 checks parsed", len(mv["checks"]) == 3, "got %d" % len(mv["checks"]))
check("mixed: FAIL row captured", mv["checks"][1]["status"] == "FAIL")
check("mixed: label with em-dash intact",
      mv["checks"][2]["label"] == "Range: p in [0,100] — includes the — dash",
      repr(mv["checks"][2]["label"]))
check("mixed: tally stops at closing **", mv["tally"] == "3 checks · 2 pass · 1 fail", repr(mv["tally"]))
check("mixed: summary is full remainder after ' — '",
      mv["summary"] == "FAILURES FOUND — fix the paper.", repr(mv["summary"]))

no_summary = ("## Consistency checks\n\nResults from x.\n\n- [PASS] only check\n\n**TOTAL: 1 checks · 1 pass · 0 fail**\n")
nv = verdict_from_index_md(no_summary)
check("no-summary: summary is None", nv["summary"] is None, repr(nv["summary"]))

# a following section must not leak into the checks
trailing = mixed + "\n## Next section\n\n- [PASS] this must NOT be captured\n"
tv = verdict_from_index_md(trailing)
check("stops at next '## ' heading", len(tv["checks"]) == 3, "got %d" % len(tv["checks"]))

# --- Test 3: fail-loud contract on malformed input ------------------------------------------
for bad, why in [("no console section here", "missing section"),
                 ("## Consistency checks\n\nno checks, no total\n", "no checks/tally")]:
    try:
        verdict_from_index_md(bad)
        check("raises on malformed (" + why + ")", False, "did not raise")
    except ValueError:
        check("raises on malformed (" + why + ")", True)

print("\nSUMMARY: %d failed" % len(fails))
sys.exit(1 if fails else 0)
