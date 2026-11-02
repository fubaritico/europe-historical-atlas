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

import { pageFadeIn } from './app/fadeIn'
import { startFrameLoop } from './app/frameLoop'
import { createMapInteraction } from './app/mapInteraction'
import { createMapUi } from './app/mapUi'
import { createViewport } from './app/viewport'
import { panelDepsFor } from './devPanel/devPanelCallbacks'
import { NO_DEV_TOOLS, mountDevTools } from './devPanel/devTools'
import { ATLAS_MESSAGES } from './i18n'
import { fetchAuthoredYears } from './loading/assets'
import { createMapPipeline } from './loading/mapPipeline'
// Vite resolves `?worker` into a constructor for the bundled worker module. It is the one
// bundler-specific line in the compute, and it lives here on purpose: the client that talks to the
// worker takes it as an injected `spawn`, so nothing below the composition root depends on Vite.
import { createSurfacePicker } from './picking/surfacePicker'
import { createStandardBlur as standardBlur } from './scene/blur/standardBlur'
import { canvasLabelDrawer } from './scene/cities/cityLabel'
import { createMapLayers } from './scene/layers/mapLayers'
import { NAME_FACE_URL } from './scene/political/names/nameFace'
import { createMapSources } from './sources/mapSources'
import { createDevState } from './tunables/devState'
import { mountYearSwitch } from './ui/yearSwitch'

import type { DevTools } from './devPanel/devTools'
import type { AtlasMessageKey } from './i18n'
import type { YearSwitch } from './ui/yearSwitch'
import type { Translate } from '@europe-historical-atlas/core/i18n/catalogue'

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
 * @returns the layers
 */
function createLayers(
  scene: Parameters<typeof createMapLayers>[0]['scene'],
  dev: Parameters<typeof createMapLayers>[0]['dev'],
  sources: Parameters<typeof createMapLayers>[0]['sources']
): ReturnType<typeof createMapLayers> {
  const cityLabels = canvasLabelDrawer(NAME_FACE_URL)
  return createMapLayers({ scene, dev, sources, blurMethod: standardBlur(), cityLabels })
}

/**
 * Start the map, then mount the temporary year switch (ATLAS-333) once the first year is on it, so a pick never
 * overtakes the startup. A failure of either is not caught here: it reaches the error net like any unexpected one.
 * @param deps - the tunables, the pipeline, the panel's redraw, the translator and the teardown flag
 * @param deps.dev - the live tunables, whose political year a pick sets
 * @param deps.pipeline - what starts the map and redraws a year
 * @param deps.tools - the developer's tools, whose panel is redrawn so its year slider follows
 * @param deps.translate - the reader's language
 * @param deps.isDisposed - whether the map was torn down meanwhile
 * @returns the switch's teardown, safe before it is mounted
 */
function startYearSwitch(deps: {
  dev: ReturnType<typeof createDevState>
  pipeline: ReturnType<typeof createMapPipeline>
  tools: Pick<DevTools, 'refresh'>
  translate: Translate<AtlasMessageKey>
  isDisposed: () => boolean
}): { dispose: () => void } {
  let mounted: YearSwitch | null = null
  void deps.pipeline
    .start()
    .then(() => fetchAuthoredYears())
    .then((years) => {
      if (deps.isDisposed()) return
      mounted = mountYearSwitch({
        host: document.body,
        years,
        current: () => deps.dev.political.year,
        pick: (year) => {
          deps.dev.political.year = year
          deps.tools.refresh()
          return deps.pipeline.rebuildPolitical()
        },
        label: deps.translate('yearSwitchLabel'),
      })
    })
  return {
    dispose(): void {
      mounted?.dispose()
    },
  }
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
  const sources = createMapSources()
  const view = createViewport(canvas, dev)
  // The browser's language when it is French, English otherwise (the dev, 2026-10-21); the page says
  // which, so a screen reader pronounces it right.
  const locale = pickLocale(navigator.languages)
  document.documentElement.lang = locale
  const translate = createTranslator(ATLAS_MESSAGES, locale)
  const ui = createMapUi({ host: document.body, isDisposed, translate })
  const layers = createLayers(view.scene, dev, sources)
  const pipeline = createMapPipeline({
    dev,
    sources,
    layers,
    ui,
    translate,
    spawn: () => new ComputeWorker(),
    fadeIn: pageFadeIn,
    isDisposed,
  })
  const interaction = createMapInteraction({
    element: canvas,
    picker: createSurfacePicker({ camera: view.camera, target: layers.pickTarget }),
    controls: view.controls,
  })
  // The settings' panel and the frame counter, under `pnpm dev` only (ATLAS-317). Written as the condition itself, so
  // the build turns it to `false` and leaves the panel, lil-gui and the counter out of the deployed bundle.
  const tools = import.meta.env.DEV
    ? mountDevTools(panelDepsFor({ dev, layers, pipeline, view }), document.body, window)
    : NO_DEV_TOOLS

  const onResize = (): void => {
    view.resize()
    layers.setResolution(window.innerWidth, window.innerHeight)
  }
  window.addEventListener('resize', onResize)

  // Temporary (ATLAS-333), to be removed with the atlas's own timeline (ATLAS-134).
  const yearSwitch = startYearSwitch({ dev, pipeline, tools, translate, isDisposed })
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
    yearSwitch.dispose()
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
