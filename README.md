# open-dossier-template

**The starting point for every Open Dossier publication.**
Click "Use this template" to create your Dossier NNN in one step.

### ▶ [See a living figure — fall from a planet to the galaxy, live](https://m4gr4th34.github.io/open-dossier-template/showcase.html)

<!-- AGENT: after the author's GitHub Pages site is live, replace this comment with a quick-links line placed HERE (immediately after the title/tagline, above the GETTING-STARTED line and the badge) so visitors can open the live result in one click. Use the author's real Pages URL:
### ▶ [Read the living paper](https://USER.github.io/REPO/) · [Run the checks](https://USER.github.io/REPO/#verify) · [Audit trail](https://USER.github.io/REPO/dossier.html) · [Living figures showcase](https://USER.github.io/REPO/showcase.html)
Rationale: lead with the live result for the skeptic, then GETTING-STARTED for the would-be author, then the explanatory sections. Do not leave these as live links until the Pages site actually resolves, or they 404. -->

<!-- DRAFT BANNER: present during pre-release. At first release, the "Spawning"/release ritual replaces this block with the standard live-document links (no "work in progress" caveat). See DEPLOY.md and the Rituals section. AGENT: replace YOURUSER/YOURREPO in these links with the real repo path during the spawn rename pass, so the author's draft preview works immediately. -->
### 📖 Live preview (work in progress)
> **This dossier is an active draft — not yet released.** Sections, claims, and checks may be incomplete. Shared early so the ideas can be read and discussed as they develop.

▶ **[Read the self-explaining edition](https://YOURUSER.github.io/YOURREPO/)** · [Audit trail](https://YOURUSER.github.io/YOURREPO/dossier.html)

## How this works (the pre-release operating model)

Before release, this repo is a **build-as-we-go shared drafting surface, not a
publication.** Rough drafts, ballpark numbers, and loose forecasts are welcome
from the very start — that is the intended way to work, not a violation. The
verification labels exist precisely so unfinished content can live in the open
honestly: a claim's label tells the reader exactly how finished it is.

Fill the editions early with clearly-labeled draft content and refine it in
place. **Do not quarantine draft material into side pages** — put it in the
self-explaining front door and the audit-trail edition where it belongs, wearing
an honest label, and sharpen it as you go.

The one rule that makes this safe: **loose content must carry its honest label
from the moment it lands — an unlabeled ballpark number is the violation, a
labeled one is not.**

## Get started in an afternoon

You got into science for the ideas — not for wrestling LaTeX, trimming to word limits, formatting bibliographies at 1 a.m., or waiting eight months on Reviewer 2. This deletes all of that.

You bring the idea and the judgment. An AI agent does the rest — drafting, typesetting, citations, figures, verification code, web pages — and out comes a live, citable, timestamped publication that **checks its own math and explains itself to strangers.** No Git, LaTeX, or web skills required.

**The whole process, start to finish:**
1. **Spawn** — point your AI agent at this template; it clones and renames everything.
2. **Map the idea** — the agent does a prior-art search and sorts claims into established / adjacent / open. You correct it with what you know.
3. **Draft** — the agent writes the paper, sets the math, formats every citation. No LaTeX tantrums.
4. **Self-check** — a verification script recomputes every number; an AI red-team attacks the paper; findings get published, not hidden.
5. **Readable editions** — a self-explaining edition, with a built-in verification console, that any curious outsider can follow.
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
CLAUDE.md           ← the single constitution (read by Claude Code AND the optional Project chat) — fill in [TOPIC] + standing context
PROJECT-INSTRUCTIONS.md ← back-compat redirect to CLAUDE.md (nothing to fill in)
editions/index.source.html    ← the paper: replace title, abstract, the self-explaining sections, terms & citation chips (avenue cards live in avenues.json)
editions/dossier.source.html  ← the audit trail: replace red-team findings and citation table
editions/verify.source.html   ← the verification edition: replace the GitHub repo links (otherwise machinery)
editions/lineage.source.html  ← the chapter index: replace the GitHub repo links (otherwise machinery)
skin/edition.html             ← the shared skin all editions render through: repo links, page chrome, per-edition CSS
index.html                    ← GENERATED with dossier.html, verify.html, lineage.html from the sources + skin; never hand-edit, run `npm run render-edition`
paper.html          ← redirect stub → index.html (nothing to edit)
verification/
  verify_numbers.py ← replace placeholder check with real ones
claim_ledger.csv    ← replace placeholder rows with your typed claims
.zenodo.json        ← fill in title, author, description
CITATION.cff        ← fill in title, author, repo URL
paper/              ← optional LaTeX source (the web editions are the paper; not shipped)
  manuscript-template.tex ← LaTeX scaffold — copy to manuscript.tex only if a venue needs a typeset document
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
Create a new public GitHub repo named dossier-NNN from my template repo m4gr4th34/open-dossier-template, and clone it into this folder. Use the gh CLI (gh repo create m4gr4th34/dossier-NNN --template m4gr4th34/open-dossier-template --public --clone); if gh isn't installed or authenticated, walk me through installing and logging in first. Then do the rename pass: in README.md, CITATION.cff, .zenodo.json, the editions/*.source.html content sources, and skin/edition.html, replace every "open-dossier-template" and "DOSSIER NNN"/"dossier-NNN" placeholder with dossier-NNN and the working title "[YOUR TITLE]", replace the YOURUSER/YOURREPO repo links (in skin/edition.html, editions/verify.source.html, and editions/lineage.source.html, plus the README draft-preview banner) with the new repo's real GitHub Pages path so the draft preview resolves once Pages is enabled, then run `npm run render-edition` so the rendered index.html, dossier.html, verify.html, and lineage.html inherit the new names and links, and set my name and affiliation (Irfan Ali-Khan, Independent Researcher, Saratoga, California) where the author placeholders are. Then remove the showroom a fork doesn't need: run `rm -f *-demo.html showcase.html` (these seven files — six `*-demo.html` plus `showcase.html` — are the template's living-figures showroom, not dossier content; the `figures/` engine stays and figures still work), and in README.md delete the top showcase link (the `### ▶ [See a living figure — fall from a planet to the galaxy, live]` line) and the `[Living figures showcase]` item from the commented quick-links block, so the fork advertises no showcase page it no longer ships. Then enable GitHub Pages on the new repo from branch main, root folder, using gh api. Show me what changed, commit as "Initialize Dossier NNN from template", and push. Then write template-sync.json at the repo root with the template repo URL, the template commit you spawned from (the upstream HEAD sha at spawn time), and today's date, and commit and push it.
```

Two clicks remain that no tool can do for you, both one-time per dossier: the Zenodo toggle (zenodo.org → GitHub → flip the new repo on — do it at birth so the first release auto-DOIs) and, in Claude.ai, creating the matching Project with the repo synced into Files and the dispatcher instructions pasted. (Automating the Zenodo step via their API token is already on the tooling roadmap — a real v2 ticket.)

### Pre-release drafting & preview

Enable **GitHub Pages from your first commit** (Settings → Pages → deploy from `main` / root). A dossier is meant to be read as it develops, not held back until it's "done" — Pages makes the live self-explaining edition (with its verification console) and audit trail readable and shareable the moment you push.

The **draft-preview banner** at the top of the README is present **by default** and signals honestly that the work is unresolved: sections, claims, and checks may be incomplete. This lets you read the self-explaining edition and share early ideas — with the right expectations set — before any release.

**At first release:** remove the draft-banner block (or replace it with the standard live-document links, without the "work in progress" caveat) — the work is no longer a work-in-progress, and a released dossier should not advertise itself as a draft. This is a **content edit the author makes deliberately, not machinery**: it changes what the dossier claims about its own status, so it is never auto-applied by a template sync.

### Syncing template improvements into an existing dossier

Port the latest template improvements into a dossier you've already filled in.
A naive copy would bulldoze your paper, so the ritual sorts every upstream
change into **three buckets**:

1. **Machinery** — workflows, the format spec, shared docs, `verify.html`, and
   the CSS/JS *plumbing* of the editions. These carry no authored meaning, so
   they port wholesale (after you review the diff).
2. **Content** — your prose, your claim-ledger rows, your dossier's real
   verification checks and data, your manuscript, your timestamps. The sync
   **never touches these.**
3. **Structural migrations** — changes that are machinery in *intent* but can
   only be adopted by **editing authored content** into a new shape (e.g. moving
   data into a new single-source file, or relabeling ledger rows under a new
   claim type). These are **never auto-applied.** Each is identified, presented
   to you as a named yes/no decision, and — if you approve it — executed as its
   **own separate, separately-reviewed commit**, never folded into the machinery
   port.

The first two buckets are a clean copy-or-skip. The third is where judgment
lives, and it's the bucket a one-line "copy machinery, skip content" rule gets
wrong — because a structural migration *looks* like machinery (it ships in the
template) but *behaves* like content (adopting it rewrites your paper). When in
doubt about which bucket a change is in, treat it as a migration and ask.

**Shape first.** Before anything else, the ritual establishes whether your
dossier is **survey-shaped** or **single-result**, because a chunk of the
template's machinery (the `avenues.json` landscape, the survey console, the
survey-consistency verifier) only applies to surveys. On a single-result
dossier those aren't migrations to do later — they're **not applicable**, and
the ritual skips them and ports only the shape-neutral machinery. This is the
difference between a single-result sync hitting one clean "skip the survey
parts" and hitting three confusing "stop and ask" flags.

Paste this to your agent:

```
Sync this dossier to the latest Open Dossier template by its three-bucket
ritual. DISCOVERY + MACHINERY first; structural migrations are separate,
approved passes. Plain commits only — NO tag/release (don't trigger
Zenodo/OpenTimestamps). Show me the full diff before EVERY commit. STOP and
ask rather than guess on any conflict.

STEP 1 — CHANGELOG (cheap if we've synced before).
- Read template-sync.json in this repo. If it records synced_from_commit,
  clone the template shallow into a temp dir and run
  `git log <synced_from_commit>..HEAD --oneline` to get the EXACT list of
  upstream changes since our last sync. If there's no template-sync.json (first
  sync under this ritual), do a full file-by-file compare instead.
- Template lives at https://github.com/m4gr4th34/open-dossier-template (clone to
  a TEMP folder; do NOT add it as a remote, do NOT merge). 
- Report the changelog before doing anything else.

STEP 2 — SHAPE. State whether this dossier is SURVEY-shaped or SINGLE-RESULT
(check index.html: an avenue landscape reading avenues.json = survey; a slider
explorer + headline number = single-result). This routes the survey-specific
machinery in Step 3.

STEP 3 — MACHINERY (bucket 1: port after I see the diff). Apply upstream changes
to machinery ONLY:
  - everything in .github/workflows/
  - verification/research_pipeline.md (format spec, incl. label/claim-type
    vocabulary like EXPLORATORY-CONJECTURE and FORECAST — adopting a DEFINITION
    is machinery; relabeling YOUR rows is a migration, see Step 4)
  - AUTHORING.md, DEPLOY.md, GETTING-STARTED.md, GETTING-STARTED-GENERIC.md
  - editions/verify.source.html + editions/lineage.source.html + skin/edition.html (the verification and chapter-index editions are entirely machinery; verify.html and lineage.html render from them)
  - the doctrine/operating sections of CLAUDE.md, PRESERVING its "## Standing
    context" section untouched
  - CSS/JS *machinery* hunks in skin/edition.html and the editions/*.source.html head_extra slots (NOT the rendered index.html/dossier.html; re-render with `npm run render-edition`)
  - IF SURVEY-shaped: also the survey console/verifier machinery and the
    structure of avenues.json. IF SINGLE-RESULT: SKIP all survey-specific
    machinery (avenues.json, the survey console, the survey verifier) — not
    applicable to this shape.
NEVER touch (bucket 2): editions/index.source.html's self-explaining section text / terms / citation chips & CITES,
claim_ledger.csv rows, the real checks in verify_numbers.py, your avenue DATA if
survey-shaped (the rows inside avenues.json are content), paper/ manuscript
files, anything in timestamps/, and LICENSE.md.
Show me the full machinery diff. On approval, commit as
"Port template machinery updates [DATE]" — plain commit, no tag.

STEP 4 — STRUCTURAL MIGRATIONS (bucket 3: identify, don't apply). From the Step 1
changelog, identify any change that would require editing authored content to
adopt. Do NOT apply any of them. For each, consult "Structural migrations" in
the template README and present it to me as a named yes/no decision with its
procedure and whether it's safe to defer. The currently-known ones:
  - avenues.json single-source adoption (only relevant if survey-shaped)
  - constitution collapse (CLAUDE.md becomes the single constitution;
    PROJECT-INSTRUCTIONS.md becomes a redirect)
  - EST -> FORECAST ledger relabeling
Execute ONLY the migrations I approve, each as its OWN separate commit with its
own diff shown first. The constitution-collapse migration has a hard rule: if
PROJECT-INSTRUCTIONS.md's Standing context differs from CLAUDE.md's, STOP and ask
me which is canonical — never silently drop a filled-in Standing context.

STEP 5 — STAMP + VERIFY. After the machinery commit, write template-sync.json
with the template repo URL, the upstream HEAD commit you synced from, and today's
date (this makes the next sync's changelog a one-line range). Confirm authored
content survived (index.html's self-explaining sections and CITES intact, every ledger row present,
paper/ and timestamps/ untouched) and that `python3 verification/verify_numbers.py`
exits 0. Report, then we're done.
```

LICENSE.md is intentionally excluded — your license is your choice; sync never
overwrites it.

#### Structural migrations (the third bucket — reference)

A template change is a **structural migration**, not plain machinery, when
adopting it requires **editing authored content into a new shape**. It ships in
the template like machinery, but you can't take it without touching your paper,
your ledger, or your real checks — so it's never auto-applied. The handling is
always the same: identify it, present it as a named decision, and if approved,
do it as a separate reviewed commit. New migrations get added to this list as
the template evolves; the *category* is what matters, so a migration we haven't
catalogued yet still has a home and a handling rule instead of becoming a
mystery "stop and ask."

**Migration A — `avenues.json` single-source (survey dossiers only).**
*When it applies:* your dossier is survey-shaped and predates the canonical
`avenues.json`. *Why it's a migration:* your avenue data currently lives as
authored prose and ledger rows; adopting the single-source means lifting that
data into `avenues.json` and pointing the console and verifier at it.
*Procedure:* extract each avenue (name, status, forecast %, signpost, cites)
into `avenues.json`; switch index.html's console and `verify_numbers.py` to the
survey-consistency versions that read it; reconcile against the prose/ledger so
nothing contradicts. *Safe to defer?* Yes. *Skip entirely?* Yes, if the dossier
is single-result — it doesn't apply at all.

**Migration B — constitution collapse (CLAUDE.md becomes the single source).**
*When it applies:* your dossier still has the old dual-file shape, where doctrine
and Standing context are mirrored across `CLAUDE.md` and `PROJECT-INSTRUCTIONS.md`.
*Why it's a migration:* the template now keeps ONE constitution in `CLAUDE.md`
and demotes `PROJECT-INSTRUCTIONS.md` to a back-compat redirect with no doctrine
and no Standing context — so adopting it deletes a section from a file that may
hold authored content. *Procedure:* merge any doctrine the upstream `CLAUDE.md`
adds (machinery), keep `CLAUDE.md`'s Standing context, then replace
`PROJECT-INSTRUCTIONS.md`'s body with the redirect stub. **Hard rule:** if the
Standing context in `PROJECT-INSTRUCTIONS.md` differs in any way from the one in
`CLAUDE.md`, STOP and ask which is canonical before demoting — never silently
drop a filled-in Standing context. *Final step (manual, in claude.ai — NOT in
the repo):* once `CLAUDE.md` is the full superset and `PROJECT-INSTRUCTIONS.md`
is the redirect, update the claude.ai **Project → Instructions** box to the
strategy-room pointer (the guarded "you CANNOT push" text in GETTING-STARTED.md
Step C). That box lives in claude.ai project settings, not in the repo, so
neither Code nor the chat can edit it — it is a manual author step, and it must
come AFTER the `CLAUDE.md` upgrade, never before (paste it against a slim
workbench `CLAUDE.md` and the strategy room inherits the workbench's "push
freely"). *Safe to defer?* Yes (low-urgency), but do it eventually so the two
rooms can't drift. *Note:* existing Project Instructions keep pointing at
`PROJECT-INSTRUCTIONS.md`; the redirect keeps them working with no change on
your side.

**Migration C — `EST` -> `FORECAST` ledger relabeling.**
*When it applies:* the template added the `FORECAST` claim type and your ledger
labels subjective forward judgments as `EST`. *Why it's a migration:* the
*definition* of FORECAST ports as machinery (Step 3), but converting your rows is
a content edit — and not a find-replace: a FORECAST **requires a dated,
falsifiable signpost** (the doctrine: a forecast without one is just an opinion
with a number on it), so each converted row needs a real signpost written for it.
*Procedure:* for each `EST` row that is actually a forward judgment, change the
type to `FORECAST` and add its mandatory dated signpost; leave genuine non-
forecast `EST` rows alone. *Safe to defer?* Yes — `EST` rows aren't false, just
less precise. Do it as a deliberate authoring pass when you're ready.

### Recording a minted DOI (post-release)

Zenodo mints a release's DOI *after* the freeze has sealed the chapter (the freeze runs on the
release event, before the DOI exists), so the immutable `chapters/<tag>/` snapshot genuinely
predates its own DOI and stays as-is — its DOI lives in the Zenodo record and the root
`provenance.json`. The **mutable** reading view `live/<tag>/` and the chapter index `lineage.html`
bake/cite their DOI from the chapter's `lineage.json` entry, so once the DOI is minted you write it
into that entry (never by hand — `lineage.json` is machinery-owned) and re-skin:

    # after Zenodo mints and you've backfilled root provenance.json + CITATION.cff:
    python3 verification/backfill_doi.py --tag <tag> --version-doi <doi> [--concept-doi <doi>]
    npm run render-backcatalog          # re-bakes live/<tag>/ with the real DOI
    npm run check-backcatalog           # gate the re-skin before committing
    git add lineage.json live/          # by name; chapters/ is immutable and untouched
    # then commit (-F) and push

`backfill_doi.py` updates `lineage.json` via the same writer the freeze uses, is idempotent, and
refuses to overwrite an already-set DOI with a different value. It touches neither `chapters/<tag>/`
(immutable) nor `provenance.json` (the human/Zenodo-owned root backfill).

### Backfilling chapters from past releases

Run this **once** in a dossier that already has releases predating the lineage
feature, to reconstruct each past release as a frozen chapter. Afterward,
`freeze-chapter.yml` archives every new release automatically — you never run this
again. Frozen chapters preserve their **as-published** appearance (old theme, old
asset set); the lineage is a historical record, **not a reskin** — do not
retro-theme them.

It is a thin caller of `verification/freeze_chapter.py` (the same shared freeze the
release workflow uses): it reconstructs each tag in a detached worktree so `main`
is never disturbed, runs the honesty gate against that old tree, then writes
`chapters/<tag>/` and appends to `lineage.json` on `main`. `chapters/` is
write-once/immutable like `timestamps/`, so re-running is safe — already-frozen
tags are skipped, never overwritten. `gh` gives the richest metadata; without it
the loop degrades to git-only (tag name + commit date).

Paste into the Code tab:

```bash
# --- PRE-FLIGHT: repo root, clean tree, lineage.json present ---
test -f verification/freeze_chapter.py && test -f lineage.json || { echo "Run from the dossier repo root (after the template sync that brings lineage)."; exit 1; }
git diff --quiet && git diff --cached --quiet || { echo "Working tree is dirty — start the backfill from a clean tree."; exit 1; }

# --- ENUMERATE release tags, ascending (this ordered set IS the lineage) ---
TAGS="$(git tag --list 'v*' --sort=v:refname)"
echo "Tags to backfill (ascending):"; printf '  %s\n' $TAGS
[ -n "$TAGS" ] || { echo "No v* tags — nothing to backfill."; exit 0; }

# --- FOR EACH TAG: reconstruct as-published in a detached worktree, freeze, clean up ---
for TAG in $TAGS; do
  echo "=== $TAG ==="
  git worktree add --detach .backfill-tmp "$TAG" || { echo "  worktree add failed; skipping $TAG"; continue; }

  TITLE="$(gh release view "$TAG" --json name -q .name 2>/dev/null)";  TITLE="${TITLE:-$TAG}"
  SUMMARY="$(gh release view "$TAG" --json body -q .body 2>/dev/null | head -n1)"
  RELEASED="$(gh release view "$TAG" --json publishedAt -q .publishedAt 2>/dev/null | cut -c1-10)"
  [ -n "$RELEASED" ] || RELEASED="$(git log -1 --format=%cs "$TAG")"        # fallback: tag commit date
  CONCEPT_DOI="$(git show "$TAG":provenance.json 2>/dev/null | jq -r '.concept_doi // ""' 2>/dev/null || echo "")"
  case "$CONCEPT_DOI" in TODO*|"") CONCEPT_DOI="" ;; esac                   # sentinel/absent -> empty
  VERSION_DOI="$(git show "$TAG":provenance.json 2>/dev/null | jq -r '.version_doi // ""' 2>/dev/null || echo "")"
  case "$VERSION_DOI" in TODO*|"") VERSION_DOI="" ;; esac                   # from that tag's own sealed provenance
  DOI_ARCHIVED="$(git show "$TAG":provenance.json 2>/dev/null | jq -r '.doi_archived // ""' 2>/dev/null || echo "")"   # "false" iff that chapter declared no DOI

  python3 verification/freeze_chapter.py \
    --tag "$TAG" --title "$TITLE" --summary "$SUMMARY" \
    --released "$RELEASED" --version-doi "$VERSION_DOI" --concept-doi "$CONCEPT_DOI" --doi-archived "$DOI_ARCHIVED" \
    --source-dir .backfill-tmp \
    || echo "  skipped $TAG (already frozen / gate failed / dup — see message above)"

  git worktree remove --force .backfill-tmp   # ALWAYS clean up, even on failure
done

# --- REGENERATE derived artifacts from the now-complete lineage (mirrors freeze-chapter.yml):
#     the per-chapter current-skin reading views (live/<tag>/) AND the lineage-driven markdown
#     index (llms.txt). Both are regenerate-all and read the finished lineage.json, so they run
#     ONCE here, after the loop — never inside it. Without these, the backfill would advance
#     lineage.json but leave live/ missing and llms.txt stale (check-markdown would go red). ---
npm run render-backcatalog
npm run render-markdown

# --- GATE-GUARD before review (fail-closed, same as the workflow): never stage a broken
#     reading view or a stale markdown index. ---
npm run check-backcatalog
node verify_projection.js
npm run check-markdown

# --- REVIEW, then commit explicitly (the ritual does NOT auto-commit) ---
echo; echo "=== review before committing ==="
git status
echo "--- lineage.json ---"; cat lineage.json
```

Review the reconstructed `chapters/` tree and `lineage.json`. When they look right,
commit explicitly — same diff-gated discipline as everywhere else:

```bash
git add chapters/ lineage.json live/ llms.txt index.md
git commit -m "freeze(lineage): backfill chapters from past releases (+ live/ views + llms.txt)"
git push
```

---

## Originates from

Dossier 001 — [m4gr4th34/dossier-001](https://github.com/m4gr4th34/dossier-001)
Irfan Ali-Khan · Independent Researcher · Saratoga, California · 2026

License: CC BY 4.0 (paper/prose) · MIT (code)
