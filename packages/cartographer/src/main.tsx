import { createToaster } from '@fubaritico/behaviors'
import { createToastApi } from '@fubaritico/react/Toast'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { createFetchContentSource } from '@europe-historical-atlas/core/data/contentSource'
import { AUTOMATIC_PALETTE } from '@europe-historical-atlas/core/data/regionPalette'
import { cloneYearDocument } from '@europe-historical-atlas/core/data/yearDocument'
import { pickLocale } from '@europe-historical-atlas/core/i18n/locale'
import ComputeWorker from '@europe-historical-atlas/core/pipeline/computeWorker?worker'
import { createWorkerMapCompute } from '@europe-historical-atlas/core/pipeline/workerCompute'
import { createAfterPaint } from '@europe-historical-atlas/core/utils/afterPaint'
import { fetchWithin } from '@europe-historical-atlas/core/utils/fetchWithin'

import { createHistoryRelay } from './canvas/history/historyRelay'
import { CHROME_PAINT_STYLE } from './canvas/paint/style'
import { CMS_SESSION_ROUTE, CMS_TERRITORY_ROUTE } from './devServer/cmsRoutes'
import { REFUSAL_EVENT } from './devServer/refusalJournalRoute'
import { YEAR_WRITE_ROUTE } from './devServer/yearWriteRoute'
import { shortcutText } from './i18n/commandKeys'
import { createLocaleStore } from './i18n/localeStore'
import { CONTENT_URL, loadCities } from './loaders/cityLoad'
import { createEditorBackdropLoad } from './loaders/editorBackdrop'
import { preparedBackdrop } from './loaders/preparedBackdrop'
import { createAlarmBoard } from './persistence/alarmBoard'
import { autosaveFollowsSession } from './persistence/autosaveFollowsSession'
import { AUTOSAVE_DELAY_MS, createAutosaveKeeper } from './persistence/autosaveKeeper'
import { writeCopyThenMap } from './persistence/autosaveWrite'
import { carryView, takeCarriedView } from './persistence/carriedView'
import { keepClipboard, keptClipboard } from './persistence/clipboardStorage'
import { guardedStorage } from './persistence/guardedStorage'
import { createMapGestures } from './persistence/mapGestures'
import { routeNotices } from './persistence/noticeRouter'
import { createTabMapKeeper, keptOpenMap } from './persistence/openMapStorage'
import { readPanelLayout, writePanelLayout } from './persistence/panelLayoutStorage'
import { persistenceWords } from './persistence/persistenceWords'
import { createQuestionRelay } from './persistence/questionRelay'
import { journalRefusals } from './persistence/refusalJournal'
import { createResultRelay } from './persistence/resultRelay'
import { installSaveShortcut } from './persistence/saveShortcut'
import { createSignOut } from './persistence/signOut'
import { wantsSlowWrites, writesFetch } from './persistence/slowWrites'
import { windowTimers } from './persistence/windowTimers'
import { createDevServerYearArchive } from './persistence/yearArchive'
import { createYearSession } from './persistence/yearSession'
import { summariseClipboard } from './state/clipboardSlice'
import { createHeldClipboard } from './state/heldClipboard'
import { keepCityFilters } from './state/keepCityFilters'
import { keepListView } from './state/keepListView'
import { keepView } from './state/keepView'
import { openEmptyYear } from './state/openEmptyYear'
import { PANEL_IDS } from './state/panelsSlice'
import { createPolityColourSource } from './state/polityColourSource'
import { createCartographerStore } from './state/store'
import { AlarmDialog } from './ui/components/AlarmDialog'
import { ChromeContexts } from './ui/components/ChromeContexts'
import { Editor } from './ui/components/Editor'
import { ErrorBoundary, ZoneBreaksContext, readZoneBreaks } from './ui/components/ErrorBoundary'
import { LocaleProvider } from './ui/components/LocaleProvider'
import { MapDialog } from './ui/components/MapDialog'
import { NewMapDialog } from './ui/components/NewMapDialog'
import { NoticeToaster, noticeToasts } from './ui/components/NoticeToaster'
import { OverwriteDialog } from './ui/components/OverwriteDialog'
import { PageHeading } from './ui/components/PageHeading'
import { SaveAsDialog } from './ui/components/SaveAsDialog'
import { SaveFirstDialog } from './ui/components/SaveFirstDialog'
import { SheetPasteDialog } from './ui/components/SheetPasteDialog'
import { arrangeSelected, arrangeWords } from './ui/utils/arrange'
import { listenForCommand, shownPlatform } from './ui/utils/commandListener'
import {
  answerCopyRequest,
  clipboardWords,
  copySelection,
  copySheetOfSelection,
  heldSentence,
} from './ui/utils/copySelection'
import { createDialogueOpener } from './ui/utils/dialogueOpener'
import { createMapNameStore } from './ui/utils/mapNameSource'
import { pasteClipboard } from './ui/utils/pasteClipboard'
import { listenForStackingKeys } from './ui/utils/stackingShortcut'
import { pageCms, startSession, whenSignedIn } from './ui/utils/startSession'
import { whenMapOpen } from './ui/utils/whenMapOpen'
import { UNFRAMED } from './viewport/viewport'
import { WIKIDATA_ENDPOINT, createWikidataApiSource } from './wikidata/wikidataSource'

// Every sheet, in order, through one module the workbench imports too — see `ui/styles/sheets.ts`.
import './ui/styles/sheets'

import type { SaveFirstAnswer, SaveFirstReason } from './persistence/mapChange'
import type { OverwriteQuestion, YearSession } from './persistence/yearSession'
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

/**
 * Every refusal of the Cartographer copied to the dev server's journal, `files/cartographer-refusals.log` (the dev,
 * 2026-11-13: a gesture blocked, its reason only in a console nobody reads). In development only — the built editor
 * has no server to send it to — and installed before the editor mounts, where every gesture's refusal is written. Put
 * back if this module is ever replaced in place, so the console is never wrapped twice.
 */
if (import.meta.hot) {
  const hot = import.meta.hot
  hot.dispose(journalRefusals(console, hot.send.bind(hot, REFUSAL_EVENT)))
}

if (!container) {
  throw new Error('Cartographer: #root is missing from index.html — nothing to mount into.')
}

// The tab's storage, guarded as the page's is (CARTO-427, review): the view is written at every change, and a browser
// refusing it keeps nothing, said once in the console.
const tabStorage = guardedStorage(() => window.sessionStorage)

/**
 * The map this tab edits — kept in the tab by *Open…*, *Save as…* and « Nouvelle carte » (`persistence/openMapStorage`),
 * never in the address (the dev, 2026-11-25, CARTO-536) — or `null`: no map is open, and the start screen shows. No map
 * opens by itself (the dev: « je veux pas de fichier par défaut »).
 */
const MAP = keptOpenMap(tabStorage)

/** The map's name as the chrome reads it — *Save as…* changes it without a reload; `null` on the start screen. */
const mapName = createMapNameStore(MAP)

/**
 * The view last on screen in this tab — the previous map's, when *Open…* brought the page here (`s19`), or this one's
 * before a reload (CARTO-427): the map opens on it rather than on the whole backdrop.
 */
const CARRIED_VIEW = takeCarriedView(tabStorage)

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

// The page's storage, guarded (CARTO-371): the browser refusing it keeps nothing, said once in the console.
const pageStorage = guardedStorage(() => window.localStorage)

// CARTO-342: the panels where the author left them last time, kept at each change of the layout.
const keptLayout = readPanelLayout(pageStorage, PANEL_IDS)
if (keptLayout !== null) store.getState().setPanelLayout(keptLayout)
store.subscribe(
  (state) => state.panelLayout,
  (layout) => {
    writePanelLayout(pageStorage, layout)
  }
)

// CARTO-371: the cities' filters as the author left them, kept at each tick.
keepCityFilters(store, pageStorage)

// CARTO-427: what the lists show, and the view, as the author left them — kept at each change, put back at a reload.
keepListView(store, pageStorage)
keepView(store, tabStorage)

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

/** The editor's backdrop: the relief baked by the worker, the coast and the rivers projected (`loaders/editorBackdrop`). */
const loadTheBackdrop = createEditorBackdropLoad({
  compute,
  afterPaint: createAfterPaint({
    hidden: () => document.visibilityState === 'hidden',
    requestFrame: (callback) => {
      window.requestAnimationFrame(callback)
    },
    queueTask: (callback) => {
      window.setTimeout(callback, 0)
    },
  }),
})

/**
 * The backdrop, prepared from the page's opening — behind the sign-in screen, its seconds not added after signing in
 * (CARTO-535, the dev's table of 2026-11-25) — and joined by the map when it mounts, after signing in as after signing in
 * again.
 */
const backdrop = preparedBackdrop(loadTheBackdrop)
// Not on the start screen: opening a map reloads the page, so a backdrop baked here would be thrown away.
if (MAP !== null) backdrop.prepare()

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

// A warning the canvas raised — a suzerain left uncarved, its outline open — goes to the warning dialogue (the dev,
// 2026-11-05: « c'est indiqué par une modale d'avertissement »).
store.subscribe(
  (state) => state.warning,
  (warning) => {
    if (warning !== null) alarms.raise({ topic: 'carving', text: warning.text, sign: 'warning' })
  }
)
// An error the canvas raised — an overlap the geometry refused to compute — goes to the same dialogue, under the error
// sign (the dev, 2026-11-06: « que ça déclenche une modale d'erreur »).
store.subscribe(
  (state) => state.error,
  (error) => {
    if (error !== null) alarms.raise({ topic: 'overlap', text: error.text, sign: 'error' })
  }
)
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

/**
 * The map open, kept in the tab (CARTO-536): a reload on a map or on the start screen; a browser refusing the tab's
 * storage changes nothing, said in the error dialogue (review ARCH-001 of 2026-11-25).
 */
const tabMap = createTabMapKeeper({
  storage: tabStorage,
  reload: () => {
    window.location.reload()
  },
  refused: (map) => {
    console.error(
      `[Cartographer] the tab's storage refused ${map ?? 'the start screen'}: the page stays`
    )
    alarms.raise({ topic: 'year', text: diskWords().t('tabStorageRefused'), sign: 'error' })
  },
})

/**
 * Who is signed in, with the CMS's account (CARTO-535): the editor and every command act only once someone is. An
 * answer of the dev server the page cannot read opens the error dialogue (the dev: the user always gets a feedback).
 */
const session = startSession(CMS_SESSION_ROUTE, () => {
  alarms.raise({ topic: 'session', text: diskWords().t('sessionBroken'), sign: 'error' })
})

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
const yearSession: YearSession | null =
  MAP === null
    ? null
    : createYearSession({
        store,
        archive: yearArchive,
        map: MAP,
        // *Save as…* made the page another map: the tab and the top bar follow, with no reload.
        onMapChanged: (map) => {
          mapName.set(map)
          tabMap.follow(map)
        },
        report: notices,
        words: diskWords,
        confirmOverwrite: overwriteQuestions.ask,
        now: () => new Date(),
        timers: windowTimers,
      })

/**
 * The automatic save — the page written as `years/<map>.autosave.<time of opening>` two seconds after each gesture,
 * one folder per opening, kept (the dev, 2026-11-02; `persistence/autosaveKeeper.ts`). Started once the map is open
 * and saving is allowed: an autosave of an empty or unreadable page would only be noise in *Open…*. None on the start
 * screen, where no map is open (the dev's table, CARTO-535).
 */
if (yearSession !== null) {
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
    timers: windowTimers,
    report: notices,
    words: diskWords,
  })
  // It runs while the map is open and someone is signed in — or was, until a session expired mid-drawing — and stops
  // while nobody is (CARTO-535, the dev's table of 2026-11-25)
  const autosave = autosaveFollowsSession(
    autosaveKeeper,
    session.store,
    () => yearSession.phase() === 'ready'
  )
  void yearSession.openOnStartup().then(autosave.follow)
}

/**
 * A command of the map open — signed in, and a map open (CARTO-535, CARTO-536); declined in the console otherwise.
 * @param command - the command's name, for the console
 * @param run - what it does with the map's session
 * @returns the command
 */
const onMap = (command: string, run: (mapSession: YearSession) => void): (() => void) =>
  whenSignedIn(session, command, whenMapOpen(yearSession, command, run))

/** Save the map — ‹ctrl+S› anywhere, and the top bar's `[Save]`: one call, two triggers. */
const handleSave = onMap('save', (mapSession) => {
  void mapSession.save()
})
installSaveShortcut(window, handleSave)

/** *Open…*'s dialogue, *Save as…*'s and « Nouvelle carte »'s — one opener per dialogue. */
const mapPicker = createDialogueOpener()
const saveAsPicker = createDialogueOpener()
const newMapPicker = createDialogueOpener()

/**
 * *Open…*, « Fermer la carte » and « Nouvelle carte » ask whether to save the map open when it holds changes (`s19`,
 * CARTO-536) — answered in `SaveFirstDialog`.
 */
const saveFirstQuestions = createQuestionRelay<SaveFirstReason, SaveFirstAnswer>(
  '« save first? » is already asking'
)

/**
 * « Se déconnecter »: a change not yet saved goes through « save first? », then the session closes (CARTO-535, the dev's
 * table of 2026-11-25). On the start screen no map is open, so nothing is asked. **Then the map is forgotten** and the
 * page reloads on the sign-in (the dev, same evening: signing in again reopened the map left — « se déconnecter ferme
 * la carte », the table said): the next sign-in lands on the start screen.
 */
const signOut = createSignOut({
  isModified: () => yearSession?.isModified() === true,
  save: () => (yearSession === null ? Promise.resolve(true) : yearSession.save()),
  askSaveFirst: saveFirstQuestions.ask,
  signOut: () => session.keeper.signOut().then(tabMap.forget),
  report: notices,
  words: diskWords,
})
const handleSignOut = (): void => {
  void signOut()
}

/** *Open…*, « Fermer la carte », « Nouvelle carte » and *Save as…*, with a map open or from the start screen (CARTO-536). */
const mapGestures = createMapGestures({
  session: yearSession,
  version: () => store.getState().version,
  askSaveFirst: saveFirstQuestions.ask,
  carryView: () => {
    carryView(tabStorage, store.getState().viewport)
  },
  reloadOn: tabMap.reloadOn,
  archive: yearArchive,
  emptyYear: openEmptyYear,
  report: notices,
  words: diskWords,
})
const handleOpenMap = (map: string): void => {
  void mapGestures.openMap(map)
}
const handleCloseMap = onMap('closeMap', () => {
  void mapGestures.closeMap()
})

/** *Save a copy*: the page written as `<map>.copy.<date and time>`, the page staying its map. */
const handleSaveCopy = onMap('saveCopy', (mapSession) => {
  void mapSession.saveCopy()
})
// ‹cmd+↑ ↓›, with ‹shift› to the end: the selected polity up or down the stacking order, from anywhere.
// Gated like every other command (review ARCH-004 of 2026-11-25): a polity still selected from before a sign-out would
// otherwise be moved in the pile with nobody signed in
listenForStackingKeys(document, (move) => {
  onMap('stacking', () => {
    arrangeSelected(store.getState(), move, results.say, arrangeWords(localeStore.get()))
  })()
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

/**
 * Where a copy goes and is said: the map's name, the tab's clipboard, the status bar, the words of the moment.
 * @param mapSession - the map's session
 * @returns the copy's dependencies
 */
const copyDeps = (mapSession: YearSession) => ({
  map: mapSession.map(),
  keep: clipboard.hold,
  say: results.say,
  words: clipboardWordsNow(),
})

/** Copy the points or the polity selected, kept in the tab for the next map (CARTO-345) — ‹cmd+C› and Édition › Copier. */
const handleCopy = onMap('copy', (mapSession) => {
  copySelection(store.getState(), copyDeps(mapSession))
})
listenForCommand(document, 'copy', handleCopy)

/** Copy the polity selected's sheet alone (the dev, 2026-11-05) — ‹shift+cmd+C› and « Copier la fiche ». */
const handleCopySheet = onMap('copySheet', (mapSession) => {
  copySheetOfSelection(store.getState(), copyDeps(mapSession))
})
listenForCommand(document, 'copySheet', handleCopySheet)

/** Paste what the clipboard holds — polities into this map, a stretch onto the polity selected — one step (CARTO-345). */
const handlePaste = onMap('paste', () => {
  pasteClipboard({
    ...store.getState(),
    content: clipboard.get(),
    say: results.say,
    words: clipboardWordsNow(),
  })
})
listenForCommand(document, 'paste', handlePaste)

// What the clipboard holds, said to the store, so a polity's menu and Édition can light their commands (CARTO-345).
const summarise = (): void => {
  store.getState().setHeld(summariseClipboard(clipboard.get()))
}
summarise()
clipboard.subscribe(summarise)

// A polity's menu (the dev, 2026-11-05): « Copier » and « Copier la fiche » copy that polity — whole, even with
// points selected, or its sheet alone; « Coller … » pastes onto it, as ‹cmd+V›.
store.subscribe(
  (state) => state.copyAsked,
  (asked) => {
    if (asked === null) return
    onMap('copy', (mapSession) => {
      store.getState().chooseTarget(asked.polity)
      answerCopyRequest(store.getState(), asked.what, copyDeps(mapSession))
    })()
  }
)
store.subscribe(
  (state) => state.pasteAsked,
  (asked) => {
    if (asked === null) return
    store.getState().chooseTarget(asked.polity)
    handlePaste()
  }
)

/**
 * ‹cmd+A› — Édition › Tout sélectionner (`open-outlines.md`): every point of the polity selected, the white arrow
 * taken. With none selected, the status bar says so.
 */
const handleSelectAll = onMap('selectAll', () => {
  const { target, askSelectAll } = store.getState()
  if (target === null) {
    console.warn('[Cartographer] select all refused: no polity selected.')
    results.say(clipboardWordsNow().clipboard('selectAllNoTarget'))
    return
  }
  askSelectAll()
})
listenForCommand(document, 'selectAll', handleSelectAll)

// ‹cmd+O›: *Open…*, as its button and the menu (CARTO-345) — on the start screen too, the one key there (CARTO-535's
// table). ‹cmd+shift+S›: *Save as…*, a map open only.
listenForCommand(document, 'open', whenSignedIn(session, 'open', mapPicker.open))
listenForCommand(document, 'saveAs', onMap('saveAs', saveAsPicker.open))

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
      <ChromeContexts platform={PLATFORM} cms={pageCms(session, CMS_TERRITORY_ROUTE, notices)}>
        <ZoneBreaksContext value={zoneBreaks}>
          <ErrorBoundary zone="cartographer">
            <Editor
              onOpen={mapPicker.open}
              onSave={handleSave}
              onSaveAs={saveAsPicker.open}
              onSaveCopy={handleSaveCopy}
              onNewMap={newMapPicker.open}
              onCloseMap={handleCloseMap}
              start={{ maps: yearArchive, now: () => new Date(), onOpenMap: handleOpenMap }}
              onCopy={handleCopy}
              onPaste={handlePaste}
              onSelectAll={handleSelectAll}
              onCopySheet={handleCopySheet}
              mapName={mapName}
              history={history}
              heading={<PageHeading store={store} />}
              store={store}
              load={backdrop.load}
              style={CHROME_PAINT_STYLE}
              colours={colours}
              wikidata={wikidata}
              results={results}
              session={session}
              onSignOut={handleSignOut}
            />
            <OverwriteDialog questions={overwriteQuestions} now={() => new Date()} />
            <AlarmDialog alarms={alarms} />
            <SheetPasteDialog store={store} clipboard={clipboard} say={results.say} />
            <NoticeToaster toaster={toaster} />
            <MapDialog
              picker={mapPicker}
              source={yearArchive}
              currentMap={mapName.get}
              onOpen={handleOpenMap}
            />
            <SaveFirstDialog questions={saveFirstQuestions} />
            <SaveAsDialog picker={saveAsPicker} saveAs={mapGestures.saveAs} />
            <NewMapDialog picker={newMapPicker} create={mapGestures.createMap} />
          </ErrorBoundary>
        </ZoneBreaksContext>
      </ChromeContexts>
    </LocaleProvider>
  </StrictMode>
)
