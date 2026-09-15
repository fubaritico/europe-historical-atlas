import { Color, PerspectiveCamera, Scene, Timer, WebGLRenderer } from 'three'
import Stats from 'three/addons/libs/stats.module.js'

import { createSessionStorageMapCameraStore } from './controls/mapCameraStore'
import { createMapControls } from './controls/mapControls'
import { createDemCoastlineSource } from './data/coastlineSource'
import { createFetchHeightmapSource, smoothHeightmap } from './data/heightmap'
import { createDevPanel } from './devPanel'
import { createCompassRose } from './scene/compassRose'
import { createDebugRect } from './scene/debugRect'
import { createLineLayer } from './scene/lineLayer'
import { createReliefMesh } from './scene/reliefMesh'
import { generateRhumbSegments } from './scene/rhumbNetwork'
import { DEFAULT_TERRAIN_OPTIONS, createTerrainTexture } from './scene/terrainTexture'
import { lerp } from './utils/math'

import type { MapRect } from './controls/mapControls'
import type { Heightmap } from './data/heightmap'
import type {
  CoastlineDevParams,
  ExtentDevParams,
  ReliefDevParams,
  RhumbDevParams,
  RoseDevParams,
} from './devPanel'
import type { TerrainTextureOptions } from './scene/terrainTexture'
import type { DataTexture, Object3D } from 'three'

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
  const extentParams: ExtentDevParams = { centerX: 0, centerZ: 0, halfWidth: 5.8, halfDepth: 5.2 }
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
    zoomSpeed: 0.01,
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

  const params: ReliefDevParams = {
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
  const coastParams: CoastlineDevParams = {
    color: '#4a3424',
    opacity: 0.2, // at full zoom-out (controls.zoom = 0)
    opacityZoomIn: 0.1, // at full zoom-in (controls.zoom = 1); lerped every frame like the exaggeration
    yLift: 0.002,
    jitter: 0.002,
    strokes: 5,
  }
  // Portolan rhumb network — straight lines radiating from a ring of compass centres over the Atlantic,
  // clipped to the sea (drawn only over water). Centre defaults to open ocean west of Iberia.
  const rhumbParams: RhumbDevParams = {
    centerU: 0.2,
    centerV: 0.52,
    circleRadius: 0.34,
    nodeCount: 12,
    directions: 32,
    color: '#6a4a2b',
    opacity: 0.16, // at full zoom-out
    opacityZoomIn: 0.06, // fades as you zoom in (less clutter)
    clipStep: 0.004, // sampling step along each line (smaller = finer sea-clip at the coast)
  }
  // Compass rose (variant D) — sits at the rhumb-network centre, portolan colour code (principal winds
  // inked, half-winds green, quarter-winds red).
  const roseParams: RoseDevParams = {
    centerU: 0.2, // Atlantic, west of Iberia/Morocco
    centerV: 0.64, // pushed south into open ocean
    size: 1.9,
    opacity: 0.65,
    showLabels: true,
    ink: '#4a3424',
    halfWind: '#3f5e3a', // vert anglais
    quarterWind: '#7a2230', // rouge bordeaux
    lift: 0.01,
  }

  // Europe relief — rebuilt from the loaded heightmap; the height curve requires a geometry rebuild.
  let heightmap: Heightmap | null = null
  let relief: ReturnType<typeof createReliefMesh> | null = null
  let terrainTexture: DataTexture | null = null
  let coastline: ReturnType<typeof createLineLayer> | null = null
  let rhumb: ReturnType<typeof createLineLayer> | null = null
  let compass: ReturnType<typeof createCompassRose> | null = null
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

  // Remove a layer handle from the scene and free its GPU resources (shared by every rebuild + teardown).
  const disposeHandle = (handle: { object: Object3D; dispose(): void } | null): void => {
    if (!handle) return
    scene.remove(handle.object)
    handle.dispose()
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
    disposeHandle(coastline)
    const segments = createDemCoastlineSource(heightmap, {
      seaLevel: textureOptions.seaLevel,
    }).load()
    coastline = createLineLayer(segments, {
      project: projectToWorld,
      color: coastParams.color,
      opacity: coastParams.opacity,
      jitter: coastParams.jitter,
      strokes: coastParams.strokes,
    })
    scene.add(coastline.object)
  }

  const rebuildRhumb = (): void => {
    if (!heightmap) return
    disposeHandle(rhumb)
    const segments = generateRhumbSegments(heightmap, {
      center: { u: rhumbParams.centerU, v: rhumbParams.centerV },
      circleRadius: rhumbParams.circleRadius,
      nodeCount: rhumbParams.nodeCount,
      includeCenter: true,
      directions: rhumbParams.directions,
      seaLevel: textureOptions.seaLevel,
      step: rhumbParams.clipStep,
    })
    rhumb = createLineLayer(segments, {
      project: projectToWorld,
      color: rhumbParams.color,
      opacity: rhumbParams.opacity,
    })
    scene.add(rhumb.object)
  }

  // World position of the compass rose (its own centre, independent of the rhumb network), lifted above
  // the sea.
  const roseWorldPosition = (): [number, number, number] => {
    const [x, , z] = projectToWorld(roseParams.centerU, roseParams.centerV)
    return [x, roseParams.lift, z]
  }

  const rebuildRose = (): void => {
    disposeHandle(compass)
    compass = createCompassRose({
      colors: {
        ink: roseParams.ink,
        halfWind: roseParams.halfWind,
        quarterWind: roseParams.quarterWind,
      },
      labels: roseParams.showLabels,
      size: roseParams.size,
      opacity: roseParams.opacity,
      position: roseWorldPosition(),
    })
    scene.add(compass.object)
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
      rebuildRhumb()
      rebuildRose()
    })
    .catch((error: unknown) => {
      console.error('relief load failed', error)
    })

  const gui = createDevPanel({
    relief: params,
    texture: textureOptions,
    coast: coastParams,
    rhumb: rhumbParams,
    rose: roseParams,
    controlsOptions: controls.options,
    framing,
    extent: extentParams,
    debug,
    callbacks: {
      rebuildRelief,
      rebuildTexture,
      rebuildCoastline,
      rebuildRhumb,
      rebuildRose,
      setWireframe: (value: boolean): void => {
        if (relief) relief.material.wireframe = value
      },
      setCoastColor: (color: string): void => {
        if (coastline) coastline.object.material.color.set(color)
      },
      setRhumbColor: (color: string): void => {
        if (rhumb) rhumb.object.material.color.set(color)
      },
      setRoseOpacity: (value: number): void => {
        if (compass) compass.object.material.opacity = value
      },
      setFov: (value: number): void => {
        camera.fov = value
        camera.updateProjectionMatrix()
      },
      applyExtent,
      setFrustumDebug: (value: boolean): void => {
        extentRect.setVisible(value)
        footprintRect.setVisible(value)
      },
      logAll: (): void => {
        console.warn(
          'ALL settings:\n' +
            JSON.stringify(
              {
                relief: params,
                texture: textureOptions,
                coastline: coastParams,
                rhumb: rhumbParams,
                rose: roseParams,
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
      logCameraState: (): void => {
        console.warn('camera state:', JSON.stringify(controls.getState()))
      },
    },
  })

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
    // Zoom-linked opacity: `opacity` at zoom-out (z=0) → `opacityZoomIn` at zoom-in (z=1).
    if (coastline)
      coastline.object.material.opacity = lerp(
        coastParams.opacity,
        coastParams.opacityZoomIn,
        controls.zoom
      )
    // Rhumb network fades as you zoom in (less clutter over the terrain).
    if (rhumb)
      rhumb.object.material.opacity = lerp(
        rhumbParams.opacity,
        rhumbParams.opacityZoomIn,
        controls.zoom
      )
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
    disposeHandle(coastline)
    disposeHandle(rhumb)
    disposeHandle(compass)
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
