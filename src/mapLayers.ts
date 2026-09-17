/**
 * Everything drawn over the terrain, behind one handle.
 *
 * These layers were held as eight separate bindings in the composition root, and that is what made the
 * root grow: each one has to be disposed here, resized there and rescaled every frame, and keeping three
 * loops in step by hand is exactly the tripwire `modular-architecture.md` warns about. One object with
 * `rebuild*`, `setResolution`, `frame` and `dispose` cannot fall out of step with itself.
 *
 * It owns no data. The sources are injected and read live, so a reload or a retuned curve reaches every
 * layer without any of them holding a stale copy.
 */

import { borderPatternFor } from './data/borderStyles'
import { createMaskCoastlineSource } from './data/coastlineSource'
import { createElevationLandMask } from './data/landMask'
import { DEFAULT_RIVER_EXTENSION, extendRiversToSea } from './data/riverSource'
import { createCompassRose } from './scene/compassRose'
import {
  buildBorderStrokes,
  createComposedLineLayer,
  inlayOpacityScale,
} from './scene/composedLineLayer'
import { createDrapeProjection } from './scene/drapeProjection'
import { createLineLayer } from './scene/lineLayer'
import { createReliefMesh } from './scene/reliefMesh'
import { generateRhumbSegments } from './scene/rhumbNetwork'
import { createRiverLayer } from './scene/riverLayer'
import { lerp } from './utils/math'

import type { BorderPattern } from './data/borderStyles'
import type { DevState } from './devState'
import type { MapSources } from './mapSources'
import type { CompassRose } from './scene/compassRose'
import type { ComposedLineLayer } from './scene/composedLineLayer'
import type { DrapeProjection } from './scene/drapeProjection'
import type { LineLayer } from './scene/lineLayer'
import type { RiverLayer } from './scene/riverLayer'
import type { DataTexture, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, Scene } from 'three'

/** World-space width of the map plane on X, which every other dimension follows from. */
export const WORLD_WIDTH = 12

/**
 * Relief subdivision.
 *
 * Draped overlays must land on the surface this produces, not on the raw DEM: at 512 segments against a
 * 1280-wide grid the mesh interpolates straight across some 17 km of terrain, so a river read at its
 * true DEM elevation sits *below* the drawn valley floor and is occluded by it.
 */
export const RELIEF_SEGMENTS = 512

/**
 * Lift applied to draped lines before the exaggeration scale, so they clear the terrain they sit on
 * instead of z-fighting with it. Scaled down with the relief, hence deliberately generous.
 */
const RIVER_LIFT = 0.004

/**
 * Draw order of the political line work. It only matters once `borderOnTop` switches depth testing off:
 * with no depth to arbitrate, this is the sole thing keeping a core stroke above its own edging.
 */
const BORDER_RENDER_ORDER = 10

/** The relief mesh, whose material carries the baked terrain texture. */
type ReliefMesh = Mesh<PlaneGeometry, MeshBasicMaterial>

/** Every layer currently on screen, or `null` where one has not been built yet. */
interface LayerHandles {
  /** The terrain itself. */
  relief: ReliefMesh | null
  /** The baked look hanging on it, managed apart from the mesh: a retune is a texture swap, not a rebuild. */
  texture: DataTexture | null
  /** The drawn shoreline. */
  coastline: LineLayer | null
  /** The portolan rhumb web. */
  rhumb: LineLayer | null
  /** The river network. */
  rivers: RiverLayer | null
  /** The political line work — frontier, casing and core — behind one handle like any other overlay. */
  borders: ComposedLineLayer | null
  /** The compass rose. */
  compass: CompassRose | null
}

/** What the layers read and draw into. */
export interface MapLayersDeps {
  /** The scene every layer is added to. */
  scene: Scene
  /** The live tunables. */
  dev: DevState
  /** What has been loaded so far. */
  sources: MapSources
}

/** The layers plus the things they need, passed to every builder instead of captured in a closure. */
interface LayerContext extends MapLayersDeps {
  /** How a grid coordinate becomes a world position, flat or draped. */
  projection: DrapeProjection
  /** The live handles, mutated in place as layers are rebuilt. */
  handles: LayerHandles
}

/** The map's overlays, as one thing. */
export interface MapLayers {
  /**
   * Rebuild the terrain mesh. Needed whenever the height curve changes, since that is geometry.
   * @returns nothing
   */
  rebuildRelief: () => void
  /**
   * Hang a freshly baked texture on the relief.
   * @param texture - the baked look; the previous one is disposed
   * @returns nothing
   */
  setTexture: (texture: DataTexture) => void
  /**
   * Retrace and redraw the shoreline.
   * @returns nothing
   */
  rebuildCoastline: () => void
  /**
   * Regenerate and redraw the rhumb web.
   * @returns nothing
   */
  rebuildRhumb: () => void
  /**
   * Redrape the rivers. A no-op until the centrelines land.
   * @returns nothing
   */
  rebuildRivers: () => void
  /**
   * Redraw the political line work from the borders the compute derived.
   * @returns nothing
   */
  rebuildBorders: () => void
  /**
   * Rebuild the compass rose, whose colours and labels are baked into its SVG.
   * @returns nothing
   */
  rebuildRose: () => void
  /**
   * Show the relief as a wireframe.
   * @param value - whether to draw wires instead of the painted surface
   * @returns nothing
   */
  setWireframe: (value: boolean) => void
  /**
   * Repaint the coastline without retracing it.
   * @param color - the new ink
   * @returns nothing
   */
  setCoastColor: (color: string) => void
  /**
   * Repaint the rivers without redraping them.
   * @param color - the new ink
   * @returns nothing
   */
  setRiverColor: (color: string) => void
  /**
   * Repaint the rhumb web without regenerating it.
   * @param color - the new ink
   * @returns nothing
   */
  setRhumbColor: (color: string) => void
  /**
   * Fade the compass rose.
   * @param value - the new opacity
   * @returns nothing
   */
  setRoseOpacity: (value: number) => void
  /**
   * Tell every fat-line layer the viewport size, which its shader needs to size a stroke in pixels.
   * @param width - viewport width in CSS pixels
   * @param height - viewport height in CSS pixels
   * @returns nothing
   */
  setResolution: (width: number, height: number) => void
  /**
   * Bring every layer up to date for this frame's zoom.
   * @param zoom - the camera's zoom in `[0, 1]`, zoomed out at zero
   * @returns nothing
   */
  frame: (zoom: number) => void
  /**
   * What a click raycasts against — the terrain itself, or `null` before it is built.
   *
   * A call rather than a handle, because the mesh is replaced whenever the height curve changes: a
   * picker holding the old one would answer about a surface no longer on screen.
   * @returns the relief mesh
   */
  pickTarget: () => Object3D | null
  /** Remove every layer from the scene and free its GPU resources. */
  dispose: () => void
}

/**
 * Remove a layer from the scene and free its GPU resources.
 *
 * `scene.remove` alone leaks: the geometry and the material stay on the GPU with nothing referencing
 * them, which is invisible until a few hundred rebuilds in.
 * @param scene - the scene it was added to
 * @param handle - the layer, or `null`
 * @returns nothing
 */
function disposeHandle(
  scene: Scene,
  handle: { object: Object3D; dispose: () => void } | null
): void {
  if (!handle) return
  scene.remove(handle.object)
  handle.dispose()
}

/**
 * Remove the relief mesh and free it.
 *
 * Its material is disposed separately from its texture on purpose: `Material.dispose` leaves `map`
 * alone, and the texture outlives any one mesh.
 * @param scene - the scene it was added to
 * @param relief - the mesh, or `null`
 * @returns nothing
 */
function disposeRelief(scene: Scene, relief: ReliefMesh | null): void {
  if (!relief) return
  scene.remove(relief)
  relief.geometry.dispose()
  relief.material.dispose()
}

/**
 * Build the projection every overlay is drawn through.
 *
 * Accessors rather than values: the grid reloads and the height curve is dragged live, so a projection
 * built from a snapshot would quietly stop matching the terrain.
 * @param dev - the live tunables
 * @param sources - what has been loaded
 * @returns the projection
 */
function createLayerProjection(dev: DevState, sources: MapSources): DrapeProjection {
  return createDrapeProjection({
    worldWidth: WORLD_WIDTH,
    segments: RELIEF_SEGMENTS,
    frame: () => sources.heightmap?.meta ?? null,
    source: () => sources.reliefSource,
    curve: () => ({ plainsCeiling: dev.relief.plainsCeiling, peakTarget: dev.relief.peakTarget }),
    flatLift: () => dev.coast.yLift,
    drapedLift: RIVER_LIFT,
  })
}

/**
 * The land mask, or the documented degraded fallback when the asset failed.
 *
 * Thresholding elevation drowns land below sea level and dries out every lake above it — visibly wrong
 * in the Dutch polders — but a degraded map beats a blank canvas.
 * @param context - the layers and what they read
 * @returns a mask, always
 */
function maskOrFallback(context: LayerContext): ReturnType<typeof createElevationLandMask> {
  const { sources, dev } = context
  if (sources.landMask) return sources.landMask
  if (!sources.heightmap) throw new Error('map layers: no elevation to threshold')
  return createElevationLandMask(sources.heightmap, dev.texture.seaLevel)
}

/**
 * How the border between two polities is drawn, looked up by name in the editorial style table.
 * @param context - the layers and what they read
 * @param pair - the two region indices the stretch separates
 * @returns the drawing pattern
 */
function patternForPair(context: LayerContext, pair: readonly [number, number]): BorderPattern {
  const regions = context.sources.regionSet?.regions
  if (!regions) return 'solid'
  return borderPatternFor(regions[pair[0]]?.name ?? null, regions[pair[1]]?.name ?? null)
}

/**
 * Rebuild the terrain mesh from the current relief grid.
 * @param context - the layers and what they read
 * @returns nothing
 */
function rebuildRelief(context: LayerContext): void {
  const { scene, dev, sources, handles } = context
  if (!sources.reliefSource) return
  disposeRelief(scene, handles.relief)
  const relief = createReliefMesh(sources.reliefSource, {
    worldWidth: WORLD_WIDTH,
    segments: RELIEF_SEGMENTS,
    plainsCeiling: dev.relief.plainsCeiling,
    peakTarget: dev.relief.peakTarget,
    wireframe: dev.relief.wireframe,
    ...(handles.texture ? { map: handles.texture } : {}),
  })
  relief.scale.setY(dev.relief.exaggeration)
  handles.relief = relief
  scene.add(relief)
}

/**
 * Hang a freshly baked texture on the relief.
 * @param context - the layers and what they read
 * @param texture - the baked look
 * @returns nothing
 */
function setTexture(context: LayerContext, texture: DataTexture): void {
  const { handles } = context
  handles.texture?.dispose()
  handles.texture = texture
  const relief = handles.relief
  if (!relief) return
  relief.material.map = texture
  relief.material.color.set('#ffffff') // white base, so the map's own colours show unmodulated
  relief.material.needsUpdate = true
}

/**
 * Retrace and redraw the shoreline.
 * @param context - the layers and what they read
 * @returns nothing
 */
function rebuildCoastline(context: LayerContext): void {
  const { scene, dev, sources, handles, projection } = context
  if (!sources.heightmap) return
  disposeHandle(scene, handles.coastline)
  // Traced at twice the DEM rather than at the mask's full four times: the extra fidelity is invisible
  // at the zooms the coastline is drawn at, and marching 23 million cells is not.
  const segments = createMaskCoastlineSource(
    maskOrFallback(context),
    sources.heightmap.meta.width * 2
  ).load()
  handles.coastline = createLineLayer(segments, {
    project: projection.toWorld,
    color: dev.coast.color,
    opacity: dev.coast.opacity,
    jitter: dev.coast.jitter,
    strokes: dev.coast.strokes,
  })
  scene.add(handles.coastline.object)
}

/**
 * Regenerate and redraw the rhumb web.
 *
 * Only the rhumb decor: it used to tear down the rivers and the borders as well without rebuilding
 * either, so moving any rhumb slider made the rivers vanish for good and left the border handle pointing
 * at freed GPU resources.
 * @param context - the layers and what they read
 * @returns nothing
 */
function rebuildRhumb(context: LayerContext): void {
  const { scene, dev, sources, handles, projection } = context
  if (!sources.heightmap) return
  disposeHandle(scene, handles.rhumb)
  const segments = generateRhumbSegments(
    sources.heightmap,
    {
      center: { u: dev.rhumb.centerU, v: dev.rhumb.centerV },
      circleRadius: dev.rhumb.circleRadius,
      nodeCount: dev.rhumb.nodeCount,
      includeCenter: true,
      directions: dev.rhumb.directions,
      seaLevel: dev.texture.seaLevel,
      step: dev.rhumb.clipStep,
    },
    sources.landMask ?? undefined
  )
  handles.rhumb = createLineLayer(segments, {
    project: projection.toWorld,
    color: dev.rhumb.color,
    opacity: dev.rhumb.opacity,
  })
  scene.add(handles.rhumb.object)
}

/**
 * Redrape the rivers.
 * @param context - the layers and what they read
 * @returns nothing
 */
function rebuildRivers(context: LayerContext): void {
  const { scene, dev, sources, handles, projection } = context
  disposeHandle(scene, handles.rivers)
  handles.rivers = null
  if (!sources.heightmap || sources.riverData.length === 0) return
  // Natural Earth stops its centrelines at the estuary head, so bridge each mouth to the shoreline we
  // actually draw. Done here, not baked into the asset, because it keys off the live sea level.
  const connected = extendRiversToSea(
    sources.riverData,
    maskOrFallback(context),
    DEFAULT_RIVER_EXTENSION
  )
  handles.rivers = createRiverLayer(connected, {
    project: projection.draped,
    color: dev.river.color,
    opacity: dev.river.opacity,
    revealStart: dev.river.revealStart,
    revealEnd: dev.river.revealEnd,
    fade: dev.river.fade,
    includeLakeCenterlines: dev.river.includeLakeCenterlines,
    jitter: dev.river.jitter,
    widthMajor: dev.river.widthMajor,
    widthMinor: dev.river.widthMinor,
  })
  handles.rivers.setResolution(window.innerWidth, window.innerHeight)
  scene.add(handles.rivers.object)
}

/**
 * Redraw the political line work from the borders the compute derived.
 *
 * Derived from the fills, a border *is* their boundary — it cannot disagree with the colour and it
 * cannot be interrupted. The tracing happens in the compute, beside the grid it reads; what is kept here
 * is its result, so restyling a stroke redraws without re-tracing anything.
 * @param context - the layers and what they read
 * @returns nothing
 */
function rebuildBorders(context: LayerContext): void {
  const { scene, dev, sources, handles, projection } = context
  disposeHandle(scene, handles.borders)
  handles.borders = null
  if (!sources.derivedBorders || !dev.political.showBorders) return
  const strokes = buildBorderStrokes(sources.derivedBorders, borderStrokeStyle(dev), (pair) =>
    patternForPair(context, pair)
  )
  if (strokes.length === 0) return
  handles.borders = createComposedLineLayer(strokes, {
    project: projection.draped,
    depthTest: !dev.political.borderOnTop,
    renderOrderBase: BORDER_RENDER_ORDER,
    dashSize: dev.political.borderDashSize,
    gapSize: dev.political.borderDashGap,
  })
  handles.borders.setResolution(window.innerWidth, window.innerHeight)
  scene.add(handles.borders.object)
}

/**
 * How the border strokes are dressed, gathered from the live tunables.
 * @param dev - the live tunables
 * @returns the stroke style
 */
function borderStrokeStyle(dev: DevState): Parameters<typeof buildBorderStrokes>[1] {
  return {
    coreColor: dev.political.borderColor,
    coreWidth: dev.political.borderWidth,
    edgeColor: dev.political.borderEdgeColor,
    edgeWidth: dev.political.borderEdgeWidth,
    opacity: dev.political.borderOpacity,
    showFrontier: dev.political.showFrontier,
    frontierColor: dev.political.frontierColor,
    frontierWidth: dev.political.frontierWidth,
    frontierOpacity: dev.political.frontierOpacity,
    dashSize: dev.political.borderDashSize,
    gapSize: dev.political.borderDashGap,
    doubleGap: dev.political.borderDoubleGap,
  }
}

/**
 * Rebuild the compass rose.
 * @param context - the layers and what they read
 * @returns nothing
 */
function rebuildRose(context: LayerContext): void {
  const { scene, dev, handles, projection } = context
  disposeHandle(scene, handles.compass)
  const [x, , z] = projection.toWorld(dev.rose.centerU, dev.rose.centerV)
  handles.compass = createCompassRose({
    colors: { ink: dev.rose.ink, halfWind: dev.rose.halfWind, quarterWind: dev.rose.quarterWind },
    labels: dev.rose.showLabels,
    size: dev.rose.size,
    opacity: dev.rose.opacity,
    position: [x, dev.rose.lift, z],
  })
  scene.add(handles.compass.object)
}

/**
 * Track the relief's live exaggeration with everything draped on it.
 *
 * Anything draped is built against an unexaggerated surface, so it has to follow the mesh's `scale.y`.
 * Miss it and the overlay floats by the exaggeration ratio — nothing on a plain, glaringly wrong along a
 * mountain crest, which is exactly where a border tends to run.
 * @param context - the layers and what they read
 * @param zoom - the camera's zoom in `[0, 1]`
 * @returns nothing
 */
function frameRelief(context: LayerContext, zoom: number): void {
  const { dev, handles } = context
  const relief = handles.relief
  if (!relief) return
  // Zoom-linked vertical exaggeration: full at zoom-out, × `exaggZoomIn` at zoom-in.
  relief.scale.setY(dev.relief.exaggeration * (1 - (1 - dev.relief.exaggZoomIn) * zoom))
  if (handles.rivers) handles.rivers.object.scale.setY(relief.scale.y)
  if (handles.borders) handles.borders.object.scale.setY(relief.scale.y)
}

/**
 * Thin, fade and reveal the line work as the camera moves.
 *
 * A weight that reads as a drawn border close up becomes a rope across the continent from far away, and
 * an edging either side of a hairline reads as an alternation rather than as one border. All of it is a
 * live material uniform, so nothing is rebuilt while zooming.
 * @param context - the layers and what they read
 * @param zoom - the camera's zoom in `[0, 1]`
 * @returns nothing
 */
function frameLineWork(context: LayerContext, zoom: number): void {
  const { dev, handles } = context
  handles.rivers?.setZoom(zoom)
  if (handles.borders) {
    // A patterned border holds a plain border's weight at continent scale, then thins to the core's
    // weight close up — hence the ratio rather than a knob: it is the same width the inlay uses.
    const patternAtZoomIn = dev.political.borderWidth / dev.political.borderEdgeWidth
    handles.borders.setWidthScale(
      lerp(dev.political.borderWidthZoomOut, 1, zoom),
      lerp(dev.political.borderWidthZoomOut, patternAtZoomIn, zoom)
    )
    handles.borders.setOpacityScale(lerp(dev.political.borderOpacityZoomOut, 1, zoom))
    handles.borders.setInlayOpacity(inlayOpacityScale(zoom, dev.political.borderInlayZoom))
  }
  handles.coastline?.setOpacity(lerp(dev.coast.opacity, dev.coast.opacityZoomIn, zoom))
  // The rhumb web fades as you zoom in, so it does not clutter the terrain it is drawn over.
  handles.rhumb?.setOpacity(lerp(dev.rhumb.opacity, dev.rhumb.opacityZoomIn, zoom))
}

/**
 * The calls that rebuild geometry.
 * @param context - the layers and what they read
 * @returns that slice of the handle
 */
function layerRebuilders(
  context: LayerContext
): Pick<
  MapLayers,
  | 'rebuildRelief'
  | 'setTexture'
  | 'rebuildCoastline'
  | 'rebuildRhumb'
  | 'rebuildRivers'
  | 'rebuildBorders'
  | 'rebuildRose'
> {
  return {
    rebuildRelief(): void {
      rebuildRelief(context)
    },
    setTexture(texture: DataTexture): void {
      setTexture(context, texture)
    },
    rebuildCoastline(): void {
      rebuildCoastline(context)
    },
    rebuildRhumb(): void {
      rebuildRhumb(context)
    },
    rebuildRivers(): void {
      rebuildRivers(context)
    },
    rebuildBorders(): void {
      rebuildBorders(context)
    },
    rebuildRose(): void {
      rebuildRose(context)
    },
  }
}

/**
 * The calls that only repaint — no geometry is touched, so they are free.
 * @param context - the layers and what they read
 * @returns that slice of the handle
 */
function layerSetters(
  context: LayerContext
): Pick<
  MapLayers,
  'setWireframe' | 'setCoastColor' | 'setRiverColor' | 'setRhumbColor' | 'setRoseOpacity'
> {
  const { handles } = context
  return {
    setWireframe(value: boolean): void {
      if (handles.relief) handles.relief.material.wireframe = value
    },
    setCoastColor(color: string): void {
      handles.coastline?.setColor(color)
    },
    setRiverColor(color: string): void {
      handles.rivers?.setColor(color)
    },
    setRhumbColor(color: string): void {
      handles.rhumb?.setColor(color)
    },
    setRoseOpacity(value: number): void {
      if (handles.compass) handles.compass.object.material.opacity = value
    },
  }
}

/**
 * What the frame loop, the resize handler and teardown call.
 * @param context - the layers and what they read
 * @returns that slice of the handle
 */
function layerLifecycle(
  context: LayerContext
): Pick<MapLayers, 'setResolution' | 'frame' | 'dispose' | 'pickTarget'> {
  const { scene, handles } = context
  return {
    setResolution(width: number, height: number): void {
      // Fat lines size their stroke in screen pixels, so the shader needs the new viewport or the width
      // distorts with the aspect ratio.
      handles.rivers?.setResolution(width, height)
      handles.borders?.setResolution(width, height)
    },
    frame(zoom: number): void {
      frameRelief(context, zoom)
      frameLineWork(context, zoom)
    },
    pickTarget(): Object3D | null {
      return handles.relief
    },
    dispose(): void {
      disposeRelief(scene, handles.relief)
      disposeHandle(scene, handles.coastline)
      disposeHandle(scene, handles.rhumb)
      disposeHandle(scene, handles.rivers)
      disposeHandle(scene, handles.borders)
      disposeHandle(scene, handles.compass)
      handles.texture?.dispose()
    },
  }
}

/**
 * Build the map's overlays. Nothing is drawn until something is rebuilt.
 * @param deps - the scene to draw into, the live tunables and the loaded sources
 * @returns the layers
 */
export function createMapLayers(deps: MapLayersDeps): MapLayers {
  const context: LayerContext = {
    ...deps,
    projection: createLayerProjection(deps.dev, deps.sources),
    handles: {
      relief: null,
      texture: null,
      coastline: null,
      rhumb: null,
      rivers: null,
      borders: null,
      compass: null,
    },
  }
  return { ...layerRebuilders(context), ...layerSetters(context), ...layerLifecycle(context) }
}
