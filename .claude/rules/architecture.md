---
paths:
  - 'packages/**'
  - 'turbo.json'
  - 'pnpm-workspace.yaml'
  - 'package.json'
  - 'eslint.config.js'
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

> **Turbo** fans out each package's `lint`, `type-check`, `test` and `coverage`; the root scripts are
> `turbo <task>` (the dev's call, 2026-10-01, once a CI existed and the third package arrived). **Lerna is
> refused**: it publishes, and we publish nothing.

> **One declared version per dependency**, in `pnpm-workspace.yaml`'s `catalog:`, referenced as `catalog:`
> from every `package.json`. The bar for an entry is _shared_ **and** _dangerous to mismatch_, not merely
> shared: React is in there because the Payload admin will want it next and two Reacts in one workspace
> give hook errors that read like application bugs; `three` is catalogued too.

## Project Structure

> Split into a pnpm workspace on **2026-09-24**. Five packages since, and the boundary that matters is a
> contract, not a folder: **`core` contains no three.js**, enforced by ESLint and proved by breaking it.
> That is what keeps the worker chunk free of any renderer — the CI checks that both apps emit the same chunk, same hash.

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
│       ├── data/       # domain + ports (heightmap, land mask, regions, rivers), and what a year says — opened,
│       │               #   its outlines, borders and their hands, homage, colours, tribes (moved from editor/ on
│       │               #   2026-11-08, the dev's call: shared by both apps, read by the worker); reads geo/ + utils/
│       ├── pipeline/   # the CPU work, worker-safe; reads data/, geo/, utils/
│       ├── time/       # the historical date type
│       ├── i18n/       # the translators (ICU)
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
│       │               #   layers/ relief/ lines/ waters/ decor/ sheet/ political/ events/ cities/
│       ├── camera/     # camera + CameraStateStore (independent of everything else)
│       ├── controls/   # navigation; depends on camera/ only
│       ├── picking/    # raycasting: answers WHERE, never WHAT
│       ├── ui/         # plain DOM over the canvas
│       └── bench/      # the benches: /icons.html, /svg-icons.html, /names.html, /cities.html
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
│       ├── persistence/    # the maps on disk: open, save, save as, a copy, the automatic save (s19)
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
├── cms/                # @europe-historical-atlas/cms — Payload 3 on Next: places and events; SQLite, local only; vitest under node
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
everything a component needs scoped to its folder** (the dev, 2026-10-22: _« les choses qui concernent des
composants doivent être scopées par rapport aux composants »_). **Everything React is under `src/ui/`** (the dev,
2026-10-22: _« tout ce qui concerne React, en fait, c'est de l'interface utilisateur »_), so the package root holds
the layers and not fifty folders. `ui/components/<Name>/` holds:

| where                           | what                                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------- |
| `<Name>.tsx`, `<Name>.test.tsx` | the component and its test, at the root                                                           |
| `hooks/`                        | its own hooks, one per file                                                                       |
| `internal/`                     | its own children — **does not nest**: a child with children gets its own top-level folder         |
| `utils/`                        | its own functions, one per file — never beside the component in its `.tsx`                        |
| `i18n/`                         | its own texts: `fr.json`, `en.json`, and an `index.ts` typing them (`Catalogue<keyof typeof en>`) |
| a types file at the root        | the shapes its parts share (`polityFieldsProps.ts`, `layerListProps.ts`)                          |
| `index.ts`                      | what the rest of the application uses — the folder's only door                                    |

**What several components use goes up one level, beside `components/` in `ui/`**: `ui/hooks/` (`useTranslation`,
`useLocale`…), `ui/utils/` (`polityDraft`, `arrange`, `statusBar`…), `ui/i18n/` (the language's React context, and
the catalogues only the chrome reads: `actions`, `app`, `arrange`, `border`, `colourPicker`). **What the chrome
shares with the rest stays at the package root**: `src/i18n/` keeps the language store and the catalogues the
canvas and the store read (`tools`, `polity`). **A layer stays whole** — `canvas/`, `viewport/`, `geometry/`,
`state/`… keep their files even where only the chrome imports one (the controller, `zoomLabel`): the chrome reads
the layers, never the reverse, and `loaders/`, `persistence/`, `devServer/`, `wikidata/` are forbidden `ui/` by
lint. A shared _component_ gets its own folder like any other (`ToolIcon/`, `Panel/`, `LocaleProvider/`). **There
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

|                     | what it is                                                                                            | renders with                         | state today                   |
| ------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------ | ----------------------------- |
| **atlas**           | the 3D map — the thing that gets published                                                            | three.js on a WebGL canvas           | built                         |
| **cartographer**    | the territory editor — anchors, rings, borders                                                        | **2D canvas** + React/Zustand chrome | built                         |
| **places & events** | the content the map shows: cities with icons and 3D models, events with their consequences and actors | **Payload** (headless Next CMS)      | built, local (`packages/cms`) |
| **core**            | the format, the readers, the compositor, the maths                                                    | —                                    | built, three-free             |

**All three ship in this repository** — committed, never git-ignored. **Two of them go online now**:
the atlas and, later, the cartographer, both static bundles. **Payload stays local for the moment** —
the dev's call, 2026-09-24, and a staged one with a named condition: going online means accounts, login
and a security layer, and the editor has to be proven first. Until then it keeps its database in a file
and the atlas reads what it produces over a **relative URL**, like every other asset it loads.

The day it does go online: Payload is a Next application, so a server runtime plus a database reachable
from it — a SQLite _file_ does not survive a serverless filesystem, so network SQLite (libSQL / Turso,
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

| package                 | what it ships                                                     | framework runtime         |
| ----------------------- | ----------------------------------------------------------------- | ------------------------- |
| `@fubaritico/tokens`    | `./css` → `variables.css` (custom properties) + a TS token object | **none**                  |
| `@fubaritico/styles`    | one `styles.css`, inside `@layer ui.components`                   | **none**                  |
| `@fubaritico/variants`  | class-string builders over `class-variance-authority`             | **none** (a couple of kB) |
| `@fubaritico/behaviors` | behaviour services (`TabsService`, colour conversions)            | **none**                  |
| `@fubaritico/react`     | the React components — what the Cartographer installs             | React                     |

**What this repository installs** (checked in each `package.json`, 2026-11-01), four of the five, at the one version of
`pnpm-workspace.yaml`'s catalogue: the **Cartographer** — `tokens`, `styles`, `behaviors`, `react`; the **CMS** — `tokens`,
`styles`, `react`; the **atlas** — none yet; `core` and the lint plugin — none. `@fubaritico/variants` is installed and
imported nowhere.

The Stencil variant recorded here on 2026-09-24 is not published; it stays the design system's
long-term plan, not something this repository can consume. Installing needs a token even though
the packages are public — see `rules/known-issues/tooling.md`.

**The atlas and the design system — what is decided and what is not** (the dev, 2026-11-01):

- **Decided**: the atlas will have a flat interface over the canvas — panels, buttons, menus, in HTML —
  built with the design system. **Nothing is wired yet**: the atlas installs none of its packages. Its
  interface elements _inside_ the map, in 3D, are drawn by three.js, not by the design system.
- **Decided**: the canvas is never a React component, unlike the Cartographer's.
- **Decided, 2026-11-08: React** (the dev: _"the interface will be in React — the elements laid over the
  relief map will be in React"_). A root mounted beside the canvas, never around it. **Still undecided**:
  Zustand or not, and **how the relief map and the interface talk to each other, both ways** (the dev, same
  day — ATLAS-392) — to be read from the interface's scenarios (ATLAS-329). Whatever the store, the map and the
  interface share state through one that lives outside React (Zustand's `createStore` from `zustand/vanilla`,
  read in React by `useStore(store, selector)`). Until that root exists, a message to the reader goes through
  the plain-DOM notices (`ui/notice.ts`, `ui/errorNet.ts`), which move into it then.
- **Undecided**: whether the 3D elements share the design system's redefined tokens (_"I don't want to
  commit to that yet"_).
- **To measure, not assumed**: whether the React root delays the map's first display. Mounted after the
  first frame it should not — a hypothesis, to measure when it lands.

The three levels of consumption, and what each costs the atlas:

1. **tokens + styles** — the whole visual language for **zero JavaScript**.
2. **Stencil custom elements** — standard `HTMLElement`s, usable from vanilla TypeScript with no
   framework; not published (see above).
3. **React components** — ~45 kB gzipped of React + ReactDOM on top of a 185 kB bundle: the cost to
   weigh if the atlas's interface grows into an application.

Whatever is chosen, **per-frame state (camera, zoom, hover) never goes through a component**
(`troubleshooting.md`).

**The design system is white-label: each application overrides it through its tokens** (colours, type,
spacing). Nothing more to it (the dev, 2026-11-01).

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

| what                        | how                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| the terrain backdrop        | the same bake (`pipeline/terrainCompose`), in the same worker chunk, same hash; the Cartographer bakes it with no political tint                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| the land mask and the coast | the same asset (`data/landMask`), and **one coast**: both trace it on the mask's full grid (CORE-421, 2026-11-12); a colour, a hatch and a border stop on it by one rule — `data/landClip.COAST_COVERAGE` (the mask's coverage at one half): the atlas discards a tint's fragment over water (`scene/relief/landTextures`, `political/tintOnRelief`), the Cartographer lays its sea image over the tints (`canvas/paint/seaPainter`), both cut the borders at the coast (`data/atlasBorders` through `data/landClip`). So an outline may run over the sea and the islands it encloses take its colour |
| the borders                 | one derivation from the outlines (`data/derivedBorders`); the atlas receives it through `data/atlasBorders`, so **the line is the same geometry in both**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| the paint order             | `data/paintOrder`, through `data/toRegionPayload` on the atlas side                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| the polity colours          | `data/polityColours` and `data/regionPalette`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| a tribe's look              | **the inner band** since 2026-11-02 (an **outlined tribe**, rank `tribe_outlined`, the band inside out — full to 15 km, half to 30, nothing deeper: `TRIBE_OUTLINED_FEATHER`, CARTO-439; the atlas's shader reads it per vertex) — half its colour from its limit to an undulating inner offset, its full colour deeper, no stroke (ATLAS-258, ATLAS-344); the fade before it stays a choice: one signed distance (`geo/signedDistance`), one rule and one default (`editor/tribeFeather`: `tribeOpacity`, `bandWidthKm`, `TRIBE_FEATHER`), the outset spill cut over other polities and the sea by the same rule; across a tribe a state shows its frontier stroke, never a border between two states, and a tribe's own edge is dropped (`data/tribes`: `asSeenAcrossTribes`, `isTribeEdge`). The atlas evaluates the ramp in its shader per fragment (`scene/political/tribes/tribeShader`, GLSL's `smoothstep` + core's `featherShiftKm`); the Cartographer per backdrop pixel into an image cached per document version (`canvas/paint/tribeFeathers`, `canvas/tribeFeatherCache`) |
| a vassal's band             | **the tribes' inner band made even and thinner** since 2026-11-09 (ATLAS-398): half the vassal's colour from its outline to `VASSAL_BAND_WIDTH_KM` (10, a constant, no panel setting) inside, its full colour deeper — one rule and one width (`data/vassalBand`: `isBandedVassal`, `vassalBandOpacity`), one signed distance (`geo/signedDistance`). The atlas measures each vassal vertex in the worker beside its cut (`pipeline/vassalBands`) — on the built site the build measures them once and the worker lays them (`pipeline/bakedBands`, `bake/bandsBake`, ATLAS-407) and lays the share in its fill shader, revealed with the vassal's colour (`scene/political/fills/fillShader`); the Cartographer per backdrop pixel into an image cached per version, drawn clipped by the vector outline (`canvas/paint/vassalBands`, `canvas/vassalBandCache`). The vassals' dotted border at `VASSAL_HAND_WEIGHT` (1.5, `data/borderHands`) in both |
| the overlaps hatched        | **one computation of the common ground** since 2026-11-09 (ATLAS-399): the shapes, the pairs and their cut (`data/overlaps`, moved from `editor/`); the atlas computes a year whole (`data/yearOverlaps`, `data/overlapHatches`, in the worker's settling), the Cartographer through its own cache, recomputing only what a gesture moved (`canvas/overlapCache`) — the sequence written twice, the cache's memoisation in the way. One stripe per polity in turn, at 45°. **The atlas bakes its stripes on the ground** — a small image repeated, mipmapped, `HATCH_STRIPE_KM` (25) wide, never resized with the zoom (`data/hatchStripes`, `scene/political/hatches/`), over the fills and the tribes; the Cartographer still draws them a fixed width on screen (CARTO-365) |
| the rivers                  | the same data and base style (`data/riverSource`, `data/riverDisplay`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| a polity's short name       | one rule (`data/shortName.shortNameOf`, CARTO-307): the short name entered, else the formal name without its title — the atlas writes it, the Cartographer's form shows it greyed while the field is empty                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

**Different — each application does it its own way:**

| what                    | Cartographer                                                                                                        | atlas                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| a polity's fill         | a vector path from the outline, composited `overlay` on the backdrop (`canvas/paint/painter.ts`): the edge is exact | cut from the same outline into triangles on the relief's planes (`pipeline/fillTriangles`, atlas `scene/political/fills/`), blended in a shader: the edge is exact too since 2026-10-16                                                                                                                                                                                        |
| the relief              | a flat image                                                                                                        | a 3D mesh, with the shore ramp (`data/shoreRamp`)                                                                                                                                                                                                                                                                                                                              |
| how a border is stroked | canvas strokes, every hand                                                                                          | three.js lines from `data/borderHands`' table, minus weight and a dotted pattern (`rules/known-issues/atlas.md`)                                                                                                                                                                                                                                                               |
| a vassal                | every polity in its own colour, with every border — and every vassal's band                                         | from afar a vassal wears its suzerain's colour and no border parts them; its own colour, its band and its border fade in by zoom (ATLAS-253, ATLAS-398) — levels from `data/homageLevels`, the zoom read by `scene/political/homageReveal`, one line layer per split level (`scene/political/borders/levelledBorderLayer`), the fills mixed across tint levels and the band revealed by the same detail (`scene/political/fills/fillShader`) |

**The direction**: geometry and decisions live in `core`; only the drawing — a 2D canvas on one side, the
GPU on the other — belongs to each application. A difference in the second table is either a rendering
choice (the relief) or a debt to close (the border weights).

## Scripts

```bash
pnpm dev                # Vite server + HMR — the atlas
pnpm dev:cartographer   # Vite server + HMR — the Cartographer
pnpm dev:cms            # the CMS (Payload + Next, port 3100) — the dev's server, never started by me
pnpm export:content     # the CMS's places and events into the atlas's content file
pnpm seed:cms           # seeds a CMS base — never on his (it ran on it once, 27/10)
pnpm format:check       # prettier --check, a job of the CI
pnpm build              # turbo build: every app, each waiting on its own type-check
pnpm preview            # preview the atlas build
pnpm type-check         # turbo type-check: one tsc per package
pnpm lint               # turbo lint: one eslint per package, each with its own config
pnpm test               # turbo test: one vitest per package, environments differ on purpose
pnpm coverage           # turbo coverage, then merge every package's lcov report into one
```

**`dev` is not `turbo dev`** on purpose: that would start every dev server at once, which is a surprise
rather than a service. Each app is named explicitly.

**`coverage` merges rather than produces.** Each package writes its own `lcov.info` with paths relative to
_itself_ (`SF:src/…`), and Sonar resolves them against the repository root — so pointed at them directly it
would find nothing and report **0 % with no error**. `scripts/merge-coverage.mjs` rewrites every path and
concatenates, so `sonar-project.properties` still reads one report. Verified: 98 paths, all resolving.

## 3D Pipeline (Milestone 1)

1. **Heightmap → relief**: load the B&W bitmap, subdivided `PlaneGeometry`, **CPU** displacement
   (read pixels → per-vertex `z`, `computeVertexNormals()`). CPU because raycasting must hit the real
   relief (GPU displacement is invisible to the raycaster).
2. **Texture**: `material.map` carries the baked terrain colour, UV-aligned on the plane; the countries' fills are separate meshes laid over the relief (`scene/political/fills/`).
3. **Navigation**: camera moved with arrow keys (map-style pan).
4. **Picking**: `Raycaster` on click → intersection → camera fly-to (tween position + target).

## Data Layers (Milestones 2+)

- **Physical relief**: stable over time (a single heightmap).
- **Historical regions**: versioned by date — one folder per year under `packages/atlas/public/years/` (`1100/`, listed in `index.json`), written by the Cartographer.
  The "click → region at time T" binding relies on this layer, not on the raw heightmap polygons.

## Git & Commits

Conventional commits. Format: `type(scope): subject` (lowercase, no trailing period, ≤ 100 chars).
Types: `build chore ci docs feat fix perf refactor revert style test`.
Scopes: by changed path, as `/commit` maps them.

## Forbidden

```
❌ console.log              → console.warn / console.error
❌ explicit any             → strict TypeScript
❌ guessing a three.js API  → verify via opensrc/three or the web
❌ GPU leak                 → dispose() geometries/materials/textures on teardown
❌ global singleton         → inject renderer/scene/camera (DI)
```
