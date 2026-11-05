import { createToaster } from '@fubaritico/behaviors'
import { createToastApi } from '@fubaritico/react/Toast'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { createFetchContentSource } from '@europe-historical-atlas/core/data/contentSource'
import { createFetchHeightmapSource } from '@europe-historical-atlas/core/data/heightmap'
import { createFetchLandMaskSource } from '@europe-historical-atlas/core/data/landMask'
import { AUTOMATIC_PALETTE } from '@europe-historical-atlas/core/data/regionPalette'
import { createFetchRiverSource } from '@europe-historical-atlas/core/data/riverSource'
import { cloneYearDocument } from '@europe-historical-atlas/core/editor/yearDocument'
import { pickLocale } from '@europe-historical-atlas/core/i18n/locale'
import ComputeWorker from '@europe-historical-atlas/core/pipeline/computeWorker?worker'
import { DEFAULT_TERRAIN_OPTIONS } from '@europe-historical-atlas/core/pipeline/terrainOptions'
import { createWorkerMapCompute } from '@europe-historical-atlas/core/pipeline/workerCompute'
import { fetchWithin } from '@europe-historical-atlas/core/utils/fetchWithin'

import { createHistoryRelay } from './canvas/history/historyRelay'
import { CHROME_PAINT_STYLE } from './canvas/paint/style'
import { YEAR_WRITE_ROUTE } from './devServer/yearWriteRoute'
import { shortcutText } from './i18n/commandKeys'
import { createLocaleStore } from './i18n/localeStore'
import { bakeToBitmap, loadBackdrop } from './loaders/backdropSource'
import { CONTENT_URL, loadCities } from './loaders/cityLoad'
import { loadVectorLayers } from './loaders/vectorLayers'
import { createAlarmBoard } from './persistence/alarmBoard'
import { AUTOSAVE_DELAY_MS, createAutosaveKeeper } from './persistence/autosaveKeeper'
import { writeCopyThenMap } from './persistence/autosaveWrite'
import { carryView, takeCarriedView } from './persistence/carriedView'
import { keepClipboard, keptClipboard } from './persistence/clipboardStorage'
import { changeMap } from './persistence/mapChange'
import { routeNotices } from './persistence/noticeRouter'
import { addressForMap, openingMapOf } from './persistence/openingMap'
import { readPanelLayout, writePanelLayout } from './persistence/panelLayoutStorage'
import { persistenceWords } from './persistence/persistenceWords'
import { createQuestionRelay } from './persistence/questionRelay'
import { createResultRelay } from './persistence/resultRelay'
import { installSaveShortcut } from './persistence/saveShortcut'
import { wantsSlowWrites, writesFetch } from './persistence/slowWrites'
import { createDevServerYearArchive } from './persistence/yearArchive'
import { createYearSession } from './persistence/yearSession'
import { createHeldClipboard } from './state/heldClipboard'
import { openEmptyYear } from './state/openEmptyYear'
import { PANEL_IDS } from './state/panelsSlice'
import { createPolityColourSource } from './state/polityColourSource'
import { createCartographerStore } from './state/store'
import { AlarmDialog } from './ui/components/AlarmDialog'
import { Editor } from './ui/components/Editor'
import { ErrorBoundary, ZoneBreaksContext, readZoneBreaks } from './ui/components/ErrorBoundary'
import { LocaleProvider } from './ui/components/LocaleProvider'
import { MapDialog } from './ui/components/MapDialog'
import { NoticeToaster, noticeToasts } from './ui/components/NoticeToaster'
import { OverwriteDialog } from './ui/components/OverwriteDialog'
import { PageHeading } from './ui/components/PageHeading'
import { SaveAsDialog } from './ui/components/SaveAsDialog'
import { SaveFirstDialog } from './ui/components/SaveFirstDialog'
import { PlatformContext } from './ui/i18n/platformContext'
import { arrangeSelected, arrangeWords } from './ui/utils/arrange'
import { listenForCommand, shownPlatform } from './ui/utils/commandListener'
import { clipboardWords, copySelection, heldSentence } from './ui/utils/copySelection'
import { createDialogueOpener } from './ui/utils/dialogueOpener'
import { createMapNameStore } from './ui/utils/mapNameSource'
import { pasteClipboard } from './ui/utils/pasteClipboard'
import { listenForStackingKeys } from './ui/utils/stackingShortcut'
import { UNFRAMED } from './viewport/viewport'
import { WIKIDATA_ENDPOINT, createWikidataApiSource } from './wikidata/wikidataSource'

// Every sheet, in order, through one module the workbench imports too — see `ui/styles/sheets.ts`.
import './ui/styles/sheets'

import type { SaveFirstAnswer } from './persistence/mapChange'
import type { OverwriteQuestion } from './persistence/yearSession'
import type { ProgressReport } from '@europe-historical-atlas/core/pipeline/mapCompute'
import type { ReactToastContent } from '@fubaritico/react/Toast'

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

/** The map the editor opens on when the address names none — the published map of 1100, the first century (P3). */
const FIRST_MAP = '1100'

/**
 * The map this page edits: `?map=1100-backup-2026-11-02` in the address, written by *Open…* and *Save as…*
 * (`persistence/mapChange.ts`), or the first map. A `map` that cannot be a map's name throws here, before anything
 * mounts — said on the console rather than opening 1100 in its place (`persistence/openingMap.ts`).
 */
const MAP = openingMapOf(window.location.search, FIRST_MAP)

/** The map's name as the chrome reads it — *Save as…* changes it without a reload. */
const mapName = createMapNameStore(MAP)

/**
 * The view the previous map was left on, when *Open…* brought the page here (`s19`): the map opens on it rather than
 * on the whole backdrop. Taken once — a plain reload opens on the opening framing.
 */
const CARRIED_VIEW = takeCarriedView(window.sessionStorage)

const store = createCartographerStore({
  edition: {
    // The year of a map is in its files; until they are read, the page holds an empty 1100, never saved as such.
    document: openEmptyYear(1100),
    clone: cloneYearDocument,
  },
  // Opened unframed on purpose, unless a view was carried from the previous map: nothing can know what fits until the
  // canvas has a box, and the canvas replaces an unframed view at its first sizing, and holds a carried one. See
  // `UNFRAMED`.
  viewport: { viewport: CARRIED_VIEW ?? UNFRAMED },
})

// `{Cities}` (CARTO-193): the contribution's cities, read once beside the backdrop — guides, never part of the year.
void loadCities(createFetchContentSource(CONTENT_URL), store.getState())

// CARTO-342: the panels where the author left them last time, kept at each change of the layout.
const keptLayout = readPanelLayout(window.localStorage, PANEL_IDS)
if (keptLayout !== null) store.getState().setPanelLayout(keptLayout)
store.subscribe(
  (state) => state.panelLayout,
  (layout) => {
    writePanelLayout(window.localStorage, layout)
  }
)

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
 * @param onProgress - told each phase of the bake before it runs, for the waiting notice's bar
 * @returns the baked backdrop and the coastline and river layers projected into its frame
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
  fetch: (input, init) => fetchWithin(input, init),
  endpoint: WIKIDATA_ENDPOINT,
})

/** The writes of the maps and of their autosaves — slowed by `?slow=save` in development (REPO-275). */
const writeFetch = writesFetch(
  (input, init) => fetchWithin(input, init),
  wantsSlowWrites(window.location.search, import.meta.env.DEV),
  (ms) =>
    new Promise((resolve) => {
      window.setTimeout(resolve, ms)
    })
)
const results = createResultRelay()
/**
 * What the year on disk says — a toast, or the alarm dialogue when the work may be lost or was not done (the dev,
 * 2026-10-24: the status bar is the tool's). The Cartographer's own stack of toasts, not the page's shared one.
 */
const toaster = createToaster<ReactToastContent>({ uid: 'cartographer' })
const alarms = createAlarmBoard()
const notices = routeNotices({ toasts: noticeToasts(createToastApi(() => toaster)), alarms })
/**
 * The language the Cartographer speaks: the browser's when it is French, English otherwise (the dev,
 * 2026-10-21) — held in a store, since a switch will change it (ATLAS-266). The page says which, so a screen
 * reader pronounces it right, and keeps saying it when it changes.
 */
const localeStore = createLocaleStore(pickLocale(navigator.languages))
document.documentElement.lang = localeStore.get()
localeStore.subscribe(() => {
  document.documentElement.lang = localeStore.get()
})

/**
 * The words of the year on disk, for its toasts and its alarms — read at each sentence, in the language of the moment.
 * @returns the words, in the language the store holds now
 */
const diskWords = () => persistenceWords(localeStore.get())

/** ‹ctrl+S› over a year changed on disk asks first (CARTO-238, rung 3) — answered in `OverwriteDialog`. */
const overwriteQuestions = createQuestionRelay<OverwriteQuestion>('a save is already asking')
/** The maps on disk: read and written by the session, listed by *Open…*. */
const yearArchive = createDevServerYearArchive({
  fetch: writeFetch,
  yearsBase: '/years',
  writeRoute: YEAR_WRITE_ROUTE,
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
 * server only (`vite.config.ts`), so the built site answers a save with an error, said in the alarm dialogue.
 */
const yearSession = createYearSession({
  store,
  archive: yearArchive,
  map: MAP,
  // *Save as…* made the page another map: the address and the top bar follow, with no reload.
  onMapChanged: (map) => {
    mapName.set(map)
    window.history.replaceState(null, '', addressForMap(window.location.search, map))
  },
  report: notices,
  words: diskWords,
  confirmOverwrite: overwriteQuestions.ask,
  now: () => new Date(),
  timers: {
    set: (run, delayMs) => window.setTimeout(run, delayMs),
    clear: (handle) => {
      window.clearTimeout(handle)
    },
  },
})
/**
 * The automatic save — the page written as `years/<map>.autosave.<time of opening>` two seconds after each gesture,
 * one folder per opening, kept (the dev, 2026-11-02; `persistence/autosaveKeeper.ts`). Started once the map is open
 * and saving is allowed: an autosave of an empty or unreadable page would only be noise in *Open…*.
 */
const autosaveKeeper = createAutosaveKeeper({
  store,
  // The copy `<map>.autosave.<date>`, then the map open itself (the dev, 2026-11-02: "you keep everything").
  write: writeCopyThenMap({
    saveCopy: (document, map) => yearArchive.save(document, map, { overwrite: true }),
    saveMap: () => yearSession.saveSilently(),
  }),
  map: () => yearSession.map(),
  delayMs: AUTOSAVE_DELAY_MS,
  now: () => new Date(),
  timers: {
    set: (run, delayMs) => window.setTimeout(run, delayMs),
    clear: (handle) => {
      window.clearTimeout(handle)
    },
  },
  report: notices,
  words: diskWords,
})
void yearSession.openOnStartup().then(() => {
  if (yearSession.phase() === 'ready') autosaveKeeper.start()
})
/** Save the map — ‹ctrl+S› anywhere, and the top bar's `[Save]`: one call, two triggers. */
const handleSave = (): void => {
  void yearSession.save()
}
installSaveShortcut(window, handleSave)

/** *Open…*'s dialogue, and *Save as…*'s — one opener per dialogue. */
const mapPicker = createDialogueOpener()
const saveAsPicker = createDialogueOpener()

/** *Open…* asks whether to save the map open when it holds changes (`s19`) — answered in `SaveFirstDialog`. */
const saveFirstQuestions = createQuestionRelay<string, SaveFirstAnswer>(
  'opening a map is already asking'
)

/**
 * Open another map: ask whether to save the map open when it changed, carry the view, then reload on the map chosen —
 * or say why the page stays.
 * @param map - the map chosen in the dialogue
 */
const handleOpenMap = (map: string): void => {
  void changeMap(
    {
      session: {
        map: () => yearSession.map(),
        isModified: () => yearSession.isModified(),
        // Saved as ‹ctrl+S› saves.
        save: () => yearSession.save(),
      },
      version: () => store.getState().version,
      askSaveFirst: saveFirstQuestions.ask,
      carryView: () => {
        carryView(window.sessionStorage, store.getState().viewport)
      },
      search: window.location.search,
      go: (address) => {
        window.location.assign(address)
      },
      report: notices,
      words: diskWords,
    },
    map
  )
}

/**
 * *Save as…*: the session saves the map open, then writes the page under the name, and the page goes on as that map —
 * its autosave following it under the new name.
 * @param name - the name typed
 * @returns done, or the refusal the form shows
 */
const handleSaveAs = (name: string) => yearSession.saveAs(name)

/** *Save a copy*: the page written as `<map>.copy.<date and time>`, the page staying its map. */
const handleSaveCopy = (): void => {
  void yearSession.saveCopy()
}
// ‹cmd+↑ ↓›, with ‹shift› to the end: the selected polity up or down the stacking order, from anywhere.
listenForStackingKeys(document, (move) => {
  arrangeSelected(store.getState(), move, results.say, arrangeWords(localeStore.get()))
})

/** The system the shortcuts are shown for, read once (CARTO-345, the shortcut converter). */
const PLATFORM = shownPlatform(navigator)

/**
 * The words of the clipboard, in the language of the moment, with the paste shortcut as this system writes it.
 * @returns the words
 */
const clipboardWordsNow = () =>
  clipboardWords(localeStore.get(), shortcutText('paste', PLATFORM, localeStore.get()).shown)

/** What the clipboard holds as this map opens — said, so the author sees what ‹cmd+V› will paste. */
const HELD = keptClipboard(window.sessionStorage)
if (HELD !== null) results.say(heldSentence(HELD, clipboardWordsNow()))

/**
 * What the clipboard holds — kept in the tab for the next map, held for this page: what ‹cmd+V› pastes and what lights
 * Édition › Coller les entités. One writer for both.
 */
const clipboard = createHeldClipboard(HELD, (content) =>
  keepClipboard(window.sessionStorage, content)
)

/** Copy the stretch or the polity selected, kept in the tab for the next map (CARTO-345) — ‹cmd+C› and Édition › Copier. */
const handleCopy = (): void => {
  copySelection(store.getState(), {
    map: yearSession.map(),
    keep: clipboard.hold,
    say: results.say,
    words: clipboardWordsNow(),
  })
}
listenForCommand(document, 'copy', handleCopy)

/** Paste what the clipboard holds — polities into this map, a stretch onto the polity selected — one step (CARTO-345). */
const handlePaste = (): void => {
  const { document, target, pastePolities, pasteStretch, chooseTarget } = store.getState()
  pasteClipboard({
    content: clipboard.get(),
    document,
    target,
    pastePolities,
    pasteStretch,
    chooseTarget,
    say: results.say,
    words: clipboardWordsNow(),
  })
}
listenForCommand(document, 'paste', handlePaste)

// ‹cmd+O› and ‹cmd+shift+S›: *Open…* and *Save as…*, as their buttons and the menu (CARTO-345).
listenForCommand(document, 'open', mapPicker.open)
listenForCommand(document, 'saveAs', saveAsPicker.open)

/**
 * The canvas's undo and redo, for the document bar's buttons — gesture first, as the keys (ARCH-101). Built
 * here because neither end owns the other: the controller registers once the backdrop is baked.
 */
const history = createHistoryRelay()

/**
 * The zones to make fail on purpose, `?break=polities-panel` in the address, so a boundary's fallback can be seen
 * in its real place (the dev, 2026-10-22). **Development only**: a build turns `import.meta.env.DEV` into `false`
 * and drops the reading, so no address can break the published Cartographer.
 */
const zoneBreaks = import.meta.env.DEV ? readZoneBreaks(window.location.search) : new Set<never>()

createRoot(container).render(
  <StrictMode>
    <LocaleProvider store={localeStore}>
      <PlatformContext value={PLATFORM}>
        <ZoneBreaksContext value={zoneBreaks}>
          <ErrorBoundary zone="cartographer">
            <Editor
              onOpen={mapPicker.open}
              onSave={handleSave}
              onSaveAs={saveAsPicker.open}
              onSaveCopy={handleSaveCopy}
              onCopy={handleCopy}
              onPaste={handlePaste}
              clipboard={clipboard}
              mapName={mapName}
              history={history}
              heading={<PageHeading store={store} />}
              store={store}
              load={loadTheBackdrop}
              style={CHROME_PAINT_STYLE}
              colours={colours}
              wikidata={wikidata}
              results={results}
            />
            <OverwriteDialog questions={overwriteQuestions} now={() => new Date()} />
            <AlarmDialog alarms={alarms} />
            <NoticeToaster toaster={toaster} />
            <MapDialog
              picker={mapPicker}
              source={yearArchive}
              currentMap={yearSession.map}
              onOpen={handleOpenMap}
            />
            <SaveFirstDialog questions={saveFirstQuestions} />
            <SaveAsDialog picker={saveAsPicker} saveAs={handleSaveAs} />
          </ErrorBoundary>
        </ZoneBreaksContext>
      </PlatformContext>
    </LocaleProvider>
  </StrictMode>
)
