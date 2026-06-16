# Quickstart — publish your first dossier with Claude Code (macOS)

> Using a different AI agent? See the [platform-agnostic walkthrough](GETTING-STARTED-GENERIC.md).

This is the no-detours path: from nothing to a live, citable, timestamped
publication, using the Claude desktop app on a Mac. Every step is literal.
If you've never touched Git or a command line, that's fine — you won't have
to.

> **You'll talk to "Claude Code," not the chat.** In the Claude desktop app,
> look for the **Code** tab (not the regular chat, not Projects). Code is the
> one that can create files, run things, and publish to GitHub for you.
> Everything below is pasted into **Code**.

---

## Before you start (one-time, ~10 min)

1. **Claude desktop app** with a Pro or Max plan — you have this.
   (A Pro plan runs about the price of a couple of fancy coffees a month — a
   rounding error against what it replaces: a year of formatting, submitting,
   and waiting. Cheapest research assistant in history.)
2. **A GitHub account** — free at github.com. Pick a username; write it down.
   You'll use it in a moment.
3. **A Zenodo account** — also free, but you don't need it yet. You'll set it
   up in about two minutes at the publish step (Step 4), using "log in with
   GitHub." It's what gives your paper a permanent DOI. Mentioned here only so
   it's no surprise later.
4. Claude Code installs and updates itself, and handles LaTeX and the rest for
   you. One possible exception: depending on your Mac's setup, a step may ask
   you to install git (Apple's developer tool). If that happens, open Terminal
   and run `xcode-select --install`, click through the dialog, then fully quit
   and reopen Terminal and Claude Code. Most people won't need this — but it's
   here so it's no surprise.

---

## Step 1 — Open Claude Code and pick a folder

1. Open the Claude desktop app.
2. Click the **Code** tab.
3. It will ask you to choose a folder to work in. Make a fresh one — e.g.
   in your home directory, a folder called `dossiers`. Select it. This is
   just where your work lives on your Mac; you won't have to touch it
   directly.

## Step 2 — Paste this one message

Copy the block below, **change only the four bracketed parts**, and paste it
into Claude Code. That's the whole setup.

> Go to https://github.com/m4gr4th34/open-dossier-template and read its
> README, plus the files AUTHORING.md, CLAUDE.md, and GETTING-STARTED.md in
> that repo. Then create a new dossier for me from that template, following
> its "Spawning a new dossier" ritual.
>
> Name the new GitHub repository: **dossier-[SHORT-NAME-FOR-YOUR-IDEA]**
> I am: **[YOUR NAME], [your affiliation, or "independent researcher, city"]**
>
> My research idea is: **[describe your idea — a full paragraph is better than a sentence. Include the core claim, why you think it's true or interesting, any specific results/numbers/sources you already have in mind, and what makes it novel. The more you give here, the less the agent has to guess — this is the one input only you can provide.]**
>
> If I'm not yet signed in to GitHub on this machine, walk me through it
> first. Before you start writing the paper, do the prior-art
> reconnaissance step with me and show me what you find. Ask me before
> anything that publishes or pushes.

Claude Code will: connect to your GitHub, create the repo, clone the
template, and start the research conversation. It will ask permission before
each real action — that's normal and good. Say yes when you're ready.

## Step 3 — Do the part only you can do

Claude Code does the writing, the math, the citations, the verification
code, and the web pages. **You do four things**, and it will prompt you for
each:

1. **The idea** — you already gave it.
2. **Reality-check the prior-art map** — it shows you what's known; you tell
   it what it's missing or got wrong. (This is the real research.)
3. **Decide what's solid vs. open** — make sure every claim is labeled
   honestly: proven things asserted, unproven things marked as open
   questions. (There's actually a small ladder of honest labels — from fully
   verified, through "true but with a named caveat," to "open and unverified,"
   down to "exploratory conjecture." Your AI agent knows them from the
   doctrine; you just need to make sure each claim sits on the rung that's
   actually true. The one rule: every label is true.)
4. **Read the draft and the self-explaining edition** — tell it what's
   unclear; it tightens.

Just talk to it in plain English. There's no syntax to learn.

## Step 4 — Publish (Claude Code walks you through it)

When the dossier is ready, say:

> Walk me through DEPLOY.md to publish this.

It will guide you, click by click, to:
- turn on the free website (GitHub Pages),
- connect Zenodo once for your DOI (free, "log in with GitHub" — if your fresh repo isn't listed, hit "Sync now"; full steps in DEPLOY.md),
- and tag the first release.

The moment you publish that release, your paper is **live, citable with a
DOI archived at CERN, and timestamped on the Bitcoin blockchain** — no
journal, no gatekeeper, no fee.

## Step 5 — Share it

Claude Code will give you your live link
(`https://YOURUSERNAME.github.io/dossier-yourname/`). Send it to anyone.
Readers can run your checks, read the self-explaining edition, and file
issues against specific claims — public, versioned review. Corrections
become dated amendments. Your paper stays alive.

---

## When you're stuck

Tell Claude Code exactly what you see — "I clicked X and got Y" — and let it
diagnose. It can read error messages and fix them. You are never expected to
debug anything yourself.

---

## The research loop: pause, resume, repeat

A dossier isn't a one-shot. Real research circles back — you draft, you
reality-check, you step away to verify something, you come back and revise.
Here's how that flows.

### Pausing and coming back to the same dossier

You can stop any time — your work is saved in two places automatically: the
files on your Mac (in the folder you chose) and, once you've pushed at least
once, on GitHub. To resume later, open Claude Code, point it at the **same
folder**, and just say what you want next, e.g.:

> "Pull the latest, show me where we left off on this dossier, and let's keep
> going. I checked with a primary source and need to revise [X]."

Nothing is lost between sessions. If you already published a release, small
fixes are ordinary edits; a substantial revision becomes a new versioned
release (v1.1, v1.2 …), and every version stays preserved with its own
timestamp.

### Reality-checking before you publish (encouraged!)

If a claim depends on something you want to confirm — a primary source, an
expert, a collaborator, your own memory of the details — **pause and confirm
it before publishing.** Tell Claude Code to label that claim as open in the
meantime:

> "I'm not certain about [claim] yet — I want to verify it with [a source]
> before we publish. Mark it OPEN-UNVERIFIED and hedge the wording until I
> confirm."

This is the whole spirit of the format: it's fine to publish with open
questions clearly labeled, and it's fine to hold a claim back until you've
checked it. The one rule is that every label is true.

### Starting a brand-new dossier (different topic)

Each dossier is its own repository and its own folder — they don't interfere.
To begin a new topic, just **run Step 2 again** with a new repo name and the
new idea. Use a fresh folder per topic to keep things tidy, e.g.
`~/dossiers/dossier-newtopic`. That's the entire "start another one" process:
new name, new folder, same one-paste setup.

> Tip once you're publishing several: keep each topic in its own **Claude
> Project** (the Projects tab — different from Code) to hold that line of
> research's context and notes across sessions. Optional, and best saved for
> after your first publication — don't let organization slow down your first
> win.

---

## Optional power path: run a dossier as a Claude Project (web)

Once you're publishing seriously — or tackling a topic sophisticated enough
that you'll work on it across many sessions — you'll want a **Claude Project**
as the home base for that line of research. A Project is a persistent
strategy room: it remembers your context and instructions across every
conversation, and it can sync (read-only) the dossier's GitHub repo so the
chat always sees the current state of your paper. Pair it with Claude Code
(which does the actual writing and publishing) and you have the full setup:
**think and plan in the Project chat; execute and publish in Code.**

> **Important — do these in the right order.** A Project *reads* a GitHub
> repo; Claude Code *creates* it. So the repo must exist first. Follow the
> steps in sequence and the wiring is clean.

### Step A — Have Claude Code create the repo first (the "wiring" step)

First, start a fresh Claude Code session pointed at a new, empty folder for
this topic (e.g. `~/dossiers/dossier-[short-name]`). Each dossier gets its own
folder so repos never tangle. Then, in that session, paste:

> Go to https://github.com/m4gr4th34/open-dossier-template, read its README,
> AUTHORING.md, CLAUDE.md, and GETTING-STARTED.md, and create a new dossier
> from it following the "Spawning a new dossier" ritual. Name the repo
> **dossier-[short-name]**. I'm **[name], [affiliation]**. Do the full
> rename pass, push the initial commit so the repo exists on GitHub, and
> confirm the repo URL. We'll do the actual research next — for now I just
> want the repo created and pushed so I can wire up a Claude Project to it.

When it finishes you'll have a live GitHub repo (e.g.
`github.com/[you]/dossier-[short-name]`) containing the template scaffold.
Copy that URL.

### Step B — Create the Claude Project (web interface)

In a browser at claude.ai (the Project file-sync feature is web-only):

1. **Projects** (left sidebar) → **New project**.
2. Name it for the topic, e.g. "Dossier — [Your Topic]".
3. Give it a one-line description.

### Step C — Point the Project's Instructions at the constitution file

Your new repo already contains **`PROJECT-INSTRUCTIONS.md`** — the versioned
"constitution" for this dossier's Project. Rather than pasting a wall of
doctrine here, point the Project at that file. Click into the Project's
**Instructions** and paste a single line:

```
Read PROJECT-INSTRUCTIONS.md in the synced repo and follow it as your constitution for every conversation in this project.
```

Then have Claude Code fill in the constitution's two blanks. Paste this into
Claude Code, edited for your dossier.

Fill in the blank version below for your topic; use the worked example that follows it as a model for the depth and labeling discipline to aim for (it's an example, not text to submit).

```
In PROJECT-INSTRUCTIONS.md in this repo, fill in the two bracketed spots and commit + push:
- The topic line: in the "## What this project is" section, replace the placeholder "Dossier [NNN / short-name]: [ONE-LINE TOPIC]" with your topic — keep the word "Dossier" in front, and leave the "Connected repo:" line untouched.
- The Standing context section — replace its bracketed placeholders with:
  - Open claims: [list any claims you already know will be open/unverified, or "none yet — to be determined during drafting"]
  - Open red-team findings: [usually "none yet" at the start]
  - Anything a fresh session must know: [the topic's sensitivities, the key prior work, and the boldest claims and exactly how they should be labeled]
Leave all the doctrine, geography, and division-of-labor sections exactly as they are.
```

Not sure how much to write? Here's the same block filled in for a deliberately hard topic — a UAP-propulsion dossier. This shows the level of rigor to aim for; copy its shape and swap in your own topic and context:

```
In PROJECT-INSTRUCTIONS.md in this repo, fill in the two bracketed spots and commit + push:
- The topic line: this dossier is "UAP Propulsion: What can be inferred about UAP propulsion from the public kinematic data — and what would a real exotic-propulsion signature have to look like?"
- The Standing context section — replace its bracketed placeholders with:
  - Open claims: None formally entered yet — to be built during prior-art recon. Anticipated structure: the ESTABLISHED bucket (documented sensor records, official acknowledgments, AARO/NASA/Navy material, kinematic observations with their measurement caveats) will be asserted with citations; the exotic/non-human-propulsion inference will be the central OPEN-UNVERIFIED claim, posted as an open challenge with the specific physical signature that would settle it.
  - Open red-team findings: None yet — adversarial pass comes after the first draft.
  - Anything a fresh session must know:
    - Framing discipline (critical): This is a charged topic. The format's credibility depends on labeling with total precision. State documented facts (anomalous kinematics are recorded; relevant data is demonstrably restricted) plainly as ESTABLISHED with sources — that is bedrock, not speculation, and being timid about it is a mistake. But the exotic-propulsion conclusion stays in the OPEN bucket, hedged, framed as a challenge — that is what makes the dossier undismissable rather than mockable. Truth in labeling cuts BOTH ways: never soft-pedal a real anomaly into "alleged," and never assert the exotic conclusion as settled. That symmetry IS the credibility.
    - Model to emulate: Avi Loeb and Garry Nolan — believe boldly in private, but publish with labels a hostile referee cannot attack. Restraint as a weapon, not as timidity.
    - The author's position: personally convinced UAP are real and that there is institutional secrecy, after years of research — but conviction and demonstration are different columns of the ledger, and the dossier honors that distinction. The author's certainty informs which questions to pursue; it does not get to set a claim's verification label.
    - Key prior work to map in recon: the AARO reports, the NASA UAP independent study, the Navy/ODNI kinematic data and FLIR videos, and any peer-reviewed physical-anomaly work (e.g. Nolan-lineage materials analysis). Treat sensationalist or unsourced material as adjacent-at-best and flag it.
    - The boldest claim and its label: "the kinematics imply non-human/exotic propulsion" → OPEN-UNVERIFIED, open challenge, with the falsifiable signature spelled out. The publishable, defensible spine is the honest separation of what the data shows from what it would take to prove exotic propulsion.
Leave all the doctrine, geography, and division-of-labor sections exactly as they are.
```

Because the constitution lives in the repo, it's versioned and upgrades with
the normal template-machinery sync, so your Project never goes stale.

Then mirror the same Standing Context into CLAUDE.md. CLAUDE.md is what Claude
Code reads automatically every session, and it ships with a `## Standing
context` TODO stub. Paste this so the two stay in lockstep:

```
In CLAUDE.md, replace the "## Standing context" TODO stub with the same Standing Context you just put in PROJECT-INSTRUCTIONS.md, so the strategy-room chat and the Code-room agent share the same framing. Show me the diff; leave every other section unchanged.
```

Why this matters: the Project chat reads PROJECT-INSTRUCTIONS.md and Claude Code
reads CLAUDE.md — if they drift, the two rooms disagree.

Then: hit Sync in the Project's Files panel so the chat reads your new
constitution, and start your prior-art reconnaissance in the Project chat. When
that chat hands you a paste-ready instruction, run it in Claude Code. That's the
loop.

### Step D — Connect the repo to the Project (read-only sync)

In the Project, find the **Files** panel (right side). Click **+** →
**GitHub** → choose your `dossier-[short-name]` repo → select everything
EXCEPT `paper/manuscript.pdf` (the .tex covers it; the PDF wastes context).
Hit **Sync**. The Project now sees your live repo. Re-hit **Sync** at the
start of any session, or after Code pushes, so the chat reads the latest.

### Step E — Work the loop

From now on: **decide and plan here in the Project chat → it hands you a
paste-ready instruction → run it in Claude Code → Code pushes → hit Sync →
review back here.** The Project remembers everything across sessions; Code
does the hands-on work; GitHub holds the truth.

> **Keeping the doctrine in the repo too.** The repo also carries a
> `CLAUDE.md` file that Claude Code reads automatically every session — so
> the same rules bind both rooms. The Project Instructions (via
> `PROJECT-INSTRUCTIONS.md`) and the repo's `CLAUDE.md` are deliberately
> parallel; if you revise your working rules, update both.
