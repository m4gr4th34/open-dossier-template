# Roadmap

A record of the deferred work this template has carried — what shipped, what is still
parked, and what surfaced along the way. **None of it blocks adoption**: the template
is complete and usable as-is. Items still open are stated with enough context to resume
cold (what it is, why it's parked, what design decision it touches, what groundwork exists).

Where a follow-on has an authoritative inline note elsewhere, this points at it rather
than restating it, so the detail can't drift out of sync.

## Shipped

The three machinery follow-ons that once had no home but this file — all now delivered
and gate-protected — plus a defect found and fixed while proving them. Kept here (rather
than erased into the git log) because a roadmap that shows its parked work getting executed,
and its proof process catching real bugs, is itself the argument: the format spreads by
shipping.

- **Multi-edition back-catalog reskin** — `render_backcatalog.js` now re-skins all three
  editions of every frozen chapter (`live/<tag>/{index,dossier,verify}.html`), not index
  alone. A reader of a chapter's current-skin view now navigates the whole chapter in the
  current skin; the immutable DOI'd record is reached deliberately via each edition's
  record-banner, never accidentally via a nav button. This **reversed** the `306343a`
  sealed-record retarget rather than reconciling with it: once all three editions ship as
  siblings in `live/<tag>/` (exactly like `chapters/<tag>/`), their dossier/verify nav
  resolves to those siblings via the bare hrefs `rewire()` already leaves, so the retarget
  was removed and `--reskin` collapsed to `rewire()` + `bake_release_label()` — one
  transform, no divergence from the freeze path. Index bakes machinery from its sealed
  `avenues.json`; dossier/verify are machinery-free. Landed in `7f54e62`.

- **lineage.html under the source-render skin** — `lineage.html` was the last hand-authored
  HTML surface outside the `EDITIONS` manifest; it is now rendered from
  `editions/lineage.source.html` + the shared `skin/edition.html`, so every HTML surface is
  source-generated and gate-protected. Gated behind a new `chrome: index` frontmatter field
  (the skin ships no provenance bar / lineage strip for a navigation surface); its source is
  sealed into each chapter via `CAPTURE_VERBATIM`; the spawn/sync rituals and file-map name it.
  Landed across `f183334` (the `chrome` field) -> `158504e` (the lineage edition) -> `1732d76`
  (the source seal) -> `02560b3` (the ritual + file-map doc-truth).

- **Current-page provenance degrade** — a provenance-bar item that links to the page it is on
  (verify.html's Bitcoin-timestamp item -> `verify.html`) is a false navigation affordance. It
  now degrades at render to a non-link "this page" span via a new optional `self` frontmatter
  field that names an edition's own output filename — the general, frontmatter-keyed mechanism
  the original note asked for, not a verify special-case. Landed in `f695234`.

- **Freeze -> derived-artifact sync (found while proving the reskin, fixed same session).**
  The freeze path advanced `lineage.json` without regenerating the artifacts derived from it,
  so the first real release would have turned `check-markdown` red in CI (the lineage-driven
  `llms.txt` lists chapters the committed file lacked) — and the README backfill ritual had the
  same gap plus a second one: it never ran `render-backcatalog`, so a backfill left `live/`
  missing entirely. Closed on both surfaces: `freeze-chapter.yml` now runs `render-markdown`
  after the freeze, gates it `check-markdown` fail-closed alongside the existing guards, and
  stages `llms.txt`/`index.md` atomically with the chapter; the backfill ritual now runs both
  `render-backcatalog` and `render-markdown` once after its loop, gated before the review.
  Proven via a real synthetic freeze in an isolated worktree (`check-markdown` RED post-freeze
  -> GREEN after `render-markdown`). Landed in `b3f8923`.

## Still parked

Genuinely deferred — each already has an authoritative inline note; this only points at it.

- **Full check-logic unification** — the survey console's check logic (not its data or
  thresholds, which are single-sourced via `avenues.json`) is hand-kept in both `buildChecks()`
  (index.html) and `verify_numbers.py`, so it can drift. Roadmap direction only if the checks
  proliferate. See AUTHORING.md, "Known limitation (and roadmap)".

- **Zenodo API auto-deposition** — automating the manual Zenodo release step via API token.
  See README.md (noted as a v2 ticket).

## Surfaced in the reskin work (resume-context preserved)

One thing found while proving the multi-edition reskin — not caused by it, pre-existing —
captured here so it isn't lost.

- **404-quieting on frozen / reskinned pages (optional polish).** A frozen or reskinned
  `chrome: reading` edition still runs its `provenance.json` / `lineage.json` / `avenues.json`
  fetch scripts in the `live/<tag>/` (or `chapters/<tag>/`) subdir, where those files don't
  exist — emitting benign, `.catch`-handled 404s (zero pageerrors; `pv-state` and the machinery
  floor are already baked, the lineage strip hides as intended). Pre-existing on every frozen
  chapter and the prior index-only reskin; the multi-edition work only mirrored index's existing
  fetches onto dossier/verify. Purely a clean-console nicety: a freeze/reskin step could
  neutralize the now-redundant fetch scripts since their data is baked. Optional — only worth it
  if a clean console on archived pages matters.
