---
paths:
  - "packages/**"
  - "turbo.json"
  - "pnpm-workspace.yaml"
  - "package.json"
  - "eslint.config.js"
---
# Architecture — europe-map

> Interactive 3D historical atlas of Europe. WebGL rendering, camera navigation, per-polygon picking.

## Tech Stack

| Category  | Technology          | Version      |
| --------- | ------------------- | ------------ |
| Language  | TypeScript (strict) | via tsconfig |
| 3D engine | three.js            | ^0.186       |
| Bundler   | Vite (+ HMR)        | ^8.3         |
| Package   | pnpm workspaces     | 10.7.1       |
| Tasks     | Turbo               | ^2.11        |
| Tests     | Vitest              | ^5.0         |
| Chrome    | React + Zustand     | 19 / 5       |

> **Turbo arrived 2026-10-01**, on the dev's call, and the earlier entry here saying it was "measured and
> refused" is superseded. What changed is the shape of the repo rather than anyone's mind: `plan.md` (P2)
> recorded the two thresholds that would reverse the refusal — **a CI** (shipped 2026-09-24) and a gate
> past ~30 s — and the third package pushed past them. Each package now owns its `lint`, `type-check`,
> `test` and `coverage`, so *something* has to fan out across them; the root scripts are `turbo <task>`.
> **Lerna is still refused**, and for a reason no threshold touches: it publishes, and we publish nothing.

> **One declared version per dependency**, in `pnpm-workspace.yaml`'s `catalog:`, referenced as `catalog:`
> from every `package.json`. The bar for an entry is *shared* **and** *dangerous to mismatch*, not merely
> shared: React is in there because the Payload admin will want it next and two Reacts in one workspace
> give hook errors that read like application bugs; `three` is catalogued too.

## Project Structure

> Split into a pnpm workspace on **2026-09-24**. Four packages since, and the boundary that matters is a
> contract, not a folder: **`core` contains no three.js**, enforced by ESLint and proved by breaking it.
> That is what keeps the worker chunk at 13.5 kB with no renderer in it.

```
pnpm-workspace.yaml     # the packages, and the dependency catalogue
turbo.json              # the task graph: build waits on its own type-check and on ^build
package.json            # workspace root: tooling only, scripts are `turbo <task>`
tsconfig.json           # the strictness every package extends
eslint.config.js        # layer boundaries as a table; each package may override it
scripts/                # repo-level utilities (coverage merge)
AGENTS.md               # written by Turbo itself for AI agents; kept committed, as it asks

packages/
├── core/               # @europe-historical-atlas/core — pure TypeScript. NO three.js, React or zustand
│   ├── vitest.config.ts    # **node** environment: no DOM, so a stray `document` fails here
│   └── src/
│       ├── utils/      # leaf: small pure helpers, importing nothing
│       ├── geo/        # leaf: projection maths
│       ├── data/       # domain + ports (heightmap, land mask, regions, rivers); reads geo/ + utils/
│       ├── pipeline/   # the CPU work, worker-safe; reads data/, geo/, utils/
│       └── editor/     # the Cartographer's document model: anchors, rings, edits, history
├── atlas/              # @europe-historical-atlas/atlas — the 3D map
│   ├── index.html      # Vite entry point (canvas)
│   ├── public/         # DEM, land mask, rivers
│   ├── vite.config.ts
│   ├── vitest.config.ts    # jsdom: sessionStorage, lil-gui and ui/ are the subject
│   └── src/            # main.ts and folders, nothing else (2026-10-27, ATLAS-291 — files/plans/atlas/src-layout.md)
│       ├── main.ts     # composition root: create, inject, connect, tear down
│       ├── app/        # the running map: viewport, frameLoop, mapInteraction, mapUi, assetMessages
│       ├── loading/    # what the map is made from, in what order: mapPipeline, mapContent, yearBorders
│       ├── sources/    # what the map has been given so far (mapSources) — a leaf the loading fills, the layers read
│       ├── tunables/   # the settings the whole map reads: devState, params/ (defaults and ranges) — a leaf
│       ├── devPanel/   # the lil-gui panel over the settings, and what each control rebuilds
│       ├── scene/      # everything drawn, one folder per family, each with its builder (`map…Layer`):
│       │               #   layers/ relief/ lines/ waters/ decor/ sheet/ political/ events/
│       ├── camera/     # camera + CameraStateStore (independent of everything else)
│       ├── controls/   # navigation; depends on camera/ only
│       ├── picking/    # raycasting: answers WHERE, never WHAT
│       ├── ui/         # plain DOM over the canvas
│       └── bench/      # the icon benches, /icons.html and /svg-icons.html
├── cartographer/       # @europe-historical-atlas/cartographer — the territory editor
│   ├── eslint.config.js    # re-imports the root config, then adds React; forbids `three`
│   ├── vite.config.ts
│   ├── vitest.config.ts    # jsdom + the React plugin
│   ├── vitest.setup.ts     # unmounts after each test; stands in for the canvas, ResizeObserver, <dialog>
│   ├── workbench.html      # the workbench: chrome pieces mounted alone, never built (2026-10-09)
│   └── src/                # 2D canvas and React chrome; main.tsx, the composition root, wires the two
│       ├── viewport/       # the screen↔backdrop arithmetic: projection, framing, zoom, reach — pure
│       ├── geometry/       # the arithmetic of the gestures: hit tests, marquee, snaps — pure
│       ├── canvas/         # the controller and the live canvas at the root; tools/ (gestures, snaps),
│       │                   #   paint/ (painters, scene, style, cursors), history/ (undo keys and relay)
│       ├── state/          # the store and its slices, read by the canvas and the chrome alike
│       ├── persistence/    # the year on disk: open, save, snapshots; draft/ holds the automatic draft
│       ├── loaders/        # fetch, bake and project the backdrop and the vector layers
│       ├── wikidata/       # a public item read and said: names, dates, what it belonged to
│       ├── devServer/      # runs in the Vite server, not the page: writes a year to disk
│       ├── i18n/           # the language store, and the catalogues the canvas and the store read
│       └── ui/             # the React chrome, all of it (2026-10-22) — outside it, only main imports it
│           ├── components/ # one folder per component: <Name>/<Name>.tsx and its test at the root,
│           │               #   hooks/ (its own hooks), internal/ (its own children), index.ts (2026-10-18)
│           ├── hooks/ utils/ i18n/   # what several components share
│           ├── styles/     # the sheets; styles/sheets.ts holds the one stylesheet order
│           ├── icons/ testing/       # the glyphs; the render helpers of the chrome's tests
│           └── workbench/  # the workbench page's plates
└── eslint-plugin-eha/  # the lint rules of this repository: where each declaration sits (2026-10-12)
    ├── tsconfig.json       # JavaScript checked by tsc (`checkJs`): ESLint imports it with no build step
    ├── vitest.config.ts    # node: ESLint never runs in a page
    └── src/                # one folder per rule, its suite beside it

files/plans/            # the plans — shipped since 2026-09-24
files/spikes/           # runnable experiments; their out/ stays ignored
```

**Flat config has no cascade**, so a package's `eslint.config.js` re-imports the root one rather than
inheriting it, and ESLint resolves one config **from the current directory** — which is why every package
owns a `lint` script. A single `eslint .` from the root would read the Cartographer's `.tsx` with no React
rule at all: green over code nothing had checked.

**Components: a folder each, a barrel each — and no barrel of barrels** (the dev's call, 2026-10-18, his
convention in `vite-mf-monorepo`, `nextjs-multizone-tmdb` and `date-time-picker`). **One file, one component, and
everything a component needs scoped to its folder** (the dev, 2026-10-22: *« les choses qui concernent des
composants doivent être scopées par rapport aux composants »*). **Everything React is under `src/ui/`** (the dev,
2026-10-22: *« tout ce qui concerne React, en fait, c'est de l'interface utilisateur »*), so the package root holds
the layers and not fifty folders. `ui/components/<Name>/` holds:

| where | what |
| --- | --- |
| `<Name>.tsx`, `<Name>.test.tsx` | the component and its test, at the root |
| `hooks/` | its own hooks, one per file |
| `internal/` | its own children — **does not nest**: a child with children gets its own top-level folder |
| `utils/` | its own functions, one per file — never beside the component in its `.tsx` |
| `i18n/` | its own texts: `fr.json`, `en.json`, and an `index.ts` typing them (`Catalogue<keyof typeof en>`) |
| a types file at the root | the shapes its parts share (`polityFieldsProps.ts`, `layerListProps.ts`) |
| `index.ts` | what the rest of the application uses — the folder's only door |

**What several components use goes up one level, beside `components/` in `ui/`**: `ui/hooks/` (`useTranslation`,
`useLocale`…), `ui/utils/` (`polityDraft`, `arrange`, `statusBar`…), `ui/i18n/` (the language's React context, and
the catalogues only the chrome reads: `actions`, `app`, `arrange`, `border`, `colourPicker`). **What the chrome
shares with the rest stays at the package root**: `src/i18n/` keeps the language store and the catalogues the
canvas and the store read (`tools`, `polity`). **A layer stays whole** — `canvas/`, `viewport/`, `geometry/`,
`state/`… keep their files even where only the chrome imports one (the controller, `zoomLabel`): the chrome reads
the layers, never the reverse, and `loaders/`, `persistence/`, `devServer/`, `wikidata/` are forbidden `ui/` by
lint. A shared *component* gets its own folder like any other (`ToolIcon/`, `Panel/`, `LocaleProvider/`). **There
is no `components/shared/` any more** (removed 2026-10-22: it held no component). A stylesheet stays in
`ui/styles/`, the one module that orders the cascade. Four rules hold it: `react/no-multi-comp`, `eha/one-hook-per-file`,
`eha/component-folder-layout` (what sits where), and `eha/no-reach-into-component` — over all of `src/` — so
nothing outside a folder imports anything in it but its `index`. **No `components/index.ts`**: a barrel of every
component is the one that makes cycles, and the subpath rule below already refuses it for `core`.

**Texts: one JSON per language, both bundled** (the dev, 2026-10-22; `plan.md` P8): never a French and an
English object in one TypeScript file, never fetched. The language flows from `LocaleProvider` (a store, so a
switch — ATLAS-266 — rewords everything); the canvas and the year on disk are handed a function that reads it at
each sentence. `core` keeps each translator once made, so a component calls `useTranslation` with no memo.

**Cross-package imports use subpath exports**: `@europe-historical-atlas/core/utils/math`, never a barrel. A single
barrel would flatten the four layers into one namespace and put `pipeline/` behind the same entry as the
rest — which is exactly what would smuggle three.js into the worker chunk.

### Where this is going — apps and resources

The dev's own taxonomy, 2026-09-24: **Payload is an app, the atlas is an app, core is a resource.**
Three applications will live here, not two, and they do not all render the same way:

|                     | what it is                                                                                            | renders with                     | state today              |
| ------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------ |
| **atlas**           | the 3D map — the thing that gets published                                                            | three.js on a WebGL canvas       | built                    |
| **cartographer**    | the territory editor — anchors, rings, borders                                                        | **2D canvas** + React/Zustand chrome | built |
| **places & events** | the content the map shows: cities with icons and 3D models, events with their consequences and actors | **Payload** (headless Next CMS)  | planned                  |
| **core**            | the format, the readers, the compositor, the maths                                                    | —                                | built, three-free        |

**All three ship in this repository** — committed, never git-ignored. **Two of them go online now**:
the atlas and, later, the cartographer, both static bundles. **Payload stays local for the moment** —
the dev's call, 2026-09-24, and a staged one with a named condition: going online means accounts, login
and a security layer, and the editor has to be proven first. Until then it keeps its database in a file
and the atlas reads what it produces over a **relative URL**, like every other asset it loads.

The day it does go online: Payload is a Next application, so a server runtime plus a database reachable
from it — a SQLite *file* does not survive a serverless filesystem, so network SQLite (libSQL / Turso,
spoken by the same adapter) or Postgres, and the auth layer with it.

**A trap worth stating once**: a browser cannot query a SQLite file over a relative URL. Either Payload
exports JSON that the atlas fetches like the DEM and the rivers, or the `.db` ships and is queried with
`sqlite-wasm`. Open, and written up in `files/plans/plan.md` (P7).

### The shared design system — decided, and it costs the atlas nothing

**The dev's call, 2026-09-24: it will be his own `fubaritico-ds`, as an external dependency**, used by
the atlas, the cartographer and the Payload admin alike. It is a **multi-framework** system: a React
component base today, a Stencil/web-component variant planned, Angular and Vue possible — and, crucially,
**the styles are independent of all of them and shared between them**.

**Published on GitHub Packages since 2026-10-09** (`0.2.0`), under the `@fubaritico` scope, all five
packages at one version. Read from its `INTEGRATION.md`, not assumed:

| package | what it ships | framework runtime |
|---|---|---|
| `@fubaritico/tokens` | `./css` → `variables.css` (custom properties) + a TS token object | **none** |
| `@fubaritico/styles` | one `styles.css`, inside `@layer ui.components` | **none** |
| `@fubaritico/variants` | class-string builders over `class-variance-authority` | **none** (a couple of kB) |
| `@fubaritico/behaviors` | behaviour services (`TabsService`, colour conversions) | **none** |
| `@fubaritico/react` | the React components — what the Cartographer installs | React |

The Stencil variant recorded here on 2026-09-24 is not published; it stays the design system's
long-term plan, not something this repository can consume. Installing needs a token even though
the packages are public — see `known-issues.md`.

**Three levels of consumption, and the atlas only ever needs the first:**

1. **tokens + styles (+ variants)** — the whole visual language for **zero JavaScript**. The atlas's DOM
   is a splash, a progress overlay and, at M2, event panels. It does not need components; it needs the
   same colours, type and spacing as the other two apps.
2. **Stencil custom elements** — standard `HTMLElement`s, usable from vanilla TypeScript with no
   framework. The fallback if the atlas ever wants a real component.
3. **React components** — ~45 kB gzipped of React + ReactDOM on top of a 185 kB bundle, for an
   application whose DOM is three elements. **Not for the atlas.**

**The cartographer reaches the opposite conclusion, for the same reason.** Its chrome *is* the
application — panels, tab strips, a 51-row list, forms, dialogues, a splitter. That is what a component
library is for, and whichever variant is ready when it is built (React or Stencil) earns its place. The
2D canvas stays imperative either way.

**Because the styles are shared across variants, all three applications look identical whichever level
each one consumes.** That is the whole point of a multi-framework system, and it is what makes "React
design system" a non-problem here.

#### The real risk, and it is not the framework

Nothing a framework does costs frames in a WebGL application **as long as per-frame state never goes
through it**. Camera position, zoom, hover, a drag in progress: route any of those through component
state and reconciliation runs at 60 Hz, which is what actually kills these applications. Keep the canvas
imperative and the document model in a plain store, render on commit rather than on `pointermove`, and
the cost is zero — in either app.

**Worth being accurate about why the atlas is fast today**: it is not that it is vanilla. It is that the
CPU work runs in a worker, that no geometry is rebuilt per frame, and that exaggeration is a `scale.y`
rather than a re-displacement. There is almost no DOM to be slow. What vanilla buys is that the wrong
pattern is not available by default — which is worth keeping, but it is not the measurement.

## Editor–atlas parity — what the two applications share, and where they differ

> The promise behind it: **what the Cartographer shows is what the atlas publishes.** Written 2026-10-16
> at the dev's request, from the imports of both packages, not from memory. **Update this table whenever
> a module moves from one column to the other** — it is the map of where the two can drift apart.

**Shared — one implementation in `core`, read by both:**

| what | how |
| --- | --- |
| the terrain backdrop | the same bake (`pipeline/terrainCompose`), in the same worker chunk, same hash; the Cartographer bakes it with no political tint |
| the land mask and the coast | the same asset (`data/landMask`); each traces its coastline from it (`data/coastlineSource`, chained by `data/coastlineChain` in the editor) |
| the borders | one derivation from the outlines (`editor/derivedBorders`); the atlas receives it through `editor/atlasBorders`, so **the line is the same geometry in both** |
| the paint order | `data/paintOrder`, through `data/toRegionPayload` on the atlas side |
| the polity colours | `editor/polityColours` and `data/regionPalette` |
| a tribe's look | its colour vanishing at its limit, no stroke (ATLAS-258): one signed distance (`geo/signedDistance`), one ramp and one default (`editor/tribeFeather`: `tribeOpacity`, `TRIBE_FEATHER`), the outset spill cut over other polities and the sea by the same rule; across a tribe a state shows its frontier stroke, never a border between two states, and a tribe's own edge is dropped (`editor/tribes`: `asSeenAcrossTribes`, `isTribeEdge`). The atlas evaluates the ramp in its shader per fragment (`scene/political/tribes/tribeShader`, GLSL's `smoothstep` + core's `featherShiftKm`); the Cartographer per backdrop pixel into an image cached per document version (`canvas/paint/tribeFeathers`, `canvas/tribeFeatherCache`) |
| the rivers | the same data and base style (`data/riverSource`, `data/riverDisplay`) |
| a polity's short name | one rule (`data/shortName.shortNameOf`, CARTO-307): the short name entered, else the formal name without its title — the atlas writes it, the Cartographer's form shows it greyed while the field is empty |

**Different — each application does it its own way:**

| what | Cartographer | atlas |
| --- | --- | --- |
| a polity's fill | a vector path from the outline, composited `overlay` on the backdrop (`canvas/paint/painter.ts`): the edge is exact | cut from the same outline into triangles on the relief's planes (`pipeline/fillTriangles`, atlas `scene/political/fills/`), blended in a shader: the edge is exact too since 2026-10-16 |
| the relief | a flat image | a 3D mesh, with the shore ramp (`data/shoreRamp`) |
| how a border is stroked | canvas strokes, every hand | three.js lines from `editor/borderHands`' table, minus weight and a dotted pattern (`rules/known-issues/atlas.md`) |
| a vassal | every polity in its own colour, with every border | from afar a vassal wears its suzerain's colour and no border parts them; its own colour and its border fade in by zoom (ATLAS-253) — levels from `editor/homageLevels`, the zoom read by `scene/political/homageReveal`, one line layer per split level (`scene/political/borders/levelledBorderLayer`), the fills mixed across tint levels (`scene/political/fills/fillShader`) |

**The direction**: geometry and decisions live in `core`; only the drawing — a 2D canvas on one side, the
GPU on the other — belongs to each application. A difference in the second table is either a rendering
choice (the relief) or a debt to close (the border weights).

## Scripts

```bash
pnpm dev                # Vite server + HMR — the atlas
pnpm dev:cartographer   # Vite server + HMR — the Cartographer
pnpm build              # turbo build: every app, each waiting on its own type-check
pnpm preview            # preview the atlas build
pnpm type-check         # turbo type-check: one tsc per package
pnpm lint               # turbo lint: one eslint per package, each with its own config
pnpm test               # turbo test: one vitest per package, environments differ on purpose
pnpm coverage           # turbo coverage, then merge the four lcov reports into one
```

**`dev` is not `turbo dev`** on purpose: that would start both Vite servers at once, which is a surprise
rather than a service. Each app is named explicitly.

**`coverage` merges rather than produces.** Each package writes its own `lcov.info` with paths relative to
*itself* (`SF:src/…`), and Sonar resolves them against the repository root — so pointed at them directly it
would find nothing and report **0 % with no error**. `scripts/merge-coverage.mjs` rewrites every path and
concatenates, so `sonar-project.properties` still reads one report. Verified: 98 paths, all resolving.

## 3D Pipeline (Milestone 1)

1. **Heightmap → relief**: load the B&W bitmap, subdivided `PlaneGeometry`, **CPU** displacement
   (read pixels → per-vertex `z`, `computeVertexNormals()`). CPU because raycasting must hit the real
   relief (GPU displacement is invisible to the raycaster).
2. **Texture**: `material.map` (colored/political map), UV alignment on the plane.
3. **Navigation**: camera moved with arrow keys (map-style pan).
4. **Picking**: `Raycaster` on click → intersection → camera fly-to (tween position + target).

## Data Layers (Milestones 2+)

- **Physical relief**: stable over time (a single heightmap).
- **Historical regions**: versioned by date (GeoJSON/mask per century, then per decade).
  The "click → region at time T" binding relies on this layer, not on the raw heightmap polygons.

## Git & Commits

Conventional commits. Format: `type(scope): subject` (lowercase, no trailing period, ≤ 100 chars).
Types: `build chore ci docs feat fix perf refactor revert style test`.
Suggested scopes: `scene`, `camera`, `controls`, `picking`, `data`, `repo`.

## Forbidden

```
❌ console.log              → console.warn / console.error
❌ explicit any             → strict TypeScript
❌ guessing a three.js API  → verify via opensrc/three or the web
❌ GPU leak                 → dispose() geometries/materials/textures on teardown
❌ global singleton         → inject renderer/scene/camera (DI)
```
