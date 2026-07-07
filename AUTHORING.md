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
3. The verification console — appears in `index.html`, but generated, never hand-edited (see the Known-limitation note below)

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

**Generated, never hand-edited.** All three editions (`index.html`, `dossier.html`, and
`verify.html`) are BUILT from their own `editions/*.source.html` (the skin-free content) +
the shared `skin/edition.html` (the wrapper) by `npm run render-edition`, manifest-driven
over all three. For `index.html` the render also **bakes the avenue cards + console
verdict into static bytes** (`bake_machinery.js`, the HTML twin of the markdown table —
single-sourced from `avenues.json` + `verify_numbers.py`), so the front door is readable
with JS OFF (the in-page JS re-renders identically); `dossier.html` and `verify.html` carry
no baked machinery. Edit the SOURCE and re-render; never hand-edit any of the three — CI's
edition round-trip gate (`npm run check-edition`) fails the build if any rendered edition
drifts from `render(source, skin)`. See BOUNDARY.md.

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

**Two layouts — apparatus-first and essay-first.** There are two legitimate places for the
landscape apparatus. **Apparatus-first** (the template default): the landscape + console open the
page, then the narrative follows — the survey/front-door shape. **Essay-first** (recap or narrative
chapters): essay sections come first and the landscape appears *after* them, closing a thread rather
than opening one. Both are supported; pick by what the chapter is.

- **The seam is automatic.** When the landscape follows essay sections, the skin adds an
  inter-register section break — generous whitespace over a hairline rule — at that boundary
  (`h2 ~ #landscape`), so the shift from prose into the apparatus reads as a designed section
  change, not a different document. It is **deliberately absent when the apparatus opens the page**:
  a section-break marker belongs *between* registers, not before the first one. You write nothing —
  put the landscape where it belongs and the seam appears (or doesn't) correctly.
- **Honest label: override the kicker/lede for a non-survey apparatus.** The default kicker
  (`THE LANDSCAPE · SURVEY`) and lede are a *claim about the section* — true of a survey, false of a
  recap. A chapter whose landscape is not a survey **must** override them via source slots (they
  default to today's text, so a survey writes nothing):

  ```html
  <!--slot:landscape_kicker-->
  THE LANDSCAPE · PRIOR PROGRAM'S MAP
  <!--/slot:landscape_kicker-->
  <!--slot:landscape_lede-->
  One line describing what THIS chapter's landscape is.
  <!--/slot:landscape_lede-->
  ```

  The open/close tags go on their **own lines** with the content between (same convention as every
  other source slot, e.g. `head_extra`) — a one-line `<!--slot:…-->text<!--/slot:…-->` will not
  match. Skin-baked wording is a truth claim; label the apparatus for what it actually is here.
- **Structural caveat.** The seam keys on essay sections being **bare `<h2>` direct children**
  before `#landscape` (the repo idiom — see `editions/index.source.html`). If a future layout wraps
  essay sections in containers, the `h2 ~ #landscape` sibling rule won't match and the seam will
  need a class hook instead. Noted, not built — keep essays as bare `<h2>` siblings and it works.

**Three-region grammar — every region announces itself with a kicker.** The page reads as three
announced regions — the landscape apparatus, the consistency console, and the narrative chapter —
each opened by a `<div class="kicker …">EYEBROW · LABEL</div>` above its heading. The two **apparatus**
kickers are skin/slot-provided (`{{landscape_kicker}}` and the console's); the **chapter** kicker is
**author-written body content** — a plain `<div class="kicker teal">…</div>` line before your first
narrative `<h2>`, no slot machinery (the same lesson as the landscape slots: wording is a claim about
the section, so each dossier writes its own honest one — `THE CHAPTER · NARRATIVE` in
`index.source.html` is only the exemplar). Every kicker gets the **uniform region pause** above it
automatically from the skin (`.kicker{margin-top}`), and sits tight above its heading so the eyebrow
owns its title — you write the label, the spacing is free. Only *region openers* get a kicker; the
numbered sub-sections inside a chapter keep the plain `<h2>` rhythm.

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
- `src`: journal, volume, page, and a resolvable id (DOI or arXiv) — the permanent handle, not
  just a description.
Re-state every cite card fresh in each chapter the work appears in — full identity plus the
plain-language summary, re-written to foreground what matters *here*. Never point back to an
earlier chapter's card ("see Chapter N"): each chapter is sealed and read alone, so it must carry
its own sources in full. (This is doctrine — see the CITE label in CLAUDE.md.)
Keep the demo chip in the how-to box — it teaches the interaction in the
reader's first ten seconds.

**Go-deeper drawers.** All equations live in collapsed `details.deeper`
blocks. The narrative must be complete without opening any of them.

**Equations — author as `data-tex`, prerender with KaTeX (agent-primary; hand-edit
is the fallback).** Author every equation as LaTeX in a `data-tex` attribute and
never hand-write the rendered math:

- Display goes on `.eq`, inline on `span.math`:
  `<div class="eq" data-tex="E = mc^2"></div>` · `<span class="math" data-tex="x_i"></span>`.
- **Number equations with KaTeX's native `\tag`, inside the `data-tex`** — e.g.
  `data-tex="\Gamma \propto e^{-2\bar{n}} \tag{eq.\ 1}"` — and reference it from prose as plain
  text ("(eq. 1)"). The tag renders right-aligned in KaTeX's display layout, survives JS-off (it is
  baked), and is projector-safe by construction: it lives inside the one attribute the markdown
  projector already treats as a math atom. **Never build a label out of styled spans/divs** — the
  projector rejects unrecognized markup, loudly.
- **`\tag` is display-only.** It works in `.eq` divs; in `span.math` (inline) KaTeX throws
  `\tag works only in display equations`. Label display equations; never inline math.
- **The drawer's closed vocabulary.** Inside a `details.deeper` body the markdown projector accepts
  exactly: `div.eq[data-tex]`, `span.math[data-tex]`, `span.mono`, `<b>`/`<strong>`, `<em>`/`<i>`,
  `button.term`, `button.cite`, and prose. Anything else fails the render with a `die` naming the
  block — this list is the contract; check it before inventing markup.
- **Failure mode.** When `render_markdown` dies, `index.md` is left **stale** (the previous
  version), not partially written — the gate aborts before the write. If content seems missing from
  the markdown edition, find the `die` message and fix the named block; do not trust the old file.
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
  in `figures/README.md`.) A new figure type's module must also call
  `DossierFigures.registerRenderer("<type>", fn)` for its figures to get the click-to-open
  lightbox — the lightbox dispatches through that registry **only** (no name-based fallback),
  and a declared-but-unregistered type gets no lightbox plus a console warning.
- A module whose render returns a `{getState, setSlider}` handle (or `setMaster` for a composed
  master) and **stashes it on its container** (`container.__lfHandle = handle`) gets **state-handoff
  and Reset for free**: the lightbox reads `getState()` to open at the reader's current zoom, and the
  Reset control restores the spec's start view via the setter. No handle → the overlay opens at the
  published start (graceful). Figures also honor `prefers-reduced-motion` — consult
  `DossierFigures.prefersReducedMotion()` at your play-state init so the figure starts paused.
- If your figure sits on a **light background** (e.g. a chart on a light card), set the optional
  top-level `"stage":"#rrggbb"` to that card color: in the lightbox the runtime paints it onto the
  figure's own background and derives a luminance-separated mat from it (omit it and both default to
  the dark astronomy field). Add an optional `"caption":"…"` (plain text) for the figure's caption:
  the sealer bakes it as a `<figcaption>` below the figure (page + JS-off floor), and the lightbox
  shows the same text under the expanded figure — one field, three surfaces. **Author the caption IN
  THE SPEC; do not hand-write a prose caption next to the figure** — that recreates the drift this
  single-sourcing removes.
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
- **Break a data-dense figure out of the column with `class="living-figure wide"`.** Add
  `wide` to the figure's class list when the figure is **data-dense or multi-panel** and its
  internal headers, tick labels, or small multiples crowd at the ~720px reading column. The
  breakout is page-wide (`min(1140px, 100vw - 48px)`, centered on the column — 680 → 1140px at a
  1440 viewport), and because the counter-scale keys off each figure's rendered width, a wider
  figure buys **more drawable art at the same tier text sizes** — it relieves the crowding
  without shrinking the type, which is the whole point for small multiples. **Single-panel
  figures should stay column-width**: the reading measure is the default for a reason, and a
  lone plot gains nothing from the extra width. `wide` is viewport-capped, so it collapses to the
  column on narrow viewports (732px against the 720px column at a 780 viewport, an exact match at
  768, never overflowing — no horizontal scroll at any width), and the JS-off floor scales the
  sealed poster uniformly — archival behavior is unchanged. It is one class on the `<figure>`;
  nothing else to seal or re-run.

**Writing an animated module.** The astronomy modules settled these conventions the hard
way — measured in a real browser, fixed at the mechanism. Follow them and your figure
inherits the whole interaction stack (lightbox, handoff, Reset, reduced-motion) for free.

1. **The loop.** One `requestAnimationFrame` loop that re-schedules itself; advance state
   only while your `playing` flag is set. Never advance by wall-clock assumption — use the
   rAF timestamp delta (`dt = (now - last) / 1000`, clamped).
2. **Visibility gate.** Attach an `IntersectionObserver(fn, { root: null })` to your figure
   and stop re-scheduling the loop when it goes off-screen; resume from the frozen state on
   re-entry (`lfVisible` / `lfResume` in any spin module). Off-screen figures burning frames
   is the #1 cause of a janky page — and `root: null` fires on parent-scroll even inside an
   iframe.
3. **Reduced motion.** Consult `DossierFigures.prefersReducedMotion()` at your `playing`
   init and start paused when the reader's OS asks for it; their Play press is the explicit
   override.
4. **Cadence — measure before you throttle.** The instinct to throttle expensive per-frame
   work "to be safe" is how you ship invisible jerkiness: a 66ms recompute throttle reads as
   prudent and renders as 15Hz stepping inside a 60Hz page — most visible on straight lines
   and slow rotations. Time your actual write batch first (`performance.now()` around one
   full recompute at default density). The measured costs here: 79 nodes = 0.2ms, 1400 =
   0.9ms, 2600 = 1.0ms, 6000 nodes + a 9000-element cull = 2.5ms — against a 16.7ms frame
   budget. Rule of thumb: a batch under ~2ms runs at frame rate; heavier drops to 30Hz **with
   the measured number in a comment** (see `ROT_MS` in `galaxy.js`). Keep the throttle as a
   knob; set its value on evidence. If your figure feels stepped, question the cadence before
   the hardware.
5. **The handle.** Return `{getState, setSlider}` (or `setMaster` for a composed figure) and
   stash it: `container.__lfHandle = handle`. That one line buys state-handoff (expand
   continues from the reader's current zoom) and Reset (re-derive the published start from the
   spec).
6. **Seam safety.** Posters and any composition seams must depend on slider position + spec
   only — never on animation time (`t` / `angle`). Pausing, gating, and cadence changes must
   leave sealed bytes untouched: `node render_figures.js <page>` reporting **0 rewritten** is
   your proof.

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
across all surfaces (tex Note added, the editions/index.source.html self-explaining block +
console qualifier, editions/dossier.source.html finding update, then re-render) in one commit.

## Surface 3 — The audit trail (`dossier.html`)

**Generated, never hand-edited** (like the front door): author the red-team findings and the
citation table in `editions/dossier.source.html` slot:body, then run `npm run render-edition`;
never hand-edit `dossier.html`, which the same edition round-trip gate covers. See the
front-door note above and BOUNDARY.md.

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

**The timeline reads oldest → newest, with the frontier at the foot.** `lineage.html` lists the
sealed chapters first — Chapter 1 at the top, numbered 1..N top-down by the CSS counter — then the
**working-draft frontier** card last (dashed, no number): the current editions, which become the
next chapter when sealed. **Two doors per sealed chapter:** *Read (current edition) →* opens the
re-skinned reading view at `live/<tag>/index.html`; *Version of record ↗* opens the frozen
`chapters/<tag>/index.html` — the immutable bytes the **DOI** cites. Read it fresh; cite the
record. The DOI is the citation, the record door is the bytes, and each re-skin repeats the same
cite-the-record affordance in its own banner. This linking *is* the routing — there is no Pages
config that makes one URL "the chapter"; the lineage's honest links send readers to the reading
view and citations to the record.

The root `llms.txt` deep-links each chapter's **sealed record markdown** (`chapters/<tag>/index.md`)
**newest-first** for machine discovery — the stable, citable surface (parallel to "cite the version
of record"), deliberately distinct from `lineage.html`'s human **oldest-first** reading order.

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
**The back-catalog lifecycle is fully automatic — humans never run it.** Two complementary
workflows keep `live/` correct, each owning one half:
- **A new chapter is born WITH its reading view.** When a chapter is frozen, `freeze-chapter.yml`
  runs the renderer in the SAME job and adds `live/<tag>/` to the freeze commit — so the chapter
  and its current-skin reading view land atomically, in one commit, with no second trigger.
- **Skin / renderer changes re-skin the existing catalog.** `reskin-backcatalog.yml` fires on a
  change to the skin, the renderers/baker, or the shared rewire/verifier the reskin shells, and
  regenerates every existing `live/<tag>/`. (It does NOT watch `lineage.json` — freeze already owns
  new chapters — so the two never overlap.)

Both paths run the gates BEFORE committing — `check-backcatalog` (regenerated == render) and
`verify_projection.js` (each `live/<tag>` carries its sealed chapter's prose + machinery) — so a
bad reskin is **red CI, never served bytes**; both commit by explicit path as `github-actions[bot]`
with `[skip ci]`. You do not run anything. `npm run render-backcatalog` remains available purely as
a **local-preview convenience** (to eyeball a skin change before pushing) — it is not a required
step, and you need not commit its output, since the workflows regenerate and commit `live/`.

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
