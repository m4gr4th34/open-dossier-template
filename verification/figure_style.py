#!/usr/bin/env python3
"""Author-local figure styling so generated plots match the dossier page.

NOT used by CI (which is stdlib-only — see .github/workflows/verify.yml). The
matplotlib import is LAZY (inside apply_dossier_style), so importing this module
never pulls matplotlib and can never break the stdlib-only CI floor.

Run locally (with matplotlib installed) to generate on-brand figures:
    from verification.figure_style import apply_dossier_style, TITLE_FONT
    plt = apply_dossier_style()
    fig, ax = plt.subplots()
    ax.plot([0, 1, 2], [1, 3, 2])
    ax.set_title("My result", fontfamily=TITLE_FONT)  # Spectral title…
    ax.set_xlabel("x")                                # …ticks/labels stay IBM Plex Mono

Note on the title font: matplotlib has no per-title font-family rcParam (only
axes.titlesize / titleweight / titlecolor / …). Setting font.family globally
would also flip ticks and labels off IBM Plex Mono, which we don't want. So the
display font (Spectral) is applied per-title via fontfamily=TITLE_FONT (see the
demo below); everything else comes from dossier.mplstyle.
"""
import os

_STYLE = os.path.join(os.path.dirname(__file__), "dossier.mplstyle")

# The page uses Spectral for display/titles and IBM Plex Mono for data/labels.
# Pass this to ax.set_title(..., fontfamily=TITLE_FONT). matplotlib substitutes
# silently if Spectral isn't installed — no crash.
TITLE_FONT = "Spectral"


def apply_dossier_style(title_font="Spectral"):
    """Apply the shared Dossier matplotlib style and return pyplot.

    matplotlib is imported lazily here so merely importing this module stays
    cheap and CI-safe. Never hard-fails if Spectral / IBM Plex Mono aren't
    installed — matplotlib substitutes a default face silently.
    """
    global TITLE_FONT
    TITLE_FONT = title_font

    import matplotlib as mpl            # lazy: keeps module import CI-safe
    import matplotlib.pyplot as plt

    mpl.style.use(_STYLE)

    # Make the display font discoverable for titles where installed; harmless if
    # absent (matplotlib falls back without raising).
    try:
        serif = list(mpl.rcParams.get("font.serif", []))
        if title_font not in serif:
            mpl.rcParams["font.serif"] = [title_font] + serif
    except Exception:
        pass

    return plt


if __name__ == "__main__":
    # Author-run demo (NOT CI): writes figure_style_demo.png so you can eyeball
    # on-brand output. Uses the stdlib `math` module for the demo data — no
    # numpy — so it runs with matplotlib alone.
    import math

    plt = apply_dossier_style()
    xs = [i / 8.0 for i in range(0, 49)]          # 0.0 … 6.0
    s1 = [math.sin(x) for x in xs]
    s2 = [math.cos(x) for x in xs]

    fig, ax = plt.subplots(figsize=(6, 3.4))
    ax.plot(xs, s1, label="sin")
    ax.plot(xs, s2, label="cos")
    ax.set_title("Dossier figure style — demo", fontfamily=TITLE_FONT)
    ax.set_xlabel("x")
    ax.set_ylabel("value")
    ax.legend()

    out = os.path.join(os.path.dirname(__file__), "figure_style_demo.png")
    fig.savefig(out, bbox_inches="tight")
    print("wrote", out)
