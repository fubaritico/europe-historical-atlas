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
import { createReliefMesh } from './scene/reliefMesh'

import type { MapControlsBounds } from './controls/mapControls'
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

  const camera = new PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200)

  // EU4-style map camera (arrow-key pan + wheel zoom, yaw locked north). Bounds are provisional here and
  // refined to the true map extent once the DEM aspect is known (see rebuildRelief).
  const provisionalBounds: MapControlsBounds = { minX: -5, maxX: 5, minZ: -5, maxZ: 5 }
  const controls = createMapControls(camera, renderer.domElement, {
    bounds: provisionalBounds,
    minDistance: 2.5,
    maxDistance: 16,
    minPitchDeg: 45,
    maxPitchDeg: 72,
    panSpeed: 8,
    zoomSpeed: 0.08,
    smoothingTau: 0.12,
    initialZoom: 0.12,
  })

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

  const params: DevParams = {
    exaggeration: 1,
    smoothing: 0,
    plainsCeiling: 575,
    peakTarget: 1900,
    wireframe: true,
  }

  // World-space width of the map plane (X axis); shared by the mesh build and the camera pan bounds.
  const WORLD_WIDTH = 12
  // Fraction of the map inset from the true edge for the pan bounds, so the plane edge/void never shows.
  const BOUNDS_INSET = 0.12

  // Europe relief — rebuilt from the loaded heightmap; the height curve requires a geometry rebuild.
  let heightmap: Heightmap | null = null
  let relief: ReturnType<typeof createReliefMesh> | null = null

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

    // Refine the camera pan bounds to the true map extent (inset so the plane edge/void never shows).
    const worldDepth = WORLD_WIDTH / (heightmap.meta.width / heightmap.meta.height)
    const halfW = (WORLD_WIDTH / 2) * (1 - BOUNDS_INSET)
    const halfD = (worldDepth / 2) * (1 - BOUNDS_INSET)
    controls.setBounds({ minX: -halfW, maxX: halfW, minZ: -halfD, maxZ: halfD })
  }

  const heightmapSource = createFetchHeightmapSource('/heightmaps/europe-dem-z5')
  void heightmapSource
    .load()
    .then((loaded) => {
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
  camFolder.add(controls.options, 'minDistance', 1, 10, 0.5).name('min distance (in)')
  camFolder.add(controls.options, 'maxDistance', 8, 30, 0.5).name('max distance (out)')
  camFolder.add(controls.options, 'minPitchDeg', 20, 89, 1).name('pitch in (oblique)')
  camFolder.add(controls.options, 'maxPitchDeg', 20, 89, 1).name('pitch out (top-down)')
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
    renderer.render(scene, camera)
    stats.update()
    frame = requestAnimationFrame(tick)
  }
  tick()

  return (): void => {
    saveCamera() // capture the exact current viewpoint before we tear down
    cancelAnimationFrame(frame)
    window.removeEventListener('beforeunload', saveCamera)
    window.removeEventListener('resize', onResize)
    controls.dispose()
    gui.destroy()
    stats.dom.remove()
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
