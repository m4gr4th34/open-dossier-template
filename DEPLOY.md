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
zenodo.org → Log in with GitHub → your name → GitHub → toggle your
repo ON. Every release now self-archives at CERN with a DOI.

## Step 6 — Publish: tag a release
Releases → Create a new release → tag v1.0.0 → publish. Automatically:
Zenodo mints your DOI; the auto-timestamp workflow anchors the release
hash in the Bitcoin blockchain and commits the proof to timestamps/.
Paste the DOI badge into README.md and add the doi: line to
CITATION.cff. Releases are for milestones; plain commits for
everything else. Never modify timestamps/.

## Maintenance notes
- OpenTimestamps proofs mature over hours; `ots upgrade
  timestamps/*.ots` later folds in the Bitcoin block attestation.
- Port future template improvements using the Rituals section of the
  template README — machinery only, never your content.
