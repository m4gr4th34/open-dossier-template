# Roadmap — parked follow-ons

Deferred work, each its own arc when it earns priority. **None blocks adoption** — the
template is complete and usable as-is. Each item is stated with enough context to resume
cold (what it is, why it's parked, what design decision it reopens, what groundwork exists).

This file is the index. Where a follow-on already has an authoritative inline note, this
points at it rather than restating it (so the detail can't drift out of sync).

## Machinery follow-ons (no prior home — captured here first)

### 1. Multi-edition back-catalog reskin
`render_backcatalog.js` writes only `live/<tag>/index.html` — index-only (no `EDITIONS` loop,
no dossier/verify source references). Extending it to reskin dossier and verify into
`live/<tag>/` reopens the `306343a` sealed-record nav decision: freeze's `rewire()` points a
frozen chapter's dossier/verify nav at the sealed `chapters/<tag>/` record so they resolve to
the snapshot, not the live root. The reskin path would need the same nav-target reconciliation.
Groundwork that exists: the sources are already sealed — `freeze_chapter.py`'s
`CAPTURE_VERBATIM` holds all three editions — so the inputs are captured; the open work is the
reskin loop plus the nav-target reconciliation against `306343a`'s contract.

### 2. lineage.html under the source-render skin
`lineage.html` is hand-authored — no script writes it, and it's not in the `EDITIONS` manifest,
so it's the lone HTML surface outside the source-render skin model, carrying its own structural
placeholders (`NNN`, `YOURUSER/YOURREPO`) edited in place. Bringing it under
`editions/lineage.source.html` + the shared `skin/edition.html` would make every HTML surface
source-generated and gate-protected (drift-proof like the trinity).
Touches: a new `EDITIONS` entry, `freeze_chapter.py`'s `CAPTURE_VERBATIM`, and lineage's current
standalone structure (its own chrome differs from the editions').

### 3. Current-page provenance degrade
`verify.html:343` (rendered from `skin/edition.html:311`) is a provenance-bar anchor with
`href="verify.html"` — so on verify.html it points at itself. This is the accepted path-(a)
delta from slab 3c-ii (a redundant but correct self-link — verify.html is where the proof
lives). The general fix: a skin mechanism that degrades any provenance item pointing at the
current page to a non-link "this page" state, applied uniformly across all editions.
Touches: shared skin chrome — a new mechanism affecting every edition's provenance rendering,
gated by the active edition.

## Already noted inline (pointers, not restated)

- Full check-logic unification — the survey console's check logic (not its data or thresholds,
  which are single-sourced via `avenues.json`) is hand-kept in both `buildChecks()` (index.html)
  and `verify_numbers.py`, so it can drift. Roadmap direction only if the checks proliferate.
  See AUTHORING.md, "Known limitation (and roadmap)".
- Zenodo API auto-deposition — automating the manual Zenodo release step via API token.
  See README.md (noted as a v2 ticket).
