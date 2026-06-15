# open-dossier-template

**The starting point for every Open Dossier publication.**
Click "Use this template" to create your Dossier NNN in one step.

<!-- AGENT: after the author's GitHub Pages site is live, replace this comment with a quick-links line placed HERE (immediately after the title/tagline, above the GETTING-STARTED line and the badge) so visitors can open the live result in one click. Use the author's real Pages URL:
### ▶ [Read the living paper](https://USER.github.io/REPO/) · [Self-explaining edition](https://USER.github.io/REPO/paper.html) · [Run the checks](https://USER.github.io/REPO/#verify) · [Audit trail](https://USER.github.io/REPO/dossier.html)
Rationale: lead with the live result for the skeptic, then GETTING-STARTED for the would-be author, then the explanatory sections. Do not leave these as live links until the Pages site actually resolves, or they 404. -->

<!-- DRAFT BANNER: present during pre-release. At first release, the "Spawning"/release ritual replaces this block with the standard live-document links (no "work in progress" caveat). See DEPLOY.md and the Rituals section. AGENT: replace YOURUSER/YOURREPO in these links with the real repo path during the spawn rename pass, so the author's draft preview works immediately. -->
### 📖 Live preview (work in progress)
> **This dossier is an active draft — not yet released.** Sections, claims, and checks may be incomplete. Shared early so the ideas can be read and discussed as they develop.

▶ **[Read the self-explaining edition](https://YOURUSER.github.io/YOURREPO/paper.html)** · [Interactive edition](https://YOURUSER.github.io/YOURREPO/) · [Audit trail](https://YOURUSER.github.io/YOURREPO/dossier.html)

## Get started in an afternoon

You got into science for the ideas — not for wrestling LaTeX, trimming to word limits, formatting bibliographies at 1 a.m., or waiting eight months on Reviewer 2. This deletes all of that.

You bring the idea and the judgment. An AI agent does the rest — drafting, typesetting, citations, figures, verification code, web pages — and out comes a live, citable, timestamped publication that **checks its own math and explains itself to strangers.** No Git, LaTeX, or web skills required.

**The whole process, start to finish:**
1. **Spawn** — point your AI agent at this template; it clones and renames everything.
2. **Map the idea** — the agent does a prior-art search and sorts claims into established / adjacent / open. You correct it with what you know.
3. **Draft** — the agent writes the paper, sets the math, formats every citation. No LaTeX tantrums.
4. **Self-check** — a verification script recomputes every number; an AI red-team attacks the paper; findings get published, not hidden.
5. **Readable editions** — a verification-console edition and a self-explaining edition any curious outsider can follow.
6. **Publish** — one release mints your DOI at CERN and anchors the hash in the Bitcoin blockchain. Priority is yours, timestamped.
7. **Live review** — readers file issues against specific claims; corrections become dated amendments. The paper stays alive.

**→ Start here: [GETTING-STARTED.md](GETTING-STARTED.md)** — publish with the Claude desktop app, step by step. Using a different AI agent, or want the full conceptual walkthrough with a worked example? See [GETTING-STARTED-GENERIC.md](GETTING-STARTED-GENERIC.md).

The first scientists to publish this way will look, in hindsight, like the first people who emailed instead of mailed.

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
GETTING-STARTED.md  ← start here — publish with the Claude desktop app
GETTING-STARTED-GENERIC.md ← platform-agnostic version
AUTHORING.md        ← production playbook — hand to your AI agent (read, don't edit)
PROJECT-INSTRUCTIONS.md ← optional Claude Project "constitution" — fill in [TOPIC] + standing context
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
Create a new public GitHub repo named dossier-NNN from my template repo m4gr4th34/open-dossier-template, and clone it into this folder. Use the gh CLI (gh repo create m4gr4th34/dossier-NNN --template m4gr4th34/open-dossier-template --public --clone); if gh isn't installed or authenticated, walk me through installing and logging in first. Then do the rename pass: in README.md, index.html, paper.html, dossier.html, CITATION.cff, and .zenodo.json, replace every "open-dossier-template" and "DOSSIER NNN"/"dossier-NNN" placeholder with dossier-NNN and the working title "[YOUR TITLE]", replace the YOURUSER/YOURREPO links in the README draft-preview banner with the new repo's real GitHub Pages path so the draft preview resolves once Pages is enabled, and set my name and affiliation (Irfan Ali-Khan, Independent Researcher, Saratoga, California) where the author placeholders are. Then enable GitHub Pages on the new repo from branch main, root folder, using gh api. Show me what changed, commit as "Initialize Dossier NNN from template", and push.
```

Two clicks remain that no tool can do for you, both one-time per dossier: the Zenodo toggle (zenodo.org → GitHub → flip the new repo on — do it at birth so the first release auto-DOIs) and, in Claude.ai, creating the matching Project with the repo synced into Files and the dispatcher instructions pasted. (Automating the Zenodo step via their API token is already on the tooling roadmap — a real v2 ticket.)

### Pre-release drafting & preview

Enable **GitHub Pages from your first commit** (Settings → Pages → deploy from `main` / root). A dossier is meant to be read as it develops, not held back until it's "done" — Pages makes the live self-explaining edition, interactive edition, and audit trail readable and shareable the moment you push.

The **draft-preview banner** at the top of the README is present **by default** and signals honestly that the work is unresolved: sections, claims, and checks may be incomplete. This lets you read the self-explaining edition and share early ideas — with the right expectations set — before any release.

**At first release:** remove the draft-banner block (or replace it with the standard live-document links, without the "work in progress" caveat) — the work is no longer a work-in-progress, and a released dossier should not advertise itself as a draft. This is a **content edit the author makes deliberately, not machinery**: it changes what the dossier claims about its own status, so it is never auto-applied by a template sync.

### Syncing template improvements into an existing dossier

Port the latest template improvements into an existing dossier. This is the subtle one, because a filled-in dossier and the template share machinery but not content, and a naive copy would bulldoze your paper. The instruction encodes that distinction:

```
In the dossier-NNN clone: fetch the latest m4gr4th34/open-dossier-template into a temporary folder and compare it against this repo. Apply template-side improvements to MACHINERY ONLY: everything in .github/workflows/, the format spec at verification/research_pipeline.md, the shared production playbook AUTHORING.md, the shared deployment guide DEPLOY.md, the shared onboarding docs GETTING-STARTED.md and GETTING-STARTED-GENERIC.md, the doctrine sections of CLAUDE.md and PROJECT-INSTRUCTIONS.md (preserving each file's "Standing context" section untouched) — including the shared verification-label vocabulary such as EXPLORATORY-CONJECTURE — the shared verification-explainer page verify.html (entirely machinery), and any CSS/JavaScript machinery changes in index.html, paper.html, and dossier.html — but never touch this repo's content: section text, terms, citation chips and CITES entries, checks in verify_numbers.py, claim_ledger.csv rows, manuscript files, or anything in timestamps/. Show me the full diff of what you propose before committing. Then commit as "Port template machinery updates [date]" and push. If any machinery change conflicts with local content edits, stop and ask me instead of guessing.
```

LICENSE.md is intentionally excluded — your license is your choice; sync never overwrites it.

The diff-before-commit and stop-on-conflict clauses are the safety rails — you stay the editor-in-chief of every port.

---

## Originates from

Dossier 001 — [m4gr4th34/dossier-001](https://github.com/m4gr4th34/dossier-001)
Irfan Ali-Khan · Independent Researcher · Saratoga, California · 2026

License: CC BY 4.0 (paper/prose) · MIT (code)
