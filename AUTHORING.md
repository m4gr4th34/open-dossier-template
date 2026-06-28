# AUTHORING.md — How to build an Open Dossier
## A production playbook for AI agents (and the humans directing them)

**Who this file is for:** any capable AI agent handed a research idea and
this repository. Follow it and the output is a complete dossier: a self-explaining front door, audit
trail, lineage index, verified claims, honest labels. **The human's job is the ideas, the intuition, the
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

**Known limitation (and roadmap).** The survey scaffold single-sources its avenue
**data** AND its consistency-check **rules** via `avenues.json` — both read by
`index.html` and `verification/verify_numbers.py`. The avenue list lives in
the `avenues` block of `avenues.json`; the check thresholds (minimum avenue
count, whether a FORECAST signpost is mandatory, the forecast probability
bounds) live in its `checks` block. Change a rule there and the page and the
verifier both
enforce it on next run — a threshold can no longer drift between them.

What is still written in each language is the check **logic itself** — the few
lines that filter forecasts, count signposts, and compare against the rules.
These are near-trivial and rarely change, and unifying them across Python and JS
would require codegen or a declarative check-DSL that, for three invariants,
would be harder to read than the code it replaces. So the residual is small and
named: if you add a genuinely new *kind* of check (not just a new threshold),
write it in both `buildChecks()` (index.html) and `verify_numbers.py`, and put
any new threshold it needs in the `checks` block of `avenues.json` so that part
stays single-sourced. Full logic unification stays the roadmap direction only if the checks
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

## Surface 2 — The front door (`index.html`) — the self-explaining edition

The front door **is** the self-explaining edition. It opens with the avenue
landscape and the consistency console — the interactive instrument — then
continues, on the same page, as the self-explaining narrative read top to
bottom. One page, one edition. (`paper.html` is now just a redirect stub that
forwards to `index.html`, kept so old links and frozen chapters resolve.)

**Generated, never hand-edited.** `index.html` is BUILT from
`editions/index.source.html` (the skin-free content) + `skin/edition.html` (the
wrapper) by `npm run render-edition`, which also **bakes the avenue cards + console
verdict into static bytes** (`bake_machinery.js`, the HTML twin of the markdown table —
single-sourced from `avenues.json` + `verify_numbers.py`), so the front door is readable
with JS OFF (the in-page JS re-renders identically). Edit the SOURCE and re-render; never
hand-edit `index.html` — CI's edition round-trip gate (`npm run check-edition`)
fails the build if `index.html` drifts from `render(source, skin)`. See BOUNDARY.md.

The same source also projects to **`index.md` + `llms.txt`** (the GENERATED,
token-efficient, skin-free markdown — avenue table from `avenues.json`, checks from
`verify_numbers.py`) via `npm run render-markdown`; never hand-edit `index.md` — CI's
markdown projection gate (`npm run check-markdown`) enforces it too.

On top of those, the **content-equivalence gate** (`npm run check-projection`) asserts
every PROSE atom of the source (headings, paragraphs, term glosses, cite who/what/src,
math, callouts) AND the **baked MACHINERY** (each avenue's name/thesis/status and each
console check label + the tally) appears in BOTH `index.html` and `index.md` — so the two
editions can't quietly diverge in what they say. It runs for the live working draft **and
every sealed chapter** under `chapters/<tag>/` (the floor leg), so frozen chapters stay
self-consistent too. And `llms.txt` is **lineage-driven** — its `## Chapters` list is
generated from `lineage.json`; regenerate it with `npm run render-markdown`, never
hand-edit. See BOUNDARY.md (step 2b).

**The interactive instrument (top of the page).**

- Port every Python check into the `buildChecks()` console verbatim
  (same model, same tolerances). The reader pressing "Run all checks"
  must reproduce CI.
- If the result has tunable parameters, build the explorer: range sliders
  for each physical parameter, a live recomputed headline number, and
  reference markers showing prior art on the same scale. Presets must
  reproduce every row of the paper's results table.
- The abstract ends with the format's tagline: **Don't trust this paper —
  run it.**

**The self-explaining narrative — THE MAGIC.** This is the format's crown jewel
and the most judgment-heavy artifact. Specs, learned from Dossier 001:

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

**Equations — author as `data-tex`, prerender with KaTeX (agent-primary; hand-edit
is the fallback).** Author every equation as LaTeX in a `data-tex` attribute and
never hand-write the rendered math:

- Display goes on `.eq`, inline on `span.math`:
  `<div class="eq" data-tex="E = mc^2"></div>` · `<span class="math" data-tex="x_i"></span>`.
- After writing or editing any `data-tex`, run `npm run render-math`. It prerenders
  the LaTeX into committed static HTML + MathML (KaTeX, vendored and version-pinned),
  so the math is baked into the page and **readers need zero JavaScript**. `data-tex`
  stays the editable source of truth — change it and re-run (idempotent) to re-render.
- This is an author-local step requiring Node, exactly like figures require
  matplotlib (`verification/figure_style.py`); readers need nothing, and **CI does
  not render math** — the stdlib-only verify floor stays untouched.

**Living figures — author as `data-figure`, seal with `render-figures` (agent-primary;
hand-edit is the fallback).** A *living figure* is an interactive SVG: a tiny JSON
spec in a `data-figure` attribute, rendered live by the vendored `figures/` runtime,
with a sealed static poster baked in for JS-off readers. This is a DIFFERENT path
from a **static plot** (Python/matplotlib → PNG via `verification/figure_style.py`,
see Design identity) — both are first-class; do not conflate them. Reach for a
living figure only when the result has dynamics worth exploring.

- Author the figure as `<figure class="living-figure" data-figure='{ "type":"…", …spec… }'>`,
  with a top-level **`"type"`** declaring the figure type (`"orrery"` / `"galaxy"` /
  `"cosmic"` for the built-ins), then load the runtime first, then the render module(s)
  it needs: `<script src="figures/figures.js"></script>` then
  `<script src="figures/orrery.js"></script>` (`galaxy.js` / `cosmiczoom.js` for the
  others). The full spec schemas — zoom-orrery, galaxy, cosmic-zoom — live in
  **`figures/README.md`**; author against them there and do not restate them in the
  page. (The engine is domain-agnostic: a non-astronomy project registers its OWN
  type without touching the sealer — see *Adopting the engine for a new figure type*
  in `figures/README.md`.)
- After writing or editing any `data-figure`, run `npm run render-figures` (or
  `node render_figures.js <page.html>`). It auto-loads the runtime + every figure
  module and **dispatches by `type`** through the poster registry, baking a
  deterministic static `<svg>` poster INTO the figure so **readers need zero
  JavaScript**; `data-figure` stays the editable source of truth — change it and
  re-run (idempotent). A figure type that registers no poster emitter is
  live-ceiling-only and is copied through unsealed; a figure with no `type` fails
  loud. On load the runtime removes the poster and renders the live figure (the floor
  upgrades to the ceiling).
- This is an author-local Node step, exactly like `render-math`; readers need
  nothing, and **CI never renders figures** — the stdlib-only verify floor stays
  untouched.
- **A capability that invites, not a bar that excludes.** Author a living figure only
  when the result genuinely has dynamics worth exploring. A null result, a flat line,
  a boring-but-correct table gets the SAME sealed, first-class frame — the medium
  never implies a finding must animate to be worthy. If your result isn't "sexy,"
  that is not a defect to paper over with motion: honesty outranks spectacle, and a
  still figure that tells the truth beats a moving one that oversells. Seal it plainly
  and let the honest label carry it.
- **In a fork:** a dossier made from the template already vendors `figures/`, so
  living figures work out of the box, and both sealing and freeze-survival are
  automatic (`render-figures` bakes the poster; a frozen chapter repoints its
  `figures/` script-src to the shared root). Enabling Pages on the fork and filling
  the `USER/REPO` placeholders is the ordinary fork story — see the README "Use this
  template" steps and DEPLOY.md; there is nothing figure-specific to redo.

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
across all surfaces (tex Note added, the index.html self-explaining block +
console qualifier, dossier.html finding update) in one commit.

## Surface 3 — The audit trail (`dossier.html`)

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

- **The provenance bar** (top of `index.html`) and
  **`verify.html`** read `provenance.json` at load time — so once that file
  carries the real version DOI and release tag, both update automatically.
  The `auto-timestamp` workflow updates only `release_tag` and the release date
  in `provenance.json`, in place — it never authors the DOI fields. You set
  `version_doi`/`concept_doi` yourself after Zenodo mints them (concept_doi
  once, permanently); a real DOI can never be overwritten or downgraded by
  automation.
- **The manuscript source footer** (`paper/manuscript.tex`, via `fancyhdr`)
  carries a `TODO-AFTER-FIRST-RELEASE` DOI placeholder. The LaTeX manuscript is
  an optional, on-demand artifact — the web editions are the paper, so it is not
  shipped or auto-built. If a legacy venue ever needs a typeset document,
  regenerate it from source and set its footer DOI to your version DOI by hand at
  that point.

After each release, backfill the new version DOI into `provenance.json` — the
workflow does not do this (it owns only the release tag and date). DEPLOY.md's
release step carries this reminder.

**Draft banner — pre-release only.** The README ships a draft-preview banner
("work in progress") that is present by default while drafting, so a
shared-early dossier signals honestly that it's unresolved. It MUST be cleared
at first release (see DEPLOY.md's release step and the README Rituals section)
— a published dossier should never display "work in progress." Clearing it is a
deliberate content edit the author makes at release, not machinery, so it is
never auto-applied by a template sync.

**Publish CTA — keep it canonical.** The publish-like-this CTA band (before the footer on index.html and dossier.html) intentionally points at the canonical open-dossier-template's GETTING-STARTED.md — the instructions-first front door — not at this dossier's own repo and not at the template's repo root. Every dossier funnels new authors straight into the step-by-step guide. Leave these URLs as the canonical GETTING-STARTED.md.

## Lineage — chapters across releases

A dossier can be a single chapter or a **lineage** of chapters. Each chapter is a
**release tag in this one repo** — `v1.0.0` is Chapter 1, `v2.0.0` is Chapter 2, and
so on — not a separate repository. GitHub Pages only ever serves the latest commit,
so without intervention an older chapter would vanish from the live URL the moment
the next one shipped. The lineage feature **freezes** each chapter at release, at its
own stable path, so every one stays readable forever.

`lineage.json` is the single source of truth: an ordered list of chapters, each
`{n, tag, title, summary, released, concept_doi, path}`. It ships **rootless**
(`{"chapters": []}`) — a standalone dossier has no lineage and shows none. Do **not**
hand-edit `lineage.json`; the freeze step appends to it, so the page and the archive
can never disagree about what exists.

Each frozen chapter also seals its **own `avenues.json`** (verbatim, alongside its source +
skin + `index.md`), so a chapter carries the avenue data behind its baked cards. The
verifier takes an optional `python verification/verify_numbers.py --avenues <path>` override
(no flag = the live root, byte-unchanged) — so a frozen chapter's verdict can be recomputed
from its OWN sealed `avenues.json` by the canonical verifier, never by reversing a projection.

`lineage.html` is the persistent **series index** — the reader's map of the whole arc.
Each edition also carries a compact **lineage strip** ("Chapter K of N · ← previous ·
view all chapters →") that appears only when chapters exist. Both read `lineage.json`
live, so they update the moment a new chapter is frozen.

**Ancestors-only — this is doctrine, not preference.** A chapter records and links only
what came *before* it: the previous chapter and the view-all index. **Never forward.** A
sealed, DOI'd chapter must not be edited to point at successors that did not exist when
it was sealed — backward lineage is permanently true, while a forward link would require
mutating a frozen artifact. The strip and the index are built this way on purpose; do
not add a "next chapter" anywhere.

**As-published — do not retro-theme the record.** A frozen chapter's `chapters/<tag>/`
editions preserve their appearance *at release*: the theme, the asset set, whatever shipped
that day. That tree is the immutable, DOI'd **version of record** — watching the design and
the argument mature across chapters is a feature, not a defect. **Never restyle the frozen
record**; never edit `chapters/<tag>/` to match a newer skin.

**The re-skin is a separate, labeled reading view — not a restyle of the record.** Distinct
from the frozen record, `live/<tag>/index.html` is a **current-skin reading view** of the same
chapter, generated by `render_backcatalog.js` (gate: `check-backcatalog`). It re-skins the
chapter's *sealed* source in the current skin and bakes its machinery from the chapter's *own*
sealed `avenues.json` (cards from it, console verdict via `verify_numbers.py --avenues` on it).
It carries a banner that names the frozen record — `chapters/<tag>/index.html`, with its
timestamp and DOI — so the label is **never false**: the re-skin says plainly it is the current
edition, not the record. The record is never touched; the re-skin is an additional door so the
whole back-catalog stays readable in the current skin (Pages serves only the latest commit).
**Re-skin ritual:** after any change to `skin/edition.html`, run `npm run render-backcatalog`
and commit the regenerated `live/` in a SEPARATE `chore(reskin)` commit (so a skin change and
its regenerated reading views read as one legible unit). `check-backcatalog` goes red if `live/`
is stale.

**Frozen = immutable.** `chapters/<tag>/` is write-once, exactly like `timestamps/` —
never modify a frozen chapter. The one thing freezing *does* adjust is navigation: a
frozen chapter's nav links point back to the **live root**, so a reader who deep-links a
sealed chapter can still return to the series. Its lineage strip stays hidden there —
the nav escapes upward, but the sealed chapter asserts nothing about a lineage it cannot
know.

**Asset discipline.** Freezing duplicates only the chapter's HTML (cheap). Shared assets
(`katex/`, fonts, CSS) are referenced at the live root from the frozen copies, never
re-copied; per-chapter heavy assets (figures) are stored write-once. A lineage
is one research **arc** — when an arc grows very long (dozens of chapters), that is the
signal to begin a *new* arc in a new repo, not a limit to engineer around.

**How chapters get frozen — two paths.** *Forward (automatic):* on each release,
`.github/workflows/freeze-chapter.yml` waits for provenance to settle, runs the
placeholder-honesty gate, then freezes the chapter and appends to `lineage.json` —
nothing to do by hand, just tag the release. *Backfill (one-time):* a repo that already
had releases before adopting lineage runs the **"Backfilling chapters from past
releases"** ritual (README Rituals) *once* to reconstruct its existing chapters; after
that, the forward workflow takes over.

## The Project constitution (`CLAUDE.md`)

For authors who run a dossier as a Claude Project (the optional power-path in
GETTING-STARTED.md), **`CLAUDE.md` is the single constitution** — the one file
that binds both rooms. Claude Code reads it automatically every session, and the
Project's Instructions point at the same file with the strategy-room pointer:
*"Your full constitution is CLAUDE.md — read it and follow it. Note specifically:
this is the strategy room. You CANNOT push to the repo; you decide here and hand
Code paste-ready instructions. (Full role split and standing context:
CLAUDE.md.)"* That explicit cannot-push guardrail is only safe once `CLAUDE.md`
is the full constitution — so on an OLDER dossier still on the slim workbench
`CLAUDE.md`, do the constitution-collapse migration (README Rituals →
Structural migrations → Migration B) before pasting it. A project that holds more
than one dossier repo uses the multi-repo pointer variant instead (see
GETTING-STARTED.md) — it keeps the same cannot-push role rule but works from the
active dossier's `CLAUDE.md`, and asks which dossier is active when that's
ambiguous. Treat it as machinery — per dossier, fill in
only its `## What this project is` topic line and its `## Standing context`
list; everything else is shared doctrine, upgraded via the template-machinery
sync (it's on the machinery list in the README's Rituals section).
**`PROJECT-INSTRUCTIONS.md`** is now only a back-compat redirect with no
doctrine of its own — it exists so older Projects whose Instructions still point
at it keep working; new Projects point straight at `CLAUDE.md`. There is no
second copy to keep in lockstep: revise your working rules in `CLAUDE.md` alone.

## Design identity (do not reinvent)

The palette and type ARE the format's brand across all dossiers:
ink #17262c, paper #f3f6f5, teal #0c8f86 (verification/key), coral
#cf5d36 (accents/security), violet #6b4e9b (sources/learning), pass
#1d9b62, open #bd861d. Display: Spectral. Data/labels: IBM Plex Mono.
Body: system sans. Keep the machinery CSS from the scaffolds; spend your
creativity on the content, not the chrome.

Generate figures through `verification/figure_style.py`'s `apply_dossier_style()`
so plots match the page (author-local; not run in CI). Usage:
`from verification.figure_style import apply_dossier_style; plt = apply_dossier_style()`.

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
- [ ] All surfaces carry the funnel link to the template
- [ ] `.github/workflows/` and `.zenodo.json` present ON THE REMOTE
      (web uploads drop dotfiles — see DEPLOY.md)
- [ ] Acknowledgments state the actual review basis
- [ ] Human has signed off, item by item, on the residue list
