import { Color, PerspectiveCamera, Scene, Timer, WebGLRenderer } from 'three'
import Stats from 'three/addons/libs/stats.module.js'

import { createSessionStorageMapCameraStore } from './controls/mapCameraStore'
import { createMapControls } from './controls/mapControls'
import { borderPatternFor } from './data/borderStyles'
import { createMaskCoastlineSource } from './data/coastlineSource'
import { createFetchHeightmapSource, smoothHeightmap } from './data/heightmap'
import { createElevationLandMask, createFetchLandMaskSource } from './data/landMask'
import { pinnedRegionColor } from './data/regionPalette'
import {
  assignRegionColors,
  expandRegionsOverLand,
  extractRegionBorders,
  rasteriseRegions,
  separatesRegions,
} from './data/regionRaster'
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
import { createCompassRose } from './scene/compassRose'
import {
  buildBorderStrokes,
  casingOpacityScale,
  createComposedLineLayer,
} from './scene/composedLineLayer'
import { createDebugRect } from './scene/debugRect'
import { createLineLayer } from './scene/lineLayer'
import { createReliefMesh, reliefWorldY } from './scene/reliefMesh'
import { generateRhumbSegments } from './scene/rhumbNetwork'
import { createRiverLayer } from './scene/riverLayer'
import { DEFAULT_TERRAIN_OPTIONS, createTerrainTexture } from './scene/terrainTexture'
import { hexToRgb } from './utils/color'
import { lerp } from './utils/math'

import type { MapRect } from './controls/mapControls'
import type { BorderPattern } from './data/borderStyles'
import type { Heightmap } from './data/heightmap'
import type { LandMask } from './data/landMask'
import type { RegionBorderLine } from './data/regionRaster'
import type {
  CoastlineDevParams,
  ExtentDevParams,
  PoliticalDevParams,
  ReliefDevParams,
  RhumbDevParams,
  RiverDevParams,
  RoseDevParams,
} from './devParams'
import type { AreaTint, TerrainTextureOptions } from './scene/terrainTexture'
import type { RgbColor } from './utils/color'
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
  let reliefSource: Heightmap | null = null // the (possibly smoothed) grid the mesh was actually built from
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
  let regionRaster: ReturnType<typeof rasteriseRegions> | null = null
  let regionTints: RgbColor[] = []
  // The seam the compositor sees: a colour claimed at a coordinate, and nothing about history.
  const areaTint: AreaTint = {
    at: (u, v) => {
      const index = regionRaster?.indexAt(u, v) ?? -1
      return index < 0 ? null : (regionTints[index] ?? null)
    },
  }
  let riverData: Awaited<ReturnType<ReturnType<typeof createFetchRiverSource>['load']>> = []
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

  const rebuildTexture = (): void => {
    if (!heightmap) return
    terrainTexture?.dispose()
    terrainTexture = createTerrainTexture(
      heightmap,
      textureOptions,
      landMask ?? createElevationLandMask(heightmap, textureOptions.seaLevel),
      areaTint
    )
    if (relief) {
      relief.material.map = terrainTexture
      relief.material.color.set('#ffffff')
      relief.material.needsUpdate = true
    }
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
    const raster = regionRaster
    const mask = landMask
    // Derived from the fills, a border *is* their boundary — it cannot disagree with the colour and it
    // cannot be interrupted. The ring path below only exists to compare the two, and has no notion of a
    // frontier. The mask is what separates "faces the open sea" (say nothing, the shoreline is already
    // drawn from a better source) from "faces land nobody claims" (draw the edge of the mapped world).
    const derived =
      raster && politicalParams.borderSource === 'raster'
        ? extractRegionBorders(raster, {
            smoothing: politicalParams.borderSmoothing,
            ...(mask ? { isLand: (u: number, v: number) => mask.isLand(u, v) } : {}),
          })
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

  const rebuildPolitical = (): void => {
    if (!heightmap) return
    const year = Math.round(politicalParams.year / 100) * 100
    void regionSourcePort
      .load(year)
      .then((loaded) => {
        if (disposed) return
        regionSet = loaded
        // Rasterised at the DEM's own grid: political areas are large, and the crisp edge the eye reads
        // is the border line drawn on top, not the boundary of the tint underneath.
        const claimed = rasteriseRegions(
          loaded.regions,
          heightmap?.meta.width ?? 1,
          heightmap?.meta.height ?? 1
        )
        // Grow the claims over any land the schematic polygons missed, so the coloured areas end on our
        // coastline rather than on theirs.
        const mask = landMask
        regionRaster = mask
          ? expandRegionsOverLand(claimed, (u, v) => mask.isLand(u, v), politicalParams.snapToCoast)
          : claimed
        // Colouring reads adjacency off the raster, so it has to run after the claims have grown: two
        // polities may only become neighbours once they both reach the coast.
        const named = loaded.regions.map((region) => ({
          name: politicalParams.colorBySuzerain ? (region.subjectTo ?? region.name) : region.name,
        }))
        regionTints = assignRegionColors(
          regionRaster,
          named,
          politicalPalette(politicalParams).map(hexToRgb),
          pinnedRegionColor
        )
        rebuildTexture()
        rebuildBorders()
      })
      .catch((error: unknown) => {
        console.error(`political layer ${String(year)} failed to load`, error)
      })
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
    reliefSource = source // overlays must drape on the same data the mesh was built from
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
      rebuildRivers() // no-op until the river payload lands; whichever finishes last draws them
      rebuildRose()
      rebuildPolitical()
    })
    .catch((error: unknown) => {
      console.error('relief load failed', error)
    })

  // The land mask loads independently too. If it fails the app still runs, on the elevation threshold —
  // visibly wrong in the Netherlands, but running beats a blank canvas.
  void createFetchLandMaskSource('/masks/europe-land')
    .load()
    .then((loaded) => {
      if (disposed) return
      landMask = loaded
      if (!heightmap) return
      rebuildTexture()
      rebuildCoastline()
      rebuildRhumb()
      rebuildRivers()
      // The mask is what lets the borders tell open sea from land nobody claims: without it there is no
      // frontier line at all, and the ring path still carries every coastal segment.
      rebuildBorders()
    })
    .catch((error: unknown) => {
      console.error('land mask load failed — falling back to the 0 m contour', error)
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
      rebuildTexture,
      rebuildCoastline,
      rebuildRhumb,
      rebuildRivers,
      rebuildPolitical,
      rebuildBorders,
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
      borders.setWidthScale(lerp(politicalParams.borderWidthZoomOut, 1, controls.zoom))
      borders.setCasingOpacity(casingOpacityScale(controls.zoom, politicalParams.borderCasingZoom))
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
