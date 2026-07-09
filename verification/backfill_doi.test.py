#!/usr/bin/env python3
"""backfill_doi.test.py — exercise backfill_doi's core against an in-memory lineage.

The template is rootless (0 chapters), so the CLI's happy path can't run here. This tests the
pure apply_doi() core — the actual lineage mutation + every guard — with no files, so the write
logic and fail-loud conditions are proven in CI regardless of chapter count. Discovered by
run_tests.js. stdlib-only, fail-loud.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from backfill_doi import apply_doi

fails = []
def check(name, cond, detail=""):
    print(("PASS" if cond else "FAIL") + "  " + name + (("  — " + detail) if (detail and not cond) else ""))
    if not cond:
        fails.append(name)

def lineage_premint():
    return {"chapters": [
        {"n": 1, "tag": "v1.0.0", "title": "A", "version_doi": "", "concept_doi": "", "doi_archived": False},
        {"n": 2, "tag": "v2.0.0", "title": "B", "version_doi": "TODO-AFTER-FIRST-RELEASE"},
    ]}

# 1) happy path
L = lineage_premint()
changed = apply_doi(L, "v1.0.0", "10.5281/zenodo.100", "10.5281/zenodo.99")
e = L["chapters"][0]
check("happy: returns changed=True", changed is True)
check("happy: version_doi written", e.get("version_doi") == "10.5281/zenodo.100", repr(e.get("version_doi")))
check("happy: concept_doi written", e.get("concept_doi") == "10.5281/zenodo.99", repr(e.get("concept_doi")))
check("happy: stale doi_archived:false removed", "doi_archived" not in e, repr(e.get("doi_archived", "<absent>")))
check("happy: other chapter untouched", L["chapters"][1].get("version_doi") == "TODO-AFTER-FIRST-RELEASE")

# 2) TODO placeholder existing DOI is overwritable (not treated as a swap)
L = lineage_premint()
changed = apply_doi(L, "v2.0.0", "10.5281/zenodo.200")
check("TODO-existing: overwritten, changed=True", changed is True and L["chapters"][1]["version_doi"] == "10.5281/zenodo.200")

# 3) idempotent
L = lineage_premint()
apply_doi(L, "v1.0.0", "10.5281/zenodo.100")
check("idempotent: second identical call returns False", apply_doi(L, "v1.0.0", "10.5281/zenodo.100") is False)

# 4) false-label guard
L = lineage_premint()
apply_doi(L, "v1.0.0", "10.5281/zenodo.100")
try:
    apply_doi(L, "v1.0.0", "10.5281/zenodo.DIFFERENT")
    check("guard: differing DOI raises", False, "did not raise")
except ValueError:
    check("guard: differing DOI raises", True)
    check("guard: entry unchanged after refusal", L["chapters"][0]["version_doi"] == "10.5281/zenodo.100")

# 5) missing tag
try:
    apply_doi(lineage_premint(), "v9.9.9", "10.5281/zenodo.1")
    check("missing tag raises", False, "did not raise")
except ValueError:
    check("missing tag raises", True)

# 6) empty / TODO input DOI
for bad in ["", "  ", "TODO-AFTER-FIRST-RELEASE"]:
    try:
        apply_doi(lineage_premint(), "v1.0.0", bad)
        check("bad input rejected: %r" % bad, False, "did not raise")
    except ValueError:
        check("bad input rejected: %r" % bad, True)

print("\nSUMMARY: %d failed" % len(fails))
sys.exit(1 if fails else 0)
