# The Open Dossier Format
## Architectural instructions for AI-assisted, publicly verified independent research

An *Open Dossier* is a research publication shipped as a versioned
repository: executable claims under CI, audited citations, published
adversarial review, a typed claim ledger with honest per-claim
verification status, and DOI-archived releases. Dossier 001 is the
reference specimen; this document is the spec for Dossier 002 and beyond.

**Governing invariant:** the rule is not "everything is verified."
The rule is "every label is true."

---

## Phase 0 — Conception & prior-art reconnaissance (AI-led)

- State the idea in one paragraph. Extract its 3–6 candidate novelty claims.
- Search each claim directly, then its components, then combinations.
- Produce: established / adjacent / open table.
- Kill criterion: if the center is prior art, pivot to the open residue or stop.
- Known limit: conference abstracts and in-review work are poorly indexed.
  Novelty claims are always "to the best of our knowledge."

## Phase 1 — The claim ledger (AI-led, human-reviewed)

Every claim gets a row. Columns: `id, claim, type, verifier, status`

Claim types and their mandated verifiers:

| Type | Meaning | Verifier |
|---|---|---|
| CITE | a source says X | fetch primary source; check authors, title, venue, vol, page, year |
| NUM | a number follows from stated assumptions | executable script; PASS/FAIL |
| DERIV | a derivation or proof step | symbolic recomputation or human review or OPEN-UNVERIFIED |
| NOVEL | nobody has done X | Phase 0 search record + "to our knowledge" phrasing |
| EST | engineering projection | script + clearly labeled as projection in text |

Claim statuses run from most defensible to most speculative: verified/PASS →
OPEN-CAVEATED → OPEN-UNVERIFIED → and, below all of them, the most speculative
tier:

**OPEN-CAVEATED** — a claim that is established, but only under an explicitly
stated restriction. The gap is one of verification WORK, not truth: the result
holds within its stated scope, and closing the caveat (extending the
derivation, computing the general case) is bounded work that could be done. It
is NOT for claims whose truth hinges on a contingent external fact that may or
may not hold — those are OPEN-UNVERIFIED. The test: can the gap be closed by
doing more verification work? → OPEN-CAVEATED; does the claim instead depend on
a fact that must be true but is not established? → OPEN-UNVERIFIED. Unlike
OPEN-UNVERIFIED, an OPEN-CAVEATED claim is verified within its scope (true, with
a caveat), not merely unverified; unlike EXPLORATORY-CONJECTURE, it asserts a
truth value (within scope) rather than none. Worked example: a result proven
only for the Gaussian case is OPEN-CAVEATED (the general case is more
verification work); a result that holds only assuming the measured range is
accurate is OPEN-UNVERIFIED (it hinges on a contingent fact — the measurement —
that has not been verified).

**EXPLORATORY-CONJECTURE** — deliberately speculative material for gedanken
experiments and idea exploration; asserts NO truth value. Admissible only if it
(a) states its premise — the explicit "if"; (b) predicts a distinct, measurable
signature that would distinguish it from the alternatives; and (c) names its
cost — the conservation law or principle it strains, the energy density or
exotic ingredient it implies, and what it cannot explain. A conjecture that
predicts nothing and costs nothing is cut. **Quarantine rule:** it lives ONLY
in a clearly-labeled exploratory section — never in the abstract, the main
results, or the claim ledger except as a row explicitly tagged
EXPLORATORY-CONJECTURE — and it may never be used as a premise for a claim of
any higher verification status. A sandbox with walls, not a loophole.

OFF the verification ladder entirely — on a separate axis — sits a provenance
label, not a rung below EXPLORATORY-CONJECTURE:

**REPORTED — NON-SCIENTIFIC SOURCE, UNCORROBORATED** (provenance label — rarely
used; included for completeness. Applies mainly to dossiers investigating
phenomena where non-scientific reports are part of the landscape; most dossiers
will never need it.) A reported observation or claim recorded in the dossier for
completeness or to flag a question worth investigating, originating from a source
that does not meet evidentiary standards — no published methodology, no raw or
instrumented data, no independent corroboration, no peer review (e.g.
entertainment media, anecdote, social media). It asserts no truth value and is
explicitly NOT the author's claim. This label sits on a different axis from the
others: the verification ladder (verified → OPEN-CAVEATED → OPEN-UNVERIFIED →
EXPLORATORY-CONJECTURE) measures how well-backed a claim the author is making or
exploring; this label measures provenance — where a reported item came from — for
material the author records but does not adopt. It is a tag on origin, not a rung
on the ladder. **Admissibility requirements (all mandatory):** (1) the source is
named explicitly and its non-scientific nature stated plainly; (2) **mundane-
explanation wall** — where an ordinary candidate explanation exists, it must be
stated with at least equal prominence to the reported anomaly. Where no ordinary
explanation is known, that absence must itself be stated ("no ordinary explanation
has been identified") — never left as an implied void, because an
unexplained-by-omission report reads as significance it has not earned. Recording
an anomaly while suppressing its plausible ordinary explanation is inadmissible
one-sided framing; (3) **premise wall** (inherited from EXPLORATORY-CONJECTURE, in
full) — it may never serve as a premise for any higher-status claim, never enters
the abstract or main results, and lives only in a clearly-walled "reported
anomalies" register, visibly separated from the physics; its function is to inform
which questions to ask, and it gets no vote on any claim's verification status.
**Boundaries:** vs. CITE — CITE means a real, evidentiary source supports the
claim; this means the source explicitly does not meet that bar, the non-evidentiary
provenance is the whole point. vs. OPEN-UNVERIFIED — OPEN-UNVERIFIED is the author's
own asserted claim, merely unchecked; this is someone else's reported claim from a
non-evidentiary source — a provenance problem, not an unfinished-verification one.
vs. EXPLORATORY-CONJECTURE — conjecture is a structured physics hypothesis (premise
/ predicted signature / named cost); this is a raw reported observation with no such
structure, it makes no hypothesis at all. **Worked example:** a recurring EM signal
reported only on a television program → REPORTED — NON-SCIENTIFIC SOURCE,
UNCORROBORATED, with the source named, its non-scientific nature stated, and the
mundane candidate (e.g. uncharacterized RF interference, or that no instrumented
measurement exists to assess it) stated alongside with equal prominence.

## Phase 2 — Drafting (AI-led)

- Manuscript written with claim ledger open.
- Reproducibility section mandatory.
- AI-assistance disclosure mandatory — state the actual review basis, not
  the aspirational one.

## Phase 3 — Mechanical verification (AI-led, automatic)

- `verify_numbers.py` recomputes every NUM and EST.
- Exits nonzero on any failure. **Fix the paper. Never widen the tolerance.**
- Citation audit: re-fetch and re-check every CITE at final-draft stage.

## Phase 4 — Adversarial review (AI-led, decorrelated sessions)

Hand the draft to fresh AI sessions — ideally different models — with this
brief verbatim:

> "You are Referee 2. Your goal is to reject this paper. Find: (a) the
> physics/math error that kills it; (b) the prior art that scoops it;
> (c) the internal inconsistency; (d) the overclaim in abstract vs body;
> (e) the assumption a hostile expert would call naive. Report findings
> ranked by severity. Do not be polite."

Consolidate into findings: RESOLVED (fixed) or OPEN (stated as caveat).
Publish both. An open finding stated in the paper is armor; discovered by
a referee, it is a wound.

## Phase 5 — Human review (HUMAN)

**Per-claim waiver doctrine.** The human may decline to verify any item.
That is a legitimate mode — judging end results by consistency and reality
checks, as in modern software practice. The waiver has one non-negotiable
price:

1. The claim's ledger status → OPEN-UNVERIFIED
2. Manuscript language softened → "is expected to," "we conjecture"
3. Acknowledgments state actual review basis
4. Claim posted as open invitation, ideally with named credit for whoever
   closes it

The format's invariant is not that everything is verified. It is that
every label is true. A paper full of honestly-labeled open claims is a
research instrument. A paper with one falsely-labeled verified claim is
dead, and takes the format's credibility with it.

## Phase 6 — Publication

- GitHub Pages → the reading layer (live site)
- Zenodo (auto on release toggle) → CERN archive + DOI
- OpenTimestamps (auto via `auto-timestamp.yml`) → blockchain proof
- Direct emails to 3–6 groups the work builds on → fastest deep review
- LinkedIn post linking the live page → distribution

**Attribution is preserved by the record, not by gatekeepers:**
- Git history: every contribution hashed, attributed, ordered
- Zenodo DOIs: each version archived, concept DOI points to latest
- Software Heritage: independent perpetual archive
- OpenTimestamps: institution-free cryptographic priority proof

## The open challenge mechanic

For any OPEN-UNVERIFIED claim, publish it explicitly as a challenge:
"The first correct treatment, confirming or refuting, gets named credit
in v[next]." This converts an unverified claim from a weakness into a
community engagement mechanism. Fork, branch, derive, open a PR.
The record keeps the receipts.

---

## What this pipeline does NOT replace

Expert peer review catches what no pipeline component catches: wrong
framing of a field, experimental impracticality known only to
practitioners, unpublished negative results everyone in the hallway knows
about. The pipeline's claim is narrower and still transformative: it makes
every mechanically-checkable claim checked, in public, before any referee
is asked for their time, and it compresses the human's verification burden
to a named residue. It raises the floor. Expert judgment still sets the ceiling.
