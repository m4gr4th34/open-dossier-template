# Getting Started (platform-agnostic) — Your first dossier, start to finish

> This is the platform-agnostic walkthrough. If you're using the Claude desktop app (the easiest path), use [GETTING-STARTED.md](GETTING-STARTED.md) instead.

Be honest: you got into science for the ideas. The discovery, the
argument, the moment the data clicks. You did *not* get into it for
wrestling LaTeX into making a two-column figure float to the right page,
or trimming a beautiful paragraph to hit a word limit, or formatting a
bibliography by hand at 1 a.m., or waiting eight months to learn that
Reviewer 2 skimmed it.

This page shows you a different way. You bring the idea and the judgment;
an AI agent does the rest — the writing, the typesetting, the citations,
the figures, the verification code, the web pages — and what comes out is
a live, citable, timestamped publication that **checks its own math and
explains itself to strangers.** Start to finish in an afternoon, not a
year.

No Git, no LaTeX, no web skills required. If you can explain your idea in
plain English and tell when an answer smells wrong, you're qualified.

> **The deal.** The AI does the literature search, the drafting, the math
> typesetting, the citation formatting, the figures, the verification
> script, and all three web editions. You do four things: bring the idea,
> sanity-check the results, decide what's established versus still an open
> question, and press the buttons that publish. That's it. That's the job.

---

## What you'll need (15 minutes, once)

1. **A GitHub account** — free, at github.com. Your paper lives here.
2. **An AI coding agent** — e.g. Claude Code (Pro/Max plan). It reads the
   instruction files in the template automatically and already knows the
   rules.
3. **A Zenodo account** — free, "log in with GitHub." Mints your permanent
   DOI. (One-time, in Step 6.)

No local software to install. The agent and GitHub's servers do the heavy
lifting.

---

## A complete worked example

To show every step on something real, we'll publish a deliberately
spicy question — the kind that makes a department chair reach for the
antacid:

> **"What can be inferred about UAP propulsion from the public kinematic
> data — and what would a real exotic-propulsion signature have to look
> like?"**

Yes, that UAP. We picked it on purpose, and not to be cheeky (okay, a
little to be cheeky). It's the perfect stress test, because it's exactly
the kind of question the old system handles *badly*: too speculative for a
journal's front door, too interesting to ignore, and guaranteed to get
mocked rather than engaged. If the format can make *this* question land as
sober, rigorous, and impossible to wave away, it can do it for your
perfectly respectable idea in your perfectly respectable subfield with
both hands tied. Whatever your idea is — quantum optics or qualia, protein
folding or flying saucers — drop it in wherever you see the example.
(Believers: you finally get a venue that takes the question seriously.
Skeptics: you get to watch honest labeling defuse the whole thing.
Everybody wins. That's sort of the point.)

---

### Step 1 — Spawn your repository (2 min)

Open your AI agent and paste this, edited for your idea:

> "Go to https://github.com/m4gr4th34/open-dossier-template and follow the
> 'Spawning a new dossier' ritual in its README to create a new dossier
> from it. Name the new repo dossier-uap-propulsion. I'm [your name],
> [your affiliation or 'independent researcher, city']. Read AUTHORING.md
> and CLAUDE.md in the template before you start — they have the
> production rules."

The agent clones the template and does the rename pass. You now own a repo
with all the machinery. (You wrote zero lines of code. This will keep
happening. Get used to it.)

### Step 2 — Map the terrain honestly (the part that feels like research)

This is a conversation, not a form:

> "Do a prior-art reconnaissance on inferring UAP propulsion from public
> data. Sort everything into three buckets, each sourced: ESTABLISHED
> (documented sensor records, official acknowledgments, the AARO/NASA/Navy
> material, kinematic claims with their measurement caveats); ADJACENT
> (proposed mechanisms, energy/acceleration analyses); and OPEN (the
> exotic-propulsion question nobody has actually closed). Build the claim
> ledger and label every entry by how well it's really verified — no
> inflation, no dismissal."

The agent searches and hands you a map. **Your job — the actual brain
work:** read it with everything you know switched on. The agent has read
more than you but understood it less; you have the taste. Correct it, tell
it what it's underweighting, push back. This back-and-forth *is* the
research, and it's the part no machine does for you.

> **Why honesty is the power move, not the timid one.** Stating flatly —
> as ESTABLISHED, with citations — that objects with anomalous kinematics
> are documented and that relevant data is restricted is not playing it
> safe. It's standing on bedrock nobody can shove you off. And parking
> "it's exotic propulsion" in the OPEN bucket isn't a retreat; it's what
> makes the whole thing impossible to laugh off *and* impossible to
> ignore. Bold claim, honest label. That combination is undismissable —
> and it works exactly the same way for your idea as for this one.

### Step 3 — Draft it (the agent does the typing you've always hated)

> "Draft the manuscript from paper/manuscript-template.tex per
> AUTHORING.md. State the established facts plainly and confidently — they
> are documented, not speculation. Label the exotic-propulsion inference
> OPEN and frame it as a challenge to the field, spelling out the specific
> signature that would settle it. I want the bold claim on the page,
> correctly labeled."

The agent writes the formal paper, sets the math, formats every citation,
and fills the claim ledger. No LaTeX tantrums, no bibliography drudgery,
no fighting the figure placement. **Your job:** make sure every label is
true *in both directions* — don't let it shrink a real anomaly into
"alleged," and don't let it promote the open question to settled fact.
That symmetry is your whole credibility, and it's the one thing only you
can certify.

### Step 4 — Let it attack its own work (automatic)

> "Run the verification script and the citation audit. Then do an
> adversarial red-team pass as the most hostile skeptical referee you can
> imagine — the one who wants to laugh this off — and publish every
> finding, including the ones I won't enjoy."

Every number recomputes; every citation gets checked; the toughest
objections get written *into the paper* and answered. This is Reviewer 2,
except instant, on your side, and not anonymous-grudge-flavored. **Your
job:** the gut check. A claim that survives this pass is worth more than
ten exclamation points.

### Step 5 — Build the readable editions (the agent leads)

> "Build all three web surfaces per AUTHORING.md: the interactive edition
> with the verification console, the self-explaining edition where every
> term and citation expands in place so a smart outsider needs no
> prerequisites, and the audit trail."

Out comes a publication a curious 17-year-old can read end to end, and a
skeptical professor can read without a single eye-roll — because every
claim is exactly as strong as its evidence. **Your job:** read the
self-explaining edition as the toughest fair reader you can picture. Where
do they snag? Tell the agent; tighten it.

### Step 6 — Publish (you press the buttons)

> "Walk me through DEPLOY.md."

The agent guides you: switch on the website, connect Zenodo once, tag the
first release. The instant you publish, your DOI is minted at CERN, your
release is anchored in the Bitcoin blockchain, and the site goes live.

**You're published.** Citable, timestamped, self-checking. No journal, no
gatekeeper, no submission fee, no eight-month wait. Your priority on the
idea is now cryptographically yours, on a date nobody can forge or erase.

### Step 7 — Let the world in

Share the link. Readers — fans and critics — file GitHub issues against
specific claims; you answer in public; corrections become dated amendments
folded into the living document. Your OPEN claims are open invitations:
the first person to settle one, either way, gets credited in your next
version. The paper is alive — it improves in the open, and every version
is preserved forever. (Compare: the old way, where your correction is an
erratum nobody reads, three issues later.)

---

## Why this is the future, not a gimmick

- **Science just got an afternoon long.** The thing that used to take a
  year of writing, formatting, submitting, waiting, and revising now takes
  one sitting. The bottleneck was never the idea. It was everything
  around the idea. That's gone.
- **You stop fighting the tools and the tedium.** No LaTeX, no column
  wars, no word limits, no bibliography by hand, no graph-pixel agony, no
  anonymous knife-fights. You think; the agent assembles.
- **You can't fool yourself, and neither can anyone else.** A
  self-checking script and a public red-team keep your own enthusiasm
  honest — and the one rule, *every label is true*, is what earns the
  trust of people not yet convinced. Conviction and evidence live in
  different columns. Keep them straight and you're unimpeachable.
- **It's yours the instant you publish.** Timestamped priority, no queue,
  no gatekeeper deciding whether you're allowed to have had the idea.
- **It welcomes the bold and the careful alike.** A wild conjecture and a
  careful incremental result get the same treatment: state it, label it
  honestly, ship it, invite the world to check — each gets the label that's
  honestly true, from verified down to clearly-marked exploratory conjecture
  (the doctrine defines the full ladder; your agent applies it). That's just how science
  was always supposed to work — now with the paperwork deleted and the
  receipts attached.

The first scientists to publish this way will look, in hindsight, like the
first people who emailed instead of mailed. Everyone else will catch up.

Bring the idea you actually care about. Skip the year of misery. Publish
it honestly, today, and let the world check your work.

**Your idea goes where the UAP example was. Start at Step 1.**

---

## The research loop: pause, resume, repeat

A dossier isn't a one-shot. Real research circles back — you draft, you
reality-check, you step away to verify something, you come back and revise.
Here's how that flows.

### Pausing and coming back to the same dossier

You can stop any time — your work is saved in two places automatically: the
files on your computer (in the folder you chose) and, once you've pushed at
least once, on GitHub. To resume later, open your AI agent, point it at the
**same folder**, and just say what you want next, e.g.:

> "Pull the latest, show me where we left off on this dossier, and let's keep
> going. I checked with a primary source and need to revise [X]."

Nothing is lost between sessions. If you already published a release, small
fixes are ordinary edits; a substantial revision becomes a new versioned
release (v1.1, v1.2 …), and every version stays preserved with its own
timestamp.

### Reality-checking before you publish (encouraged!)

If a claim depends on something you want to confirm — a primary source, an
expert, a collaborator, your own memory of the details — **pause and confirm
it before publishing.** Tell your AI agent to label that claim as open in the
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

> Tip once you're publishing several: keep each topic in its own persistent
> project or workspace in your AI tool (if it offers one) to hold that line of
> research's context and notes across sessions. Optional, and best saved for
> after your first publication — don't let organization slow down your first
> win.

---

## Optional power path: run a dossier as a persistent project/workspace

Once you're publishing seriously — or tackling a topic sophisticated enough
that you'll work on it across many sessions — you'll want **a persistent
project/workspace in your AI tool, if it has one** as the home base for that
line of research. It's a persistent strategy room: it remembers your context
and instructions across every conversation, and if it can sync (read-only)
the dossier's GitHub repo, the chat always sees the current state of your
paper. Pair it with your AI agent (which does the actual writing and
publishing) and you have the full setup: **think and plan in the project
chat; execute and publish with your agent.**

> **Important — do these in the right order.** The project *reads* a GitHub
> repo; your AI agent *creates* it. So the repo must exist first. Follow the
> steps in sequence and the wiring is clean.

### Step A — Have your AI agent create the repo first (the "wiring" step)

First, start a fresh AI agent session pointed at a new, empty folder for this
topic (e.g. `~/dossiers/dossier-[short-name]`). Each dossier gets its own
folder so repos never tangle. Then, in that session, paste:

> Go to https://github.com/m4gr4th34/open-dossier-template, read its README,
> AUTHORING.md, CLAUDE.md, and GETTING-STARTED.md, and create a new dossier
> from it following the "Spawning a new dossier" ritual. Name the repo
> **dossier-[short-name]**. I'm **[name], [affiliation]**. Do the full
> rename pass, push the initial commit so the repo exists on GitHub, and
> confirm the repo URL. We'll do the actual research next — for now I just
> want the repo created and pushed so I can wire up a project to it.

When it finishes you'll have a live GitHub repo (e.g.
`github.com/[you]/dossier-[short-name]`) containing the template scaffold.
Copy that URL.

### Step B — Create the project/workspace

In your AI tool (repo file-sync, if it's offered, is usually in the web
interface):

1. Find the projects/workspaces area → create a new one.
2. Name it for the topic, e.g. "Dossier — [Your Topic]".
3. Give it a one-line description.

### Step C — Point the project's instructions at the constitution file

Your new repo already contains **`CLAUDE.md`** — the single constitution for
this dossier. An agent that supports project-level instruction files reads it
automatically, and it's also what the project chat follows, so there's only
one file to keep current. Rather than pasting a wall of doctrine here, point
the project at that file. In the project's **instructions** (or system
prompt), paste this:

```
Your full constitution is CLAUDE.md — read it and follow it. Note specifically: this is the strategy room. You CANNOT push to the repo; you decide here and hand Code paste-ready instructions. (Full role split and standing context: CLAUDE.md.)
```

**Caution — only once CLAUDE.md is the full constitution.** This pointer is only correct after CLAUDE.md is the full constitution. If you're upgrading an OLDER dossier whose CLAUDE.md is still the slim workbench version, complete the constitution-collapse migration (README Rituals → Structural migrations → Migration B) BEFORE pasting this pointer, or the strategy room will inherit the workbench's "push freely."

**If this project contains MORE THAN ONE dossier repo, use this pointer instead** (the single-repo pointer above is the default; this is the alternative for a project that holds several dossiers):

```
This project contains multiple dossier repositories, each with its own CLAUDE.md serving as that dossier's constitution. For every conversation, work from the CLAUDE.md of the dossier being worked on and follow it as your constitution — including its role rules: this is the strategy room, you CANNOT push, you decide here and hand Code paste-ready instructions. If it is not clear from the conversation which dossier is active, ask before proceeding rather than assuming.
```

The same caution applies per repo: each dossier's CLAUDE.md must be the full constitution (Migration B done) before this pointer is safe for it.

Then have your AI agent fill in the constitution's two blanks. Paste this into
your AI agent, edited for your dossier.

Fill in the blank version below for your topic; use the worked example that follows it as a model for the depth and labeling discipline to aim for (it's an example, not text to submit).

```
In CLAUDE.md in this repo, fill in the two bracketed spots and commit + push:
- The topic line: in the "## What this project is" section, replace the placeholder "Dossier [NNN / short-name]: [ONE-LINE TOPIC]" with your topic — keep the word "Dossier" in front, and leave the "Connected repo:" line untouched.
- The Standing context section — replace its bracketed placeholders with:
  - Open claims: [list any claims you already know will be open/unverified, or "none yet — to be determined during drafting"]
  - Open red-team findings: [usually "none yet" at the start]
  - Anything a fresh session must know: [the topic's sensitivities, the key prior work, and the boldest claims and exactly how they should be labeled]
Leave the rest of CLAUDE.md — the doctrine, geography, and operating-mode sections — exactly as they are; you're only filling in the topic line and Standing context.
```

Not sure how much to write? Here's the same block filled in for a deliberately hard topic — a UAP-propulsion dossier. This shows the level of rigor to aim for; copy its shape and swap in your own topic and context:

```
In CLAUDE.md in this repo, fill in the two bracketed spots and commit + push:
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
Leave the rest of CLAUDE.md — the doctrine, geography, and operating-mode sections — exactly as they are; you're only filling in the topic line and Standing context.
```

Because the constitution lives in the repo, it's versioned and upgrades with
the normal template-machinery sync, so your project never goes stale. Because
`CLAUDE.md` is the single source of truth — read by your agent and pointed at
by the project instructions — there's nothing to mirror into a second file.

Then: re-sync the repo into your project so the chat reads your new constitution
(if your tool syncs files; otherwise point it at the repo), and start your
prior-art reconnaissance in the project chat. When that chat hands you a
paste-ready instruction, run it with your AI agent. That's the loop.

### Step D — Connect the repo (read-only sync)

If your AI tool can sync a GitHub repo into the project read-only, connect
your `dossier-[short-name]` repo and include everything EXCEPT
`paper/manuscript.pdf` (the .tex covers it; the PDF wastes context). Re-sync
at the start of any session, or after your agent pushes, so the chat reads
the latest. (If your tool can't sync files, just paste the repo URL and ask
it to read the current state from GitHub at the start of a session.)

### Step E — Work the loop

From now on: **decide and plan here in the project chat → it hands you a
paste-ready instruction → run it with your AI agent → it pushes → re-sync →
review back here.** The project remembers everything across sessions; your
agent does the hands-on work; GitHub holds the truth.

> **One constitution, both rooms.** `CLAUDE.md` is the single source of
> truth: an agent that supports project-level instruction files reads it
> automatically every session, and the project instructions point at the same
> file — so the same rules bind both rooms with nothing to keep in sync.
> `PROJECT-INSTRUCTIONS.md` is now just a back-compat redirect that holds no
> doctrine; revise your working rules in `CLAUDE.md` alone.
