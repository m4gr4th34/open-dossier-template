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
4. That's it. Claude Code installs and updates itself; you don't need to
   install Git, LaTeX, or anything else.

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
> My research idea is: **[describe your idea in a sentence or two]**
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
   questions. The one rule: every label must be true.
4. **Read the draft and the self-explaining edition** — tell it what's
   unclear; it tightens.

Just talk to it in plain English. There's no syntax to learn.

## Step 4 — Publish (Claude Code walks you through it)

When the dossier is ready, say:

> Walk me through DEPLOY.md to publish this.

It will guide you, click by click, to:
- turn on the free website (GitHub Pages),
- connect Zenodo once (free, "log in with GitHub") for your DOI,
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

## Once you've published your first one (optional power-up)

Publishing more dossiers? You can keep each research topic tidy in its own
**Claude Project** (the Projects tab in the desktop app — different from
Code). A Project remembers the context and instructions for one line of
research across many sessions. Workflow that scales well:
- One Claude **Project** per research topic (holds your strategy and notes).
- One GitHub **repo** + one Claude Code **folder** per dossier (holds the
  actual publication).
- Decide and plan in the Project chat; execute and publish in Code.

But don't bother with this for your first dossier — just get one published.
Organization is a reward you give yourself after the first win, not a hoop
to jump through before it.
