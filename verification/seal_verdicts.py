#!/usr/bin/env python3
"""seal_verdicts.py — backfill chapters/<tag>/verdict.json for already-frozen chapters.

A chapter's console verdict is a function of avenues.json AND the verifier code. Freeze
historically sealed only avenues.json, so a back-catalog re-skin re-ran the CURRENT verifier
against OLD avenues and baked the wrong check-set onto old chapters (a false label). Sealing the
verdict — extracted from each chapter's own sealed index.md, a projection of the SAME verifier run
that baked that chapter — fixes it by construction. Run ONCE per repo after adopting the
verdict-seal machinery; freeze seals verdict.json for every new chapter automatically thereafter.

Additive-only + idempotent: writes ONLY new verdict.json files, never touches existing sealed
bytes, and skips any chapter that already carries verdict.json. Pre-split chapters (no sealed
index.md) are skipped — they are not retrofitted.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from freeze_chapter import verdict_from_index_md  # ONE extractor, shared with freeze step 3c

CHAPTERS = os.path.join(REPO_ROOT, "chapters")


def main():
    if not os.path.isdir(CHAPTERS):
        print("seal_verdicts: no chapters/ (rootless repo) — nothing to backfill.")
        return 0
    sealed = skipped = 0
    for tag in sorted(os.listdir(CHAPTERS)):
        chdir = os.path.join(CHAPTERS, tag)
        md = os.path.join(chdir, "index.md")
        out = os.path.join(chdir, "verdict.json")
        if not os.path.isdir(chdir) or not os.path.isfile(md):
            continue                       # pre-split / machinery-free chapter: not retrofitted
        if os.path.isfile(out):
            skipped += 1
            continue                       # idempotent
        with open(md, encoding="utf-8") as fh:
            verdict = verdict_from_index_md(fh.read())
        with open(out, "w", encoding="utf-8") as fh:
            json.dump(verdict, fh, ensure_ascii=False, indent=2)
            fh.write("\n")
        print("seal_verdicts: sealed chapters/%s/verdict.json (%d checks)"
              % (tag, len(verdict["checks"])))
        sealed += 1
    print("seal_verdicts: %d sealed, %d already present." % (sealed, skipped))
    return 0


if __name__ == "__main__":
    sys.exit(main())
