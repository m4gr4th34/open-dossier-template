# Roadmap

A record of the deferred work this template has carried — what shipped, what is still
parked, and what surfaced along the way. **None of it blocks adoption**: the template
is complete and usable as-is. Items still open are stated with enough context to resume
cold (what it is, why it's parked, what design decision it touches, what groundwork exists).

Where a follow-on has an authoritative inline note elsewhere, this points at it rather
than restating it, so the detail can't drift out of sync.

## Shipped

The machinery follow-ons that once had no home but this file — delivered and gate-protected —
a defect found and fixed while proving them, and, after an adversarial audit proved the format's
highest-stakes gate sound, that gate hardened with committed self-test machinery. Kept here
(rather than erased into the git log) because a roadmap that shows its parked work executed, its
proof process catching real bugs, and its own gates proven sound is itself the argument: the
format spreads by shipping.

**Delivered + fixed**

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

- **Spawn hygiene: forks don't inherit the showroom** — "Use this template" copies the whole
  tree, so spawned dossiers were carrying the template's living-figures showroom (six
  `*-demo.html` + `showcase.html`, ~636K of text the fork never authored) plus a README showcase
  link the rename pass repointed at a `dossier-NNN/showcase.html` the fork didn't need. The spawn
  ritual now strips them after rename/render and before Pages goes live, anchored on the visible
  link text so it survives the rename pass that rewrites the URL. The template keeps its own
  showroom intact (it *is* the showroom — the demos are its marketing); only forks are stripped,
  and the sync ritual is named-machinery-only so it never re-introduces them. Landed in `38653c2`.

- **First-class no-DOI chapter mode** — a chapter can be released timestamp-only, without a DOI,
  to preserve and version thinking between archival results without minting a DOI for every
  milestone. The release is still cryptographically sealed: OpenTimestamps anchors it on the
  Bitcoin blockchain regardless of Zenodo (DOI and timestamp are independent). It's declared by an
  explicit `"doi_archived": false` in `provenance.json` — a positive declaration, not inferred
  from an empty field, which disambiguates "no DOI by design" from "DOI not yet" (the two were
  previously indistinguishable, both rendering "DOI after first release"). Labeled honestly at
  every surface: the provenance bar and lineage show "not DOI-archived -> preserved via
  OpenTimestamps" instead of implying a DOI is coming, and the declaration is carried through
  freeze into the sealed lineage entry. Strictly backward-compatible — all branches use strict
  `=== false`, so every existing chapter (absent field) falls through to current behavior,
  byte-identical at runtime; the field is gate-inert and survives the release writer. The "every
  label true" doctrine now covers the no-DOI case. Landed in `2645348`.

**Audit-hardened (the honesty gate, proven sound then made self-testing)**

- **Placeholder-honesty gate: injectable + adversarial regression suite** — the gate that enforces
  "every label true" is the format's highest-stakes check; one falsely-labeled claim kills its
  credibility. An adversarial audit proved it sound (every release path with a surviving placeholder
  fails closed; the OR-latch resists single-signal reversal; a clean released dossier still passes),
  and that proof is now committed as re-runnable machinery: the gate was made dependency-injectable
  (defaulted params, the no-arg CI invocation byte-identical to before) and a hermetic 26-check suite
  (`verification/check_placeholders.test.py`) re-proves the 8 attacks plus the predicates in isolation,
  against tmpdir fixtures with zero repo mutation. The format's "executable, not asserted" doctrine
  applied to its own gate. Landed in `7d936c4`.

- **Discovery-based test runner (`npm test`)** — the author-local tests had no single entry point, a
  discoverability gap for anyone adopting the template. `run_tests.js` discovers every
  `*.test.{js,py}` by recursive walk, dispatches by runtime, and aggregates by exit code; a new test
  registers by naming convention alone, no list to drift. Author-local, not CI-wired, matching the
  repo's test doctrine. Landed in `ab02cc2`.

## Still parked

Genuinely deferred — each already has an authoritative inline note; this only points at it.

- **Full check-logic unification** — *a considered decision, not pending work.* The survey
  console's check *logic* is hand-kept in two languages: `buildChecks()` (authored in
  `skin/edition.html`, rendered into index.html) and `verify_numbers.py`. The check *data* and
  *thresholds* are already single-sourced via `avenues.json`, so those can't drift; only ~3 lines
  of derivation (filter forecasts, count signposts, range-check) are mirrored. Unifying that across
  JS and Python would require codegen or a check-DSL that, for three near-trivial invariants, reads
  *worse* than the duplication it removes — so it is deliberately left duplicated. This is settled,
  not awaiting action. It reopens only on a concrete trigger: the checks proliferate past a handful,
  or any check's logic outgrows one line. At that point the right move is not codegen but a
  drift-detector test — run both implementations against the same `avenues.json` and assert
  identical verdicts (cheaper than unification, and `npm test` now gives it a home). Until that
  trigger fires, add any genuinely new *kind* of check to both sites and put its threshold in
  `avenues.json`. See AUTHORING.md, "Known limitation (and roadmap)".

- **Zenodo API auto-deposition** — automating the manual Zenodo release step via API token.
  See README.md (noted as a v2 ticket).

- **Cite-completeness gate** (deferred; doctrine holds it for now). Per-card check: each cites-data
  entry has non-empty who/what/src and src matches a DOI/arXiv pattern — a straightforward
  JSON/regex checker. Cross-chapter check (harder, needs lineage machinery): a ref used in a
  chapter has its full card in that chapter, no back-reference. Land only if review-enforced
  doctrine shows drift. See the CITE label in CLAUDE.md.

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
