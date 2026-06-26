# `figures/` — the living-figures runtime (vendored, first-party)

Small, self-contained interactive/animated SVG figures for a dossier's editions.
Everything here is **vendored, zero-dependency, reader-side static code** — the
same discipline as `katex/`: no CDN, no remote bundles, no third-party runtime
packages. **None of it is ever executed by CI** (the stdlib-only verify floor
stays untouched).

## Files

| File | Role |
|---|---|
| `figures.js` | The runtime **floor** — shared primitives every figure leans on. Exposes `window.DossierFigures`. Pinned by `FIGURES_RUNTIME_VERSION`. |
| `figures.test.js` | Author-local Node test for the primitives (`node figures/figures.test.js`). Never run by CI. |
| `orrery.js` | A render module that **composes** the primitives into a Keplerian zoom-orrery. Extends `DossierFigures` with `renderOrrery(container, spec)`. |
| `galaxy.js` | A render module that **composes** the primitives into a procedural spiral galaxy (statistical structure, ~10-order zoom, per-scale cull). Extends `DossierFigures` with `renderGalaxy(container, spec)`. |

## Versioning (how we pin our own code)

`FIGURES_RUNTIME_VERSION` in `figures.js` is the pin for this runtime, recorded
in the file itself — the same way `package.json` pins `katex@0.16.47`. A frozen
chapter therefore permanently records which runtime rendered its figures. Bump
it on any behavioural change to a primitive.

## The model: floor / source / ceiling

- **FLOOR** — this vendored runtime (`figures.js`): the primitives.
- **SOURCE** — each figure's parameters, authored as data (the source of truth).
- **CEILING** — the rendered, committed figure a reader sees; no live fetches.

## The `data-figure` convention (parallel to `data-tex` for math)

A living figure is authored as a `<figure>` carrying a tiny JSON spec in a
`data-figure` attribute — the **visible, AI-editable source of truth**, exactly
as `data-tex` carries LaTeX:

```html
<figure class="living-figure" data-figure='{ ...spec json... }'>
  <!-- Phase 3 prerenders a sealed <svg> poster here; for now JS renders into it -->
</figure>
```

The renderer **reads** the attribute, renders **into** the element, and **leaves
`data-figure` in place** — it never destroys the source. (Phase 3 adds a
build-time prerender, `render_figures.js`, mirroring `render_math.js`: it fills
the element with committed static SVG so readers need no JavaScript.)

### Spec schema — zoom-orrery (`renderOrrery`)

```jsonc
{
  "title":  "…",                                   // accessible label
  "zoom":   { "lo": 0.3, "hi": 6000, "start": 34 },// AU half-window range (lo,hi > 0); start = initial scale
  "time":   { "baseSpeed": 0.45, "playing": true },// years/sec at scale 1; autoplay
  "bodies": [                                       // orbital elements (one per body)
    { "name": "Earth", "a": 1.0, "e": 0.017, "period": 1.0,
      "r": 3.6, "color": "#3f7fb0", "M0": 2.9, "omega": 0.5 }
    // a = semi-major axis (AU), e = eccentricity, period = years,
    // r = marker radius (px), M0 = start mean anomaly (rad), omega = longitude of periapsis (rad)
  ],
  "belts":  [                                       // GENERATED from a seed, not stored
    { "name": "Asteroid belt", "seed": 10543, "count": 700,
      "aMin": 2.05, "aMax": 3.3, "eMax": 0.18, "color": "#9a8f76" }
  ],
  "oort":   { "seed": 91237, "count": 900, "rMin": 1800, "rMax": 4600, "color": "#5d6b7a" },
  "regions":[ { "name": "Giants", "scale": 34 } ]   // zoom-to targets (AU half-window)
}
```

### Spec schema — galaxy (`renderGalaxy`)

A parallel spec: the same `version/title/zoom/time/regions` envelope, with galaxy
domain blocks (`disk` / `bulge` / `halo` / `sun`) instead of `bodies` / `belts` /
`oort`. Structure is GENERATED from seeds (`seededScatter`), never stored.

```jsonc
{
  "title": "…",
  "zoom":  { "lo": 0.00001, "hi": 200000, "start": 60000 }, // light-year half-window (lo,hi > 0); ~10 orders of magnitude
  "time":  { "baseSpeed": 0.05, "playing": true },          // rigid-spin rate at scale 1; autoplay
  "disk":  { "seed": 80021, "count": 9000, "arms": 4,       // log-spiral star field
             "rMin": 1500, "rMax": 48000, "pitch": 4.3, "spread": 0.55, "color": "#cdd8ff" },
             // per star: arm = i % arms; R = rMin + (rMax-rMin)*u*u (center-dense);
             // theta = arm*2PI/arms + pitch*ln(R) + spread*(u-0.5)
  "bulge": { "seed": 4407, "count": 1200, "radius": 9000, "color": "#ffe6b0" },          // dense core (uniform-shell fn)
  "halo":  { "seed": 2231, "count": 800, "rMin": 20000, "rMax": 85000, "color": "#8a93a8" }, // sparse outer shell
  "sun":   { "r": 26000, "theta": 2.3, "label": "You are here" },  // galactic position of the Solar System (one point)
  "regions":[ { "name": "Solar neighborhood", "scale": 400, "center": "sun" } ] // zoom-to (ly); center "sun" pans to the Sun
}
```

Rendering notes (all in `galaxy.js`, not the runtime): a per-scale **cull** caps
stars drawn at `MAX_STAR_NODES` (4000) — wide zoom shows a representative sample,
a zoomed region draws only its local stars. The spin is **rigid** (one angle in
projection, scale-coupled via `scaleAwareTime`). The Sun marker is a
constant-size point — **honest sub-pixel scaling**: the whole Solar System is one
dot at galaxy scale, and stays a single point when zoomed in (no fabricated
sub-structure). `Math.log`/`cos`/`sin` are geometry on `seededScatter` output;
the density gradient uses `u*u` (no `Math.pow`), keeping composition unambiguous.


## The composition law (the whole point of the scaffold)

Render modules **compose** the runtime primitives; they never re-roll them.
`orrery.js` sources every hard primitive from `figures.js`:

| Need | Primitive (from `figures.js`) |
|---|---|
| orbital position | `DossierFigures.solveKepler(M, e)` |
| procedural belts | `DossierFigures.seededScatter(seed, count, fn)` — `fn(rng, i)`, `rng` first |
| log-scale zoom | `DossierFigures.logZoom.sliderToScale` / `scaleToSlider` (bounds > 0) |
| scale-aware play-speed | `DossierFigures.scaleAwareTime(baseSpeed, scale)` |
| soft motion | `DossierFigures.ease(t)` |
| SVG nodes | `DossierFigures.el(tag, attrs)` (SVG-namespaced) |

`scaleAwareTime` is the inner-planet-legibility fix: zoomed in → slow time
(inner planets readable), zoomed out → fast time (giants visibly move).

## Loading order (browser)

```html
<script src="figures/figures.js"></script>  <!-- runtime first -->
<script src="figures/orrery.js"></script>    <!-- then render modules -->
```

Root-relative paths, no CDN. (Freezing a figure into `chapters/<tag>/` needs the
freeze rewire extended to repoint `figures/` script-src — handled in Phase 5; the
Phase-2 demo page is deliberately outside the freeze set.)
