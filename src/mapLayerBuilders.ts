/**
 * How each layer of the map is built.
 *
 * One function per overlay, all taking the same context, none of them holding anything: the handles
 * they replace live in the context, so a rebuild cannot leave a stale one behind or free a live one
 * twice — which is what happened when the rhumb rebuild tore down the rivers without rebuilding them.
 */

import { borderPatternFor } from './data/borderStyles'
import { createMaskCoastlineSource } from './data/coastlineSource'
import { DEFAULT_RIVER_EXTENSION, extendRiversToSea } from './data/riverSource'
import {
  BORDER_RENDER_ORDER,
  RELIEF_SEGMENTS,
  WORLD_WIDTH,
  disposeHandle,
  disposeRelief,
  maskOrFallback,
} from './mapLayerContext'
import { composeSheetRgba } from './pipeline/sheetCompose'
import { createCompassRose } from './scene/compassRose'
import { buildBorderStrokes, createComposedLineLayer } from './scene/composedLineLayer'
import { createGraticuleFrame } from './scene/graticuleFrame'
import { createLineLayer } from './scene/lineLayer'
import { createPaperSheet } from './scene/paperSheet'
import { createReliefMesh, meshWorldDepth } from './scene/reliefMesh'
import { generateRhumbSegments } from './scene/rhumbNetwork'
import { createRiverLayer } from './scene/riverLayer'
import { wrapTerrainTexture } from './scene/terrainTexture'

import type { BorderPattern } from './data/borderStyles'
import type { DevState } from './devState'
import type { LayerContext } from './mapLayerContext'
import type { DataTexture } from 'three'

/**
 * How the border between two polities is drawn, looked up by name in the editorial style table.
 * @param context - the layers and what they read
 * @param pair - the two region indices the stretch separates
 * @returns the drawing pattern
 */
export function patternForPair(
  context: LayerContext,
  pair: readonly [number, number]
): BorderPattern {
  const regions = context.sources.regionSet?.regions
  if (!regions) return 'solid'
  return borderPatternFor(regions[pair[0]]?.name ?? null, regions[pair[1]]?.name ?? null)
}

/**
 * Rebuild the terrain mesh from the current relief grid.
 * @param context - the layers and what they read
 * @returns nothing
 */
export function rebuildRelief(context: LayerContext): void {
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
export function setTexture(context: LayerContext, texture: DataTexture): void {
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
export function rebuildCoastline(context: LayerContext): void {
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
export function rebuildRhumb(context: LayerContext): void {
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
export function rebuildRivers(context: LayerContext): void {
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
export function rebuildBorders(context: LayerContext): void {
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
export function borderStrokeStyle(dev: DevState): Parameters<typeof buildBorderStrokes>[1] {
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
export function rebuildRose(context: LayerContext): void {
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
 * How many pixels the sheet's vellum is baked at.
 *
 * Square, and modest: fibre has no direction and no detail worth resolving, so this is stretched over
 * the whole sheet rather than tiled — a tile would show its seams on an area this large.
 */
const SHEET_TEXTURE_SIZE = 1024

/**
 * Rebuild the sheet and the border that frames the map.
 *
 * The two are one thing: the border's place is decided by the map's own edge, and the sheet is what it
 * is drawn on. Rebuilding one without the other is how a frame ends up floating over nothing.
 * @param context - the layers and what they read
 * @returns nothing
 */
export function rebuildFrame(context: LayerContext): void {
  const { scene, dev, sources, handles } = context
  disposeHandle(scene, handles.sheet)
  disposeHandle(scene, handles.frame)
  handles.sheet = null
  handles.frame = null
  if (!sources.heightmap || !dev.frame.show) return

  const worldDepth = meshWorldDepth(sources.heightmap.meta, WORLD_WIDTH)
  handles.sheetTexture?.dispose()
  handles.sheetTexture = wrapTerrainTexture(
    composeSheetRgba(SHEET_TEXTURE_SIZE, {
      paper: dev.texture.sea,
      grain: dev.frame.grain,
      grainScale: dev.frame.grainScale,
    }),
    SHEET_TEXTURE_SIZE,
    SHEET_TEXTURE_SIZE
  )
  handles.sheet = createPaperSheet({
    halfWidth: WORLD_WIDTH / 2 + dev.frame.sheetMargin,
    halfDepth: worldDepth / 2 + dev.frame.sheetMargin,
    drop: dev.frame.lift,
    texture: handles.sheetTexture,
  })
  handles.frame = createGraticuleFrame({
    bounds: sources.heightmap.meta.bbox,
    worldWidth: WORLD_WIDTH,
    worldDepth,
    bandWidth: dev.frame.bandWidth,
    bandStepDeg: dev.frame.bandStepDeg,
    ruleWidth: dev.frame.ruleWidth,
    labelLaneWidth: dev.frame.labelLaneWidth,
    ink: dev.frame.ink,
    paper: dev.texture.sea,
    lift: dev.frame.lift,
  })
  scene.add(handles.sheet.object, handles.frame.object)
}
