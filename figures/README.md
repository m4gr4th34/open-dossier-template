# `figures/` — the living-figures runtime (vendored, first-party)

Small, self-contained interactive/animated SVG figures for a dossier's editions.
Everything here is **vendored, zero-dependency, reader-side static code** — the
same discipline as `katex/`: no CDN, no remote bundles, no third-party runtime
packages. **None of it is ever executed by CI** (the stdlib-only verify floor
stays untouched).

## Files

| File | Role |
|---|---|
| `figures.js` | The **domain-agnostic** runtime floor (v0.2.0+) — general primitives every figure composes (`el` / `ease` / `logZoom` / `scaleAwareTime` / `seededScatter` / `mulberry32` / `r2` / `escAttr` / `escTxt`) **plus the figure-type registry** (`registerPoster(type, fn)` / `posterEmitters` / `dedupPoster`). No domain physics. Exposes `window.DossierFigures`; pinned by `FIGURES_RUNTIME_VERSION`. |
| `figures.test.js` | Author-local Node test for the general primitives (`node figures/figures.test.js`). Never run by CI. |
| `orrery.js` | A render module that **composes** the primitives into a Keplerian zoom-orrery. Extends `DossierFigures` with `renderOrrery(container, spec)`. |
| `galaxy.js` | A render module that **composes** the primitives into a procedural spiral galaxy (statistical structure, ~10-order zoom, per-scale cull). Extends `DossierFigures` with `renderGalaxy(container, spec)`. |
| `cosmiczoom.js` | A composer **one level up**: calls `renderOrrery` + `renderGalaxy` and crossfades them into one continuous Mercury→Milky-Way zoom (the unit bridge + seam). Extends `DossierFigures` with `renderCosmicZoom(container, spec)`. |

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
  <!-- render-figures bakes the sealed <svg> poster here; the runtime removes it and renders live on JS load -->
</figure>
```

The renderer **reads** the attribute, renders **into** the element, and **leaves
`data-figure` in place** — it never destroys the source. A build-time prerender,
`render_figures.js` (mirroring `render_math.js`), bakes committed static SVG into
the element so readers need no JavaScript — see **Sealing the floor** below.

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


### Spec schema — cosmic-zoom (`renderCosmicZoom`)

A COMPOSITION figure: it references a full `orrery` spec and a full `galaxy`
spec (the schemas above) plus a `seam` block, and stitches them into one
continuous Mercury→Milky-Way zoom by CALLING `renderOrrery` + `renderGalaxy`
(it does not reimplement them). The composer sets `controls:false` on each child
so one master bar drives both.

```jsonc
{
  "orrery": { /* a full zoom-orrery spec — see above */ },
  "galaxy": { /* a full galaxy spec — use focus:"sun" so the seam anchors on the Sun */ },
  "seam": {
    "lo": 0.35, "hi": 4e9, "start": 5,         // master cosmic scale range, in AU (Mercury -> Milky Way)
    "fadeLoAU": 0.63, "fadeHiAU": 6000,         // crossfade band: orrery fades out / galaxy fades in
    "voidInLoLy": 4, "voidInHiLy": 12,          // nearest-star waypoints fade IN across this ly band
    "voidOutLoLy": 300, "voidOutHiLy": 1500,    // ... and fade OUT as the galaxy populates
    "journeyRate": 0.05, "playing": false,      // Powers-of-Ten auto-journey (ping-pong); default paused
    "regions": [ { "name": "Oort cloud", "scale": 5000 } ],   // master zoom-to targets, scale in AU
    "nearestStars": [ { "name": "Proxima Centauri", "ly": 4.247, "dir": 18 } ] // the one bit of real DATA
  }
}
```

The UNIT BRIDGE (`1 ly = 63,241 AU`) lives ONLY in `cosmiczoom.js`. The two SVG
canvases are pixel-identical (`viewBox 0 0 800 480`), so the layers stack and
crossfade by opacity — no geometric reconciliation. The ANCHOR (Sun at screen
centre through the seam) is held by composing the galaxy's own `focus:"sun"`
auto-focus + the orrery's origin=Sun; the composer drives only `setSlider`.


## The composition law (the whole point of the scaffold)

Render modules **compose** the runtime primitives; they never re-roll them. The
core (`figures.js`) is **domain-agnostic** — its primitives are general, not
astronomical. `orrery.js` sources the general primitives from `figures.js`, and
owns the **one** domain-specific primitive itself:

| Need | Primitive |
|---|---|
| procedural belts | `DossierFigures.seededScatter(seed, count, fn)` — `fn(rng, i)`, `rng` first |
| log-scale zoom | `DossierFigures.logZoom.sliderToScale` / `scaleToSlider` (bounds > 0) |
| scale-aware play-speed | `DossierFigures.scaleAwareTime(baseSpeed, scale)` |
| soft motion | `DossierFigures.ease(t)` |
| SVG nodes | `DossierFigures.el(tag, attrs)` (SVG-namespaced) |
| orbital position | `solveKepler(M, e)` — **local to `orrery.js`**, NOT the runtime |

`solveKepler` (Kepler's equation) was relocated out of the core in v0.2.0: it is
the only astronomy-specific primitive and only the orrery needs it, so the orbital
module owns it. A non-astronomy figure composes the general core and never touches
it. `scaleAwareTime` is the inner-planet-legibility fix: zoomed in → slow time
(inner planets readable), zoomed out → fast time (giants visibly move).

## Loading order (browser)

```html
<script src="figures/figures.js"></script>  <!-- runtime first -->
<script src="figures/orrery.js"></script>    <!-- then render modules -->
```

Root-relative paths, no CDN. In a **page**, list the runtime first then each module
the page uses. In the **sealer** (`render_figures.js`) the load is automatic — it
requires `figures.js` first, then every other `figures/*.js` (order-independent; see
*Sealing the floor*). (Freezing a figure into `chapters/<tag>/` repoints
these `figures/` script-srcs to the shared root `../../figures/` automatically —
`rewire_script_src` in `freeze_chapter.py`; the standalone demo pages are
deliberately outside the freeze set.)

## Sealing the floor (`render-figures`, author-local)

A living figure has a **live ceiling** (JS-on: the interactive runtime renders
into the `<figure>`) and a **sealed floor** (JS-off: a static `<svg>` baked into
the figure). `render_figures.js` bakes the floor:

```sh
node render_figures.js                 # defaults to figure-demo.html
node render_figures.js a.html b.html
npm run render-figures
```

It is **author-local and pure Node — NO browser required** (the poster paths touch
no DOM), mirroring how `render-math` needs only Node + vendored KaTeX. It reads each
`<figure data-figure='…'>`, generates the sealed `<svg data-poster="1">`
deterministically from the spec, and bakes it inside the figure — keeping the
`data-figure` open tag **byte-identical** (the source of truth). Idempotent (a
second run is a no-op); fail-loud (non-zero exit on any error). **NEVER run by CI**
— the stdlib-only verify floor is untouched. On load, the runtime removes the
`data-poster` `<svg>` before rendering, so a JS-on reader sees exactly one (live)
figure: the floor upgrades to the ceiling.

**Dispatch by `type`, through the registry (v0.2.0+ — no hardcoded figure names).**
Every figure spec declares a top-level **`"type"`**; each poster-bearing module
registers its emitter with `DossierFigures.registerPoster("<type>", renderXPosterSVG)`
(orrery → `"orrery"`, galaxy → `"galaxy"`, cosmic-zoom → `"cosmic"`). The sealer
**auto-loads** every `figures/*.js` (`figures.js` first; module order doesn't matter —
a composer's poster, e.g. cosmic delegating to the galaxy poster, resolves at *seal*
time, not load time) and dispatches `spec.type` through `posterEmitters`. Three
outcomes:

| `spec.type` | emitter registered? | result |
|---|---|---|
| set | yes | **sealed** with that emitter |
| set | no | **live-ceiling-only** — copied through unchanged (no JS-off floor; intentional, not an error) |
| absent | — | **fails loud** (every sealed figure must declare its type; clean break, no domain-key sniff) |

Adding a **new** figure type therefore needs **no edit to `render_figures.js`**:
declare the `type`, register the emitter, drop the module in `figures/`. (Before
v0.2.0 the sealer sniffed domain keys — `bodies`/`disk`/`seam` — to pick a named
poster fn; that hardcoded dispatch is gone.)

**The poster-density lever.** The sealed poster's point density is an *independent*
knob from the live figure's: the floor only needs to **communicate the finding** — a
recognisable orrery, a recognisable galaxy — not match the live point-count. An
optional top-level `poster` block caps each layer of the SEALED `<svg>` to a lighter
representative sample, **without changing the live figure at all**:

```jsonc
"poster": { "beltCount": 300, "oortCount": 200 }                      // orrery: per belt layer + Oort
"poster": { "starCount": 1800, "bulgeCount": 700, "haloCount": 450 }  // galaxy (and cosmic's nested galaxy)
```

How it stays honest:

- **Poster-only.** The caps are read in `computeFrame` / `computeGalaxyFrame`, which
  ONLY the poster path calls — the live `renderOrrery` / `renderGalaxy` never read
  `poster`, so the interactive ceiling keeps its full density (the live galaxy still
  draws its `MAX_STAR_NODES`).
- **Deterministic subset, not a re-scatter.** A cap is a prefix of the SAME seeded
  array (`seededScatter(seed, BIG, fn).slice(0, N)` === `seededScatter(seed, N, fn)`,
  since point `i` is count-independent) — so the floor is a true representative subset
  of the ceiling, reproducibly.
- **Absent = full density.** No `poster` block → no caps → the sealed `<svg>` is
  byte-identical to a poster-less spec (re-sealing rewrites nothing). For the galaxy,
  an omitted star/bulge/halo cap falls back to today's `MAX_STAR_NODES` / uncapped /
  uncapped.
- **Cosmic** inherits it for free: `renderCosmicZoomPosterSVG` delegates to the galaxy
  poster, so `poster` goes inside the nested `galaxy` block.

In the demos this trims the sealed posters ~69% (orrery) and ~51% (galaxy / cosmic)
while the floors still read unmistakably as the solar system and the Milky Way.

## Adopting the engine for a new figure type

The engine is **domain-agnostic** (v0.2.0+): the astronomy lives entirely in the
modules, not the core, so any project — a QC dossier, an econ sweep, anything — can
add its own figure type **without forking the template machinery** (no edit to
`render_figures.js`). Four steps:

1. **Write your module** (`figures/<your-type>.js`) exposing a live render fn
   `render<YourType>(container, spec)` that composes the general primitives
   (`el`/`ease`/`logZoom`/`scaleAwareTime`/`seededScatter`/…) — never re-roll them.
   If you want a **JS-off floor**, also write a pure `render<YourType>PosterSVG(spec)`
   poster emitter via the **shared-compute split** (geometry computed once, consumed
   by both the live `el()` emitter and the string emitter — see `orrery.js`/`galaxy.js`),
   so the floor can never drift from the ceiling. Use `DossierFigures.dedupPoster(container)`
   to drop a baked floor before rendering live.
2. **Register the emitter:** `DossierFigures.registerPoster("your-type", render<YourType>PosterSVG)`.
   (A **live-ceiling-only** figure — no JS-off floor — simply registers *nothing*; the
   sealer copies it through unchanged.)
3. **Declare the type:** add `"type":"your-type"` as a top-level key in the figure's
   `data-figure` spec.
4. **Drop the module in `figures/`.** The sealer auto-loads it and dispatches by
   `type`; `npm run render-figures` seals it. Nothing else to touch.

**Honest scope — what the engine does and does NOT yet ship.** The engine provides
the *sealing architecture* (floor/source/ceiling, the registry, the byte-stable
poster path) and *general primitives* (deterministic PRNG + seeded scatter, log-zoom
over many orders of magnitude, scale-aware time, easing, SVG node/string emit). It
does **not** yet ship **chart/plotting primitives** — axes, ticks, value→pixel scales,
or line/area path emitters. A figure type that needs those (e.g. a scientific
line-chart or a frontier sweep) writes them **in its own module** for now; if they
prove general, they can be promoted into the runtime later. So: the engine will
*seal and serve* any SVG figure you can emit, but it does not yet *plot data for you* —
don't assume axes exist until a charting layer lands.
