import GUI from 'lil-gui'
import { Color, PerspectiveCamera, Scene, Timer, WebGLRenderer } from 'three'
import Stats from 'three/addons/libs/stats.module.js'

import { createSessionStorageMapCameraStore } from './controls/mapCameraStore'
import { createMapControls } from './controls/mapControls'
import { createDemCoastlineSource } from './data/coastlineSource'
import { createFetchHeightmapSource, smoothHeightmap } from './data/heightmap'
import { createCoastlineLayer } from './scene/coastlineLayer'
import { createDebugRect } from './scene/debugRect'
import { createReliefMesh } from './scene/reliefMesh'
import { DEFAULT_TERRAIN_OPTIONS, createTerrainTexture } from './scene/terrainTexture'

import type { MapRect } from './controls/mapControls'
import type { Heightmap } from './data/heightmap'
import type { TerrainTextureOptions } from './scene/terrainTexture'
import type { DataTexture } from 'three'

/**
 * Dev-tunable parameters, exposed live through the lil-gui panel.
 */
interface DevParams {
  /** Vertical exaggeration of the relief at full zoom-out (applied via `mesh.scale.y`). */
  exaggeration: number
  /** Exaggeration multiplier at full zoom-in (relief flattens as you zoom in); 1 = no flattening. */
  exaggZoomIn: number
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

  // No lights: the relief uses an unlit material with the hillshade baked into its texture (see
  // `terrainTexture`), and every overlay (coastline, debug rects) is line-based / unlit.

  // Debug overlay — the map extent (red) + the live frustum ground footprint (blue), toggled in the panel.
  const debug = { showFrustum: false }
  const extentRect = createDebugRect('#c0392b')
  const footprintRect = createDebugRect('#2980b9')
  scene.add(extentRect.object, footprintRect.object)

  const params: DevParams = {
    exaggeration: 0.75,
    exaggZoomIn: 0.35,
    smoothing: 0,
    plainsCeiling: 575,
    peakTarget: 1900,
    wireframe: false,
  }

  // World-space width of the map plane (X axis), consumed by the mesh build.
  const WORLD_WIDTH = 12

  // Baked terrain look (parchment + hypsometric tint + DEM hillshade), tuned live. Regenerating the
  // DataTexture is independent of the geometry rebuild (cheap material swap, no new geometry).
  const textureOptions: TerrainTextureOptions = { ...DEFAULT_TERRAIN_OPTIONS }
  // Coastline drawn as draped 3D lines (crisp, unlike a baked texture). A LIGHT jitter over a few
  // overlaid strokes at low opacity gives the soft pencil look. Follows `textureOptions.seaLevel`.
  const coastParams = {
    color: '#4a3424',
    opacity: 0.2, // at full zoom-out (controls.zoom = 0)
    opacityZoomIn: 0.1, // at full zoom-in (controls.zoom = 1); lerped every frame like the exaggeration
    yLift: 0.002,
    jitter: 0.002,
    strokes: 5,
  }

  // Europe relief — rebuilt from the loaded heightmap; the height curve requires a geometry rebuild.
  let heightmap: Heightmap | null = null
  let relief: ReturnType<typeof createReliefMesh> | null = null
  let terrainTexture: DataTexture | null = null
  let coastline: ReturnType<typeof createCoastlineLayer> | null = null
  let disposed = false // guards the async heightmap load from building a mesh after teardown (HMR mid-load)

  // Project a normalized grid coordinate (u: west→east, v: north→south) to world XZ, matching the relief
  // mesh mapping. The coastline sits at a small fixed lift above the flat sea (y=0), independent of the
  // zoom-linked exaggeration (the shoreline is at sea level, so exaggeration barely moves it).
  const projectToWorld = (u: number, v: number): [number, number, number] => {
    if (!heightmap) return [0, coastParams.yLift, 0]
    const aspect = heightmap.meta.width / heightmap.meta.height
    const worldDepth = WORLD_WIDTH / aspect
    return [(u - 0.5) * WORLD_WIDTH, coastParams.yLift, (v - 0.5) * worldDepth]
  }

  const rebuildTexture = (): void => {
    if (!heightmap) return
    terrainTexture?.dispose()
    terrainTexture = createTerrainTexture(heightmap, textureOptions)
    if (relief) {
      relief.material.map = terrainTexture
      relief.material.color.set('#ffffff')
      relief.material.needsUpdate = true
    }
  }

  const rebuildCoastline = (): void => {
    if (!heightmap) return
    if (coastline) {
      scene.remove(coastline.object)
      coastline.dispose()
    }
    const segments = createDemCoastlineSource(heightmap, {
      seaLevel: textureOptions.seaLevel,
    }).load()
    coastline = createCoastlineLayer(segments, {
      project: projectToWorld,
      color: coastParams.color,
      opacity: coastParams.opacity,
      jitter: coastParams.jitter,
      strokes: coastParams.strokes,
    })
    scene.add(coastline.object)
  }

  const rebuildRelief = (): void => {
    if (!heightmap) return
    if (relief) {
      scene.remove(relief)
      relief.geometry.dispose()
      relief.material.dispose() // Material.dispose leaves `map` alone — the texture is managed separately
    }
    const source = smoothHeightmap(heightmap, params.smoothing)
    relief = createReliefMesh(source, {
      worldWidth: WORLD_WIDTH,
      segments: 512,
      plainsCeiling: params.plainsCeiling,
      peakTarget: params.peakTarget,
      wireframe: params.wireframe,
      ...(terrainTexture ? { map: terrainTexture } : {}),
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
      rebuildTexture()
      rebuildRelief()
      rebuildCoastline()
    })
    .catch((error: unknown) => {
      console.error('relief load failed', error)
    })

  const gui = new GUI({ title: 'europe-map · dev' })
  // Dump every tunable value at once (relief + texture + coastline + camera) so a tuned look can be
  // pasted back as defaults. `console.warn` (never `console.log`).
  gui
    .add(
      {
        logAll: (): void => {
          console.warn(
            'ALL settings:\n' +
              JSON.stringify(
                {
                  relief: params,
                  texture: textureOptions,
                  coastline: coastParams,
                  camera: { ...controls.getState(), fov: framing.fov },
                  controls: {
                    panSpeed: controls.options.panSpeed,
                    zoomSpeed: controls.options.zoomSpeed,
                    smoothingTau: controls.options.smoothingTau,
                    enableDrag: controls.options.enableDrag,
                    enableEdgeScroll: controls.options.enableEdgeScroll,
                    edgeScrollSpeed: controls.options.edgeScrollSpeed,
                    minDistance: controls.options.minDistance,
                    maxDistance: controls.options.maxDistance,
                    minPitchDeg: controls.options.minPitchDeg,
                    maxPitchDeg: controls.options.maxPitchDeg,
                  },
                  extent: extentParams,
                },
                null,
                2
              )
          )
        },
      },
      'logAll'
    )
    .name('⤓ log ALL settings')
  // Exaggeration follows the zoom (applied every frame in the loop): full at zoom-out, × exaggZoomIn at
  // zoom-in. This is a cheap scale.y transform — no geometry rebuild.
  gui.add(params, 'exaggeration', 0, 4, 0.05).name('exaggeration (zoom-out)')
  gui.add(params, 'exaggZoomIn', 0.1, 1, 0.05).name('exaggeration @ zoom-in')
  gui.add(params, 'smoothing', 0, 8, 1).name('smoothing (outliers)').onFinishChange(rebuildRelief)
  gui
    .add(params, 'plainsCeiling', 0, 1000, 25)
    .name('plains ceiling (m)')
    .onFinishChange(rebuildRelief)
  gui.add(params, 'peakTarget', 200, 3000, 25).name('peak target (m)').onFinishChange(rebuildRelief)
  gui.add(params, 'wireframe').onChange((value: boolean) => {
    if (relief) relief.material.wireframe = value
  })

  // Terrain look — parchment base, hypsometric tint, DEM hillshade. Regenerating the texture is a full
  // pixel pass (heavy), so numeric tuning fires on release; colours fire when the picker closes.
  const texFolder = gui.addFolder('texture (parchment)')
  texFolder
    .add(textureOptions, 'seaLevel', -200, 500, 10)
    .name('sea level (m)')
    .onFinishChange(() => {
      rebuildTexture()
      rebuildCoastline() // coastline is the same seaLevel iso-line → follows
    })
  texFolder
    .add(textureOptions, 'lightAzimuthDeg', 0, 360, 1)
    .name('light azimuth')
    .onFinishChange(rebuildTexture)
  texFolder
    .add(textureOptions, 'lightAltitudeDeg', 5, 85, 1)
    .name('light altitude')
    .onFinishChange(rebuildTexture)
  texFolder
    .add(textureOptions, 'hillshadeStrength', 0, 1, 0.05)
    .name('hillshade')
    .onFinishChange(rebuildTexture)
  texFolder
    .add(textureOptions, 'hillshadeMode', ['multiply', 'overlay', 'softLight', 'normal'])
    .name('shade blend')
    .onFinishChange(rebuildTexture)
  texFolder
    .add(textureOptions, 'zFactor', 0.0002, 0.006, 0.0002)
    .name('relief strength')
    .onFinishChange(rebuildTexture)
  texFolder
    .add(textureOptions, 'tintStrength', 0, 1, 0.05)
    .name('tint')
    .onFinishChange(rebuildTexture)
  texFolder
    .add(textureOptions, 'tintMode', ['multiply', 'overlay', 'softLight', 'normal'])
    .name('tint blend')
    .onFinishChange(rebuildTexture)
  texFolder
    .add(textureOptions, 'peakReference', 500, 5000, 100)
    .name('peak ref (m)')
    .onFinishChange(rebuildTexture)
  texFolder
    .add(textureOptions, 'grain', 0, 1, 0.05)
    .name('grain (vellum)')
    .onFinishChange(rebuildTexture)
  texFolder
    .add(textureOptions, 'grainScale', 1, 40, 1)
    .name('grain scale (px)')
    .onFinishChange(rebuildTexture)
  texFolder
    .addColor(textureOptions, 'parchment', 255)
    .name('parchment')
    .onFinishChange(rebuildTexture)
  texFolder.addColor(textureOptions, 'sea', 255).name('sea').onFinishChange(rebuildTexture)
  texFolder
    .addColor(textureOptions, 'lowland', 255)
    .name('lowland tint')
    .onFinishChange(rebuildTexture)
  texFolder
    .addColor(textureOptions, 'highland', 255)
    .name('highland tint')
    .onFinishChange(rebuildTexture)
  texFolder.close()

  // Coastline — draped 3D lines; light jitter over a few low-opacity strokes = soft pencil. Colour and
  // opacity update the live material; jitter/strokes rebuild the geometry.
  const coastFolder = gui.addFolder('coastline')
  coastFolder
    .addColor(coastParams, 'color')
    .name('colour')
    .onChange(() => {
      if (coastline) coastline.object.material.color.set(coastParams.color)
    })
  coastFolder.add(coastParams, 'opacity', 0, 1, 0.05).name('opacity (zoom-out)')
  coastFolder.add(coastParams, 'opacityZoomIn', 0, 1, 0.05).name('opacity @ zoom-in')
  coastFolder
    .add(coastParams, 'jitter', 0, 0.02, 0.0005)
    .name('jitter (light)')
    .onFinishChange(rebuildCoastline)
  coastFolder
    .add(coastParams, 'strokes', 1, 6, 1)
    .name('strokes (overdraw)')
    .onFinishChange(rebuildCoastline)
  coastFolder
    .add(coastParams, 'yLift', 0, 0.02, 0.001)
    .name('lift')
    .onFinishChange(rebuildCoastline)
  coastFolder.close()

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
    // Zoom-linked vertical exaggeration: full at zoom-out (z=0), × exaggZoomIn at zoom-in (z=1).
    if (relief)
      relief.scale.setY(params.exaggeration * (1 - (1 - params.exaggZoomIn) * controls.zoom))
    // Zoom-linked coastline opacity: `opacity` at zoom-out (z=0) → `opacityZoomIn` at zoom-in (z=1).
    if (coastline)
      coastline.object.material.opacity =
        coastParams.opacity + (coastParams.opacityZoomIn - coastParams.opacity) * controls.zoom
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
      scene.remove(relief)
      relief.geometry.dispose()
      relief.material.dispose()
    }
    if (coastline) {
      scene.remove(coastline.object)
      coastline.dispose()
    }
    terrainTexture?.dispose()
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
