# GETTING-STARTED.md — Your first dossier, start to finish

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
  honestly, ship it, invite the world to check. That's just how science
  was always supposed to work — now with the paperwork deleted and the
  receipts attached.

The first scientists to publish this way will look, in hindsight, like the
first people who emailed instead of mailed. Everyone else will catch up.

Bring the idea you actually care about. Skip the year of misery. Publish
it honestly, today, and let the world check your work.

**Your idea goes where the UAP example was. Start at Step 1.**
