# open-dossier-template

**The starting point for every Open Dossier publication.**
Click "Use this template" to create your Dossier NNN in one step.

[![claims: verified](https://github.com/m4gr4th34/open-dossier-template/actions/workflows/verify.yml/badge.svg)](https://github.com/m4gr4th34/open-dossier-template/actions/workflows/verify.yml)

---

## What is an Open Dossier?

A research publication shipped as a versioned repository:

- **Executable claims** — every number recomputed by `verify_numbers.py` under CI. The badge above shows claims passing continuously.
- **Auto-timestamped releases** — every tagged release is automatically anchored in the Bitcoin blockchain via OpenTimestamps. No manual steps.
- **Auto-DOI'd releases** — connect Zenodo once; every release self-archives at CERN and gets a permanent citable identifier.
- **Published adversarial review** — red-team findings ship with the paper, RESOLVED or OPEN. Nothing hidden.
- **Honest verification labels** — the rule isn't "everything is verified." The rule is "every label is true."
- **GitHub Issues as the review venue** — unknown people chip away at open claims in public. The version history preserves who contributed what, when.

This format eats its own cooking: its first deployment lost its automation files to a web-upload quirk, was caught by its own tooling, fixed, and publicly logged — see the [closed postmortem](https://github.com/m4gr4th34/open-dossier-template/issues/1) — within a day of launch. Every label must be true, including the tooling's labels about itself.

[Dossier 001](https://m4gr4th34.github.io/dossier-001/) is the reference specimen.

---

## Use this template

1. Click **"Use this template" → "Create a new repository"** (green button, top right).
2. Name it `dossier-NNN` (or your choice). Set to **Public**.
3. Clone locally or edit in the GitHub web interface.
4. Work through the `TODO` markers in order:

```
AUTHORING.md        ← production playbook — hand to your AI agent (read, don't edit)
index.html          ← replace title, abstract, concept cards, JS checks
paper.html          ← self-explaining edition: replace placeholder sections, terms, and citation chips
dossier.html        ← replace red-team findings and citation table
verification/
  verify_numbers.py ← replace placeholder check with real ones
claim_ledger.csv    ← replace placeholder rows with your typed claims
.zenodo.json        ← fill in title, author, description
CITATION.cff        ← fill in title, author, repo URL
paper/              ← add manuscript.tex and manuscript.pdf
  manuscript-template.tex ← LaTeX scaffold — copy to manuscript.tex and fill in
```

5. The fastest path: hand AUTHORING.md plus your research idea to any capable AI agent (Claude Code reads it automatically alongside CLAUDE.md). It contains the full production playbook — your job is the ideas, the intuition, the reality checks, and the sign-offs; the playbook covers everything else.
6. Connect Zenodo: zenodo.org → Log in with GitHub → your repo → toggle ON.
7. Tag `v1.0.0` as a release → Zenodo auto-DOIs it, CI auto-timestamps it.
8. Enable GitHub Pages: Settings → Pages → Deploy from branch main / root.

Your paper is live, DOI'd, and blockchain-timestamped. Total new setup time after the first dossier: ~20 minutes.

---

## Automation included

| Workflow | Trigger | What it does |
|---|---|---|
| `verify.yml` | every push | reruns `verify_numbers.py`; badge goes red if any claim fails |
| `auto-timestamp.yml` | every release | stamps release archive in Bitcoin blockchain; commits `.ots` proof to `timestamps/` |

Zenodo DOI is automatic after the one-time toggle — no workflow needed.

---

## The Open Dossier format spec

See [`verification/research_pipeline.md`](verification/research_pipeline.md) for the full architectural instructions — what each phase does, what each claim type means, and the per-claim waiver doctrine (you may decline to verify any claim, at exactly one price: the label tells the truth).

---

## Rituals

Two repeatable workflows run this template. Each is a single instruction block you paste to Claude — copy it verbatim and edit only the placeholders.

### Spawning a new dossier

Birth a new dossier from the template. Paste into the Code tab, editing the number and title:

```
Create a new public GitHub repo named dossier-NNN from my template repo m4gr4th34/open-dossier-template, and clone it into this folder. Use the gh CLI (gh repo create m4gr4th34/dossier-NNN --template m4gr4th34/open-dossier-template --public --clone); if gh isn't installed or authenticated, walk me through installing and logging in first. Then do the rename pass: in README.md, index.html, paper.html, dossier.html, CITATION.cff, and .zenodo.json, replace every "open-dossier-template" and "DOSSIER NNN"/"dossier-NNN" placeholder with dossier-NNN and the working title "[YOUR TITLE]", and set my name and affiliation (Irfan Ali-Khan, Independent Researcher, Saratoga, California) where the author placeholders are. Then enable GitHub Pages on the new repo from branch main, root folder, using gh api. Show me what changed, commit as "Initialize Dossier NNN from template", and push.
```

Two clicks remain that no tool can do for you, both one-time per dossier: the Zenodo toggle (zenodo.org → GitHub → flip the new repo on — do it at birth so the first release auto-DOIs) and, in Claude.ai, creating the matching Project with the repo synced into Files and the dispatcher instructions pasted. (Automating the Zenodo step via their API token is already on the tooling roadmap — a real v2 ticket.)

### Syncing template improvements into an existing dossier

Port the latest template improvements into an existing dossier. This is the subtle one, because a filled-in dossier and the template share machinery but not content, and a naive copy would bulldoze your paper. The instruction encodes that distinction:

```
In the dossier-NNN clone: fetch the latest m4gr4th34/open-dossier-template into a temporary folder and compare it against this repo. Apply template-side improvements to MACHINERY ONLY: everything in .github/workflows/, the format spec at verification/research_pipeline.md, the doctrine sections of CLAUDE.md (preserving this repo's "Standing context" section untouched), and any CSS/JavaScript machinery changes in index.html, paper.html, and dossier.html — but never touch this repo's content: section text, terms, citation chips and CITES entries, checks in verify_numbers.py, claim_ledger.csv rows, manuscript files, or anything in timestamps/. Show me the full diff of what you propose before committing. Then commit as "Port template machinery updates [date]" and push. If any machinery change conflicts with local content edits, stop and ask me instead of guessing.
```

The diff-before-commit and stop-on-conflict clauses are the safety rails — you stay the editor-in-chief of every port.

---

## Originates from

Dossier 001 — [m4gr4th34/dossier-001](https://github.com/m4gr4th34/dossier-001)
Irfan Ali-Khan · Independent Researcher · Saratoga, California · 2026

License: CC BY 4.0 (paper/prose) · MIT (code)
