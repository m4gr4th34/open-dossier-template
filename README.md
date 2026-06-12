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

[Dossier 001](https://m4gr4th34.github.io/dossier-001/) is the reference specimen.

---

## Use this template

1. Click **"Use this template" → "Create a new repository"** (green button, top right).
2. Name it `dossier-NNN` (or your choice). Set to **Public**.
3. Clone locally or edit in the GitHub web interface.
4. Work through the `TODO` markers in order:

```
index.html          ← replace title, abstract, concept cards, JS checks
dossier.html        ← replace red-team findings and citation table
verification/
  verify_numbers.py ← replace placeholder check with real ones
claim_ledger.csv    ← replace placeholder rows with your typed claims
.zenodo.json        ← fill in title, author, description
CITATION.cff        ← fill in title, author, repo URL
paper/              ← add manuscript.tex and manuscript.pdf
```

5. Connect Zenodo: zenodo.org → Log in with GitHub → your repo → toggle ON.
6. Tag `v1.0.0` as a release → Zenodo auto-DOIs it, CI auto-timestamps it.
7. Enable GitHub Pages: Settings → Pages → Deploy from branch main / root.

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

## Originates from

Dossier 001 — [m4gr4th34/dossier-001](https://github.com/m4gr4th34/dossier-001)
Irfan Ali-Khan · Independent Researcher · Saratoga, California · 2026

License: CC BY 4.0 (paper/prose) · MIT (code)
