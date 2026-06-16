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
- **REPORTED — NON-SCIENTIFIC SOURCE, UNCORROBORATED** (provenance label — rarely
  used; included for completeness. Applies mainly to dossiers investigating
  phenomena where non-scientific reports are part of the landscape; most dossiers
  will never need it.) A reported observation or claim recorded in the dossier for
  completeness or to flag a question worth investigating, originating from a source
  that does not meet evidentiary standards — no published methodology, no raw or
  instrumented data, no independent corroboration, no peer review (e.g.
  entertainment media, anecdote, social media). It asserts no truth value and is
  explicitly NOT the author's claim. This label sits on a different axis from the
  others. The verification ladder (verified → OPEN-CAVEATED → OPEN-UNVERIFIED →
  EXPLORATORY-CONJECTURE) measures how well-backed a claim the author is making or
  exploring. This label measures provenance — where a reported item came from — for
  material the author records but does not adopt. It is a tag on origin, not a rung
  on the ladder.
  Admissibility requirements (all mandatory): (1) The source is named explicitly
  and its non-scientific nature stated plainly. (2) Mundane-explanation wall: where
  an ordinary candidate explanation exists, it must be stated with at least equal
  prominence to the reported anomaly. Where no ordinary explanation is known, that
  absence must itself be stated ("no ordinary explanation has been identified") —
  never left as an implied void, because an unexplained-by-omission report reads as
  significance it has not earned. Recording an anomaly while suppressing its
  plausible ordinary explanation is inadmissible one-sided framing. (3) Premise wall
  (inherited from EXPLORATORY-CONJECTURE, in full): it may never serve as a premise
  for any higher-status claim, never enters the abstract or main results, and lives
  only in a clearly-walled "reported anomalies" register, visibly separated from the
  physics. Its function is to inform which questions to ask; it gets no vote on any
  claim's verification status.
  Boundaries: vs. CITE — CITE means a real, evidentiary source supports the claim.
  This means the source explicitly does not meet that bar; the non-evidentiary
  provenance is the whole point. vs. OPEN-UNVERIFIED — OPEN-UNVERIFIED is the
  author's own asserted claim, merely unchecked. This is someone else's reported
  claim from a non-evidentiary source — a provenance problem, not an
  unfinished-verification one. vs. EXPLORATORY-CONJECTURE — conjecture is a
  structured physics hypothesis (premise / predicted signature / named cost). This
  is a raw reported observation with no such structure; it makes no hypothesis at
  all.
  Worked example: A recurring EM signal reported only on a television program →
  REPORTED — NON-SCIENTIFIC SOURCE, UNCORROBORATED, with the source named, its
  non-scientific nature stated, and the mundane candidate (e.g. uncharacterized RF
  interference, or that no instrumented measurement exists to assess it) stated
  alongside with equal prominence.

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
