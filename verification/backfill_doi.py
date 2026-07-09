#!/usr/bin/env python3
"""backfill_doi.py — write a minted DOI into a chapter's lineage.json entry (post-mint).

Zenodo mints a release's DOI out of band, AFTER the freeze has already sealed the chapter
(the freeze runs on the release event, before the DOI exists). The immutable chapters/<tag>/
record therefore predates its own DOI and stays as-is — its DOI lives in the Zenodo record and
the root provenance.json, which is standard. But the MUTABLE reading view live/<tag>/ bakes its
DOI chip from the chapter's lineage.json entry (render_backcatalog --reskin forwards
ch.version_doi / ch.doi_archived), and lineage.html cites from the same entry. Until the minted
DOI is written INTO that entry, both surfaces show the pre-mint state.

This tool writes the DOI into the lineage entry (and clears a stale doi_archived:false), via the
SAME JSON writer freeze uses — so lineage.json is machinery-updated, never hand-edited. It does
NOT touch chapters/<tag>/ (immutable) or provenance.json (the human/Zenodo-owned root backfill).
After running it, re-skin (npm run render-backcatalog) so live/<tag>/ bakes the real DOI.

Idempotent + fail-loud: aborts if the tag isn't in lineage; refuses to overwrite an already-set
version_doi with a DIFFERENT value (a silent DOI swap would be a false label in a citable record);
a no-op re-run prints "already current" and changes nothing.

Usage:
  python3 verification/backfill_doi.py --tag v1.0.0 --version-doi 10.5281/zenodo.124 \
      [--concept-doi 10.5281/zenodo.123]
"""
import argparse
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from freeze_chapter import load_lineage, write_lineage  # reuse the exact loader/writer freeze uses


def abort(msg):
    sys.stderr.write("backfill_doi: ABORT — " + msg + "\n")
    sys.exit(1)


def apply_doi(lineage, tag, version_doi, concept_doi=""):
    """Pure core: mutate `lineage` in place, return True iff it changed. Raises ValueError on the
    fail-loud conditions (empty/TODO input DOI; tag not in lineage; a DIFFERENT existing DOI —
    a citable record's DOI must not silently change). File-IO-free so it is unit-testable against
    an in-memory lineage (verification/backfill_doi.test.py)."""
    vdoi = (version_doi or "").strip()
    cdoi = (concept_doi or "").strip()
    if not vdoi or vdoi.startswith("TODO"):
        raise ValueError("version_doi must be a real minted DOI (not empty / not a TODO placeholder).")
    entry = next((c for c in lineage["chapters"] if str(c.get("tag")) == tag), None)
    if entry is None:
        raise ValueError("tag '" + tag + "' is not in lineage.json — freeze the chapter first.")
    existing = (entry.get("version_doi") or "").strip()
    if existing and not existing.startswith("TODO") and existing != vdoi:
        raise ValueError("chapter '" + tag + "' already carries version_doi '" + existing
                         + "'. Refusing to overwrite it with a different DOI ('" + vdoi + "') — a "
                         "citable record's DOI must not silently change. If the existing DOI is "
                         "wrong, correct it deliberately by hand-review.")
    changed = False
    if existing != vdoi:
        entry["version_doi"] = vdoi
        changed = True
    if cdoi and not cdoi.startswith("TODO") and (entry.get("concept_doi") or "") != cdoi:
        entry["concept_doi"] = cdoi
        changed = True
    # The chapter is now DOI-archived: a stale honesty flag would keep baking "not DOI-archived".
    if entry.get("doi_archived") is False:
        del entry["doi_archived"]
        changed = True
    return changed


def main():
    ap = argparse.ArgumentParser(description="Write a minted DOI into a chapter's lineage entry.")
    ap.add_argument("--tag", required=True)
    ap.add_argument("--version-doi", dest="version_doi", required=True)
    ap.add_argument("--concept-doi", dest="concept_doi", default="")
    args = ap.parse_args()

    tag = args.tag.strip()
    lineage = load_lineage()
    try:
        changed = apply_doi(lineage, tag, args.version_doi, args.concept_doi)
    except ValueError as e:
        abort(str(e))

    if not changed:
        print("backfill_doi: chapters/%s already current (version_doi=%s) — no change."
              % (tag, args.version_doi.strip()))
        return 0

    write_lineage(lineage)
    print("backfill_doi: wrote version_doi=%s%s into lineage entry for %s."
          % (args.version_doi.strip(),
             (" concept_doi=" + args.concept_doi.strip()) if args.concept_doi.strip() else "", tag))
    print("backfill_doi: now re-skin so live/%s bakes the real DOI:  npm run render-backcatalog" % tag)
    return 0


if __name__ == "__main__":
    sys.exit(main())
