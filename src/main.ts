/**
 * The composition root: create, inject, connect, tear down. Nothing else.
 *
 * It held 567 lines of the map's own logic until 2026-09-17, which is how this codebase learned that
 * layer boundaries police *where* code lives and nothing polices *this* — anything needing two
 * collaborators at once landed here without ever breaking an import rule (ARCH-012). What is left is
 * wiring, and the rule is that it stays that way: if a line here takes data and returns data, it belongs
 * in a module that can be exercised with a literal.
 */

import Stats from 'three/addons/libs/stats.module.js'

import { createDevPanel } from './devPanel'
import { panelDepsFor } from './devPanelCallbacks'
import { createDevState } from './devState'
import { startFrameLoop } from './frameLoop'
import { createMapLayers } from './mapLayers'
import { createMapPipeline } from './mapPipeline'
import { createMapSources } from './mapSources'
import { createMapUi } from './mapUi'
// Vite resolves `?worker` into a constructor for the bundled worker module. It is the one
// bundler-specific line in the compute, and it lives here on purpose: the client that talks to the
// worker takes it as an injected `spawn`, so nothing below the composition root depends on Vite.
import ComputeWorker from './pipeline/computeWorker?worker'
import { createViewport } from './viewport'

/**
 * Assemble the map and start it.
 * @returns the teardown, which frees every GPU resource and stops the worker
 */
function bootstrap(): () => void {
  const canvas = document.querySelector<HTMLCanvasElement>('#scene')
  if (!canvas) throw new Error('Canvas #scene not found in index.html')

  // Read through a call, not the binding: across an `await`, control-flow analysis still believes the
  // flag it narrowed cannot have changed — which is precisely what teardown does, and would turn every
  // guard downstream into dead code the compiler is happy to prove.
  let disposed = false
  const isDisposed = (): boolean => disposed

  const dev = createDevState()
  const sources = createMapSources()
  const view = createViewport(canvas, dev)
  const ui = createMapUi({ host: document.body, isDisposed })
  const layers = createMapLayers({ scene: view.scene, dev, sources })
  const pipeline = createMapPipeline({
    dev,
    sources,
    layers,
    ui,
    spawn: () => new ComputeWorker(),
    isDisposed,
  })
  const gui = createDevPanel(panelDepsFor({ dev, layers, pipeline, view }))

  const stats = new Stats()
  document.body.appendChild(stats.dom)

  const onResize = (): void => {
    view.resize()
    layers.setResolution(window.innerWidth, window.innerHeight)
  }
  window.addEventListener('resize', onResize)

  void pipeline.start()
  const stopLoop = startFrameLoop(view, layers, stats)

  return (): void => {
    disposed = true // stop any in-flight load from building onto a dead scene
    stopLoop()
    window.removeEventListener('resize', onResize)
    // The worker first: it is the only part of this that outlives the page's own teardown if left
    // alone, and a bake in flight has nothing left to hand its pixels to.
    pipeline.dispose()
    gui.destroy()
    stats.dom.remove()
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
