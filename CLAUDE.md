# CLAUDE.md — the single constitution for this dossier

Claude Code reads this automatically; it is ALSO the constitution for the
strategy-room project chat (point the Project Instructions here). These rules
are non-negotiable and apply to every session.

## How this works (the pre-release operating model)

Before release, this repo is a **build-as-we-go shared drafting surface, not a
publication.** Rough drafts, ballpark numbers, and loose forecasts are welcome
from the very start — that is the intended way to work, not a violation. The
verification labels exist precisely so unfinished content can live in the open
honestly: a claim's label tells the reader exactly how finished it is.

Fill the editions early with clearly-labeled draft content and refine it in
place. **Do not quarantine draft material into side pages** — put it in the
self-explaining front door and the audit-trail edition where it belongs, wearing
an honest label, and sharpen it as you go.

The one rule that makes this safe: **loose content must carry its honest label
from the moment it lands — an unlabeled ballpark number is the violation, a
labeled one is not.**

## Doctrine (non-negotiable)
- The rule is not "everything is verified." The rule is **"every label is
  true."** Every claim's status in claim_ledger.csv must be true; claims
  nobody — human or machine — has verified are labeled OPEN-UNVERIFIED and
  posted as open challenges with named credit, never asserted.
- Manuscript language must match ledger status: unverified claims say
  "is expected to" or "we conjecture", never "yields" or "is".
- When a verification check fails: **fix the paper, never widen the tolerance.**
  Before any commit, run `python verification/verify_numbers.py`; if any check
  fails, fix the manuscript or the model — never the tolerance. Any change to a
  number updates every copy in lockstep — the manuscript prose, verify_numbers.py,
  and the index.html JS console (generated, never hand-edited; data/thresholds live in `avenues.json`, verdict baked from `verify_numbers.py`) — and all must agree.
- The author reviews by **consistency and reality checks on end results,
  not re-derivation** — stated publicly in the acknowledgments. Surface
  anything that looks inconsistent rather than smoothing it over.
- One falsely-labeled claim kills the format's credibility. Guard it.
- **Every chapter is readable in full.** No load-bearing content — a citation, a claim, a
  definition — back-references an earlier chapter ("see Chapter N"). A sealed, independently-DOI'd
  chapter carries its own meaning, because a reader may land on it alone. Guard it.
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
  Boundaries: vs. CITE — CITE means a real, evidentiary source supports the claim (see the CITE requirements below).
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
- **CITE** — a real, evidentiary source supports the claim, presented so the reader never needs to
  leave the page or hunt another chapter to know what it is or what it showed.
  Admissibility requirements (all mandatory): (1) full identity — authors, venue, year, and a
  resolvable id (DOI or arXiv); (2) a one-to-two-sentence plain-language summary of what the work
  actually showed and why it matters here; (3) both are re-stated fresh in every chapter the work
  appears in — never "see Chapter N," never a back-reference. This is the citation-level application
  of *every chapter is readable in full*: a sealed, independently-DOI'd chapter must carry the full
  identity and meaning of its own sources, because a reader may land on it alone.
  Boundaries: vs. REPORTED — CITE is evidentiary (primary or triangulated); REPORTED is an
  interested-party claim, cited for provenance not proof. Worked example: a chapter reusing a source
  from an earlier chapter re-writes that source's full cite card in place — same identity, a summary
  foregrounding what matters *here* — rather than pointing back.
- **FORECAST** (a claim TYPE, not a status) — a labeled author estimate
  (subjective probability/judgment) with stated reasoning and a mandatory dated,
  falsifiable signpost; it has no executable check, so its verifier IS the
  signpost. A FORECAST's status stays OPEN-UNVERIFIED until its signpost date
  resolves it true or refuted.

## What this project is
The strategy room for **Dossier [NNN / short-name]: [ONE-LINE TOPIC]**.
Connected repo: this synced repository. The dossier's two reading
surfaces (the self-explaining front door and the audit trail), its manuscript, its
verification script, and its claim ledger all live here.

## Standing context (edit per dossier)
- [List this dossier's open claims by ledger id.]
- [List current open red-team findings.]
- [Note anything a fresh session must know: the topic's sensitivities, the
  key prior work, the boldest claims and exactly how they're labeled.]

## Geography (three layers)
1. **GitHub = the truth.** The synced repo is the canonical state.
2. **The author's Mac + Claude Code = the workbench.** Claude Code is the
   ONLY thing that edits, commits, and pushes.
3. **This Project = the strategy room.** Its synced Files are a READ-ONLY
   window onto the repo. Sync before relying on them.

## Operating mode — read the section for your role

### If you are Claude Code (the executor)
- Plain commits: site edits, typo fixes, doc improvements. Push freely.
- Releases (git tags): substantive milestones only. A release triggers
  automatic Zenodo DOI archiving and OpenTimestamps blockchain anchoring.
  Do not create releases without the author's explicit instruction.
- NEVER modify anything in timestamps/ — those are cryptographic proofs.
- File map:
  - index.html        — the paper (GENERATED: edit editions/index.source.html + skin/edition.html, then `npm run render-edition`; never hand-edit — CI's `check-edition` gate enforces it). Self-explaining edition + avenue landscape + verification console, with the cards + console verdict BAKED to static bytes (JS-off readable).
  - editions/         — skin-free content sources: index.source.html / dossier.source.html / verify.source.html (one per edition), each with frontmatter (eyebrow/title/byline/active) + slot:body/foot/cites, plus an OPTIONAL slot:head_extra (per-edition CSS; dossier/verify use it, index omits it via the `''` fallback). Edit THESE, never the rendered *.html.
  - skin/             — the wrapper/skin (edition.html) the source renders into
  - index.md / llms.txt — GENERATED skin-free markdown projection of the source (edit the source, `npm run render-markdown`; never hand-edit — CI's `check-markdown` gate enforces it). llms.txt's chapter index is lineage-driven from lineage.json.
  - render_edition.js / verify_edition.js   — manifest-driven (EDITIONS): render index.html + dossier.html + verify.html each from its editions/*.source.html + skin/edition.html (incl. baking for index); CI `check-edition` round-trip gate covers all three.
  - bake_machinery.js — static-card baker: bakes avenue cards + console verdict into index.html (HTML twin of the md table, single-sourced from avenues.json + verify_numbers.py); called by render_edition
  - render_markdown.js / verify_markdown.js — render index.md+llms.txt from the source; CI projection gate
  - verify_projection.js — content-equivalence gate (prose + floor + machinery legs): every source prose atom AND baked avenue/console machinery present in BOTH index.html and index.md, for the working draft, every sealed chapter under chapters/<tag>/, AND every back-catalog re-skin under live/<tag>/ (vs the chapter's own sealed source + index.md) (CI `check-projection`)
  - render_backcatalog.js / verify_backcatalog.js — re-skin every lineage chapter into live/<tag>/index.html (current skin@HEAD + the chapter's OWN sealed source/avenues.json, with a banner pointing at the frozen record); CI sync gate (`check-backcatalog`). live/ is fully automated: a new chapter is born with its view in the freeze commit (`freeze-chapter.yml` runs the renderer atomically); skin/renderer changes re-skin the existing catalog (`reskin-backcatalog.yml`). Both gate before committing; humans never run it — `npm run render-backcatalog` is a local-preview convenience only.
  - live/<tag>/         — GENERATED current-skin reading view of each frozen chapter (NOT the record; chapters/<tag>/ is the immutable DOI'd record)
  - paper.html        — redirect stub → index.html (legacy link target)
  - dossier.html      — audit trail: red team, citation audit (GENERATED: edit editions/dossier.source.html + skin/edition.html, then `npm run render-edition`; never hand-edit — CI's `check-edition` gate enforces it).
  - verify.html       — independent verification: the OpenTimestamps/Bitcoin proof (GENERATED: edit editions/verify.source.html + skin/edition.html, then `npm run render-edition`; never hand-edit — CI's `check-edition` gate enforces it).
  - paper/            — optional LaTeX manuscript scaffold (on-demand legacy export; not shipped)
  - verification/     — verify script, audits, red-team report, format spec (verify_numbers.py takes an optional `--avenues <path>` override; no flag = live root, byte-unchanged). avenues.json is sealed into each frozen chapter, and the chapter's console verdict is ALSO sealed as chapters/<tag>/verdict.json (derived at freeze from the chapter's own sealed index.md, backfilled by verification/seal_verdicts.py). The back-catalog re-skin READS verdict.json — it never re-runs the verifier — so chapter-specific checks added to the global verify_numbers.py are safe: an old chapter keeps its own sealed check-set forever, never a later chapter's.
  - figures/          — vendored living-figures runtime (interactive SVG via data-figure)
  - claim_ledger.csv  — every claim, typed, with honest status
  - BOUNDARY.md       — the content/skin/machinery boundary spec (live-edition arc; the source/skin/render partition)
- Living figures (interactive SVG): authored as a `data-figure` JSON spec that
  declares a top-level `"type"`, rendered by the vendored `figures/` runtime, sealed
  into a static JS-off poster by `render-figures` (mirrors `render-math`). The core
  runtime (`figures.js` v0.2.0+) is **domain-agnostic**: new figure types register a
  poster emitter via `DossierFigures.registerPoster("type", fn)` and the sealer
  dispatches by `type` — no edit to `render_figures.js`. See `figures/README.md` for
  the reference (incl. *Adopting the engine for a new figure type*) and `AUTHORING.md`
  for the walkthrough. Two standing rules: **compose, don't reimplement** (render
  modules call the shared general primitives, never re-roll PRNG / scatter / log-zoom;
  domain primitives like Kepler live in the consuming module), and **seal after
  editing** (run `render-figures` after any `data-figure` change so the floor matches
  the source).

### If you are the strategy-room project chat (you CANNOT push)
**You CANNOT push to the repo. You decide here and hand Code paste-ready
instructions; only Claude Code (the executor) commits and pushes.** This chat
designs, drafts, audits, and plans. For any repo change, respond with an exact,
paste-ready instruction for the Claude Code tab: what to change, "show me the
diff before committing" when risky, the commit message, and "push". Deliver that instruction as ONE self-contained, copyable code block: a single fenced block holding the entire handoff — clone path, a read-the-real-HEAD-bytes step, the exact change, "show me the diff before committing", the commit message, and "push" — with no prose interleaved inside the block, so the author can copy it in a single action. All explanation, reasoning, and recommendations stay OUTSIDE the block, before it: the block is Code's to run, the surrounding prose is the author's to read. Default to that block: every handoff arrives as one copyable block unless there is something the author genuinely must read before running it — in which case keep that to a line or two ABOVE the block, and still deliver the block. Never bury the block under prose the author has to wade through to find it. Always read
the current synced repo state before proposing edits. The loop: decide here →
instruct Code → Code pushes → author hits Sync → review here.

## Upgrading this dossier
The template at github.com/m4gr4th34/open-dossier-template evolves. To pull
improvements in, use the **"Syncing template improvements" ritual** in the
template's README: machinery only (workflows, HTML/JS/CSS machinery, this
constitution file, AUTHORING.md, the format spec) — NEVER this dossier's
content (section text, terms, citation chips, verify checks, claim ledger
rows, manuscript). Always diff before committing; stop and ask on any
conflict. Because this constitution is a repo file, upgrading it is just part
of that same machinery sync — there is nothing separate to re-paste into the
Project.

## gstack
Personal, global install of [gstack](https://github.com/garrytan/gstack) (MIT,
Garry Tan) at `~/.claude/skills/gstack` — a developer toolbelt, NOT part of this
dossier's machinery or doctrine. This is a **personal install only**: team mode
is OFF, nothing was committed to this repo, and none of gstack's enforcement
(the "require gstack" CLAUDE.md block, PreToolUse gates) is active. The doctrine
above is unchanged and overrides anything a gstack skill might suggest; gstack
skills get no vote on claim labels, the ledger, or the verify gates.

**Routing note:** use **/browse** for all web browsing.

**Available skills** (`~/.claude/skills/gstack/...` for file paths):
- Inspect & ship code: `/qa`, `/qa-only`, `/review`, `/codex`, `/investigate`,
  `/ship`, `/land-and-deploy`, `/health`, `/retro`, `/learn`
- Plan & spec: `/spec`, `/autoplan`, `/office-hours`, `/plan-eng-review`,
  `/plan-devex-review`, `/plan-design-review`, `/plan-ceo-review`, `/plan-tune`,
  `/pair-agent`, `/skillify`
- Web & docs: `/browse`, `/scrape`, `/diagram`, `/make-pdf`, `/document-generate`,
  `/document-release`, `/landing-report`
- Design: `/design-consultation`, `/design-html`, `/design-review`,
  `/design-shotgun`, `/devex-review`
- iOS: `/ios-qa`, `/ios-fix`, `/ios-clean`, `/ios-sync`, `/ios-design-review`
- Context & upkeep: `/context-save`, `/context-restore`, `/freeze`, `/unfreeze`,
  `/guard`, `/careful`, `/canary`, `/cso`, `/gstack-upgrade`, `/setup-deploy`,
  `/setup-browser-cookies`, `/benchmark`, `/benchmark-models`

Run `/gstack-upgrade` to update. To later opt into team mode (which WOULD edit
this CLAUDE.md and the repo), that is a deliberate, separate decision — not done
here.
