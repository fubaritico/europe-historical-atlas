import { Color, PerspectiveCamera, Scene, Timer, WebGLRenderer } from 'three'
import Stats from 'three/addons/libs/stats.module.js'

import { COMPUTE_PHASE_LABELS } from './computeLabels'
import { createSessionStorageMapCameraStore } from './controls/mapCameraStore'
import { createMapControls } from './controls/mapControls'
import { borderPatternFor } from './data/borderStyles'
import { createMaskCoastlineSource } from './data/coastlineSource'
import { createFetchHeightmapSource, smoothHeightmap } from './data/heightmap'
import { createElevationLandMask, createFetchLandMaskSource } from './data/landMask'
import { separatesRegions } from './data/regionRaster'
import { createFetchRegionSource } from './data/regionSource'
import {
  DEFAULT_RIVER_EXTENSION,
  createFetchRiverSource,
  extendRiversToSea,
} from './data/riverSource'
import { createDevPanel } from './devPanel'
import {
  DEFAULT_CAMERA_TUNING,
  DEFAULT_COASTLINE_PARAMS,
  DEFAULT_EXTENT_PARAMS,
  DEFAULT_POLITICAL_PARAMS,
  DEFAULT_RELIEF_PARAMS,
  DEFAULT_RHUMB_PARAMS,
  DEFAULT_RIVER_PARAMS,
  DEFAULT_ROSE_PARAMS,
  politicalPalette,
} from './devParams'
// Vite resolves `?worker` into a constructor for the bundled worker module. It is the one
// bundler-specific line in the compute, and it lives here on purpose: the client that talks to the
// worker takes it as an injected `spawn`, so nothing below the composition root depends on Vite.
import ComputeWorker from './pipeline/computeWorker?worker'
import { createInlineMapCompute, rasterFromResult, scaleProgress } from './pipeline/inlineCompute'
import { DEFAULT_TERRAIN_OPTIONS } from './pipeline/terrainCompose'
import { createWorkerMapCompute } from './pipeline/workerCompute'
import { createCompassRose } from './scene/compassRose'
import {
  buildBorderStrokes,
  createComposedLineLayer,
  inlayOpacityScale,
} from './scene/composedLineLayer'
import { createDebugRect } from './scene/debugRect'
import { createLineLayer } from './scene/lineLayer'
import { createReliefMesh, reliefWorldY } from './scene/reliefMesh'
import { generateRhumbSegments } from './scene/rhumbNetwork'
import { createRiverLayer } from './scene/riverLayer'
import { wrapTerrainTexture } from './scene/terrainTexture'
import { createProgressOverlay } from './ui/progressOverlay'
import { hexToRgb } from './utils/color'
import { createLatestOnly } from './utils/latestOnly'
import { lerp } from './utils/math'

import type { MapRect } from './controls/mapControls'
import type { BorderPattern } from './data/borderStyles'
import type { Heightmap } from './data/heightmap'
import type { LandMask } from './data/landMask'
import type { RegionBorderLine, RegionBorders } from './data/regionRaster'
import type {
  CoastlineDevParams,
  ExtentDevParams,
  PoliticalDevParams,
  ReliefDevParams,
  RhumbDevParams,
  RiverDevParams,
  RoseDevParams,
} from './devParams'
import type { MapCompute, ProgressReport } from './pipeline/mapCompute'
import type { TerrainTextureOptions } from './pipeline/terrainCompose'
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
  const extentParams: ExtentDevParams = { ...DEFAULT_EXTENT_PARAMS }
  const toExtent = (): MapRect => ({
    minX: extentParams.centerX - extentParams.halfWidth,
    maxX: extentParams.centerX + extentParams.halfWidth,
    minZ: extentParams.centerZ - extentParams.halfDepth,
    maxZ: extentParams.centerZ + extentParams.halfDepth,
  })
  const controls = createMapControls(camera, renderer.domElement, {
    ...DEFAULT_CAMERA_TUNING,
    extent: toExtent(),
    // Honour prefers-reduced-motion by collapsing the inertia rather than disabling the controls.
    smoothingTau: reduceMotion ? 0.02 : DEFAULT_CAMERA_TUNING.smoothingTau,
    initialZoom: 0,
    edgeScrollMargin: 24,
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

  // The only DOM the app owns besides the canvas. It is also the surface roadmap chapter 07 wants for
  // load failures — built once, for both.
  const progress = createProgressOverlay({ host: document.body })

  const params: ReliefDevParams = { ...DEFAULT_RELIEF_PARAMS }

  // World-space width of the map plane (X axis), consumed by the mesh build.
  const WORLD_WIDTH = 12

  // Lift applied to draped lines before the exaggeration scale, so they clear the terrain they sit on
  // instead of z-fighting with it. Scaled down with the relief, hence deliberately generous.
  const RIVER_LIFT = 0.004

  // Relief subdivision. Draped overlays must land on the surface this produces, not on the raw DEM:
  // at 512 segments against a 1280-wide grid the mesh interpolates straight across ~17 km of terrain,
  // so a river read at its true DEM elevation sits *below* the drawn valley floor and is occluded.
  const RELIEF_SEGMENTS = 512

  // How far either side of a source ring the legacy border path samples, in DEM cells. It is the value
  // that breaks that path: `snapToCoast` grows each claim by up to its own value (5–12), so past two
  // cells both samples land in the same polity and the stretch is dropped. Kept only until the on-screen
  // comparison with the raster-derived borders is settled.
  const RING_BORDER_PROBE_CELLS = 2

  // How a change of year divides the progress bar. Measured rather than chosen: at the raster's 2× scale
  // the compute costs ~215 ms against a bake that is longer still, and the fetch is a local file. The
  // remainder above `bake` is the border geometry, which is this thread's own work and quick.
  const POLITICAL_SPLIT = { fetch: 0.1, compute: 0.65, bake: 0.95 }

  // Draw order of the political line work. It only matters once `borderOnTop` switches depth testing
  // off: with no depth to arbitrate, this is the sole thing keeping a core stroke above its own edging.
  const BORDER_RENDER_ORDER = 10

  // Baked terrain look (parchment + hypsometric tint + DEM hillshade), tuned live. Regenerating the
  // DataTexture is independent of the geometry rebuild (cheap material swap, no new geometry).
  const textureOptions: TerrainTextureOptions = { ...DEFAULT_TERRAIN_OPTIONS }
  // Coastline drawn as draped 3D lines (crisp, unlike a baked texture). A LIGHT jitter over a few
  // overlaid strokes at low opacity gives the soft pencil look. Follows `textureOptions.seaLevel`.
  const coastParams: CoastlineDevParams = { ...DEFAULT_COASTLINE_PARAMS }

  // Portolan rhumb network — straight lines radiating from a ring of compass centres over the Atlantic,
  // clipped to the sea (drawn only over water). Centre defaults to open ocean west of Iberia.
  const rhumbParams: RhumbDevParams = { ...DEFAULT_RHUMB_PARAMS }

  // Compass rose (variant D) — sits at the rhumb-network centre, portolan colour code (principal winds
  // inked, half-winds green, quarter-winds red).
  const roseParams: RoseDevParams = { ...DEFAULT_ROSE_PARAMS }

  // Rivers — Natural Earth centrelines (public domain), draped on the relief and revealed by zoom.
  const riverParams: RiverDevParams = { ...DEFAULT_RIVER_PARAMS }

  // Historical political overlay — GPL-3.0 source, kept out of git (see files/spikes/fetch-borders).
  const politicalParams: PoliticalDevParams = { ...DEFAULT_POLITICAL_PARAMS }

  // Europe relief — rebuilt from the loaded heightmap; the height curve requires a geometry rebuild.
  let heightmap: Heightmap | null = null
  let regionSet: Awaited<ReturnType<ReturnType<typeof createFetchRegionSource>['load']>> | null =
    null
  let reliefSource: Heightmap | null = null // the (possibly smoothed) grid every draped overlay samples
  // Which cells are land. A DEM cannot answer this — a polder is dry below sea level, a lake is wet
  // above it — so it comes from its own asset, with an elevation threshold as the degraded fallback.
  let landMask: LandMask | null = null
  let relief: ReturnType<typeof createReliefMesh> | null = null
  let terrainTexture: DataTexture | null = null
  let coastline: ReturnType<typeof createLineLayer> | null = null
  let rhumb: ReturnType<typeof createLineLayer> | null = null
  let rivers: ReturnType<typeof createRiverLayer> | null = null
  // Every stroke of the political line work: the frontier against unclaimed land, then the casing and
  // core of the shared borders. A list rather than one handle because a composed line is the *same*
  // geometry drawn several times — and each draw needs the resize, the exaggeration tracking and the
  // teardown just like a layer of its own.
  // The political line work — frontier, casing and core — behind one handle, like every other overlay.
  let borders: ReturnType<typeof createComposedLineLayer> | null = null
  // The main thread's copy of the political grid. The compute keeps its own — it is what the next bake
  // tints from — and this one exists for the things only this thread can do: the ring-path comparison
  // today, a click landing on a polity tomorrow.
  let regionRaster: ReturnType<typeof rasterFromResult> | null = null
  // The border lines as the compute derived them, kept so that restyling a stroke redraws rather than
  // re-traces. Only the smoothing changes the geometry, and it asks for a fresh derivation.
  let derivedBorders: RegionBorders | null = null
  let riverData: Awaited<ReturnType<ReturnType<typeof createFetchRiverSource>['load']>> = []
  let compass: ReturnType<typeof createCompassRose> | null = null
  let disposed = false // guards the async heightmap load from building a mesh after teardown (HMR mid-load)

  // Read through a call, not the binding: across an `await`, control-flow analysis still believes the
  // flag it narrowed cannot have changed — which is precisely what teardown does, and would turn every
  // guard below into dead code the compiler is happy to prove.
  const isDisposed = (): boolean => disposed

  const nextFrame = (): Promise<void> =>
    new Promise((resolve) => {
      requestAnimationFrame(() => {
        resolve()
      })
    })

  /**
   * The map's CPU work, off this thread when the browser allows it.
   *
   * The worker is what unfreezes the texture bake: it is one indivisible synchronous block, so no amount
   * of yielding between phases could keep the tab alive through it. The inline compute stays as the
   * fallback, and needs the frame wait the worker has no use for — on this thread, a flag raised before a
   * synchronous block is a flag nobody sees.
   */
  let compute: MapCompute

  /** The main-thread implementation, used when no worker can be had and when one dies. */
  const inlineCompute = (): MapCompute => createInlineMapCompute({ yieldControl: nextFrame })

  /**
   * Carry on after the worker dies, on this thread.
   *
   * The fallback starts empty — it holds neither the sources nor the year the dead worker was holding —
   * so recovering means redoing the setup, not just retrying the call that failed. A frozen map with one
   * console line is the outcome this exists to avoid.
   */
  const failoverToInline = (error: Error): void => {
    console.warn('map compute worker died — continuing on the main thread', error)
    if (isDisposed()) return
    compute = inlineCompute()
    void pushSources()
      .then(() => rebuildPolitical())
      .catch((failure: unknown) => {
        console.error('main-thread fallback could not restore the map', failure)
      })
  }

  try {
    compute = createWorkerMapCompute({
      spawn: () => new ComputeWorker(),
      onFatal: failoverToInline,
    })
  } catch (error: unknown) {
    console.warn('map compute worker unavailable — computing on the main thread instead', error)
    compute = inlineCompute()
  }

  /**
   * Hand the compute the sources it reads. Called again whenever one of them lands, since the relief and
   * the mask load independently and whichever arrives second must not leave the other behind.
   *
   * Copied across, never transferred: this thread keeps drawing the relief and draping overlays from the
   * very same buffers.
   * @returns once the compute holds them
   */
  const pushSources = async (): Promise<void> => {
    const dem = heightmap
    if (!dem) return
    const mask = landMask
    await compute.setSources({
      heightmap: { meta: dem.meta, data: dem.data },
      landMask: mask ? { meta: mask.meta, bits: mask.pack() } : null,
    })
  }

  // Project a normalized grid coordinate (u: west→east, v: north→south) to world XZ, matching the relief
  // mesh mapping. The coastline sits at a small fixed lift above the flat sea (y=0), independent of the
  // zoom-linked exaggeration (the shoreline is at sea level, so exaggeration barely moves it).
  const projectToWorld = (u: number, v: number): [number, number, number] => {
    if (!heightmap) return [0, coastParams.yLift, 0]
    const aspect = heightmap.meta.width / heightmap.meta.height
    const worldDepth = WORLD_WIDTH / aspect
    return [(u - 0.5) * WORLD_WIDTH, coastParams.yLift, (v - 0.5) * worldDepth]
  }

  // Same XZ mapping, but with Y sampled off the terrain: a river runs over the ground, not at sea level.
  // It goes through `reliefWorldY` — the relief mesh's own height curve — so the two cannot disagree;
  // the group's scale.y then tracks the mesh's live exaggeration every frame.
  const projectDraped = (u: number, v: number): [number, number, number] => {
    const [x, , z] = projectToWorld(u, v)
    const source = reliefSource
    if (!source) return [x, 0, z]
    const curve = { plainsCeiling: params.plainsCeiling, peakTarget: params.peakTarget }
    // Evaluate the height on the mesh's own vertex grid and interpolate between those nodes — the same
    // surface the triangles draw. Reading the DEM directly would place rivers on a finer terrain than
    // the one on screen, and bury them wherever the mesh spans a valley.
    const aspect = source.meta.width / source.meta.height
    const segX = RELIEF_SEGMENTS
    const segY = Math.max(1, Math.round(RELIEF_SEGMENTS / aspect))
    const fx = Math.min(segX, Math.max(0, u * segX))
    const fy = Math.min(segY, Math.max(0, v * segY))
    const x0 = Math.min(segX - 1, Math.floor(fx))
    const y0 = Math.min(segY - 1, Math.floor(fy))
    const tx = fx - x0
    const ty = fy - y0
    const nodeY = (col: number, row: number): number =>
      reliefWorldY(source.sample(col / segX, row / segY), curve)
    const top = nodeY(x0, y0) * (1 - tx) + nodeY(x0 + 1, y0) * tx
    const bottom = nodeY(x0, y0 + 1) * (1 - tx) + nodeY(x0 + 1, y0 + 1) * tx
    return [x, top * (1 - ty) + bottom * ty + RIVER_LIFT, z]
  }

  // Remove a layer handle from the scene and free its GPU resources (shared by every rebuild + teardown).
  const disposeHandle = (handle: { object: Object3D; dispose(): void } | null): void => {
    if (!handle) return
    scene.remove(handle.object)
    handle.dispose()
  }

  // Two gates, because two independent results race: a dev-panel slider fires a bake per change, and a
  // change of year fires a whole political rebuild. Without them the answer to an old drag position can
  // arrive after the answer to the current one and paint the map back to where it was. One gate each —
  // sharing a single one would have a bake needlessly cancel a year.
  const bakeGate = createLatestOnly()
  const politicalGate = createLatestOnly()

  /**
   * Re-bake the terrain texture and hang it on the relief.
   * @param onProgress - where to announce the bake, when a caller is showing a panel
   * @returns once the new texture is on screen, or once a newer bake has superseded this one
   */
  /**
   * Re-derive the grid every draped overlay samples.
   *
   * Kept apart from the mesh build so that draping stops depending on build order: an overlay created
   * before the relief mesh exists would otherwise be laid flat at sea level and stay there. That order
   * dependency was latent until the bake became asynchronous and the mesh stopped being first.
   * @returns the grid, or `null` before the elevation has loaded
   */
  const refreshReliefSource = (): Heightmap | null => {
    reliefSource = heightmap ? smoothHeightmap(heightmap, params.smoothing) : null
    return reliefSource
  }

  const rebuildTexture = async (onProgress?: ProgressReport): Promise<void> => {
    if (!heightmap) return
    const isCurrent = bakeGate.begin()
    const baked = await compute.bakeTerrain(textureOptions, onProgress)
    if (isDisposed() || !isCurrent()) return
    terrainTexture?.dispose()
    terrainTexture = wrapTerrainTexture(baked.rgba, baked.width, baked.height)
    if (relief) {
      relief.material.map = terrainTexture
      relief.material.color.set('#ffffff')
      relief.material.needsUpdate = true
    }
  }

  /** Fire a texture rebuild from a caller that cannot await — a dev-panel control, or a load handler. */
  const requestTexture = (): void => {
    void rebuildTexture().catch((error: unknown) => {
      console.error('terrain bake failed', error)
    })
  }

  const rebuildCoastline = (): void => {
    if (!heightmap) return
    disposeHandle(coastline)
    const mask = landMask ?? createElevationLandMask(heightmap, textureOptions.seaLevel)
    // Traced at twice the DEM rather than at the mask's full four times: the extra fidelity is invisible
    // at the zooms the coastline is drawn at, and marching 23 million cells is not.
    const segments = createMaskCoastlineSource(mask, heightmap.meta.width * 2).load()
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
    // Only the rhumb decor. It used to tear down the rivers and the borders as well without rebuilding
    // either: moving any rhumb slider made the rivers vanish for good (nulled, never rebuilt) and left
    // `borders` pointing at a handle whose GPU resources were already freed, so the next border rebuild
    // disposed them a second time. The rhumb layout has no bearing on either layer.
    disposeHandle(rhumb)
    const segments = generateRhumbSegments(
      heightmap,
      {
        center: { u: rhumbParams.centerU, v: rhumbParams.centerV },
        circleRadius: rhumbParams.circleRadius,
        nodeCount: rhumbParams.nodeCount,
        includeCenter: true,
        directions: rhumbParams.directions,
        seaLevel: textureOptions.seaLevel,
        step: rhumbParams.clipStep,
      },
      landMask ?? undefined
    )
    rhumb = createLineLayer(segments, {
      project: projectToWorld,
      color: rhumbParams.color,
      opacity: rhumbParams.opacity,
    })
    scene.add(rhumb.object)
  }

  const rebuildRivers = (): void => {
    if (!heightmap) return
    if (rivers) {
      scene.remove(rivers.object)
      rivers.dispose()
      rivers = null
    }
    if (riverData.length === 0) return
    // Natural Earth stops its centrelines at the estuary head, so bridge each mouth to the shoreline we
    // actually draw. Done here, not baked into the asset, because it keys off the live `seaLevel`.
    const connected = extendRiversToSea(
      riverData,
      landMask ?? createElevationLandMask(heightmap, textureOptions.seaLevel),
      DEFAULT_RIVER_EXTENSION
    )
    rivers = createRiverLayer(connected, {
      project: projectDraped,
      color: riverParams.color,
      opacity: riverParams.opacity,
      revealStart: riverParams.revealStart,
      revealEnd: riverParams.revealEnd,
      fade: riverParams.fade,
      includeLakeCenterlines: riverParams.includeLakeCenterlines,
      jitter: riverParams.jitter,
      widthMajor: riverParams.widthMajor,
      widthMinor: riverParams.widthMinor,
    })
    rivers.setZoom(controls.zoom)
    rivers.setResolution(window.innerWidth, window.innerHeight)
    scene.add(rivers.object)
  }

  /**
   * The original border path: trace the source rings, keeping only the stretches a fixed probe says
   * separate two polities.
   *
   * Kept behind `borderSource` purely to compare it on screen — it is the one that leaves gaps. The probe
   * reaches two DEM cells either side, while `snapToCoast` grows each claim by up to its own value, so
   * wherever the expansion moved the frontier further than the probe reaches, both samples land in the
   * same polity and the stretch is discarded.
   * @returns the border stretches, in normalized grid coordinates
   */
  const ringBorderLines = (): RegionBorderLine[] => {
    const out: RegionBorderLine[] = []
    if (!heightmap || !regionSet) return out
    const raster = regionRaster
    const probe = RING_BORDER_PROBE_CELLS / (heightmap.meta.width - 1)
    for (const region of regionSet.regions) {
      for (const ring of region.rings) {
        for (let i = 0; i < ring.length; i++) {
          const a = ring[i]
          const b = ring[(i + 1) % ring.length]
          if (!a || !b) continue
          // Only the stretches actually shared with another polity: the rest is coastline, which the
          // map already draws once, from a far better source.
          if (raster && !separatesRegions(raster, a, b, probe)) continue
          out.push([a, b]) // a two-point chain: the ring path has no runs to speak of
        }
      }
    }
    return out
  }

  /**
   * How the border between two polities is drawn, looked up by name in the editorial style table.
   * @param pair - the two region indices the stretch separates
   * @returns the drawing pattern
   */
  const patternForPair = (pair: readonly [number, number]): BorderPattern => {
    const regions = regionSet?.regions
    if (!regions) return 'solid'
    return borderPatternFor(regions[pair[0]]?.name ?? null, regions[pair[1]]?.name ?? null)
  }

  const rebuildBorders = (): void => {
    disposeHandle(borders)
    borders = null
    if (!heightmap || !regionSet || !politicalParams.showBorders) return
    // Derived from the fills, a border *is* their boundary — it cannot disagree with the colour and it
    // cannot be interrupted. The tracing happens in the compute, beside the grid it reads; what is kept
    // here is its result, so restyling a stroke redraws without re-tracing anything. The ring path below
    // only exists to compare the two, and has no notion of a frontier.
    const derived =
      derivedBorders && politicalParams.borderSource === 'raster'
        ? derivedBorders
        : {
            // The ring path knows nothing about which polities a stretch separates, so it all goes in
            // one bucket under a pair no rule can match — drawn solid, which is all it ever was.
            between: [{ pair: [-1, -1] as const, lines: ringBorderLines() }],
            frontier: [],
          }

    const strokes = buildBorderStrokes(
      derived,
      {
        coreColor: politicalParams.borderColor,
        coreWidth: politicalParams.borderWidth,
        edgeColor: politicalParams.borderEdgeColor,
        edgeWidth: politicalParams.borderEdgeWidth,
        opacity: politicalParams.borderOpacity,
        showFrontier: politicalParams.showFrontier,
        frontierColor: politicalParams.frontierColor,
        frontierWidth: politicalParams.frontierWidth,
        frontierOpacity: politicalParams.frontierOpacity,
        dashSize: politicalParams.borderDashSize,
        gapSize: politicalParams.borderDashGap,
        doubleGap: politicalParams.borderDoubleGap,
      },
      patternForPair
    )
    if (strokes.length === 0) return
    borders = createComposedLineLayer(strokes, {
      project: projectDraped,
      depthTest: !politicalParams.borderOnTop,
      renderOrderBase: BORDER_RENDER_ORDER,
      dashSize: politicalParams.borderDashSize,
      gapSize: politicalParams.borderDashGap,
    })
    borders.setResolution(window.innerWidth, window.innerHeight)
    scene.add(borders.object)
  }

  const regionSourcePort = createFetchRegionSource((year) => `/borders/europe-${String(year)}.json`)

  /**
   * A change of year, end to end: fetch the polities, hand them to the compute, hang the result on the
   * map.
   *
   * The panel is honest now because the work is genuinely elsewhere. The texture bake is one indivisible
   * synchronous block — no amount of yielding could have kept this thread alive through it — so the bar
   * used to stall at seventy per cent and the tab with it. What is left here is a fetch, a wait, and the
   * two things only this thread can do: wrapping pixels into a texture and building line geometry.
   * @returns nothing; resolves once the year is on screen
   */
  const rebuildPolitical = async (): Promise<void> => {
    if (!heightmap) return
    // Every await below is a place a second rebuild can start — the palette pickers fire continuously,
    // and a year fetched from cache can overtake one still in flight. Checked before *every* side effect,
    // not only before the state write: a stale call whose raster was correctly suppressed would otherwise
    // still go on to overwrite the live texture and the border layer underneath the newer one.
    const isCurrent = politicalGate.begin()
    const year = Math.round(politicalParams.year / 100) * 100
    progress.begin(`Chargement de l'année ${String(year)}…`)
    try {
      const loaded = await regionSourcePort.load(year)
      if (isDisposed() || !isCurrent()) return
      regionSet = loaded

      // The panel spans two jobs, so each reports into its own slice of the bar rather than being told
      // where it sits in a sequence it knows nothing about.
      const report: ProgressReport = (fraction, phase) => {
        progress.report(fraction, COMPUTE_PHASE_LABELS[phase])
      }

      const result = await compute.computePolitical(
        {
          regions: loaded.regions,
          rasterScale: politicalParams.rasterScale,
          snapToCoast: politicalParams.snapToCoast,
          colorBySuzerain: politicalParams.colorBySuzerain,
          palette: politicalPalette(politicalParams).map(hexToRgb),
          borderSmoothing: politicalParams.borderSmoothing,
        },
        scaleProgress(report, POLITICAL_SPLIT.fetch, POLITICAL_SPLIT.compute)
      )
      if (isDisposed() || !isCurrent()) return
      regionRaster = rasterFromResult(result)
      derivedBorders = result.borders

      await rebuildTexture(scaleProgress(report, POLITICAL_SPLIT.compute, POLITICAL_SPLIT.bake))
      if (isDisposed() || !isCurrent()) return

      rebuildBorders()
      progress.report(1)
    } catch (error: unknown) {
      console.error(`political layer ${String(year)} failed to load`, error)
    } finally {
      progress.end()
    }
  }

  /**
   * Re-trace the border lines from the grid the compute already holds, then redraw them.
   *
   * The one border tunable that changes geometry rather than paint. It costs a trace, not a year: the
   * raster is not touched.
   * @returns once the lines are back on screen
   */
  const rebuildBorderGeometry = async (): Promise<void> => {
    if (!regionSet) return
    try {
      const traced = await compute.deriveBorders(politicalParams.borderSmoothing)
      if (isDisposed()) return
      derivedBorders = traced
      rebuildBorders()
    } catch (error: unknown) {
      console.error('border derivation failed', error)
    }
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
    const source = refreshReliefSource()
    if (!source) return
    relief = createReliefMesh(source, {
      worldWidth: WORLD_WIDTH,
      segments: RELIEF_SEGMENTS,
      plainsCeiling: params.plainsCeiling,
      peakTarget: params.peakTarget,
      wireframe: params.wireframe,
      ...(terrainTexture ? { map: terrainTexture } : {}),
    })
    relief.scale.setY(params.exaggeration)
    scene.add(relief)
  }

  /**
   * Bring the map up in a single appearance.
   *
   * The relief and the mask used to load independently, each triggering its own bake, and the political
   * layer a third — so the map arrived in three visible instalments, each one throwing away the last.
   * Worse, once the bake became asynchronous the mesh stopped waiting for its texture and appeared
   * untextured first: four states for one map.
   *
   * Sequenced instead, into **two** deliberate stages rather than three accidental ones:
   *
   * 1. the terrain — sea, continents, relief — as soon as the elevation and the mask are in;
   * 2. the same map with the countries and their borders, once the political layer has been computed.
   *
   * Two stages and not one is the dev's call, made on screen: waiting for everything meant a blank
   * parchment for the whole load, and Europe appearing at once late reads worse than Europe appearing
   * early and then being coloured in. The cost is real and worth stating — **it bakes twice**, roughly
   * 1.5 million pixels each, and the two bakes serialise in the worker, so the *finished* map lands later
   * than it would have. What was removed is only the waste: the third bake, and the untextured mesh.
   * @returns once the map is on screen
   */
  const startup = async (): Promise<void> => {
    // The mask is optional by design: without it the shoreline falls back to an elevation threshold,
    // visibly wrong in the Dutch polders, but a degraded map beats a blank canvas.
    const [dem, mask] = await Promise.all([
      heightmapSource.load(),
      landMaskSource.load().catch((error: unknown) => {
        console.error('land mask load failed — falling back to the 0 m contour', error)
        return null
      }),
    ])
    if (isDisposed()) return // teardown ran mid-load → don't add an orphan mesh to a dead scene
    heightmap = dem
    landMask = mask
    refreshReliefSource() // draping is correct from here on, mesh or no mesh
    await pushSources()
    if (isDisposed()) return

    // Stage one: the terrain alone. Awaited before the mesh is built, never fired and forgotten — a
    // relief built while the texture is still in the worker takes no map at all and shows as bare
    // material colour, which is exactly the flash this sequencing exists to remove.
    await rebuildTexture()
    if (isDisposed()) return

    rebuildRelief()
    rebuildCoastline()
    rebuildRhumb()
    rebuildRivers() // no-op until the river payload lands; whichever finishes last draws them
    rebuildRose()

    // Stage two: the same map with the countries painted in and their borders drawn over it. It bakes
    // again — the tint is composited into the texture, not laid over it — and announces itself through
    // the progress panel, so the wait is visible rather than mysterious.
    await rebuildPolitical()
  }

  const heightmapSource = createFetchHeightmapSource('/heightmaps/europe-dem-z5')
  const landMaskSource = createFetchLandMaskSource('/masks/europe-land')

  void startup().catch((error: unknown) => {
    console.error('the map could not be brought up', error)
  })

  // Rivers load independently of the DEM: neither blocks the other, and the second to arrive triggers
  // the build (the rebuild needs both the terrain to drape on and the centrelines to drape).
  void createFetchRiverSource('/rivers/europe-rivers.json')
    .load()
    .then((loaded) => {
      if (disposed) return
      riverData = loaded
      rebuildRivers()
    })
    .catch((error: unknown) => {
      console.error('river load failed', error)
    })

  const gui = createDevPanel({
    relief: params,
    texture: textureOptions,
    coast: coastParams,
    rhumb: rhumbParams,
    river: riverParams,
    political: politicalParams,
    rose: roseParams,
    controlsOptions: controls.options,
    framing,
    extent: extentParams,
    debug,
    callbacks: {
      rebuildRelief,
      rebuildTexture: requestTexture,
      rebuildCoastline,
      rebuildRhumb,
      rebuildRivers,
      rebuildPolitical: () => {
        void rebuildPolitical()
      },
      rebuildBorders,
      rebuildBorderGeometry: () => {
        void rebuildBorderGeometry()
      },
      rebuildRose,
      setWireframe: (value: boolean): void => {
        if (relief) relief.material.wireframe = value
      },
      setCoastColor: (color: string): void => {
        coastline?.setColor(color)
      },
      setRiverColor: (color: string): void => {
        rivers?.setColor(color)
      },
      setRhumbColor: (color: string): void => {
        rhumb?.setColor(color)
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
                river: riverParams,
                political: politicalParams,
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
    // Fat lines size their stroke in screen pixels, so the shader needs the new viewport or the width
    // distorts with the aspect ratio.
    rivers?.setResolution(window.innerWidth, window.innerHeight)
    borders?.setResolution(window.innerWidth, window.innerHeight)
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
    // Rivers follow the relief's live exaggeration (same surface), and reveal their finer ranks as the
    // camera comes in — opacity only, so no geometry is rebuilt while zooming.
    // Anything draped is built against an unexaggerated surface, so it has to track the relief's live
    // scale.y. Miss it and the overlay floats by the exaggeration ratio — nothing on a plain, glaringly
    // wrong along a mountain crest, where a border is precisely where the terrain is highest.
    if (relief) {
      if (rivers) {
        rivers.object.scale.setY(relief.scale.y)
        rivers.setZoom(controls.zoom)
      }
      if (borders) borders.object.scale.setY(relief.scale.y)
    }
    // Zoom-linked line work. A weight that reads as a drawn border close up becomes a rope across the
    // continent from far away, and an edging either side of a hairline reads as an alternation rather
    // than as one border — so the whole thing thins out and the casing fades away as the camera pulls
    // back. Both are live material uniforms, so nothing is rebuilt while zooming.
    if (borders) {
      // A patterned border holds a plain border's weight at continent scale, then thins to the core's
      // weight close up — hence the ratio rather than a knob: it is the same 1.4 px the inlay uses.
      const patternAtZoomIn = politicalParams.borderWidth / politicalParams.borderEdgeWidth
      borders.setWidthScale(
        lerp(politicalParams.borderWidthZoomOut, 1, controls.zoom),
        lerp(politicalParams.borderWidthZoomOut, patternAtZoomIn, controls.zoom)
      )
      borders.setOpacityScale(lerp(politicalParams.borderOpacityZoomOut, 1, controls.zoom))
      borders.setInlayOpacity(inlayOpacityScale(controls.zoom, politicalParams.borderInlayZoom))
    }
    // Zoom-linked opacity: `opacity` at zoom-out (z=0) → `opacityZoomIn` at zoom-in (z=1).
    if (coastline)
      coastline.setOpacity(lerp(coastParams.opacity, coastParams.opacityZoomIn, controls.zoom))
    // Rhumb network fades as you zoom in (less clutter over the terrain).
    if (rhumb) rhumb.setOpacity(lerp(rhumbParams.opacity, rhumbParams.opacityZoomIn, controls.zoom))
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
    // Terminate the worker before anything else: it is the only part of this that outlives the page's
    // own teardown if left alone, and a bake in flight has nothing left to hand its pixels to.
    compute.dispose()
    gui.destroy()
    progress.dispose()
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
    disposeHandle(borders)
    if (rivers) {
      scene.remove(rivers.object)
      rivers.dispose()
      rivers = null
    }
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
