# The atlas's `src/`, put in order — ATLAS-291

> The dev's call, 2026-10-27: *« on se retrouve avec le même défaut qu'il y avait dans le Cartographe, tout est mis à
> plat »* — he looked for where the two swords are declared and went round in circles between `eventMarkers`,
> `mapEventLayer` and the root. A chore: **nothing on screen changes**; what changes is that he finds things.

## What is wrong, measured 2026-10-27

- **21 files at the root of `src/`**, of four different trades: the running map (`viewport`, `frameLoop`), the
  loading (`mapPipeline`, `mapSources`, `mapContent`), the layers' wiring (`mapLayers`, `mapLayerBuilders`,
  `mapLayerContext`, `mapEventLayer`, `mapTribeLayer`, `tribePatches`, `eventPins`, `yearBorders`), the dev panel
  (`devPanel`, `devPanelCallbacks`, `devState`).
- **28 files flat in `scene/`**, of seven families: the relief, the sheet and its frame, the portolan decor, the
  lines, the political colour, the events, and a few shared helpers.
- **One subject spread over two levels**: an event icon runs `mapEventLayer` (root) → `eventIconMarkers` →
  `eventIcons` (where the swords are) → `eventIconSvg`, `iconHalo`, `eventMarkers` (all `scene/`). A tribe:
  `mapTribeLayer` and `tribePatches` at the root, `tribeLayer` in `scene/` — which imports *up* into the root.
- **Five files past 500 lines**: `devPanel` (594), `mapLayerBuilders` (577), `mapPipeline` (560), `mapControls`
  (513), `composedLineLayer` (511). `eventIcons` holds the three icons, their parts and their lights in one file.
- **Function bodies carry almost no comments**: the JSDoc says *what* a function is for, nothing says what each
  stretch of its body does.

## The rules of the layout

1. **One folder per thing on the map, holding its wiring and its three.js objects together.** Looking for the swords
   means opening `scene/events/icons/` — not following imports.
2. **One icon, one file** (*« une icône à la fois, chacune ses spécificités »*, 26/10): `swords.ts`, `tower.ts`,
   `crown.ts`, beside what they share. ATLAS-289 (instancing) then lands in one place.
3. **The root of `src/` holds `main.ts` and folders, nothing else.**
4. **Files are moved, not renamed** — **except where the name lies** (the dev, 2026-10-27): `eventMarkers.ts` drew the pin
   and also held the contract every marker answers to, so it became `markers.ts` (the contract) and `pin.ts` (the pin).
5. **Every function body longer than a few lines gets comments on its stretches** — what this stretch does, in plain
   English, for a reader who did not write it. Written in each file **as it moves**, not as a separate pass.
6. **The order is semantic, in the folders and in the files alike** (the dev, 2026-10-27: *« c'est un rangement à
   caractère sémantique que je t'ai demandé »*). A file holds **one idea**: the settings tuned on sight in one file, the
   arithmetic of facing the camera in another, the placement in a third — never all of them in the module that uses
   them. A kind of thing gets its own sub-folder (*« les meshes dans un sous-répertoire meshes »*). **Splitting is by
   meaning, not by length**: a long file that holds one idea stays whole, and a short one holding three is split. And
   not everything is scattered — where things belong together, they stay together.

## The target

```
src/
├── main.ts                 composition root — unchanged
├── app/                    the running map: viewport, frameLoop, mapInteraction, mapUi, assetMessages
├── loading/                what the map is made from, and the order it is paid in: mapPipeline (the façade),
│                           assets (where the files live), pipelineContext, compute (worker or this thread),
│                           stages/ (texture, political, terrain, rivers, startup), mapContent, yearBorders,
│                           computeLabels
├── sources/                what the map has been given so far: mapSources — a leaf the loading fills and the layers
│                           read (split from loading/ on 2026-10-27, so scene/ need not read loading/)
├── tunables/               the settings the whole map reads: devState, params/ (today's devParams/) — a leaf
├── devPanel/               the panel that shows them: devPanel (the assembly), panelContract, addControl, reset,
│                           folders/ (one per system, as tunables/params/), devPanelCallbacks
├── scene/                  everything drawn, one folder per family; each family holds its three.js objects AND
│   │                       its builder, `map…Layer` (how it is put on the map from the layers' context)
│   ├── layers/             the façade over all of it: mapLayers; layerContext (the handles and the context),
│   │                       frameLayers (what every frame updates), rebuildSurface (the one order), layerProjection,
│   │                       disposeHandle
│   ├── relief/             reliefMesh, mapEdge (its wall), terrainTexture, drapeProjection, mapReliefLayer
│   ├── lines/              lineLayer, polylines (chain geometry: offset, mitres, segments), depthBias
│   ├── waters/             riverLayer, mapRiverLayer, mapCoastLayer
│   ├── decor/              rose/ (compassRose, compassRoseSvg, mapRoseLayer), rhumbs/ (rhumbNetwork, mapRhumbLayer)
│   ├── sheet/              paperSheet, graticuleFrame, frameLabels, mapTitle, mapFrameLayer
│   ├── political/          tintOnRelief (what fills and tribes share), homageReveal,
│   │   │                   fills/ (fillBuffers, fillShader, fillLayer, mapFillLayer),
│   │   │                   borders/ (borderStrokes, composedLineLayer, levelledBorderLayer, mapBorderLayer),
│   │   │                   tribes/ (tribePatches, tribeBuffers, tribeShader, tribeLayer, mapTribeLayer)
│   ├── events/             mapEventLayer (the entry), eventPins (which events, where), markers (what every
│   │   │                   marker answers to), pin (the plain pin)
│   │   └── icons/          eventIconMarkers (the assembly), settings (how they stand), facing (turned to the camera,
│   │       │               swayed), crossFade (3D near, flat far), forms (an icon's place: its pose and its squares'),
│   │       │               iconInstances (the 3D icons as instances, ATLAS-289), billboards (facing squares as
│   │       │               instances), billboardMaterials (the halo's and the drawings'), slots, kinds, palette
│   │       ├── meshes/     the 3D models, one file per icon: swords, tower, crown; parts, iconModel (a kind's model,
│   │       │               built once, fused per colour), eventIcons (one icon, for the bench)
│   │       ├── flat/       the drawings seen from afar, one file per icon: swords, tower, crown; drawing (what a
│   │       │               drawing is), eventIconSvg (the SVG made from one)
│   │       └── light/      what detaches an icon from the map: lighting, halo
│   └── (root)              what several families share: world (the map's width), landMask (the land, or its
│                           fallback), screenScale, svgTexture, fadeHidden, debugRect
├── camera/  picking/  ui/  utils/  i18n/  bench/      unchanged
├── controls/               mapControls (the façade), mapControlsDrive (each frame's motion), mapControlsInput
│                           (keys, wheel, pointer; click vs drag), with cameraFlight, cameraFraming, focusMode
```

**The ESLint boundaries keep working** for `scene/`, `camera/`, `controls/`, `picking/` and `ui/`: their globs match
at any depth (`**/scene/**`). `app/`, `loading/` and `devPanel/` are new layers and get their row in
`eslint.config.js`, written from their measured imports and each **verified by breaking it**. `architecture.md`'s
tree is updated with the layout.

## The steps — each one alone, gate green, committed after he looks

| | what | why first |
| --- | --- | --- |
| 1 | **The events**: `scene/events/` and `icons/`, `eventIcons` cut into one file per icon, body comments | it is where he was lost, and ATLAS-289 builds on it |
| 2 | **The rest of `scene/`** by family, `tribePatches` and `mapTribeLayer` into `political/tribes/` | ends the import from `scene/` up into the root |
| 3 | **The root** into `app/`, `loading/`, `tunables/`, `devPanel/` (the settings are not the panel: the whole map reads them — split on 2026-10-27); their ESLint rows; `architecture.md` | the root holds `main.ts` and folders |
| 4 | **The long files left** split by meaning: `devPanel`, `mapPipeline`, `mapControls` (`mapLayerBuilders` and `composedLineLayer` went with step 2) | a split is easier to review once the file has its home |

Each step: the moves by `git mv` (history follows), imports rewritten, tests moved beside their file,
`pnpm type-check && pnpm lint && pnpm test`, `/review`, and **he opens the atlas** (`/`, `/icons.html`,
`/svg-icons.html`) to see that nothing moved on screen.

**Worth knowing**: his atlas server reloads the page at each move — harmless, the atlas holds nothing unsaved.

## Decided after the tidy-up (ATLAS-293)

- **The list of layers stays written out in `scene/layers/layerContext.ts`; no registry** (the dev, 2026-10-27:
  *« en termes de couches, on est pas mal »*). `LAYER_ROLES` gives each layer its role and fails type-check on a
  missing one. **Trigger to revisit**: the layers multiply — the countries' names, the rest of the render.
