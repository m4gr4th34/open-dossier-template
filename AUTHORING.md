# AUTHORING.md — How to build an Open Dossier
## A production playbook for AI agents (and the humans directing them)

**Who this file is for:** any capable AI agent handed a research idea and
this repository. Follow it and the output is a complete dossier: formal
PDF, interactive edition, self-explaining edition, audit trail, verified
claims, honest labels. **The human's job is the ideas, the intuition, the
reality checks, and the sign-offs. Everything else is yours.**

Read `verification/research_pipeline.md` first — it defines the process
phases and the claim types. This file defines the *production specs*: what
good output looks like on each surface.

---

## The Triple Lockstep (the one rule above all others)

Every quantitative claim exists in three places and they must always agree:

1. The manuscript prose (`paper/manuscript.tex`)
2. The Python verifier (`verification/verify_numbers.py`)
3. The JavaScript console (`index.html`)

Any edit to a number updates all three in the same commit. When a check
fails: **fix the paper, never widen the tolerance.** The tolerances in the
checks are exactly what the manuscript states — not padded.

**Known limitation (and roadmap).** The survey scaffold now single-sources its
avenue **data** via `avenues.json` — read by both `index.html` and
`verification/verify_numbers.py` — which closes the data-drift hole: the
editions and the verifier can no longer disagree about what the avenues are.
What remains hand-mirrored is the three consistency-**check implementations**
across Python and JS — simple invariants (at least one avenue; every FORECAST
carries a dated signpost; all forecast probabilities in [0,100]) that rarely
change. Full logic unification — generating one set of checks from the other,
or a shared declarative spec — stays the roadmap direction if the checks
proliferate. (The manuscript prose and claim ledger are still hand-synced too;
every numeric edit touches all of them in one commit.)

---

## Choosing the shape: survey (default) or single-result

Most dossiers are surveys — you scope a field before you dive — so the scaffold
ships **survey-shaped by default**: `index.html` renders the avenue landscape
from the canonical `avenues.json`, and both the consistency console and
`verification/verify_numbers.py` read that **same file**, so the data can't
drift between page and verifier. A focused **single-result** finding uses the
documented alternate instead: the slider-explorer / live-headline / presets
block, preserved as an OPTIONAL comment in `index.html` — Dossier 001 is the
worked example of that shape. State plainly in your project which shape you're
using; the editions, the console, and the verifier all follow from that one
choice.

## Surface 1 — The formal manuscript (`paper/manuscript.tex`)

Start from `paper/manuscript-template.tex`. Conventions:

- Plain `article` class compiles everywhere including arXiv; RevTeX is an
  optional later conversion.
- **Honest-language rule:** verified claims may assert ("yields", "is");
  claims with ledger status OPEN-UNVERIFIED must hedge ("is expected to",
  "we conjecture") AND state in the text that the claim is open, labeled,
  and invited as a community contribution.
- **FORECAST claims** are a distinct claim TYPE (not a status): a labeled author
  estimate — subjective probability or judgment — with stated reasoning and a
  mandatory dated, falsifiable signpost. There is no executable check; the
  signpost IS the verifier. Phrase it as an estimate, never a result, and carry
  ledger status OPEN-UNVERIFIED until the signpost date resolves it true/refuted.
- A `Relation to prior work` section explicitly separates established /
  adjacent / new, with "to the best of our knowledge" phrasing on novelty.
- A `Reproducibility` section (mandatory boilerplate in the template)
  points at the verification script.
- The `Acknowledgments` state the AI assistance AND the human's actual
  review basis — what was machine-checked, what was reality-checked, what
  nobody verified. Never write "all claims were verified by the author"
  unless it is literally true.
- **Amendments** are absorbed as dated `\section*{Note added (DATE)}`
  sections, never silent edits: state what changed, what is and is not
  affected, the issue number, and that archived releases stay frozen.

## Surface 2 — The interactive edition (`index.html`)

- Port every Python check into the `buildChecks()` console verbatim
  (same model, same tolerances). The reader pressing "Run all checks"
  must reproduce CI.
- If the result has tunable parameters, build the explorer: range sliders
  for each physical parameter, a live recomputed headline number, and
  reference markers showing prior art on the same scale. Presets must
  reproduce every row of the paper's results table.
- The abstract ends with the format's tagline: **Don't trust this paper —
  run it.**

## Surface 3 — The self-explaining edition (`paper.html`) — THE MAGIC

This is the format's crown jewel and the most judgment-heavy artifact.
Specs, learned from Dossier 001:

**Structure.** One page, one column, numbered narrative sections (5–8 of
them), readable top to bottom by a sharp high-school student with NO
prerequisites and NO clicking required — the expansions are optional
depth, not required context. Open with the problem as a story; end each
major turn with a `.punch` line (one italic sentence the reader carries
away).

**Voice.** Plain, warm, precise. Concrete analogies for every abstraction
(detector jitter = "photographing a hummingbird's wings with a shutter 30×
too slow"). Active voice. Zero hype words; let the facts be surprising.
Honesty beats polish: state what's open in the text itself.

**Term expansions.** Wrap the FIRST occurrence of every technical term:
`<button class="term" data-d="...">term</button>`. The `data-d` text is
3–5 sentences answering: what is it, why does it matter HERE, and what is
the one surprising thing about it? Written for a smart non-specialist.
~15–20 terms is typical for a physics paper. Test: could a curious
teenager read the expansion and continue without confusion?

**Citation chips.** Every load-bearing reference becomes a chip:
`<button class="cite" data-c="KEY">Venue 'YY</button>` plus a CITES entry:
- `who`: authors and year, with the group named when it adds standing
- `what`: TWO sentences, plain language — what that source actually
  showed, and why it matters to this paper. This is the anti-rabbit-hole:
  the reader never needs to leave the page to know why a citation exists.
- `src`: journal, volume, page.
Keep the demo chip in the how-to box — it teaches the interaction in the
reader's first ten seconds.

**Go-deeper drawers.** All equations live in collapsed `details.deeper`
blocks. The narrative must be complete without opening any of them.

**Honest labels inline.** Any OPEN-UNVERIFIED claim gets an `.openclaim`
amber box AT THE EXACT POINT the claim is made — naming its ledger id and
posting it as an open challenge with named credit for whoever closes it.

**OPEN-CAVEATED — verified within a stated scope.** A claim that holds, but
only under an explicitly stated restriction. The gap is verification WORK, not
truth: closing the caveat (extending the derivation, computing the general
case) is bounded work that could be done — so the claim is true within its
scope, not merely unverified. Separate it from OPEN-UNVERIFIED with the
verification-work-vs-contingent-fact test: a result proven only for the
Gaussian case is OPEN-CAVEATED (the general case is more verification work); a
result that holds only assuming the measured range is accurate is
OPEN-UNVERIFIED (its truth hinges on a contingent fact — the measurement — that
has not been verified). State the caveat explicitly at the claim in prose; the
ledger status is OPEN-CAVEATED.

**EXPLORATORY-CONJECTURE — the walled sandbox.** The most speculative label
(below OPEN-UNVERIFIED): deliberately speculative material for gedanken
experiments, asserting no truth value, admissible only if it states its premise,
predicts a distinct measurable signature, and names its cost (a conjecture that
predicts nothing and costs nothing is cut). Quarantine it to a clearly-labeled
exploratory section — never the abstract, the main results, or the ledger except
as a row tagged EXPLORATORY-CONJECTURE — and never let it be a premise for a
higher-status claim. The self-explaining edition may present such material in a
visually distinct exploratory section — reuse the `.openclaim` amber styling but
with an **EXPLORATORY** tag (not OPEN) — so readers always know they've entered
the speculative sandbox, not the verified results.

**REPORTED — NON-SCIENTIFIC SOURCE, UNCORROBORATED — an off-ladder provenance tag.**
(Rarely used; mainly for dossiers investigating phenomena where non-scientific
reports are part of the landscape.) A reported observation or claim recorded for
completeness or to flag a question worth investigating, from a source that does not
meet evidentiary standards (no published methodology, no raw or instrumented data,
no independent corroboration, no peer review — e.g. entertainment media, anecdote,
social media). It asserts no truth value and is explicitly NOT the author's claim.
It is not a rung on the verification ladder — it measures provenance (where a
reported item came from), not how well-backed a claim is. Admissibility (all
mandatory): (1) the source is named explicitly and its non-scientific nature stated
plainly; (2) **mundane-explanation wall** — where an ordinary candidate explanation
exists, state it with at least equal prominence to the reported anomaly; where no
ordinary explanation is known, state that absence explicitly ("no ordinary
explanation has been identified") — never leave it as an implied void, because an
unexplained-by-omission report reads as significance it has not earned (recording an
anomaly while suppressing its plausible ordinary explanation is inadmissible
one-sided framing); (3) **premise wall** (inherited from EXPLORATORY-CONJECTURE, in
full) — never a premise for a higher-status claim, never in the abstract or main
results, lives only in a clearly-walled "reported anomalies" register visibly
separated from the physics; it informs which questions to ask and gets no vote on
any claim's status. Distinguish it from CITE (a real evidentiary source — the
opposite of this), OPEN-UNVERIFIED (the author's own unchecked claim, not someone
else's report), and EXPLORATORY-CONJECTURE (a structured hypothesis — this makes no
hypothesis at all). Worked example: a recurring EM signal reported only on a
television program → REPORTED — NON-SCIENTIFIC SOURCE, UNCORROBORATED, with the
source named, its non-scientific nature stated, and the mundane candidate (e.g.
uncharacterized RF interference, or that no instrumented measurement exists to
assess it) stated alongside with equal prominence.

**Amendments.** Post-publication corrections appear as dated
`AMENDED · DD MMM YYYY` `.openclaim` blocks at the exact site of the
amended claim, stating: what changed, what is NOT affected, the issue
link, and that the archived release stays frozen. Mirror every amendment
across all four surfaces (tex Note added, paper.html block, index.html
qualifier, dossier.html finding update) in one commit.

## Surface 4 — The audit trail (`dossier.html`)

- Red-team findings from the Phase 4 adversarial pass, each RESOLVED
  (green) or OPEN (amber), ranked by severity, including author
  dispositions for deliberate waivers. Publish the embarrassing ones —
  a finding stated is armor; a finding discovered by a referee is a wound.
- The citation table: every reference with its verification status
  (primary-source verified / triangulated / flagged). Never fabricate an
  entry; flag what you couldn't confirm.
- Status chips in the header must state real counts.

## Provenance surfaces — DOI and Bitcoin timestamp

Three surfaces carry the publication's provenance, and every one must stay
true after each release:

- **The provenance bar** (top of `index.html` and `paper.html`) and
  **`verify.html`** read `provenance.json` at load time — so once that file
  carries the real version DOI and release tag, both update automatically.
  The `auto-timestamp` workflow rewrites `provenance.json` on each release
  (release tag + date); you set the DOI fields once.
- **The manuscript DOI footer** (`paper/manuscript.tex`, via `fancyhdr`) is
  baked into the PDF at compile time and is NOT auto-updated — replace its
  `TODO-AFTER-FIRST-RELEASE` placeholder with your version DOI after the
  first release, then let `build-pdf.yml` rebuild the PDF.

After each release, confirm the real version DOI is in `provenance.json`
(or was written there by the workflow) and in the manuscript footer.
DEPLOY.md's release step carries this reminder.

**Draft banner — pre-release only.** The README ships a draft-preview banner
("work in progress") that is present by default while drafting, so a
shared-early dossier signals honestly that it's unresolved. It MUST be cleared
at first release (see DEPLOY.md's release step and the README Rituals section)
— a published dossier should never display "work in progress." Clearing it is a
deliberate content edit the author makes at release, not machinery, so it is
never auto-applied by a template sync.

**Publish CTA — keep it canonical.** The publish-like-this CTA band (before the footer on index.html, paper.html, and dossier.html) intentionally points at the canonical open-dossier-template's GETTING-STARTED.md — the instructions-first front door — not at this dossier's own repo and not at the template's repo root. Every dossier funnels new authors straight into the step-by-step guide. Leave these URLs as the canonical GETTING-STARTED.md.

## The Project constitution (`PROJECT-INSTRUCTIONS.md`)

For authors who run a dossier as a Claude Project (the optional power-path in
GETTING-STARTED.md), the repo ships **`PROJECT-INSTRUCTIONS.md`** — a versioned
"constitution" the Project's Instructions point at with one line: *"Read
PROJECT-INSTRUCTIONS.md in the synced repo and follow it…"*. It is deliberately
**parallel to `CLAUDE.md`**: the same doctrine, binding the strategy-room chat
the way `CLAUDE.md` binds Claude Code. Treat it as machinery — per dossier, fill
in only its `[TOPIC]` line and Standing-context list; everything else is shared
doctrine, upgraded via the template-machinery sync (it's on the machinery list
in the README's Rituals section). If you revise your working rules, update both
`CLAUDE.md` and `PROJECT-INSTRUCTIONS.md` so the two rooms stay in lockstep.

## Design identity (do not reinvent)

The palette and type ARE the format's brand across all dossiers:
ink #101d26, paper #f6f8f9, teal #0e7c7b (verification/key), coral
#e4572e (accents/security), violet #6b4e9b (sources/learning), pass
#1e8e5a, open #b07d1f. Display: Spectral. Data/labels: IBM Plex Mono.
Body: system sans. Keep the machinery CSS from the scaffolds; spend your
creativity on the content, not the chrome.

## What the agent must STOP and ask the human

- Sign-off on every claim ledger row before release (per-claim waiver is
  the human's right; honest labeling is its non-negotiable price).
- Any release/tag decision (releases trigger DOI + blockchain anchoring).
- Novelty claims (the human's domain memory is a verifier).
- Anything where deployed reality contradicts the instructions — report
  the discrepancy; never improvise a workaround silently.

## Pre-release checklist

- [ ] `python3 verification/verify_numbers.py` exits 0
- [ ] Triple Lockstep: prose = Python = JS, spot-checked
- [ ] Every ledger label true; unverified claims hedged in prose
- [ ] Citation audit complete; flags resolved or stated
- [ ] Red-team pass done; findings published
- [ ] All four surfaces carry the funnel link to the template
- [ ] `.github/workflows/` and `.zenodo.json` present ON THE REMOTE
      (web uploads drop dotfiles — see DEPLOY.md)
- [ ] Acknowledgments state the actual review basis
- [ ] Human has signed off, item by item, on the residue list
