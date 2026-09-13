import GUI from 'lil-gui'
import {
  AmbientLight,
  Color,
  DirectionalLight,
  PerspectiveCamera,
  Scene,
  Timer,
  WebGLRenderer,
} from 'three'
import Stats from 'three/addons/libs/stats.module.js'

import { createSessionStorageMapCameraStore } from './controls/mapCameraStore'
import { createMapControls } from './controls/mapControls'
import { createFetchHeightmapSource, smoothHeightmap } from './data/heightmap'
import { createDebugRect } from './scene/debugRect'
import { createReliefMesh } from './scene/reliefMesh'

import type { MapRect } from './controls/mapControls'
import type { Heightmap } from './data/heightmap'

/**
 * Dev-tunable parameters, exposed live through the lil-gui panel.
 */
interface DevParams {
  /** Vertical exaggeration of the relief (applied via `mesh.scale.y`). */
  exaggeration: number
  /** Box-blur radius (grid cells); kills isolated DEM outliers. Keep low to stay crisp. */
  smoothing: number
  /** Elevations up to this (metres) stay 1:1 — plains keep their relief. */
  plainsCeiling: number
  /** Apparent height (metres) the highest peaks ease toward (e.g. 4441 m → ~700 m). Lower = flatter. */
  peakTarget: number
  /** Render the relief as a wireframe (Milestone 1.1 validates the geometry first). */
  wireframe: boolean
}

/**
 * Bootstrap — renderer + scene + camera + loop + dev overlays, with a persisted camera viewpoint and the
 * Europe relief loaded from the pre-baked elevation grid. Returns a teardown (safe HMR, no GPU leak).
 * @returns the teardown function
 */
function bootstrap(): () => void {
  const canvas = document.querySelector<HTMLCanvasElement>('#scene')
  if (!canvas) throw new Error('Canvas #scene not found in index.html')

  const renderer = new WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(window.innerWidth, window.innerHeight)

  const scene = new Scene()
  scene.background = new Color('#efe6d2') // parchment placeholder (vintage palette)

  // Respect the OS "reduce motion" setting: near-zero inertia so pan/zoom stop immediately (no coasting).
  const reduceMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // Camera perspective, tuned live: lower fov = flatter, less perspective (more map-like).
  const framing = { fov: 35 }

  const camera = new PerspectiveCamera(
    framing.fov,
    window.innerWidth / window.innerHeight,
    0.1,
    300
  )

  // EU4-style map camera (arrow-key pan + wheel zoom, yaw locked north). `extent` is the world rectangle
  // the view must stay within; the frustum-aware clamp derives the pannable range from it (grows when
  // zoomed in, shrinks/re-centres when zoomed out, adapts on resize). Tuned live via centre + half-size.
  const extentParams = { centerX: 0, centerZ: 0, halfWidth: 5.8, halfDepth: 5.2 }
  const toExtent = (): MapRect => ({
    minX: extentParams.centerX - extentParams.halfWidth,
    maxX: extentParams.centerX + extentParams.halfWidth,
    minZ: extentParams.centerZ - extentParams.halfDepth,
    maxZ: extentParams.centerZ + extentParams.halfDepth,
  })
  const controls = createMapControls(camera, renderer.domElement, {
    extent: toExtent(),
    minDistance: 1,
    maxDistance: 6,
    minPitchDeg: 30,
    maxPitchDeg: 55,
    panSpeed: 8,
    zoomSpeed: 0.08,
    smoothingTau: reduceMotion ? 0.02 : 0.12,
    initialZoom: 0,
    enableDrag: true,
    enableEdgeScroll: true,
    edgeScrollMargin: 24,
    edgeScrollSpeed: 8,
  })
  const applyExtent = (): void => {
    controls.setExtent(toExtent())
  }

  // Restore the persisted viewpoint BEFORE the first render → zero camera transition on reload/HMR.
  const cameraStore = createSessionStorageMapCameraStore()
  const persisted = cameraStore.load()
  if (persisted) controls.setState(persisted)

  const saveCamera = (): void => {
    cameraStore.save(controls.getState())
  }
  window.addEventListener('beforeunload', saveCamera)

  scene.add(new AmbientLight(0xffffff, 0.6))
  const sun = new DirectionalLight(0xffffff, 1.4)
  sun.position.set(5, 10, 3)
  scene.add(sun)

  // Debug overlay — the map extent (red) + the live frustum ground footprint (blue), toggled in the panel.
  const debug = { showFrustum: false }
  const extentRect = createDebugRect('#c0392b')
  const footprintRect = createDebugRect('#2980b9')
  scene.add(extentRect.object, footprintRect.object)

  const params: DevParams = {
    exaggeration: 1,
    smoothing: 0,
    plainsCeiling: 575,
    peakTarget: 1900,
    wireframe: true,
  }

  // World-space width of the map plane (X axis), consumed by the mesh build.
  const WORLD_WIDTH = 12

  // Europe relief — rebuilt from the loaded heightmap; the height curve requires a geometry rebuild.
  let heightmap: Heightmap | null = null
  let relief: ReturnType<typeof createReliefMesh> | null = null
  let disposed = false // guards the async heightmap load from building a mesh after teardown (HMR mid-load)

  const rebuildRelief = (): void => {
    if (!heightmap) return
    if (relief) {
      scene.remove(relief)
      relief.geometry.dispose()
      relief.material.dispose()
    }
    const source = smoothHeightmap(heightmap, params.smoothing)
    relief = createReliefMesh(source, {
      worldWidth: WORLD_WIDTH,
      segments: 512,
      plainsCeiling: params.plainsCeiling,
      peakTarget: params.peakTarget,
      wireframe: params.wireframe,
    })
    relief.scale.setY(params.exaggeration)
    scene.add(relief)
  }

  const heightmapSource = createFetchHeightmapSource('/heightmaps/europe-dem-z5')
  void heightmapSource
    .load()
    .then((loaded) => {
      if (disposed) return // teardown ran mid-load → don't add an orphan mesh to a dead scene
      heightmap = loaded
      rebuildRelief()
    })
    .catch((error: unknown) => {
      console.error('relief load failed', error)
    })

  const gui = new GUI({ title: 'europe-map · dev' })
  gui
    .add(params, 'exaggeration', 0, 4, 0.05)
    .name('vertical exaggeration')
    .onChange((value: number) => {
      relief?.scale.setY(value)
    })
  gui.add(params, 'smoothing', 0, 8, 1).name('smoothing (outliers)').onFinishChange(rebuildRelief)
  gui
    .add(params, 'plainsCeiling', 0, 1000, 25)
    .name('plains ceiling (m)')
    .onFinishChange(rebuildRelief)
  gui.add(params, 'peakTarget', 200, 3000, 25).name('peak target (m)').onFinishChange(rebuildRelief)
  gui.add(params, 'wireframe').onChange((value: boolean) => {
    if (relief) relief.material.wireframe = value
  })

  // Camera feel — tune the EU4-style pan/zoom live (read every frame by the controls).
  const camFolder = gui.addFolder('camera')
  camFolder.add(controls.options, 'panSpeed', 1, 30, 0.5).name('pan speed')
  camFolder.add(controls.options, 'zoomSpeed', 0.01, 0.3, 0.01).name('zoom speed')
  camFolder.add(controls.options, 'smoothingTau', 0.02, 0.5, 0.01).name('inertia (s)')
  camFolder.add(controls.options, 'enableDrag').name('drag-pan')
  camFolder.add(controls.options, 'enableEdgeScroll').name('edge-scroll')
  camFolder.add(controls.options, 'edgeScrollSpeed', 1, 30, 0.5).name('edge speed')
  camFolder.add(controls.options, 'minDistance', 0.5, 8, 0.25).name('min distance (in)')
  camFolder.add(controls.options, 'maxDistance', 2, 15, 0.25).name('max distance (out)')
  camFolder.add(controls.options, 'minPitchDeg', 20, 89, 1).name('pitch in (oblique)')
  camFolder.add(controls.options, 'maxPitchDeg', 20, 89, 1).name('pitch out (top-down)')
  camFolder
    .add(framing, 'fov', 15, 60, 1)
    .name('fov (lower = flatter)')
    .onChange((value: number) => {
      camera.fov = value
      camera.updateProjectionMatrix()
    })
  const extentFolder = camFolder.addFolder('extent (view limit)')
  extentFolder.add(extentParams, 'centerX', -6, 6, 0.05).name('centre X').onChange(applyExtent)
  extentFolder.add(extentParams, 'centerZ', -6, 6, 0.05).name('centre Z').onChange(applyExtent)
  extentFolder.add(extentParams, 'halfWidth', 0.5, 6, 0.05).name('half width').onChange(applyExtent)
  extentFolder.add(extentParams, 'halfDepth', 0.5, 6, 0.05).name('half depth').onChange(applyExtent)
  camFolder
    .add(debug, 'showFrustum')
    .name('show extent + footprint')
    .onChange((value: boolean) => {
      extentRect.setVisible(value)
      footprintRect.setVisible(value)
    })
  camFolder
    .add(
      {
        logState: (): void => {
          console.warn('camera state:', JSON.stringify(controls.getState()))
        },
      },
      'logState'
    )
    .name('log camera state')
  camFolder.close()

  const stats = new Stats()
  document.body.appendChild(stats.dom)

  const onResize = (): void => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  }
  window.addEventListener('resize', onResize)

  const timer = new Timer()
  let frame = 0
  const tick = (): void => {
    timer.update()
    controls.update(timer.getDelta())
    if (debug.showFrustum) {
      extentRect.update(controls.getExtent(), 0.05)
      footprintRect.update(controls.getFootprint(), 0.05)
    }
    renderer.render(scene, camera)
    stats.update()
    frame = requestAnimationFrame(tick)
  }
  tick()

  return (): void => {
    disposed = true // stop any in-flight heightmap load from building an orphan mesh
    saveCamera() // capture the exact current viewpoint before we tear down
    cancelAnimationFrame(frame)
    window.removeEventListener('beforeunload', saveCamera)
    window.removeEventListener('resize', onResize)
    controls.dispose()
    gui.destroy()
    stats.dom.remove()
    extentRect.dispose()
    footprintRect.dispose()
    if (relief) {
      relief.geometry.dispose()
      relief.material.dispose()
    }
    renderer.dispose()
  }
}

const dispose = bootstrap()

// Vite HMR: tear the old instance down (which persists the viewpoint) then let the module re-run and
// restore it — no full reload, no camera transition.
if (import.meta.hot) {
  import.meta.hot.dispose(dispose)
  import.meta.hot.accept()
}
