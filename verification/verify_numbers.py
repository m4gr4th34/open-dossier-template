#!/usr/bin/env python3
"""
verify_numbers.py — Open Dossier survey-consistency verifier (template stub).

This is the Python mirror of the consistency console in index.html. A survey's
verification weight sits mostly in the citation audit (dossier.html); this
script runs the same cross-avenue CONSISTENCY checks the browser console runs,
so CI and the live page always agree.

INSTRUCTIONS FOR AUTHORS:
Keep the AVENUES list below in lockstep with the AVENUES array in index.html
(same name / status / forecast / signpost shape), then add your survey's real
cross-avenue and arithmetic checks alongside the built-in consistency checks.

The contract (unchanged):
  - computed value must fall within [claimed_lo, claimed_hi]
  - if it doesn't, this script exits nonzero — CI goes red — fix the PAPER
  - never widen the tolerance to make a failing check pass
  - label is the exact check as it reads on the page

Run locally:  python verification/verify_numbers.py
CI runs this: on every push (see .github/workflows/verify.yml)
"""

import sys

PASS, FAIL = "PASS", "FAIL"
results = []


def check(label, computed, claimed_lo, claimed_hi, fmt="{:.4g}"):
    ok = claimed_lo <= computed <= claimed_hi
    status = PASS if ok else FAIL
    results.append((status, label, computed, (claimed_lo, claimed_hi)))
    symbol = "✓" if ok else "✗"
    print(f"[{status}] {symbol} {label}")
    print(f"       computed={fmt.format(computed)}  "
          f"claimed=[{fmt.format(claimed_lo)}, {fmt.format(claimed_hi)}]")
    return ok


# ----------------------------------------------------------------
# AVENUES — keep in lockstep with the AVENUES array in index.html.
#   status   : ESTABLISHED | OPEN-UNVERIFIED | FORECAST | REPORTED
#   forecast : subjective probability (%) for a FORECAST avenue, else None
#   signpost : dated, falsifiable signpost — MANDATORY for a FORECAST
# Placeholder data; replace with your survey's avenues. Exits green as-is.
# ----------------------------------------------------------------
AVENUES = [
    {"name": "PLACEHOLDER avenue A", "status": "ESTABLISHED",     "forecast": None, "signpost": None},
    {"name": "PLACEHOLDER avenue B", "status": "OPEN-UNVERIFIED", "forecast": None, "signpost": None},
    {"name": "PLACEHOLDER avenue C", "status": "FORECAST",        "forecast": 35,   "signpost": "2030"},
    {"name": "PLACEHOLDER avenue D", "status": "REPORTED",        "forecast": None, "signpost": None},
]


print("=" * 72)
print("SURVEY CONSISTENCY — same checks as the index.html console")
print("=" * 72)

forecasts     = [a for a in AVENUES if a["status"] == "FORECAST"]
with_signpost = sum(1 for a in forecasts if a["signpost"])
out_of_range  = sum(1 for a in AVENUES
                    if a["forecast"] is not None and (a["forecast"] < 0 or a["forecast"] > 100))

# (1) Every avenue renders a card — at least one avenue in the landscape.
check("Consistency: at least one avenue in the landscape", len(AVENUES), 1, 9999)
# (2) Mandatory-signpost rule: every FORECAST carries a dated signpost.
check("Consistency: every FORECAST has a dated signpost", with_signpost, len(forecasts), len(forecasts))
# (3) Probabilities are well-formed: all forecast probabilities lie in [0,100].
check("Consistency: all forecast probabilities lie in [0,100]", out_of_range, 0, 0)

# TODO: add your survey's real cross-avenue / arithmetic checks here,
# mirroring whatever you add to buildChecks() in index.html. Same rule:
# never widen a tolerance to make a failing check pass — fix the paper.

# ----------------------------------------------------------------
print()
n_fail = sum(1 for r in results if r[0] == FAIL)
n_pass = sum(1 for r in results if r[0] == PASS)
print("=" * 72)
print(f"TOTAL: {len(results)} checks · {n_pass} pass · {n_fail} fail")
if n_fail:
    print("FAILURES FOUND — fix the paper, not the tolerances.")
else:
    print("All checks pass — the survey is internally consistent.")
print("=" * 72)
sys.exit(1 if n_fail else 0)
