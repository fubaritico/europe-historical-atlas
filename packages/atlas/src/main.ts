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
import { createMapPipeline } from './loading/mapPipeline'
// Vite resolves `?worker` into a constructor for the bundled worker module. It is the one
// bundler-specific line in the compute, and it lives here on purpose: the client that talks to the
// worker takes it as an injected `spawn`, so nothing below the composition root depends on Vite.
import { createSurfacePicker } from './picking/surfacePicker'
import { createStandardBlur as standardBlur } from './scene/blur/standardBlur'
import { createMapLayers } from './scene/layers/mapLayers'
import { createMapSources } from './sources/mapSources'
import { createDevState } from './tunables/devState'

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
  const layers = createMapLayers({ scene: view.scene, dev, sources, blurMethod: standardBlur() })
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
    ? mountDevTools(panelDepsFor({ dev, layers, pipeline, view }), document.body)
    : NO_DEV_TOOLS

  const onResize = (): void => {
    view.resize()
    layers.setResolution(window.innerWidth, window.innerHeight)
  }
  window.addEventListener('resize', onResize)

  void pipeline.start()
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
