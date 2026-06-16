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
Work through the TODO markers: index.html, paper.html, dossier.html,
verification/verify_numbers.py, claim_ledger.csv, CITATION.cff,
.zenodo.json, CLAUDE.md (Standing context), paper/.

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

After your first release, update the DOI in three places (or confirm
provenance.json auto-updated): provenance.json, the manuscript.tex footer,
and CITATION.cff. The provenance bar and verify.html read provenance.json
automatically.

## Maintenance notes
- OpenTimestamps proofs mature over hours; `ots upgrade
  timestamps/*.ots` later folds in the Bitcoin block attestation.
- Port future template improvements using the Rituals section of the
  template README — machinery only, never your content.
