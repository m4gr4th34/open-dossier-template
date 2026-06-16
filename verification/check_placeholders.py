#!/usr/bin/env python3
"""
check_placeholders.py — placeholder-honesty check, gated on release state.

Why this exists: a template ships full of fill-in sentinels. Drafts are allowed
to be drafty, but a *released* dossier should never still display unfilled
placeholders on its public surfaces.

The gate (release state) is read from README.md:
  - If README still carries the draft-preview banner (the literal phrase
    "work in progress"), the dossier is PRE-RELEASE → this script only WARNS
    and exits 0. Drafts are allowed to be drafty.
  - If that banner is gone, the dossier is treated as RELEASED → any surviving
    sentinel on a publication surface FAILS the build (exit 1).

Scope: only the author's *publication surfaces* are scanned (see SURFACES).
Machinery/instruction files (AUTHORING.md, CLAUDE.md, PROJECT-INSTRUCTIONS.md,
GETTING-STARTED*.md, DEPLOY.md, the README Rituals section, the workflows, and
this script itself) legitimately quote these sentinels as documentation, so
scanning the whole repo would always fail at release. We scan what readers see.

This script reads no numbers and is independent of verify_numbers.py.
"""
import os
import sys

# Fill-in sentinels that must not survive into a released publication surface.
SENTINELS = [
    "DESCRIBE YOUR USE",
    "PLACEHOLDER",
    "TODO-AFTER-FIRST-RELEASE",
    "YOURUSER",
    "YOURREPO",
    "YOUR NAME",
    "NNN",
]

# Author-facing publication surfaces (what a reader/citer actually sees).
SURFACES = [
    "index.html",
    "paper.html",
    "dossier.html",
    "verify.html",
    "CITATION.cff",
    ".zenodo.json",
    "provenance.json",
    "avenues.json",
    "claim_ledger.csv",
    "paper/manuscript.tex",
]

DRAFT_BANNER_MARKER = "work in progress"


def is_pre_release():
    """True if README.md still carries the draft-preview banner."""
    try:
        with open("README.md", encoding="utf-8", errors="replace") as fh:
            return DRAFT_BANNER_MARKER in fh.read().lower()
    except FileNotFoundError:
        # No README at all → treat as released (be strict).
        return False


def scan():
    hits = []
    for path in SURFACES:
        if not os.path.exists(path):
            continue
        with open(path, encoding="utf-8", errors="replace") as fh:
            for lineno, line in enumerate(fh, 1):
                for sentinel in SENTINELS:
                    if sentinel in line:
                        hits.append((path, lineno, sentinel, line.strip()))
    return hits


def main():
    hits = scan()
    pre_release = is_pre_release()

    if not hits:
        print("check_placeholders: no fill-in sentinels in publication surfaces. OK.")
        return 0

    print(f"check_placeholders: found {len(hits)} sentinel occurrence(s) in publication surfaces:")
    for path, lineno, sentinel, line in hits:
        print(f"  {path}:{lineno}  [{sentinel}]  {line[:100]}")

    if pre_release:
        print()
        print("Draft-preview banner present in README.md (pre-release) → WARNINGS ONLY (exit 0).")
        print("Drafts are allowed to be drafty; fill these in before you remove the banner / release.")
        return 0

    print()
    print("Draft-preview banner ABSENT in README.md (treated as released) → FAIL (exit 1).")
    print("A released dossier must not display fill-in placeholders. Fill them in,")
    print("or restore the draft-preview banner if this is still a work in progress.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
