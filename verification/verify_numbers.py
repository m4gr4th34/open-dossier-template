#!/usr/bin/env python3
"""
verify_numbers.py — Open Dossier template verification stub.

INSTRUCTIONS FOR AUTHORS:
Replace each TODO block with a check for a real quantitative claim
in your manuscript. Every number in the paper should have an entry here.

The contract:
  - computed value must fall within [claimed_lo, claimed_hi]
  - if it doesn't, this script exits nonzero — CI goes red — fix the PAPER
  - never widen the tolerance to make a failing check pass
  - label is the exact claim as it appears in the manuscript

Run locally:  python verification/verify_numbers.py
CI runs this: on every push (see .github/workflows/verify.yml)
"""

import math
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


print("=" * 72)
print("VERIFICATION — replace TODO blocks with your paper's actual checks")
print("=" * 72)

# ----------------------------------------------------------------
# TODO: replace these example checks with your paper's claims.
#
# Example pattern:
#
#   result = your_formula(param_a, param_b)
#   check("Sec 2 claim: result equals X ± Y", result, X - Y, X + Y)
#
# The ranges should be exactly what your manuscript states —
# not padded to make things pass.
# ----------------------------------------------------------------

# Placeholder check — delete once you have real ones
check(
    "PLACEHOLDER — replace with your first real claim",
    42.0,  # computed value
    41.0,  # claimed lower bound
    43.0,  # claimed upper bound
)

# ----------------------------------------------------------------
print()
n_fail = sum(1 for r in results if r[0] == FAIL)
n_pass = sum(1 for r in results if r[0] == PASS)
print("=" * 72)
print(f"TOTAL: {len(results)} checks · {n_pass} pass · {n_fail} fail")
if n_fail:
    print("FAILURES FOUND — fix the paper, not the tolerances.")
else:
    print("All checks pass — the paper's numbers reproduce.")
print("=" * 72)
sys.exit(1 if n_fail else 0)
