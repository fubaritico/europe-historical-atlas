/**
 * The composition root: create, inject, connect, tear down. Nothing else.
 *
 * It held 567 lines of the map's own logic until 2026-09-17, which is how this codebase learned that
 * layer boundaries police *where* code lives and nothing polices *this* — anything needing two
 * collaborators at once landed here without ever breaking an import rule (ARCH-012). What is left is
 * wiring, and the rule is that it stays that way: if a line here takes data and returns data, it belongs
 * in a module that can be exercised with a literal.
 */

import { createTranslator } from '@europe-historical-atlas/core/i18n/catalogue'
import { pickLocale } from '@europe-historical-atlas/core/i18n/locale'
import ComputeWorker from '@europe-historical-atlas/core/pipeline/computeWorker?worker'

import { startFrameLoop } from './app/frameLoop'
import { createMapInteraction } from './app/mapInteraction'
import { createMapUi } from './app/mapUi'
import { pageAfterPaint } from './app/pageAfterPaint'
import { previewIcons } from './app/preview'
import { createQuietTime } from './app/quietTime'
import { createViewport } from './app/viewport'
import { bridgeYear } from './app/yearBridge'
import { panelDepsFor } from './devPanel/devPanelCallbacks'
import { NO_DEV_TOOLS, mountDevTools } from './devPanel/devTools'
import { ATLAS_MESSAGES } from './i18n'
import { bandsSource, fetchAuthoredYears } from './loading/assets'
import { createMapBuffer } from './loading/mapBuffer'
import { createMapPipeline } from './loading/mapPipeline'
// Vite resolves `?worker` into a constructor for the bundled worker module. It is the one
// bundler-specific line in the compute, and it lives here on purpose: the client that talks to the
// worker takes it as an injected `spawn`, so nothing below the composition root depends on Vite.
import { createSurfacePicker } from './picking/surfacePicker'
import { createStandardBlur as standardBlur } from './scene/blur/standardBlur'
import { canvasLabelDrawer } from './scene/cities/cityLabel'
import { canvasSeaLabelDrawer } from './scene/decor/seas/seaLabel'
import { createMapLayers } from './scene/layers/mapLayers'
import { NAME_FACE_URL } from './scene/political/names/nameFace'
import { createMapSources } from './sources/mapSources'
import { createAtlasStore, interfaceSideOf } from './state/atlasStore'
import { createDevState } from './tunables/devState'
import { mountInterface } from './ui/mountInterface'
import './ui/styles/sheets'

import type { QuietMap, QuietTime } from './app/quietTime'
import type { DevTools } from './devPanel/devTools'
import type { MapBuffer } from './loading/mapBuffer'
import type { MapSources } from './sources/mapSources'
import type { AtlasStore } from './state/atlasStore'
import type { Locale } from '@europe-historical-atlas/core/i18n/locale'

/**
 * The page's canvas the map is drawn on.
 * @returns it
 * @throws when the page has none — `index.html` declares it, so a miss is a broken page
 */
function sceneCanvas(): HTMLCanvasElement {
  const canvas = document.querySelector<HTMLCanvasElement>('#scene')
  if (!canvas) throw new Error('Canvas #scene not found in index.html')
  return canvas
}

/**
 * The map's layers, with the standard blur and the cities' names drawn in the countries' names' face — made once here,
 * so the face loads once, at the first name.
 * @param scene - the scene every layer is added to
 * @param dev - the live tunables
 * @param sources - what has been loaded so far
 * @param uploadUnseen - the viewport's way to send a map set aside to the GPU unseen (ATLAS-396)
 * @param locale - the reader's language, the seas' names written in it
 * @returns the layers
 */
function createLayers(
  scene: Parameters<typeof createMapLayers>[0]['scene'],
  dev: Parameters<typeof createMapLayers>[0]['dev'],
  sources: Parameters<typeof createMapLayers>[0]['sources'],
  uploadUnseen: Parameters<typeof createMapLayers>[0]['uploadUnseen'],
  locale: Locale
): ReturnType<typeof createMapLayers> {
  const cityLabels = canvasLabelDrawer(NAME_FACE_URL)
  const seaLabels = canvasSeaLabelDrawer(NAME_FACE_URL)
  return createMapLayers({
    scene,
    dev,
    sources,
    blurMethod: standardBlur(),
    cityLabels,
    seaLabels,
    locale,
    previewIcons: previewIcons(window.location.search),
    uploadUnseen,
  })
}

/**
 * The maps kept ready around the one shown — the dev's video buffer (ATLAS-333) — over the pipeline and the page's waits.
 * @param pipeline - what prepares a map aside and frees the others
 * @param quiet - the page's waits
 * @param years - the years having a map
 * @returns the buffer
 */
function bufferOver(
  pipeline: ReturnType<typeof createMapPipeline>,
  quiet: QuietTime,
  years: readonly number[]
): MapBuffer {
  return createMapBuffer({
    years,
    prepare: (year, isCurrent) => pipeline.prepareAside(year, isCurrent, quiet.whenQuiet),
    compute: (year) => {
      pipeline.computeAhead(year)
    },
    keepOnly: (kept) => {
      pipeline.keepYears(kept)
    },
    sleep: quiet.sleep,
  })
}

/**
 * The maps kept ready, following the year shown in the atlas's store.
 * @param store - the atlas's store
 * @param buffer - the maps kept ready
 * @returns the unsubscription
 */
function bufferFollows(store: AtlasStore, buffer: MapBuffer): () => void {
  return store.subscribe(
    (state) => state.shownYear,
    (shown) => {
      if (shown !== null) buffer.shown(shown)
    },
    { fireImmediately: true }
  )
}

/**
 * The map's side of the year: a year asked in the store set in the tunables and the dev panel, then drawn.
 * @param deps - the store, the tunables, the panel, the pipeline and the sources
 * @param deps.store - the atlas's store
 * @param deps.dev - the live tunables, whose political year the drawing reads
 * @param deps.tools - the developer's tools, whose year slider follows
 * @param deps.pipeline - what draws the year
 * @param deps.sources - the map's sources, whose year drawn settles the request
 * @returns the unsubscription
 */
function bridgeOver(deps: {
  store: AtlasStore
  dev: ReturnType<typeof createDevState>
  tools: Pick<DevTools, 'refresh'>
  pipeline: Pick<ReturnType<typeof createMapPipeline>, 'rebuildPolitical'>
  sources: Pick<MapSources, 'askedYear'>
}): () => void {
  return bridgeYear({
    store: deps.store,
    setYear: (year) => {
      deps.dev.political.year = year
      deps.tools.refresh()
    },
    draw: () => deps.pipeline.rebuildPolitical(),
    // The year drawn, not the one asked: a change overtaken or failing leaves the map where it is (review ARCH-007).
    drawnYear: () => deps.sources.askedYear,
  })
}

/**
 * Start the map, then tell the atlas's store the years it has and the year it laid first — the interface's year switch
 * shows its buttons from then on, so they never overtake the startup. The year goes through the store (ATLAS-392): the
 * switch and the dev panel's slider request it there, the bridge has the map draw it, the maps kept ready follow the year shown. The bridge listens from
 * the first moment, so the dev panel's slider — mounted before — may request a year during the startup, as it always
 * could: once the relief is loaded the map's political gate lets the newest drawing win; before, the drawing does
 * nothing and the request settles on the year drawn at that moment, which the startup then replaces (review QUAL-002,
 * second pass). A failure of either is not caught here: it reaches the error net like any unexpected one.
 * @param deps - the store, the tunables, the pipeline, the panel's redraw and the teardown flag
 * @param deps.store - the atlas's store, where the year is asked and shown
 * @param deps.dev - the live tunables, whose political year the map's drawing reads
 * @param deps.pipeline - what starts the map and redraws a year
 * @param deps.tools - the developer's tools, whose panel is redrawn so its year slider follows
 * @param deps.isDisposed - whether the map was torn down meanwhile
 * @param deps.sources - the map's sources, whose year drawn the store is told
 * @param deps.map - the map's canvas, where a press holds the maps' laying off (ATLAS-396)
 * @returns its teardown, safe before the map has started
 */
function startMap(deps: {
  store: AtlasStore
  dev: ReturnType<typeof createDevState>
  pipeline: ReturnType<typeof createMapPipeline>
  tools: Pick<DevTools, 'refresh'>
  isDisposed: () => boolean
  sources: Pick<MapSources, 'askedYear'>
  map: QuietMap
}): { dispose: () => void } {
  const { store } = deps
  const stops: (() => void)[] = [bridgeOver(deps)]
  let buffer: MapBuffer | null = null
  const quiet = createQuietTime(window, deps.map, () => performance.now())
  void deps.pipeline
    .start()
    .then(() => fetchAuthoredYears())
    .then((years) => {
      if (deps.isDisposed()) return
      const ready = bufferOver(deps.pipeline, quiet, years)
      buffer = ready
      stops.push(bufferFollows(store, ready))
      store.getState().started(years, deps.sources.askedYear)
    })
  return {
    dispose(): void {
      for (const stop of stops) stop()
      buffer?.dispose()
      quiet.dispose()
    },
  }
}

/**
 * The page's pipeline: the map's collaborators, with what only the page gives — its worker, its frame, and the bands'
 * distances from the build on the built site, measured in the worker on the dev server (ATLAS-407).
 * @param deps - the map's collaborators
 * @returns the pipeline
 */
function pagePipeline(
  deps: Omit<Parameters<typeof createMapPipeline>[0], 'spawn' | 'afterPaint' | 'assets'>
): ReturnType<typeof createMapPipeline> {
  return createMapPipeline({
    ...deps,
    spawn: () => new ComputeWorker(),
    afterPaint: pageAfterPaint,
    assets: { bakedBands: bandsSource(!import.meta.env.DEV) },
  })
}

/**
 * The settings' panel and the frame counter, under `pnpm dev` only (ATLAS-317). Written as the condition itself, so the
 * build turns it to `false` and leaves the panel, lil-gui and the counter out of the deployed bundle.
 * @param deps - what the panel drives, and the atlas's store its year slider asks in
 * @returns the tools, or none on the built site
 */
function devToolsFor(
  deps: Omit<Parameters<typeof panelDepsFor>[0], 'requestYear'> & { store: AtlasStore }
): DevTools {
  const { store, ...drives } = deps
  return import.meta.env.DEV
    ? mountDevTools(
        panelDepsFor({
          ...drives,
          requestYear: (year) => {
            store.getState().requestYear(year)
          },
        }),
        document.body,
        window
      )
    : NO_DEV_TOOLS
}

/**
 * Assemble the map and start it.
 * @returns the teardown, which frees every GPU resource and stops the worker
 */
function bootstrap(): () => void {
  const canvas = sceneCanvas()

  // Read through a call, not the binding: across an `await`, control-flow analysis still believes the
  // flag it narrowed cannot have changed — which is precisely what teardown does, and would turn every
  // guard downstream into dead code the compiler is happy to prove.
  let disposed = false
  const isDisposed = (): boolean => disposed

  const dev = createDevState()
  // The state the map and the interface share (ATLAS-392), made here and handed to both.
  const store = createAtlasStore()
  const sources = createMapSources()
  const view = createViewport(canvas, dev)
  // The browser's language when it is French, English otherwise (the dev, 2026-10-21); the page says
  // which, so a screen reader pronounces it right.
  const locale = pickLocale(navigator.languages)
  document.documentElement.lang = locale
  const translate = createTranslator(ATLAS_MESSAGES, locale)
  const ui = createMapUi({ host: document.body, isDisposed, translate })
  const layers = createLayers(view.scene, dev, sources, view.uploadUnseen, locale)
  const pipeline = pagePipeline({ dev, sources, layers, ui, translate, isDisposed })
  const interaction = createMapInteraction({
    element: canvas,
    picker: createSurfacePicker({ camera: view.camera, target: layers.pickTarget }),
    controls: view.controls,
  })
  const tools = devToolsFor({ dev, layers, pipeline, view, store })

  const onResize = (): void => {
    view.resize()
    layers.setResolution(window.innerWidth, window.innerHeight)
  }
  window.addEventListener('resize', onResize)

  // The interface over the map (ATLAS-519), in React beside the canvas; the map started under it.
  const face = mountInterface(document.body, {
    side: interfaceSideOf(store),
    yearSwitchLabel: translate('yearSwitchLabel'),
  })
  const map = startMap({ store, dev, pipeline, tools, isDisposed, sources, map: canvas })
  const stopLoop = startFrameLoop(view, layers, tools.stats)

  return (): void => {
    disposed = true // stop any in-flight load from building onto a dead scene
    stopLoop()
    window.removeEventListener('resize', onResize)
    // The worker first: it is the only part of this that outlives the page's own teardown if left
    // alone, and a bake in flight has nothing left to hand its pixels to.
    pipeline.dispose()
    interaction.dispose()
    tools.dispose()
    map.dispose()
    face.dispose()
    ui.dispose()
    layers.dispose()
    view.dispose() // persists the viewpoint before it takes the camera apart
  }
}

const dispose = bootstrap()

// Vite HMR: tear the old instance down (which persists the viewpoint) then let the module re-run and
// restore it — no full reload, no camera transition.
if (import.meta.hot) {
  import.meta.hot.dispose(dispose)
  import.meta.hot.accept()
}
