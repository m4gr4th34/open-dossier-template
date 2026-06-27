#!/usr/bin/env python3
"""
check_placeholders.py — placeholder-honesty check, gated on release state.

Why this exists: a template ships full of fill-in sentinels. Drafts are allowed
to be drafty, but a *released* dossier must never still display unfilled
placeholders on its public surfaces — including a placeholder DOI.

Release state is read primarily from provenance.json — the SAME file the
auto-timestamp workflow owns — so the checker and the release automation can
never disagree about whether the repo is released. It is NOT hinged on a single
README banner. The repo is treated as RELEASED if ANY of:

  - provenance.release_tag is a real tag (set, not the v0.0.0 scaffold default,
    not a sentinel), OR
  - provenance.concept_doi is a real DOI (not a sentinel), OR
  - README.md no longer carries the draft-preview banner.

OR-logic is the strict direction: the honesty check latches ON easily and cannot
be silently disabled by tampering with one signal. A released dossier carrying a
placeholder DOI therefore FAILS loudly (the intended behavior); it clears the
moment the real DOI is backfilled.

Scope: only the author's *publication surfaces* are scanned (see SURFACES).
Machinery/instruction files legitimately quote these sentinels as documentation.
This script reads no numbers and is independent of verify_numbers.py.
"""
import json
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
PROVENANCE = "provenance.json"
SCAFFOLD_TAG = "v0.0.0"


def _looks_like_sentinel(value):
    """True if a field value is empty, a TODO, or contains a known sentinel."""
    v = str(value or "").strip()
    if not v:
        return True
    if v.upper().startswith("TODO"):
        return True
    return any(s in v for s in SENTINELS)


def _load_provenance():
    try:
        with open(PROVENANCE, encoding="utf-8", errors="replace") as fh:
            return json.load(fh)
    except (FileNotFoundError, ValueError):
        return {}


def _has_real_tag(prov):
    tag = str(prov.get("release_tag", "")).strip()
    if not tag or tag == SCAFFOLD_TAG:
        return False
    return not _looks_like_sentinel(tag)


def _has_real_concept_doi(prov):
    return not _looks_like_sentinel(prov.get("concept_doi", ""))


def _banner_absent():
    try:
        with open("README.md", encoding="utf-8", errors="replace") as fh:
            return DRAFT_BANNER_MARKER not in fh.read().lower()
    except FileNotFoundError:
        # No README at all -> be strict (treat as released).
        return True


def is_released():
    """Multi-signal release gate keyed primarily off provenance.json."""
    prov = _load_provenance()
    signals = []
    if _has_real_tag(prov):
        signals.append("provenance.release_tag is set")
    if _has_real_concept_doi(prov):
        signals.append("provenance.concept_doi is a real DOI")
    if _banner_absent():
        signals.append("README draft-preview banner is gone")
    return (len(signals) > 0), signals


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
    released, signals = is_released()

    if not hits:
        print("check_placeholders: no fill-in sentinels in publication surfaces. OK.")
        return 0

    print(f"check_placeholders: found {len(hits)} sentinel occurrence(s) in publication surfaces:")
    for path, lineno, sentinel, line in hits:
        print(f"  {path}:{lineno}  [{sentinel}]  {line[:100]}")

    if not released:
        print()
        print("Release state: PRE-RELEASE (no release signal present) -> WARNINGS ONLY (exit 0).")
        print("Drafts are allowed to be drafty; fill these in before you release.")
        return 0

    print()
    print("Release state: RELEASED -> FAIL (exit 1). Signals: " + "; ".join(signals) + ".")
    print("A released dossier must not display fill-in placeholders (a placeholder DOI included).")
    print("Backfill the real value(s), or restore the draft-preview banner if this is still a draft.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
