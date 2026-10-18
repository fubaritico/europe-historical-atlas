import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { createFetchHeightmapSource } from '@europe-historical-atlas/core/data/heightmap'
import { createFetchLandMaskSource } from '@europe-historical-atlas/core/data/landMask'
import { AUTOMATIC_PALETTE } from '@europe-historical-atlas/core/data/regionPalette'
import { createFetchRiverSource } from '@europe-historical-atlas/core/data/riverSource'
import { cloneYearDocument } from '@europe-historical-atlas/core/editor/yearDocument'
import ComputeWorker from '@europe-historical-atlas/core/pipeline/computeWorker?worker'
import { DEFAULT_TERRAIN_OPTIONS } from '@europe-historical-atlas/core/pipeline/terrainOptions'
import { createWorkerMapCompute } from '@europe-historical-atlas/core/pipeline/workerCompute'

import { bakeToBitmap, loadBackdrop } from './backdropSource'
import { createHistoryRelay } from './canvas/historyRelay'
import { CHROME_PAINT_STYLE } from './canvas/style'
import { arrangeSelected } from './components/arrange'
import { DraftRecoveryDialog } from './components/DraftRecoveryDialog'
import { Editor } from './components/Editor'
import { listenForStackingKeys } from './components/stackingShortcut'
import { DRAFTS_FOLDER, DRAFT_ROUTE } from './devServer/draftRoute'
import { YEAR_WRITE_ROUTE } from './devServer/yearWriteRoute'
import { DRAFT_DELAY_MS, createDraftKeeper } from './persistence/draftKeeper'
import { createDraftOffers } from './persistence/draftOffers'
import { offerDraft } from './persistence/draftRecovery'
import { openWithDraft, saveAndClearDraft } from './persistence/draftSession'
import { createDevServerDraftStore } from './persistence/draftStore'
import { createResultRelay } from './persistence/resultRelay'
import { installSaveShortcut } from './persistence/saveShortcut'
import { createDevServerYearArchive } from './persistence/yearArchive'
import { createYearSession } from './persistence/yearSession'
import { openEmptyYear } from './state/openEmptyYear'
import { createPolityColourSource } from './state/polityColourSource'
import { createCartographerStore } from './state/store'
import { loadVectorLayers } from './vectorLayers'
import { UNFRAMED } from './view/viewport'
import { WIKIDATA_ENDPOINT, createWikidataApiSource } from './wikidata/wikidataSource'

// Every sheet, in order, through one module the workbench imports too — see `styles/sheets.ts`.
import './styles/sheets'

import type { ProgressReport } from '@europe-historical-atlas/core/pipeline/mapCompute'

/**
 * The Cartographer's entry point, and its composition root: it builds the store and mounts the page.
 *
 * What it renders is a placeholder and says so: a landmark, a heading, and **the year read back out of the
 * store**, which is the smallest thing that makes `pnpm dev:cartographer` *show* that Vite, React, the JSX
 * transform and the cross-package import all hold. An empty `<StrictMode />` would have proved the first
 * three to a test and nothing at all to a human opening the page. The real screen arrives with the canvas and
 * the chrome; it will live in its own module, not here.
 *
 * **Why the year is read imperatively rather than through the hook.** The JSX is written inline because a
 * component declared in this file is one Fast Refresh cannot reload — that is what
 * `react-refresh/only-export-components` is for — and a hook needs a component to live in. So the value is
 * taken with `getState()`, which is also the honest shape for a value that cannot change before the first
 * paint. The hook itself is exercised under React in `state/editionSlice.test.ts`, with `renderHook`.
 *
 * **The copier is injected here, and that is the whole point of the factory.** Neither
 * `createCartographerStore` nor the edition slice imports `cloneYearDocument`; this root hands it over. A
 * store reached by `import` from a pure module is the global singleton `rules/modular-architecture.md`
 * forbids, and the undo line needs a copier whatever we do — so there was a seam to pass through regardless.
 *
 * **The store is built from slices, one per owner of a piece of state**, combined in `state/store.ts`, where
 * the middleware also lives and where the inventory of slices is kept. It is deliberately **not** repeated
 * here: this paragraph used to list them and was already wrong by two before anyone noticed, which is the
 * `ARCH-101` shape — a fact written in a second place nobody reopens. What belongs here is only why this
 * file has `edition:` and `viewport:` keys at all, and that is because those two slices have collaborators
 * to inject; a slice with no dependencies gets no key.
 *
 * `StrictMode` is kept, and it is not free: it double-invokes renders and effects in development to surface
 * impure ones. That is the defect a canvas editor produces most easily, since painting is a side effect and
 * the temptation is to do it during a render. Better it shouts now than once two canvases are wired.
 *
 * A missing `#root` **throws**, which is a decision rather than a detail (`rules/error-handling.md`): the
 * element is declared in `index.html`, so its absence means the HTML and this file disagree — a build fault,
 * not a runtime condition. The template's `getElementById('root')!` is the tempting alternative and the worse
 * one, since the assertion silences the check it appears to perform and `createRoot(null)` then fails inside
 * React with a message about something else. Creating a `div` to mount into would be worse still: the
 * application would run, detached, and nothing would say so.
 */
const container = document.getElementById('root')

if (!container) {
  throw new Error('Cartographer: #root is missing from index.html — nothing to mount into.')
}

/** The year the editor opens on. 1100 is the first century to be contributed (P3, measured against OHM). */
const FIRST_YEAR = 1100

/**
 * Off-screen but readable — the heading stays for a screen reader and leaves the canvas the whole surface.
 *
 * `display: none` would remove it from the accessibility tree, which is the opposite of the point: the
 * canvas carries only a name, so this heading is the only thing announcing what the page *is*.
 */
const visuallyHidden = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const

const store = createCartographerStore({
  edition: {
    document: openEmptyYear(FIRST_YEAR),
    clone: cloneYearDocument,
  },
  // Opened unframed on purpose: nothing can know what fits until the canvas has a box, and the canvas
  // replaces this at its first sizing. See `UNFRAMED`.
  viewport: { viewport: UNFRAMED },
})

/**
 * The compute the backdrop is baked through — a worker, so the ~1.8 s bake is nobody's frozen tab.
 *
 * **One import, because `core/pipeline` already holds it**: the same `computeWorker` the atlas spawns
 * (`atlas/src/main.ts`), reached with Vite's `?worker` suffix. Nothing here is Cartographer-specific,
 * which is the point of the port — the editor bakes the atlas's texture with the atlas's code.
 *
 * **The political half is never called**, so the terrain comes out bare: a bake paints whichever
 * political layer is installed, and none ever is. That is `s99`'s *"with the political tint cleared"*
 * obtained by not installing one, rather than by remembering to clear it.
 *
 * `onFatal` only reports. A worker that dies has already had every call in flight rejected, so the
 * author sees the failure in the canvas area; what this adds is the cause in the console, which the
 * rejection does not carry. Falling back to an inline compute would be a degraded mode nobody decided —
 * and it would be the 1.8 s freeze this worker exists to avoid.
 */
const compute = createWorkerMapCompute({
  spawn: () => new ComputeWorker(),
  onFatal: (error) => {
    console.error('Cartographer: the compute worker died while baking the backdrop.', error)
  },
})

/**
 * The assets, served over a relative URL exactly as the atlas loads them.
 *
 * Both paths are the Cartographer's own `publicDir`, which *is* the atlas's (`vite.config.ts`) — so
 * these are the same bytes the published map renders, not a copy of them.
 *
 * The atlas declares the same two strings in `mapPipeline.ts`, and they are left as two declarations
 * rather than shared through `core`: a deployment path is not domain code, and the cost of them drifting
 * is a loud `transport` failure at startup, not a silent wrong picture. Worth a line, not a module.
 */
const loadTheBackdrop = async (onProgress: ProgressReport) => {
  const backdrop = await loadBackdrop({
    heightmap: createFetchHeightmapSource('/heightmaps/europe-dem-z5'),
    landMask: createFetchLandMaskSource('/masks/europe-land'),
    compute,
    toImage: bakeToBitmap,
    options: DEFAULT_TERRAIN_OPTIONS,
    onProgress,
  })
  // After the bake, and reusing its mask rather than fetching three megabytes again. The order is not
  // arbitrary: the shoreline is traced through that mask, and the frame it is projected into is the one
  // the DEM declared — so neither can be had before the backdrop is.
  const vectors = await loadVectorLayers({
    mask: backdrop.mask,
    rivers: createFetchRiverSource('/rivers/europe-rivers.json'),
    frame: backdrop.frame,
  })
  return { backdrop, vectors }
}

/**
 * The polities' colours, for the canvas and every panel alike — one source, with the palette given here
 * and nowhere else, so a fill and the swatch beside its name cannot disagree.
 */
const colours = createPolityColourSource(AUTOMATIC_PALETTE)

/**
 * Wikidata, read by the polity form to propose names, dates and a suzerain, and to warn of an anachronism
 * (CARTO-243). The public API, anonymously: only the ids are sent. Down the props, like the colours.
 */
const wikidata = createWikidataApiSource({
  fetch: (input, init) => fetch(input, init),
  endpoint: WIKIDATA_ENDPOINT,
})

/**
 * The year on disk: opened when the editor starts, saved on ‹ctrl+S› — local mode, through the dev server
 * (`files/plans/cartographer/save-open-plan.md`).
 *
 * **Started here, in the entry module, and not in a component's effect**: a component remounts and its
 * effect re-runs, and `StrictMode` runs it twice on purpose — a second start-up read racing the first is
 * exactly the shape `known-issues.md` records for the backdrop. This runs once because a module runs once.
 *
 * `/years` is read with a plain GET, the folder the atlas reads too; the write route is served by the dev
 * server only (`vite.config.ts`), so the built site answers a save with an error, said in the status bar.
 */
const results = createResultRelay()
const yearSession = createYearSession({
  store,
  archive: createDevServerYearArchive({
    fetch: (input, init) => fetch(input, init),
    yearsBase: '/years',
    writeRoute: YEAR_WRITE_ROUTE,
  }),
  year: FIRST_YEAR,
  report: results.say,
})
/**
 * The draft — the work since the last ‹ctrl+S›, kept on disk a moment after every gesture (CARTO-238).
 *
 * **The order is the whole point, and it is one chain**: open the year, *then* offer the draft the previous
 * session left, *then* start keeping drafts. Started any earlier, the keeper's first write would overwrite
 * the draft the offer exists to give back — and it starts only when the offer leaves the way clear
 * (`persistence/draftSession.ts`).
 */
const drafts = createDevServerDraftStore({
  fetch: (input, init) => fetch(input, init),
  route: DRAFT_ROUTE,
})
const draftOffers = createDraftOffers()
const draftKeeper = createDraftKeeper({
  store,
  drafts,
  year: FIRST_YEAR,
  delayMs: DRAFT_DELAY_MS,
  now: () => new Date(),
  timers: {
    set: (run, delayMs) => window.setTimeout(run, delayMs),
    clear: (handle) => {
      window.clearTimeout(handle)
    },
  },
  report: results.say,
})
void openWithDraft({
  openYear: () => yearSession.openOnStartup(),
  offerDraft: () =>
    offerDraft({
      drafts,
      year: FIRST_YEAR,
      store,
      ask: draftOffers.ask,
      now: () => new Date(),
      report: results.say,
      draftsFolder: DRAFTS_FOLDER,
    }),
  keeper: draftKeeper,
  report: results.say,
})
/**
 * Save the year — ‹ctrl+S› anywhere, and the top bar's `[Save]`: one call, two triggers. A save that wrote
 * the year tells the keeper, which removes the draft unless the author drew since the save took the document.
 */
const handleSave = (): void => {
  void saveAndClearDraft({
    version: () => store.getState().version,
    save: () => yearSession.save(),
    keeper: draftKeeper,
  })
}
installSaveShortcut(window, handleSave)
// ‹cmd+↑ ↓›, with ‹shift› to the end: the selected polity up or down the stacking order, from anywhere.
listenForStackingKeys(document, (move) => {
  arrangeSelected(store.getState(), move, results.say)
})

/**
 * The canvas's undo and redo, for the document bar's buttons — gesture first, as the keys (ARCH-101). Built
 * here because neither end owns the other: the controller registers once the backdrop is baked.
 */
const history = createHistoryRelay()

createRoot(container).render(
  <StrictMode>
    <Editor
      name="Europe Historical Atlas Cartographer"
      onSave={handleSave}
      history={history}
      heading={<h1 style={visuallyHidden}>Cartographer — year {store.getState().document.year}</h1>}
      store={store}
      load={loadTheBackdrop}
      style={CHROME_PAINT_STYLE}
      label={`Map of the year ${String(store.getState().document.year)}, being edited`}
      colours={colours}
      wikidata={wikidata}
      results={results}
    />
    <DraftRecoveryDialog offers={draftOffers} />
  </StrictMode>
)
