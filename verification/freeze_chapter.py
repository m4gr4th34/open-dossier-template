#!/usr/bin/env python3
"""
freeze_chapter.py — freeze one release as an immutable lineage chapter.

ONE implementation, called by BOTH the release workflow (freeze-chapter.yml) and
the backfill ritual, so the two can never drift. Pure stdlib (no third-party
deps): importing this module pulls nothing heavy and runs nothing — all work is
under main().

A "chapter" is a RELEASE. Freezing copies the four editions of that release into
chapters/<TAG>/ (write-once, immutable like timestamps/), rewires their two
outward-local asset paths to the shared root, and appends the chapter to
lineage.json. The live root pages stay mutable; chapters are the frozen lineage.

Usage:
  python3 verification/freeze_chapter.py \
      --tag v1.0.0 --title "..." --summary "..." --released 2026-01-01 \
      --version-doi "10.5281/zenodo.124" --concept-doi "10.5281/zenodo.123" \
      [--source-dir <dir>]

A chapter (= a release) has TWO DOIs in its provenance.json — version_doi (pinned
to that exact release) and concept_doi (permanent, the whole work). The lineage
entry carries BOTH under their true names; storing a version DOI in the concept
slot (or vice versa) would be a false label in a write-once archive. Each defaults
to "" when absent/sentinel.

  --source-dir defaults to the repo root (the current tree), which is what the
  release workflow uses. The backfill ritual passes a checked-out-tag worktree
  path so an OLD release is frozen exactly as it was at that tag.

Output (chapters/, lineage.json) is always written into THIS repo (resolved from
the script location), regardless of --source-dir.

Aborts loudly (no partial writes) on:
  (a) the placeholder-honesty gate failing for the source snapshot,
  (b) chapters/<TAG>/ already existing (frozen is frozen),
  (c) <TAG> already present in lineage.json (dup).
"""

import argparse
import json
import os
import subprocess
import sys

# Repo root resolved from this file's location: <repo>/verification/freeze_chapter.py
HERE = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(HERE)
LINEAGE = os.path.join(REPO_ROOT, "lineage.json")
CHAPTERS = os.path.join(REPO_ROOT, "chapters")

# The four editions frozen together so their intra-set relative links keep working.
EDITIONS = ["index.html", "paper.html", "dossier.html", "verify.html"]


def abort(msg):
    sys.stderr.write("freeze_chapter: ABORT — " + msg + "\n")
    sys.exit(1)


# --- step 1: honesty gate ----------------------------------------------------

def run_gate(source_dir):
    """Run check_placeholders.py with cwd=source_dir so it judges the snapshot.

    Prefer the source's own gate; if the source predates it (old tag), fall back
    to the current repo's gate so a consistent standard still applies.
    """
    src_gate = os.path.join(source_dir, "verification", "check_placeholders.py")
    own_gate = os.path.join(HERE, "check_placeholders.py")
    if os.path.exists(src_gate):
        gate, note = src_gate, ""
    elif os.path.exists(own_gate):
        gate, note = own_gate, " (source predates the gate; used the current check_placeholders.py)"
    else:
        abort("no check_placeholders.py found to gate the snapshot.")
    proc = subprocess.run(
        [sys.executable, gate],
        cwd=source_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        universal_newlines=True,
    )
    return proc.returncode, proc.stdout, note


# --- step 4: rewire the two outward-local asset patterns ---------------------

def rewire(html):
    """Repoint a frozen chapter's outward-local paths to the live root (../../).

    Two kinds of rewrite:
      - shared ASSETS (katex/, paper/manuscript.pdf, + forward-compat assets/ and
        paper/ images) -> ../../ so the frozen copy uses the single shared root
        copy rather than a missing per-chapter one.
      - cross-edition + lineage NAV links (index/paper/dossier/verify/lineage.html)
        -> ../../ so a sealed chapter is not a navigational dead-end: its nav
        returns the reader to the LIVE series, NOT to its frozen siblings in the
        same dir (frozen chapters are read leaves; navigation happens on the live
        site). This is an UPWARD/ANCESTOR escape only — linking the live lineage
        index is not a forward claim (a sealed chapter still asserts nothing about
        successors), and the lineage STRIP's fetch('lineage.json') is deliberately
        left untouched (it .catch->hides in the subdir, which is intended).

    Leaves absolute URLs (http...) and in-page anchors (#...) alone. Asset rewrites
    handle both quote styles; NAV rewrites are double-quote-only so the strip's
    single-quoted JS href is never touched. Idempotent (each value gains exactly
    one ../../, since the search forms carry no ../). Returns
    (new_html, {pattern: count}).
    """
    reps = []
    for q in ('"', "'"):
        # shared assets that actually exist in the editions today
        reps.append(("href=" + q + "katex/", "href=" + q + "../../katex/"))
        reps.append(("href=" + q + "paper/manuscript.pdf" + q, "href=" + q + "../../paper/manuscript.pdf" + q))
        # forward-compat (only rewritten if present in a future figure-bearing chapter)
        reps.append(("href=" + q + "assets/", "href=" + q + "../../assets/"))
        reps.append(("src=" + q + "assets/", "src=" + q + "../../assets/"))
        reps.append(("src=" + q + "paper/", "src=" + q + "../../paper/"))

    # cross-edition + lineage NAV -> live root. DOUBLE-QUOTE ONLY on purpose: the
    # editions write every HTML attribute with double quotes, whereas the lineage
    # strip's JS uses single quotes (e.g. all.href='lineage.html'). Restricting to
    # double quotes rewrites the real nav links without ever touching that JS.
    # Exact value + closing quote so #anchors / suffixes are never matched. This
    # escapes the reader up to the LIVE series; it is never a forward/successor
    # claim, and the strip's fetch('lineage.json') is left to .catch->hide.
    for page in ("index.html", "paper.html", "dossier.html", "verify.html", "lineage.html"):
        reps.append(('href="' + page + '"', 'href="../../' + page + '"'))

    counts = {}
    for old, new in reps:
        n = html.count(old)
        if n:
            html = html.replace(old, new)
            counts[old] = counts.get(old, 0) + n
    return html, counts


# --- step 5: lineage.json ----------------------------------------------------

def load_lineage():
    if not os.path.exists(LINEAGE):
        abort("lineage.json missing at repo root.")
    try:
        with open(LINEAGE, encoding="utf-8") as fh:
            data = json.load(fh)
    except ValueError as e:
        abort("lineage.json is not valid JSON: " + str(e))
    if not isinstance(data, dict) or not isinstance(data.get("chapters"), list):
        abort('lineage.json must be an object with a "chapters" array.')
    return data


def write_lineage(data):
    with open(LINEAGE, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2, ensure_ascii=False)
        fh.write("\n")


# --- main --------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(description="Freeze a release as a lineage chapter.")
    ap.add_argument("--tag", required=True)
    ap.add_argument("--title", required=True)
    ap.add_argument("--summary", required=True)
    ap.add_argument("--released", required=True, help="YYYY-MM-DD")
    ap.add_argument("--version-doi", dest="version_doi", default="")
    ap.add_argument("--concept-doi", dest="concept_doi", default="")
    ap.add_argument("--source-dir", dest="source_dir", default=REPO_ROOT)
    args = ap.parse_args()

    tag = args.tag.strip()
    source_dir = os.path.abspath(args.source_dir)
    if not tag:
        abort("--tag must be non-empty.")
    if not os.path.isdir(source_dir):
        abort("source dir does not exist: " + source_dir)

    chapter_dir = os.path.join(CHAPTERS, tag)

    # --- early atomic guards (b) + (c): refuse before any writes ---
    lineage = load_lineage()
    if any(str(c.get("tag")) == tag for c in lineage["chapters"]):
        abort("tag '" + tag + "' already present in lineage.json (dup); chapters are immutable.")
    if os.path.exists(chapter_dir):
        abort("chapters/" + tag + "/ already exists; chapters/ is immutable like timestamps/.")

    # --- step 1: GATE ---
    code, out, note = run_gate(source_dir)
    if code != 0:
        sys.stderr.write(out)
        abort("placeholder-honesty gate failed for the snapshot" + note +
              " — a chapter that fails the honesty gate must not be frozen.")
    print("Gate: check_placeholders passed" + note + ".")

    # --- step 3: SNAPSHOT (copy whatever subset of the four exists) ---
    present = [f for f in EDITIONS if os.path.isfile(os.path.join(source_dir, f))]
    missing = [f for f in EDITIONS if f not in present]
    if not present:
        abort("none of the four editions found in source dir: " + source_dir)

    os.makedirs(chapter_dir, exist_ok=False)
    rewired_summary = {}
    for f in present:
        with open(os.path.join(source_dir, f), encoding="utf-8") as fh:
            html = fh.read()
        # --- step 4: REWIRE ---
        html, counts = rewire(html)
        with open(os.path.join(chapter_dir, f), "w", encoding="utf-8") as fh:
            fh.write(html)
        if counts:
            rewired_summary[f] = counts

    # --- step 5: APPEND ---
    n = max((int(c.get("n", 0)) for c in lineage["chapters"]), default=0) + 1
    # Both DOIs, each under its true name (mirrors provenance.json): version_doi
    # pins this exact release; concept_doi is the permanent all-versions pointer.
    # Both default "" when absent/sentinel — no placeholders in the archive.
    entry = {
        "n": n,
        "tag": tag,
        "title": args.title,
        "summary": args.summary,
        "released": args.released,
        "version_doi": args.version_doi,
        "concept_doi": args.concept_doi,
        "path": "chapters/" + tag + "/",
    }
    lineage["chapters"].append(entry)
    lineage["chapters"].sort(key=lambda c: int(c.get("n", 0)))
    write_lineage(lineage)

    # --- step 6: SUMMARY ---
    print("Frozen chapter n=" + str(n) + " (" + tag + ") -> " + os.path.relpath(chapter_dir, REPO_ROOT) + "/")
    print("  editions frozen : " + ", ".join(present))
    if missing:
        print("  editions MISSING: " + ", ".join(missing) + " (copied the subset that existed)")
    if rewired_summary:
        for f, counts in rewired_summary.items():
            bits = ", ".join(k + "->../../ x" + str(v) for k, v in counts.items())
            print("  rewired " + f + ": " + bits)
    else:
        print("  rewired: (no outward-local asset paths found to rewire)")
    print("  lineage.json: appended " + json.dumps(entry, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
