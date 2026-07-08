#!/usr/bin/env python3
"""
freeze_chapter.py — freeze one release as an immutable lineage chapter.

ONE implementation, called by BOTH the release workflow (freeze-chapter.yml) and
the backfill ritual, so the two can never drift. Pure stdlib (no third-party
deps): importing this module pulls nothing heavy and runs nothing — all work is
under main().

A "chapter" is a RELEASE. Freezing copies the three editions of that release into
chapters/<TAG>/ (write-once, immutable like timestamps/), rewires their two
outward-local asset paths to the shared root, and appends the chapter to
lineage.json. It ALSO seals, verbatim (no rewire/label-bake), the chapter's content
source + skin and its pre-built markdown projection (CAPTURE_VERBATIM), so the chapter
can be re-skinned or read as clean text later without re-rendering the frozen editions.
The live root pages stay mutable; chapters are the frozen lineage.

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
import re
import subprocess
import sys

# --- verdict extractor (shared by freeze step 3c AND verification/seal_verdicts.py) ----------
# A chapter's console verdict is a function of avenues.json AND the verifier CODE. Freeze seals
# avenues.json but not the verifier, so a back-catalog re-skin that re-ran the CURRENT verifier
# against OLD avenues would bake the wrong check-set onto an old chapter — a false label. We seal
# the verdict itself, extracted from the chapter's own sealed index.md (a projection of the SAME
# verifier run that baked this chapter), reproducing render_markdown.runVerifier()'s shape exactly:
#   { "checks": [ { "status": "PASS"|"FAIL", "label": str } ], "tally": str, "summary": str|None }
def verdict_from_index_md(md):
    lines = md.split("\n")
    try:
        start = next(i for i, l in enumerate(lines) if l.strip() == "## Consistency checks")
    except StopIteration:
        raise ValueError("index.md has no '## Consistency checks' section")
    checks, tally, summary = [], None, None
    for l in lines[start + 1:]:
        if l.startswith("## "):                       # next section -> stop
            break
        m = re.match(r"^- \[(PASS|FAIL)\] (.+)$", l)
        if m:
            checks.append({"status": m.group(1), "label": m.group(2)})
            continue
        t = re.match(r"^\*\*TOTAL: (.+?)\*\*(?: — (.+))?$", l)
        if t:
            tally = t.group(1).strip()
            summary = (t.group(2) or "").strip() or None
            break                                     # checks precede TOTAL; nothing after it is the verdict
    if not checks or not tally:
        raise ValueError("could not parse checks/tally from index.md console section")
    return {"checks": checks, "tally": tally, "summary": summary}

# Repo root resolved from this file's location: <repo>/verification/freeze_chapter.py
HERE = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(HERE)
LINEAGE = os.path.join(REPO_ROOT, "lineage.json")
CHAPTERS = os.path.join(REPO_ROOT, "chapters")

# The three editions (index.html, dossier.html, verify.html) frozen together so their intra-set relative links keep working.
EDITIONS = ["index.html", "dossier.html", "verify.html"]

# Sealed VERBATIM (no rewire/label-bake): the chapter's own notarized content source
# + skin, its pre-built CI-gated markdown projection, and its own avenue data (avenues.json).
# These let the chapter be re-skinned, read as clean text, and re-bake / verify its machinery
# from its OWN sealed data (verify_numbers.py --avenues) — without re-rendering the frozen editions.
CAPTURE_VERBATIM = ["editions/index.source.html", "editions/dossier.source.html", "editions/verify.source.html", "editions/lineage.source.html", "skin/edition.html", "index.md", "avenues.json"]


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
      - shared ASSETS: katex/ and forward-compat assets/ links, plus EVERY
        relative <img> src (figures at ANY path, via rewire_img_src) -> ../../
        so the frozen copy uses the single shared root copy rather than a
        missing per-chapter one.
      - SERIES-LEVEL NAV: lineage.html -> ../../ ONLY. A sealed chapter ships its
        own editions (index/dossier/verify.html) as siblings in chapters/<tag>/,
        so their nav is LEFT BARE and resolves to those sealed siblings — a reader
        inside a DOI'd snapshot stays inside it when moving between its own
        editions. Only lineage.html escapes ../../: there is no per-chapter copy
        (chapters/<tag>/lineage.html 404s) and the lineage index is a series-level
        view, not part of the sealed snapshot. This REVERSES the earlier "frozen
        chapters are read leaves, escape to the live series" rule — pointing a
        sealed page's own nav at the mutable live tip silently walked the reader
        out of the notarized snapshot, a seal-honesty break rather than a
        convenience. Linking the live lineage index is still not a forward/
        successor claim (a sealed chapter asserts nothing about successors), and
        the lineage STRIP's fetch('lineage.json') is deliberately left untouched
        (it .catch->hides in the subdir, which is intended).

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
        # forward-compat (only rewritten if present in a future figure-bearing chapter)
        reps.append(("href=" + q + "assets/", "href=" + q + "../../assets/"))

    # DOUBLE-QUOTE ONLY on purpose: the editions write every HTML attribute with
    # double quotes, whereas the lineage strip's JS uses single quotes
    # (e.g. all.href='lineage.html'). Restricting to double quotes rewrites the real
    # nav link without ever touching that JS; exact value + closing quote so
    # #anchors / suffixes are never matched. The strip's fetch('lineage.json') is
    # left to .catch->hide. (paper.html was a retired redirect stub, never rewritten.)
    # Series-level nav ONLY escapes to the live root. lineage.html has no per-chapter
    # copy (chapters/<tag>/lineage.html 404s), so it must point ../../ at the live series.
    # index/dossier/verify.html are LEFT BARE on purpose: each frozen chapter ships its
    # own sealed siblings in chapters/<tag>/, and a reader inside the DOI'd snapshot must
    # stay inside it when moving between its own editions — never be silently walked into
    # the mutable live draft. Bare hrefs already resolve to those siblings.
    reps.append(('href="lineage.html"', 'href="../../lineage.html"'))

    counts = {}
    for old, new in reps:
        n = html.count(old)
        if n:
            html = html.replace(old, new)
            counts[old] = counts.get(old, 0) + n

    # BUG-2 fix: generalize figure-image rewiring beyond the old assets//paper/
    # src prefixes. A figure can live at ANY relative path; rewrite every <img>
    # whose src is relative so it resolves from chapters/<tag>/ at the live root.
    html, nimg = rewire_img_src(html)
    if nimg:
        counts["<img> relative src"] = nimg

    # P5: same generalization for the living-figures RUNTIME. A sealed figure
    # loads it via <script src="figures/figures.js"> (+ orrery/galaxy/cosmiczoom);
    # from chapters/<tag>/ that relative path 404s, so repoint every relative
    # <script src> to the shared live root, exactly as <img> is handled.
    html, nscript = rewire_script_src(html)
    if nscript:
        counts["<script> relative src"] = nscript
    return html, counts


def rewire_img_src(html):
    """Repoint RELATIVE <img> src values to the live root (../../X).

    BUG-2 fix: the old rewire only repathed the src="assets/" and src="paper/"
    PREFIXES, so a figure at any other relative path (src="figures/x.png",
    src="verification/a/b.png", a bare src="x.png", ...) 404'd from the
    chapters/<tag>/ subdir. This rewrites EVERY <img> whose src is relative.

    Left untouched (so it is safe and idempotent): absolute URLs (http://,
    https://), protocol-relative (//) and root-absolute (/) paths, in-page
    #anchors, data: URIs, and already-../-prefixed values. The lightbox
    <img id="lbx-img"> ships with NO src (filled at runtime), so the pattern
    never matches it. Only the plain `src` attribute is touched — `srcset`,
    `data-src`, etc. are ignored (the boundary requires whitespace before src).
    Handles both quote styles. Returns (new_html, count)."""
    SKIP = ("http://", "https://", "//", "/", "#", "data:", "../")
    changed = [0]  # count ACTUAL rewrites, not bare pattern matches

    def repl(m):
        head, quote, val = m.group(1), m.group(2), m.group(3)
        if (not val) or val.startswith(SKIP):
            return m.group(0)
        changed[0] += 1
        return head + quote + "../../" + val + quote

    pat = re.compile(r'(<img\b[^>]*?\ssrc=)(["\'])(.*?)\2', re.IGNORECASE)
    return pat.sub(repl, html), changed[0]


def rewire_script_src(html):
    """Repoint RELATIVE <script src> values to the live root (../../X).

    P5: the living-figures runtime is loaded as <script src="figures/figures.js">
    (+ orrery.js / galaxy.js / cosmiczoom.js). From a frozen chapters/<tag>/ subdir
    that relative path 404s, so — exactly as rewire_img_src does for figures —
    rewrite EVERY <script> whose src is relative to resolve from the single shared
    runtime at the live root.

    Left untouched (so it is safe and idempotent), via the SAME SKIP set as the
    <img> rule: absolute URLs (http://, https://), protocol-relative (//) and
    root-absolute (/) paths, in-page #anchors, data: URIs, and already-../-prefixed
    values. Inline <script> blocks (the provenance/lineage JS, the ?embed toggle)
    carry NO src=, so the pattern never matches them. Only the plain `src`
    attribute is touched (the boundary requires whitespace before src). Handles
    both quote styles. Returns (new_html, count)."""
    SKIP = ("http://", "https://", "//", "/", "#", "data:", "../")
    changed = [0]  # count ACTUAL rewrites, not bare pattern matches

    def repl(m):
        head, quote, val = m.group(1), m.group(2), m.group(3)
        if (not val) or val.startswith(SKIP):
            return m.group(0)
        changed[0] += 1
        return head + quote + "../../" + val + quote

    pat = re.compile(r'(<script\b[^>]*?\ssrc=)(["\'])(.*?)\2', re.IGNORECASE)
    return pat.sub(repl, html), changed[0]


def bake_release_label(html, tag):
    """BUG-1 fix: bake the sealed release label into the #pv-state element.

    A frozen chapters/<tag>/ page has no adjacent provenance.json, so its
    provenance fetch 404s; the .catch resets the DOI item but NEVER pv-state,
    leaving the baked-in "live tip" default — a sealed chapter wrongly reading
    "live". Rewriting the element's inner text at freeze time makes the label
    correct ("release <TAG>") with NO script and NO fetch.

    Targets the element by its double-quoted id="pv-state" attribute (the live
    fetch script's getElementById('pv-state') uses single quotes and is never
    matched). Replaces only the inner content, leaving the rest of the bar
    intact. Returns (new_html, count)."""
    pat = re.compile(r'(id="pv-state"[^>]*>).*?(</span>)')
    return pat.subn(lambda m: m.group(1) + "release " + tag + m.group(2), html, count=1)


def bake_doi_chip(html, version_doi, doi_archived):
    """Bake the sealed DOI state into the #pv-doi chip so a frozen page shows the truth
    with NO script and NO fetch.

    A frozen chapters/<tag>/ (or reskinned live/<tag>/) page ships no adjacent
    provenance.json — its fetch 404s and the skin's .catch resets the DOI item to a generic
    "see repository". That erases a real DOI, or (worse) implies an archive that a
    doi_archived:false chapter never had. But a sealed chapter's DOI state is a STATIC FACT,
    so bake it here and mark the anchor data-doi-baked="1" (the skin's .catch now leaves a
    baked chip alone -> the honest state survives every JS-on load, not just JS-off):

      real version_doi   -> href https://doi.org/<doi>,  text "<doi> ↗"
      doi_archived false -> href verify.html,            text "not DOI-archived ↗"
                            (the skin's own honest no-DOI wording + target, VERBATIM; verify.html
                             is a sealed sibling in chapters/<tag>/ and live/<tag>/, so it resolves)
      neither knowable   -> bake nothing (the generic .catch fallback stands)

    Mirrors bake_release_label: targets the double-quoted static attrs id="pv-doi" /
    id="pv-doi-v" (the fetch script's single-quoted getElementById is never matched).
    Returns (new_html, count)."""
    version_doi = (version_doi or "").strip()
    if version_doi and not version_doi.startswith("TODO"):
        href, text = "https://doi.org/" + version_doi, version_doi + " ↗"
    elif doi_archived == "false":
        href, text = "verify.html", "not DOI-archived ↗"
    else:
        return html, 0
    # 1) the anchor: replace the static href="#" with the sealed href and flag it baked
    a_pat = re.compile(r'(<a\b[^>]*\bid="pv-doi"[^>]*?)href="[^"]*"([^>]*>)')
    html, na = a_pat.subn(
        lambda m: m.group(1) + 'href="' + href + '" data-doi-baked="1"' + m.group(2),
        html, count=1)
    # 2) the value span's inner text
    v_pat = re.compile(r'(id="pv-doi-v"[^>]*>).*?(</span>)')
    html, nv = v_pat.subn(lambda m: m.group(1) + text + m.group(2), html, count=1)
    return html, min(na, nv)


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
    ap.add_argument("--doi-archived", dest="doi_archived", default="")
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

    # --- step 3: SNAPSHOT (copy whatever subset of the three exists) ---
    present = [f for f in EDITIONS if os.path.isfile(os.path.join(source_dir, f))]
    missing = [f for f in EDITIONS if f not in present]
    if not present:
        abort("none of the three editions (index.html, dossier.html, verify.html) "
              "found in source dir: " + source_dir)

    os.makedirs(chapter_dir, exist_ok=False)
    rewired_summary = {}
    baked_labels = []
    baked_dois = []
    for f in present:
        with open(os.path.join(source_dir, f), encoding="utf-8") as fh:
            html = fh.read()
        # --- step 4: REWIRE paths + BAKE the sealed release label + BAKE the DOI chip ---
        html, counts = rewire(html)
        html, nlabel = bake_release_label(html, tag)
        if nlabel:
            baked_labels.append(f)
        html, ndoi = bake_doi_chip(html, args.version_doi, args.doi_archived)
        if ndoi:
            baked_dois.append(f)
        with open(os.path.join(chapter_dir, f), "w", encoding="utf-8") as fh:
            fh.write(html)
        if counts:
            rewired_summary[f] = counts

    # --- step 3b: SEAL the verbatim build inputs (content source + skin) and the
    #     pre-built, CI-gated markdown projection — RAW bytes, relative path preserved,
    #     NO rewire() and NO bake_release_label(). These are the chapter's notarized
    #     content source and its clean-text reading copy, sealed exactly as built on main
    #     (so the chapter can be re-skinned / read as text later without re-rendering the
    #     frozen editions). Same present/missing subset handling as the editions above.
    cap_present = [f for f in CAPTURE_VERBATIM if os.path.isfile(os.path.join(source_dir, f))]
    cap_missing = [f for f in CAPTURE_VERBATIM if f not in cap_present]
    for rel in cap_present:
        dst = os.path.join(chapter_dir, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        with open(os.path.join(source_dir, rel), "rb") as fh:
            raw = fh.read()
        with open(dst, "wb") as fh:
            fh.write(raw)

    # --- step 3c: SEAL THE VERDICT (derived, NOT verbatim) -----------------------
    # See verdict_from_index_md above for why. Only a chapter that carries machinery
    # (sealed index.md + avenues.json) gets a verdict; pre-split chapters are skipped,
    # matching "pre-split chapters are not retrofitted".
    if "index.md" in cap_present and "avenues.json" in cap_present:
        with open(os.path.join(chapter_dir, "index.md"), encoding="utf-8") as fh:
            verdict = verdict_from_index_md(fh.read())
        with open(os.path.join(chapter_dir, "verdict.json"), "w", encoding="utf-8") as fh:
            json.dump(verdict, fh, ensure_ascii=False, indent=2)
            fh.write("\n")

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
    # Sparse: only a chapter that DELIBERATELY declared no DOI (provenance doi_archived:false)
    # carries this key. A DOI'd chapter (or any pre-feature chapter) omits it entirely, so its
    # lineage entry is byte-identical to before. The string "false" arrives from the workflow's
    # jq read; convert to a real JSON boolean so lineage.source.html's `=== false` strict check fires.
    if args.doi_archived == "false":
        entry["doi_archived"] = False
    lineage["chapters"].append(entry)
    lineage["chapters"].sort(key=lambda c: int(c.get("n", 0)))
    write_lineage(lineage)

    # --- step 6: SUMMARY ---
    print("Frozen chapter n=" + str(n) + " (" + tag + ") -> " + os.path.relpath(chapter_dir, REPO_ROOT) + "/")
    print("  editions frozen : " + ", ".join(present))
    if missing:
        print("  editions MISSING: " + ", ".join(missing) + " (copied the subset that existed)")
    if cap_present:
        print("  sealed verbatim : " + ", ".join(cap_present) + " (raw bytes; no rewire/label-bake)")
    if cap_missing:
        print("  verbatim MISSING: " + ", ".join(cap_missing) + " (sealed the subset that existed)")
    if rewired_summary:
        for f, counts in rewired_summary.items():
            bits = ", ".join(k + "->../../ x" + str(v) for k, v in counts.items())
            print("  rewired " + f + ": " + bits)
    else:
        print("  rewired: (no outward-local asset paths found to rewire)")
    if baked_labels:
        print("  pv-state baked 'release " + tag + "' in: " + ", ".join(baked_labels))
    if baked_dois:
        state = ("DOI " + args.version_doi) if (args.version_doi or "").strip() and not (args.version_doi or "").strip().startswith("TODO") else "not DOI-archived"
        print("  pv-doi  baked '" + state + "' in: " + ", ".join(baked_dois))
    print("  lineage.json: appended " + json.dumps(entry, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    # --reskin <tag>: read HTML on stdin, apply the SAME outward-rewire (../../) + sealed
    # release-label bake freeze applies to a chapter's editions, and write to stdout. Used by
    # render_backcatalog.js so a live/<tag>/ re-skin (one level deep, exactly like chapters/<tag>/)
    # resolves shared assets/nav from the live root and its provenance bar reads "release <tag>",
    # never the live default. REUSES rewire()/bake_release_label() — one implementation, so the
    # current-skin reading view can never drift from the frozen record's chrome transform.
    if len(sys.argv) >= 3 and sys.argv[1] == "--reskin":
        # --reskin <tag> [version_doi] [doi_archived]: render_backcatalog.js forwards the DOI
        # state from the chapter's OWN lineage.json entry so live/<tag>/ bakes the identical chip
        # the freeze path bakes (one bake_doi_chip implementation -> the reading view's DOI chip
        # can never drift from the frozen record's).
        html = sys.stdin.read()
        html, _ = rewire(html)
        # live/<tag>/ now ships the FULL edition set (index/dossier/verify.html) as siblings,
        # exactly like chapters/<tag>/. So a reskinned edition's dossier/verify nav resolves to
        # its sibling reskin via the BARE href rewire() already leaves — no retarget. This
        # COLLAPSES the reskin transform back to (rewire + bake_release_label), byte-identical to
        # the freeze path's per-edition transform: one transform, no divergence. (Reverses the
        # earlier index-only retarget, which existed only because live/<tag>/ shipped index alone;
        # that precondition is gone now that all three editions are reskinned. lineage.html still
        # escapes ../../ via rewire() — series-level, never a per-chapter sibling.)
        html, _ = bake_release_label(html, sys.argv[2])
        reskin_vdoi = sys.argv[3] if len(sys.argv) >= 4 else ""
        reskin_darch = sys.argv[4] if len(sys.argv) >= 5 else ""
        html, _ = bake_doi_chip(html, reskin_vdoi, reskin_darch)
        sys.stdout.write(html)
        sys.exit(0)
    sys.exit(main())
