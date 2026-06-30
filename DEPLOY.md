# DEPLOY.md — from template to live, DOI'd publication

## Step 1 — Create your repo (2 min)
Click "Use this template" → "Create a new repository". Name it
dossier-NNN. Public. Add a description ending with:
"Don't trust this paper — run it."

## Step 2 — If you upload files via the web interface: dotfile warning
Web drag-and-drop from Finder/Explorer silently DROPS dotfiles —
`.github/workflows/` and `.zenodo.json` both. (This template's own
first deployment lost them this way; see the closed postmortem issue.)
**After any web upload, open the repo file list on GitHub and verify
`.github/workflows/` and `.zenodo.json` are present.** If missing,
restore them via Add file → Create new file, or push via git, which
never loses dotfiles. Working through Claude Code / git clone avoids
this entirely.

## Step 3 — Fill in the placeholders
Work through the TODO markers: editions/index.source.html, skin/edition.html
(the front door is generated — edit the source, not index.html; `npm run render-edition`
regenerates it), dossier.html, verification/verify_numbers.py, claim_ledger.csv,
CITATION.cff, .zenodo.json, CLAUDE.md (Standing context), paper/ (optional LaTeX —
only if a legacy venue needs it).

## Step 4 — Turn on the website (2 min)
Settings → Pages → Deploy from a branch → main, / (root) → Save.
Live at https://YOURUSER.github.io/dossier-NNN/ in ~2 minutes.

## Step 5 — Connect Zenodo once (3 min)
Zenodo (for your DOI): go to zenodo.org → log in with GitHub → click your
username (top right) → GitHub in the dropdown (left side). Find your
dossier-[name] repo in the list and flip its toggle ON. If the repo isn't
listed yet (common for a freshly-created repo), click Sync now at the top of
that list and refresh. If it still doesn't appear, don't worry — you only need
it ON before your first release, so you can return and do this at the publish
step.

## Pre-flight — before you publish, prove it green locally
Catch problems on your machine, not via a red build after you push. Before Step 6:

- **Run the tests:** `npm test` — discovers and runs the template's self-tests (the figure
  primitives, the honesty gate's own adversarial suite). Always green on an unmodified template;
  if you've changed machinery, this is where a regression surfaces. Author-local — CI runs the
  gates directly, this is your convenience check.
- **Run the gates the way CI will:** `node verify_edition.js && node verify_markdown.js &&
  node verify_projection.js && python3 verification/verify_numbers.py` — the same checks
  `verify-claims` runs on every push, on bare Node (no install). Green here means green in CI.
- **Final honesty check, after you remove the draft-preview banner (Step 6):** `python3
  verification/check_placeholders.py`. While the banner is present this only warns (drafts are
  allowed to be drafty); the moment the banner is gone it fails on any surviving placeholder on a
  publication surface. So run it as your *last* step before tagging — once you've removed the
  banner — to confirm nothing's left unfilled. (This mirrors exactly what CI enforces; the local
  run just lets you see it first.)

If you're porting template machinery rather than publishing fresh, the same pre-flight applies —
see the Rituals section of the template README for the spawn, sync, and backfill blocks.

## Step 6 — Publish: tag a release
Releases → Create a new release → tag v1.0.0 → publish. Automatically:
Zenodo mints your DOI; the auto-timestamp workflow anchors the release
hash in the Bitcoin blockchain and commits the proof to timestamps/.
Paste the DOI badge into README.md and add the doi: line to
CITATION.cff. Remove the draft-preview banner from README.md (and confirm the
live pages no longer carry "work in progress" language) — your dossier is now
released, not a draft. A CI check (`verification/check_placeholders.py`) enforces
this gate: while the draft-preview banner is present it only warns, but once the
banner is gone any surviving fill-in placeholder (YOURUSER, YOUR NAME,
TODO-AFTER-FIRST-RELEASE, NNN, PLACEHOLDER, …) on a publication surface fails the
build — so you can't release with placeholders still showing. Releases are for
milestones; plain commits for everything else. Never modify timestamps/.

Tagging a release now **also freezes that chapter into the permanent lineage**: a
separate workflow (`freeze-chapter.yml`, kept apart from the timestamp/DOI machinery so
provenance stays untouched) snapshots the editions into `chapters/<tag>/` and registers
the chapter in `lineage.json`. It runs the honesty gate first — a chapter with surviving
placeholders is NOT frozen, so fix and re-release. Frozen chapters are immutable, like
timestamps/. (Full convention: AUTHORING.md, "Lineage — chapters across releases".)

After your first release, set the DOI by hand in three places — release
automation never writes DOI fields: provenance.json (version_doi, and concept_doi
once, permanently), the manuscript.tex footer, and CITATION.cff. The
auto-timestamp workflow updates only release_tag and the release date in
provenance.json. The provenance bar and verify.html read provenance.json
automatically.

## Maintenance notes
- OpenTimestamps proofs mature over hours; `ots upgrade
  timestamps/*.ots` later folds in the Bitcoin block attestation.
- Port future template improvements using the Rituals section of the
  template README — machinery only, never your content.
- Provenance invariant. Release automation never authors DOI fields.
  version_doi/concept_doi are minted by Zenodo and backfilled by a human; the
  auto-timestamp workflow touches only release_tag and the date, and is
  structurally blocked (jq in-place update + a hard regression guard) from
  altering any DOI. A released dossier still showing a placeholder DOI fails CI
  until you backfill — that red build is the honest signal, and it clears the
  moment the real DOI lands.
