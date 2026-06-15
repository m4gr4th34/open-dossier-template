# CLAUDE.md — Working doctrine for this repository

This repo is an Open Dossier: a living research publication. These rules
are non-negotiable and apply to every session.

## Before any commit
- Run `python verification/verify_numbers.py`. If any check fails,
  fix the manuscript or the model — NEVER widen a tolerance to pass.
- If a change alters any number in the paper, the corresponding check
  in verify_numbers.py AND the JS port in index.html must be updated
  to match. All three must agree.

## Verification labels are sacred
- Every claim's status in claim_ledger.csv must be true. Claims nobody
  verified are labeled OPEN-UNVERIFIED, never asserted.
- Manuscript language must match ledger status: unverified claims say
  "is expected to" or "we conjecture", never "yields" or "is".
- **OPEN-CAVEATED** — a claim that is established, but only under an explicitly
  stated restriction. The gap is one of verification WORK, not truth: the
  result holds within its stated scope, and closing the caveat (extending the
  derivation, computing the general case) is bounded work that could be done.
  NOT for claims whose truth hinges on a contingent external fact that may or
  may not hold — those are OPEN-UNVERIFIED. The test: can the gap be closed by
  doing more verification work? → OPEN-CAVEATED; does the claim instead depend
  on a fact that must be true but isn't established? → OPEN-UNVERIFIED. Unlike
  OPEN-UNVERIFIED, an OPEN-CAVEATED claim IS verified within its scope (true,
  with a caveat), not merely unverified; unlike EXPLORATORY-CONJECTURE, it
  asserts a truth value (within scope) rather than none. Worked example: a
  result proven only for the Gaussian case is OPEN-CAVEATED (the general case
  is more verification work); a result that holds only assuming the measured
  range is accurate is OPEN-UNVERIFIED (it hinges on a contingent fact — the
  measurement — that has not been verified).
- **EXPLORATORY-CONJECTURE** — deliberately speculative material for gedanken
  experiments and idea exploration. Asserts NO truth value. Admissible only if
  it (a) states its premise — the explicit "if"; (b) predicts a distinct,
  measurable signature that would distinguish it from the alternatives; and
  (c) names its cost — the conservation law or principle it strains, the energy
  density or exotic ingredient it implies, and what it cannot explain. A
  conjecture that predicts nothing and costs nothing is cut. Quarantine rule:
  exploratory-conjecture material lives ONLY in a clearly-labeled exploratory
  section — never in the abstract, the main results, or the claim ledger except
  as a row explicitly tagged EXPLORATORY-CONJECTURE, and it may never be used as
  a premise for a claim of any higher verification status. It is a sandbox with
  walls, not a loophole.

## Releases vs commits
- Plain commits: site edits, typo fixes, doc improvements. Push freely.
- Releases (git tags): substantive milestones only. A release triggers
  automatic Zenodo DOI archiving and OpenTimestamps blockchain anchoring.
  Do not create releases without the author's explicit instruction.
- NEVER modify anything in timestamps/ — those are cryptographic proofs.

## File map
- index.html        — interactive edition (sliders + verification console)
- paper.html        — self-explaining edition (term/citation expansions)
- dossier.html      — audit trail (red team, citation audit)
- paper/            — LaTeX manuscript + PDF
- verification/     — verify script, audits, red-team report, format spec
- claim_ledger.csv  — every claim, typed, with honest status

## Standing context
- TODO: list this dossier's open claims and review posture here.
