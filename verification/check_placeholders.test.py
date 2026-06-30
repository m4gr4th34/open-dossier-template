#!/usr/bin/env python3
"""
check_placeholders.test.py — author-local test for the placeholder-honesty gate.

Exercises check_placeholders.py WITHOUT touching the repo: every case builds a
hermetic tmpdir fixture (its own provenance.json / README.md / publication
surfaces) and drives the gate's INJECTABLE seam (main/is_released/scan accept
defaulted path params, added in R1). The same author-local discipline as
figures/figures.test.js and render_math.js: run it on your machine with Python;
it is NEVER run by CI (the stdlib-only verify floor stays untouched).

  python3 verification/check_placeholders.test.py

Stdlib only (no install). Prints PASS/FAIL per case and exits non-zero on ANY
failure (fail-loud). ZERO repo mutation: all fixtures live under tempfile.mkdtemp
and are rmtree'd at the end; the gate is only ever pointed at those temp paths,
never at the repo's own provenance.json / README.md / surfaces.

Two layers:
  - INTEGRATION (A-H): the 8 adversarial cases, asserting main()'s RETURN int
    (0 = pass, 1 = released+placeholder fail) — the same matrix proven live in
    the ephemeral red-team, now hermetic and repeatable.
  - UNIT (U1-U8): is_released / scan / the sentinel predicate in isolation, so
    the released-branch and each release signal are exercised independently of
    the surface scan (the gap the live audit flagged: H passes via the zero-hits
    short-circuit, so the released predicate wasn't distinctly asserted there).
"""
import contextlib
import io
import json
import os
import shutil
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import check_placeholders as c  # noqa: E402  (after sys.path injection, by design)

# --- hand-rolled fail-loud harness (mirrors figures.test.js's check()) --------
FAILURES = []


def check(name, cond):
    print(("  PASS  " if cond else "  FAIL  ") + name)
    if not cond:
        FAILURES.append(name)


# --- hermetic fixtures: tmpdir only, tracked for guaranteed teardown ----------
TMPDIRS = []


def make_fixture(provenance=None, readme_text=None, surfaces=None):
    """Build a throwaway dir with optional provenance.json / README.md / surfaces.

    Returns (dir, prov_path, readme_path, surface_paths). When provenance is None
    the prov_path still points at a (nonexistent) provenance.json so the gate's
    FileNotFoundError->{} path is exercised; when readme_text is None the
    readme_path points at a nonexistent file (so _banner_absent reads True).
    surfaces is a {filename: content} map written into the dir.
    """
    d = tempfile.mkdtemp(prefix="cptest-")
    TMPDIRS.append(d)
    prov_path = os.path.join(d, "provenance.json")
    if provenance is not None:
        with open(prov_path, "w", encoding="utf-8") as fh:
            json.dump(provenance, fh, indent=2)
    if readme_text is not None:
        readme_path = os.path.join(d, "README.md")
        with open(readme_path, "w", encoding="utf-8") as fh:
            fh.write(readme_text)
    else:
        readme_path = os.path.join(d, "NOREADME")  # absent -> banner reads gone
    surface_paths = []
    for name, content in (surfaces or {}).items():
        p = os.path.join(d, name)
        with open(p, "w", encoding="utf-8") as fh:
            fh.write(content)
        surface_paths.append(p)
    return d, prov_path, readme_path, surface_paths


def run_main(prov_path, readme, surfaces):
    """Call the gate's main() against injected paths; capture (return_int, printed)."""
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        rc = c.main(prov_path=prov_path, readme=readme, surfaces=surfaces)
    return rc, buf.getvalue()


# --- fixture material ---------------------------------------------------------
SCAFFOLD = {
    "release_tag": "v0.0.0",
    "version_doi": "TODO-AFTER-FIRST-RELEASE",
    "concept_doi": "TODO-AFTER-FIRST-RELEASE",
    "released": "YYYY-MM-DD",
}
BANNER = "# Title\n\n### Live preview (work in progress)\n> active draft.\n"
NOBANNER = "# Title\n\n### Live document\n> released.\n"
SENTINEL_HTML = "<h1>@@TITLE@@</h1>\n<p>PLACEHOLDER body</p>\n"
CLEAN_HTML = "<h1>A Fully Filled Title</h1>\n<p>real content, no fill-ins</p>\n"


def _released(**over):
    p = dict(SCAFFOLD)
    p.update(over)
    return p


# =====================================================================
# INTEGRATION LAYER — the 8 adversarial cases (assert main() return int)
# =====================================================================
def integration():
    print("\n-- integration (A-H): main() return value --")

    # A: released via release_tag, placeholder survives -> FAIL (1)
    _, prov, rdm, surf = make_fixture(_released(release_tag="v1.0.0"), BANNER,
                                      {"index.html": SENTINEL_HTML})
    rc, _out = run_main(prov, rdm, surf)
    check("A released via release_tag + sentinel -> main==1", rc == 1)

    # B: released via concept_doi (tag stays scaffold) -> FAIL (1)
    _, prov, rdm, surf = make_fixture(_released(concept_doi="10.5281/zenodo.123"), BANNER,
                                      {"index.html": SENTINEL_HTML})
    rc, _out = run_main(prov, rdm, surf)
    check("B released via concept_doi + sentinel -> main==1", rc == 1)

    # C: released via banner-absent (provenance scaffold) -> FAIL (1)
    _, prov, rdm, surf = make_fixture(SCAFFOLD, NOBANNER, {"index.html": SENTINEL_HTML})
    rc, _out = run_main(prov, rdm, surf)
    check("C released via banner-gone + sentinel -> main==1", rc == 1)

    # D: full release, sentinel only in a non-HTML surface; report names it -> FAIL (1)
    _, prov, rdm, surf = make_fixture(
        _released(release_tag="v1.0.0", concept_doi="10.5281/zenodo.123"),
        NOBANNER, {".zenodo.json": '{ "title": "DOSSIER NNN @@TITLE@@" }\n'})
    rc, out = run_main(prov, rdm, surf)
    check("D full release, sentinel in .zenodo.json -> main==1", rc == 1)
    check("D report names the non-HTML surface + sentinel",
          ".zenodo.json" in out and "@@TITLE@@" in out)

    # E: NIGHTMARE — released + placeholder version_doi, provenance is ALSO a
    #    scanned surface (so the TODO is a content hit) -> FAIL (1)
    _, prov, rdm, _ = make_fixture(_released(release_tag="v1.0.0"), BANNER, {})
    rc, out = run_main(prov, rdm, [prov])   # provenance.json passed as prov_path AND surface
    check("E released + placeholder version_doi (provenance self-scan) -> main==1", rc == 1)
    check("E report names provenance.json + the TODO sentinel",
          "provenance.json" in out and "TODO-AFTER-FIRST-RELEASE" in out)

    # F: tamper-resist — banner gone latches release despite tag reverted to scaffold -> FAIL (1)
    _, prov, rdm, surf = make_fixture(SCAFFOLD, NOBANNER, {"index.html": SENTINEL_HTML})
    rc, out = run_main(prov, rdm, surf)
    check("F banner-gone latches despite scaffold tag -> main==1", rc == 1)
    check("F report attributes release to the banner signal",
          "banner is gone" in out)

    # G: version_doi-only is NOT a release driver -> PASS (0, warnings-only)
    _, prov, rdm, surf = make_fixture(_released(version_doi="10.5281/zenodo.999"), BANNER,
                                      {"index.html": SENTINEL_HTML})
    rc, out = run_main(prov, rdm, surf)
    check("G version_doi-only -> pre-release -> main==0", rc == 0)
    check("G report says PRE-RELEASE", "PRE-RELEASE" in out)

    # H: clean + released -> PASS (0)
    _, prov, rdm, surf = make_fixture(
        _released(release_tag="v1.0.0", version_doi="10.5281/zenodo.999",
                  concept_doi="10.5281/zenodo.123"),
        NOBANNER, {"index.html": CLEAN_HTML})
    rc, out = run_main(prov, rdm, surf)
    check("H clean + released -> main==0", rc == 0)
    check("H report says OK (no sentinels)", "OK" in out)


# =====================================================================
# UNIT LAYER — is_released / scan / predicate, independent of the scan
# =====================================================================
def unit():
    print("\n-- unit (U1-U8): predicates in isolation --")

    # U1: real tag -> released, release_tag signal present.
    _, prov, rdm, _ = make_fixture(_released(release_tag="v1.0.0"), None, {})
    rel, sig = c.is_released(prov_path=prov, readme=rdm)
    check("U1 real tag -> released + 'release_tag is set' signal",
          rel is True and any("release_tag is set" in s for s in sig))

    # U2: concept_doi real, tag scaffold, banner present -> released via concept only.
    _, prov, rdm, _ = make_fixture(_released(concept_doi="10.5281/zenodo.123"), BANNER, {})
    rel, sig = c.is_released(prov_path=prov, readme=rdm)
    check("U2 concept_doi -> released, no release_tag signal",
          rel is True and any("concept_doi is a real DOI" in s for s in sig)
          and not any("release_tag" in s for s in sig))

    # U3: full scaffold + banner present -> genuine pre-release, no signals.
    _, prov, rdm, _ = make_fixture(SCAFFOLD, BANNER, {})
    rel, sig = c.is_released(prov_path=prov, readme=rdm)
    check("U3 scaffold + banner -> pre-release (False, [])", rel is False and sig == [])

    # U4: scaffold prov, banner removed -> released via banner-absent alone.
    _, prov, rdm, _ = make_fixture(SCAFFOLD, NOBANNER, {})
    rel, sig = c.is_released(prov_path=prov, readme=rdm)
    check("U4 banner-gone is the ONLY signal",
          rel is True and sig == ["README draft-preview banner is gone"])

    # U5: version_doi real, tag+concept scaffold, banner present -> NOT a driver.
    _, prov, rdm, _ = make_fixture(_released(version_doi="10.5281/zenodo.999"), BANNER, {})
    rel, sig = c.is_released(prov_path=prov, readme=rdm)
    check("U5 version_doi is not a release driver (False, [])", rel is False and sig == [])

    # U6: _banner_absent multi-occurrence contract.
    _, _p, present_once, _ = make_fixture(SCAFFOLD, "a work in progress note\n", {})
    _, _p2, absent, _ = make_fixture(SCAFFOLD, NOBANNER, {})
    check("U6 one 'work in progress' occurrence -> banner NOT absent",
          c._banner_absent(present_once) is False)
    check("U6 zero occurrences -> banner absent",
          c._banner_absent(absent) is True)

    # U7: scan isolation (independent of release state).
    _, _p, _r, clean = make_fixture(None, None, {"x.html": CLEAN_HTML})
    _, _p, _r, dirty = make_fixture(None, None,
                                    {"y.html": "line @@FOO@@\nline PLACEHOLDER\n"})
    check("U7 scan(clean) -> no hits", c.scan(surfaces=clean) == [])
    dirty_hits = c.scan(surfaces=dirty)
    found = {h[2] for h in dirty_hits}
    check("U7 scan(dirty) -> names @@FOO@@ regex hit AND PLACEHOLDER literal",
          "@@FOO@@" in found and "PLACEHOLDER" in found)

    # U8: _looks_like_sentinel — the helper the whole release logic rests on.
    check("U8 empty -> sentinel", c._looks_like_sentinel("") is True)
    check("U8 'TODO-x' -> sentinel", c._looks_like_sentinel("TODO-x") is True)
    check("U8 'v1.0.0' -> not sentinel", c._looks_like_sentinel("v1.0.0") is False)
    check("U8 real DOI -> not sentinel", c._looks_like_sentinel("10.5281/zenodo.1") is False)


def main():
    print("check_placeholders.test — hermetic adversarial + unit suite\n")
    try:
        integration()
        unit()
    finally:
        for d in TMPDIRS:
            shutil.rmtree(d, ignore_errors=True)
    total = len(FAILURES)
    print("\n" + ("ALL PASS" if total == 0 else f"{total} FAILURE(S): " + "; ".join(FAILURES)))
    return 1 if total else 0


if __name__ == "__main__":
    sys.exit(main())
