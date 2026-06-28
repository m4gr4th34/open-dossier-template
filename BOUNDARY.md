# BOUNDARY.md — the content / skin / machinery line

**Status: implemented and shipped.** The
floor/source/ceiling pattern this generalizes already ships for *figures*
(`data-figure` + sealed poster + live runtime) and *math* (`data-tex` + KaTeX).
This document promotes that same pattern to the *whole chapter*, and that work is
now done: chapter-level source, the live reader, the markdown projection, and the
equivalence gate all exist and are CI-gated (steps 1-5 below all DONE). This document
is the contract the arc was built to, now fully realized.

## Why this exists

Frozen chapters at `chapters/<tag>/` are the version of record: each is DOI'd and
OpenTimestamped, and citations point at those exact bytes. They must NEVER be
restyled in place — one tampered notarized artifact kills the format's credibility
permanently. But the template improves constantly, so an old chapter frozen in an
old skin reads as dated next to the current one.

The resolution: separate what a chapter *says* from how it *looks*, so the newest
skin can render any chapter on demand while the record stays byte-identical. This
is not a retro-theme of the record — the record is preserved exactly; we add a
presentation layer that is a pure function of an immutable source.

## The pattern: floor / source / ceiling, promoted

A figure already has a **source** (`data-figure` spec), a **floor** (sealed poster,
the record), and a **ceiling** (live render in the current runtime). Math does the
same. This spec is that pattern at chapter scale: **one skin-free source per
chapter; every rendering is a pure function of it.** It is the template's existing
single-sourcing discipline, one level up — not a new philosophy.

## The trinity

The content/skin binary is insufficient: a rendered edition mixes three things, not
two. Naming all three is what keeps the porting ritual clean.

| Category | What it is | Test | Examples |
|---|---|---|---|
| Content | Meaning; the thing that asserts | Change it → the paper says something different | Title, byline, abstract, section order, headings, prose, term definitions, cite summaries, go-deeper bodies, figure specs, math specs, avenue data, claim-ledger rows, acknowledgments |
| Skin | Presentation | Swap it → meaning unchanged | Palette tokens, fonts, chrome skeleton, nav, card/lightbox/console CSS, grain overlay, the tap-to-expand / collapse interactions, license/format footer boilerplate |
| Machinery | Executable behavior that computes or verifies (does not assert) | It produces a result; the result must equal the record | Consistency console, AVENUES→cards renderer, figure runtime, KaTeX, provenance/lineage fetch |

**The two-cut test.** First: *swap the skin → is meaning unchanged?* That separates
skin from the rest. Then: *does it assert, or compute?* That separates content from
machinery. Machinery decomposes onto the other two: its **data is content** (e.g.
`avenues.json`), its **runtime is vendored skin**, its **rendered result must match
the record** (enforced by the equivalence gate below).

## The source

One skin-free **source** per chapter, authored as a **semantic, chrome-free HTML
fragment** — not JSON. The template already authors content as semantic HTML
carrying data-attributes (`data-figure`, `data-tex`, `<button class="term" data-d>`,
`<button class="cite" data-c>`); the real boundary is fragment-vs-wrapper, not
HTML-vs-JSON. HTML keeps authoring natural, reuses every existing convention, is one
pass from the markdown projection, and is the form an AI agent edits fluently.

The source CARRIES: frontmatter (title, byline, abstract, dossier number, shape, and
the figure-runtime + KaTeX version pins); ordered sections with semantic headings;
prose with inline term/cite buttons whose definitions and summaries travel inline
(they are content); `data-figure` and `data-tex` specs; and a *reference* to
`avenues.json` — never a copy (it is already single-sourced).

The source CARRIES NO: `<style>`, nav, header/footer chrome, or runtime `<script>`.

The **skin** is the wrapper template: `<head>` + CSS + chrome + nav + footer + every
runtime script. It is versioned, exactly like `FIGURES_RUNTIME_VERSION`. Rendering
is `wrap(source, skin)`.

## Four renderings of one source

1. **Frozen floor** — `chapters/<tag>/index.html` = `wrap(source@tag, skin@tag)`,
   fully baked (figures sealed to posters, math pre-rendered, avenue cards baked
   static, console verdict baked). Byte-identical forever, DOI'd, timestamped,
   readable with JS off. The record.
2. **Live skinned HTML** = `wrap(source@tag, skin@HEAD)`, regenerated at resync. The
   human front door. STATIC output, not a client-side app — interactivity is
   progressive enhancement layered on a complete static render, exactly as the
   figure floor upgrades to its ceiling.
3. **Clean markdown / llms.txt** = `text(source@tag)`. Skin stripped; machinery
   rendered as its data and results (avenue table as markdown, checks as a pass/fail
   list); terms as inline glosses, cites as references, figures as poster-alt +
   caption, math as LaTeX. Emitted as `chapters/<tag>/index.md` per sealed chapter (the working
   draft at the root `index.md`) plus a root `llms.txt` indexing the lineage. The token-efficient,
   agent-readable form.
4. **The source itself** — notarized alongside the floor, so the content the live and
   markdown renderings draw from is itself frozen and timestamped. This is what makes
   the live view honest: the skin is live, but the content is immutable and notarized.

## The keystone: the equivalence gate

Define the **content projection** of a rendering: strip skin and machinery widgets,
normalize, leaving only asserted content plus machinery *results*. The gate asserts:

    content-projection(floor) == content-projection(live) == content-projection(markdown)

for every chapter, in CI, on every template change. On failure: **fix the skin, never
the record, never the gate.** This is "fix the paper, not the tolerance" at chapter
scale. It extends to figures (poster and live render must agree in content, not
pixels) and to the console (its live verdict must equal the frozen record's).

Without this gate the pretty default could quietly contradict the notarized truth
while a perfectly honest label points at a record nobody reads — the one failure mode
doctrine calls fatal. The gate is what makes the live view safe to be the default.

## Edge-case rulings

| Element | Ruling |
|---|---|
| Term definition (`data-d`) | Content (travels in source). Tap-to-expand is skin. |
| Cite summary (`who`/`what`/`src`) | Content. Chip interaction is skin. |
| Go-deeper drawer body | Content. The `<details>` collapse is skin. |
| Section order / heading hierarchy | Content. |
| Avenue grid | Data = content (`avenues.json`); rendering = machinery; card styling = skin. |
| Consistency console | Check defs + results = content / machinery-result, gate-checked against the record; button + log animation = skin. |
| Provenance bar / lineage strip | Skin + machinery describing the artifact you are viewing, NOT part of the content projection — which is exactly why the floor bakes "release <tag>", the live says "live tip", and both are honest. |
| Figures / math | Already solved: spec = content, runtime = vendored skin, poster = floor, live = ceiling. |
| Footer boilerplate vs acknowledgments | License/format text = skin; author acknowledgments = content. |

The provenance/lineage-bar ruling is load-bearing: it is the formal reason the live
view is *allowed* to differ from the frozen record without tripping the gate — the bar
reports rendering context, not a claim of the paper.

## Decisions (ratified)

1. Source form = skin-free semantic HTML fragment (not JSON).
2. Avenue data = the source *references* `avenues.json`; it never copies it.
3. Provenance / lineage bars = rendering-context, excluded from the content
   projection, permitted to differ floor-vs-live. This is the call that makes the
   live view legal.
4. Carrier directions are opposite: `<!--mount:X-->` expands a SKIN fragment INTO a
   content position (skin→content); `<!--slot:X-->` / `{{…}}` fills CONTENT INTO a
   skin position (content→skin). Mounts live in the skin's fragment library; slots
   and frontmatter live in the source.

## Sequencing the arc

1. Pilot the extraction on the merged front door (`index.html`, now the richest single
   surface). Prove `wrap(extracted_source, current_skin)` is BYTE-IDENTICAL to today's
   hand-authored `index.html` — the same byte-identical proof gate the figure arc lived
   by. **DONE (step 1b).**
2a. Round-trip gate (`verify_edition.js`) — **DONE**: asserts `index.html ==
   render(source, skin)`, fail-loud, in CI (the `verify-claims` workflow). Protects the
   partition the moment the source is edited.
2b. Content-projection equivalence gate — **DONE (all three legs)**: the **prose + floor legs**
   (`verify_projection.js`) assert every prose content atom of the source appears in BOTH
   `index.html` and `index.md`, so the two renderings can't diverge in what they SAY — now
   for the live working draft **and every sealed chapter** under `chapters/<tag>/` (5b-i; a
   chapter's rewired/baked `index.html` vs its verbatim `index.md`, chrome normalized away).
   The **machinery leg** (baked avenue cards + console verdict vs the markdown table/list) is
   **DONE for the working draft (5b-ii-1)**: `render_edition.js` now runs `bake_machinery.js`
   (the HTML twin of the md table, single-sourced from `avenues.json` + `verify_numbers.py`),
   so `index.html` ships STATIC baked cards + verdict — JS-off readable, and comparable. The
   gate parses each location's own `index.md` for the machinery atoms, so it auto-covers baked
   chapters once frozen; the back-catalog **renderer** that bakes per-chapter machinery (so old
   chapters re-skin with baked floors) is **5b-ii-2 — DONE**. Foundation **5b-ii-2a (DONE)**:
   freeze seals each chapter's own `avenues.json` (verbatim, via `CAPTURE_VERBATIM`), and
   `verify_numbers.py` accepts an optional `--avenues <path>` override (default byte-unchanged).
   **5b-ii-2b (DONE)**: `render_backcatalog.js` re-skins every lineage chapter into
   `live/<tag>/index.html` — wrap(sealed source, skin@HEAD) + machinery baked from the chapter's
   OWN sealed `avenues.json` (cards from it, verdict via `--avenues` on it) + an honest-label
   banner naming the frozen record, then the SAME outward-rewire/label-bake freeze applies
   (reused via `freeze_chapter.py --reskin`, no divergence). `verify_backcatalog.js` gates
   `live/<tag>` byte-equal to its render, and `verify_projection.js` now also walks `live/<tag>/`
   (re-skin html vs the chapter's sealed source + `index.md`). (Markdown machinery fidelity to
   `avenues.json`/`verify_numbers.py` is already gated at step 3.)
3. Add the markdown / llms.txt projection (falls out of the source for free).
   **Projection engine + front-door output DONE (step 3):** `render_markdown.js` emits
   `index.md` (avenue table from `avenues.json`, checks from `verify_numbers.py`, prose
   with inline glosses/cites/LaTeX/labels) and a root `llms.txt`; `verify_markdown.js`
   gates `index.md == text(source)` in CI. The **lineage `llms.txt` index is DONE (5b-i)** —
   its `## Chapters` list is generated newest-first from `lineage.json` (single-sourced;
   `verify_markdown.js` gates it byte-equal to `buildLlmsTxt()`). Per-chapter markdown is also
   **DONE (5a)**: each frozen chapter seals its own `index.md` verbatim (via `CAPTURE_VERBATIM`)
   at `chapters/<tag>/index.md` — consumed by the back-catalog renderer, the content-equivalence
   gate, and the `llms.txt` per-chapter deep-links. (It shipped as the sealed `index.md`, not a
   separately-emitted `<tag>.md`.)
4. Build the build-time static live reader. **DONE (5b-ii-2b):** `render_backcatalog.js` +
   `verify_backcatalog.js` + the `live/<tag>/` reading views, gated in CI.
   **Reader-experience capstone — DONE:** `lineage.html` is now an oldest→newest timeline (sealed
   Chapter 1..N top-down, the working-draft frontier card at the foot) where each sealed chapter
   offers **two doors** — *Read (current edition) →* `live/<tag>/index.html` and *Version of
   record ↗* `chapters/<tag>/index.html`, with the **DOI** shown as the citation — and each re-skin
   carries the same **cite-the-record** banner. **Pages-routing is answered by honest linking**, not
   config: there is no rule making one URL "the chapter"; the lineage's links send readers to the
   reading view and citations to the immutable record. (The retired `paper.html` stub is dropped
   from freeze's rewrite tuple — a dead no-op now the edition set is index/dossier/verify.)
   **Back-catalog lifecycle fully automated (5c — DONE):** `freeze-chapter.yml` runs the renderer
   in the freeze job, so a new chapter is born WITH its `live/<tag>/` view in one commit;
   `reskin-backcatalog.yml` regenerates the existing catalog on any skin/renderer change. Both
   fail-close on the gates before committing. `verify.yml`'s standalone back-catalog byte-sync gate
   was removed as structurally redundant — `live/` freshness is now guaranteed at WRITE time (the
   gate only flickered red→green on a push); `verify_backcatalog.js` lives on as both workflows'
   pre-commit guard. Zero human action: nobody runs `render-backcatalog`.
5. Rewire `freeze_chapter.py` to capture the source and emit the projections. **DONE (5a):**
   freeze seals each chapter's content source + skin + its pre-built `index.md` projection +
   `avenues.json` verbatim (via `CAPTURE_VERBATIM`) — the source is captured and the markdown
   projection is sealed per chapter at `chapters/<tag>/index.md`.

Pre-split chapters have no source and are not retrofitted — reverse-engineering a
source from frozen chrome is lossy and the gate cannot protect a fabricated source.
The live view is forward-looking; pre-split chapters keep their as-published render,
which is honest because it is literally what they looked like.
