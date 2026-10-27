/**
 * How the sheet is put on the map: the vellum it is printed on, the graduated border, the degrees in the margin and
 * the atlas's name.
 */

import { requireHeightmap } from '@europe-historical-atlas/core/pipeline/inlineCompute'
import { composeSheetRgba } from '@europe-historical-atlas/core/pipeline/sheetCompose'
import { terrainTextureSize } from '@europe-historical-atlas/core/pipeline/terrainCompose'

import { disposeHandle } from '../layers/disposeHandle'
import { meshWorldDepth } from '../relief/reliefMesh'
import { wrapTerrainTexture } from '../relief/terrainTexture'
import { svgToTexture } from '../svgTexture'
import { WORLD_WIDTH } from '../world'

import { createFrameLabels } from './frameLabels'
import { createGraticuleFrame, labelLane } from './graticuleFrame'
import { MAP_TITLE, createMapTitle } from './mapTitle'
import { createPaperSheet } from './paperSheet'

import type { GraticuleFrameOptions } from './graticuleFrame'
import type { MapTitle } from './mapTitle'
import type { LayerContext } from '../layers/layerContext'
import type { DataTexture } from 'three'

/**
 * How many pixels the sheet's vellum is baked at.
 *
 * Square, and modest: fibre has no direction and no detail worth resolving, so this is stretched over
 * the whole sheet rather than tiled — a tile would show its seams on an area this large.
 */
const SHEET_TEXTURE_SIZE = 1024

/** How far the numbers sit above the band, so the two never contend for a pixel. */
const LABEL_LIFT = 0.0005

/**
 * Bake the vellum the map is printed on.
 *
 * The fibre is sampled from the TERRAIN's own noise field, at its origin and its scale, so the paper
 * runs on across the map's edge without a seam. Sharing the function is not enough: sampled in its own
 * pixels the grain comes out a different size in world terms, measured at 23x coarser before this.
 * @param context - the layers and what they read
 * @param halfWidth - half the sheet's width in world units
 * @param halfDepth - half its depth
 * @param worldDepth - the map's own depth, which anchors the sampling
 * @returns the baked texture
 */
function bakeSheetTexture(
  context: LayerContext,
  halfWidth: number,
  halfDepth: number,
  worldDepth: number
): DataTexture {
  const { dev, sources } = context
  const terrain = terrainTextureSize(requireHeightmap(sources.heightmap), dev.texture)
  // The frame maps the sheet's pixels onto the terrain texture's pixels: where the sheet's corner falls
  // in them, and how many terrain pixels one sheet pixel spans on each axis.
  return wrapTerrainTexture(
    composeSheetRgba(SHEET_TEXTURE_SIZE, {
      paper: dev.texture.sea,
      grain: dev.texture.grain,
      grainScale: dev.texture.grainScale,
      frame: {
        originX: ((WORLD_WIDTH / 2 - halfWidth) / WORLD_WIDTH) * terrain.width,
        originY: ((worldDepth / 2 - halfDepth) / worldDepth) * terrain.height,
        ratioX: ((halfWidth * 2) / WORLD_WIDTH) * (terrain.width / SHEET_TEXTURE_SIZE),
        ratioY: ((halfDepth * 2) / worldDepth) * (terrain.height / SHEET_TEXTURE_SIZE),
      },
    }),
    SHEET_TEXTURE_SIZE,
    SHEET_TEXTURE_SIZE
  )
}

/**
 * How the border is drawn, gathered from the live tunables.
 * @param context - the layers and what they read
 * @param worldDepth - the map's depth in world units
 * @returns the frame's settings
 */
function frameSettings(context: LayerContext, worldDepth: number): GraticuleFrameOptions {
  const { dev, sources } = context
  return {
    bounds: requireHeightmap(sources.heightmap).meta.bbox,
    worldWidth: WORLD_WIDTH,
    worldDepth,
    bandWidth: dev.frame.bandWidth,
    bandStepDeg: dev.frame.bandStepDeg,
    ruleWidth: dev.frame.ruleWidth,
    labelLaneWidth: dev.frame.labelLaneWidth,
    ink: dev.frame.ink,
    bandOpacity: dev.frame.bandOpacity,
    lift: dev.frame.lift,
  }
}

/**
 * Print the atlas's name in the margin, below everything the border carries.
 *
 * Placed from the border's own outermost edge rather than from the map's, so the name keeps its distance
 * from the frame when the band thickens or the label lane widens instead of drifting into them.
 * @param context - the layers and what they read
 * @param settings - the frame the title sits below
 * @returns the title, or `null` when it is switched off
 */
function buildTitle(context: LayerContext, settings: GraticuleFrameOptions): MapTitle | null {
  const { dev } = context
  if (!dev.frame.titleShow) return null
  const outerEdge = labelLane(settings).toZ + Math.max(0, dev.frame.ruleWidth)
  return createMapTitle({
    text: MAP_TITLE,
    size: dev.frame.titleSize,
    z: outerEdge + dev.frame.titleOffset,
    lift: dev.frame.lift + LABEL_LIFT,
    ink: dev.frame.titleInk,
    opacity: dev.frame.titleOpacity,
    roughness: dev.frame.titleRoughness,
    loadTexture: svgToTexture,
  })
}

/**
 * Rebuild the sheet, the border that frames the map, and the degrees written in its margin.
 *
 * The three are one thing: the border's place is decided by the map's own edge, the sheet is what it is
 * drawn on, and the numbers name the graduations it carries. Rebuilding one without the others is how a
 * frame ends up floating over nothing.
 * @param context - the layers and what they read
 * @returns nothing
 */
export function rebuildFrame(context: LayerContext): void {
  const { scene, dev, sources, handles } = context
  // 1. Take down whatever the last build mounted, and stop there if there is no relief or no frame.
  disposeHandle(scene, handles.sheet)
  disposeHandle(scene, handles.frame)
  disposeHandle(scene, handles.labels)
  disposeHandle(scene, handles.title)
  handles.sheet = null
  handles.frame = null
  handles.labels = null
  handles.title = null
  if (!sources.heightmap || !dev.frame.show) return

  // 2. The sheet: the map's own extent plus the margin, its vellum baked afresh (the old one freed).
  const worldDepth = meshWorldDepth(sources.heightmap.meta, WORLD_WIDTH)
  const halfWidth = WORLD_WIDTH / 2 + dev.frame.sheetMargin
  const halfDepth = worldDepth / 2 + dev.frame.sheetMargin
  handles.sheetTexture?.dispose()
  handles.sheetTexture = bakeSheetTexture(context, halfWidth, halfDepth, worldDepth)
  handles.sheet = createPaperSheet({
    halfWidth,
    halfDepth,
    drop: dev.frame.lift,
    texture: handles.sheetTexture,
  })

  // 3. The graduated border, then the degrees in its margin, from the same settings.
  const settings = frameSettings(context, worldDepth)
  handles.frame = createGraticuleFrame(settings)
  handles.labels = createFrameLabels({
    ...settings,
    // A hair above the band, so the two never contend for a pixel where a number overhangs a block.
    lift: settings.lift + LABEL_LIFT,
    labelStepDeg: dev.frame.labelStepDeg,
    labelInk: dev.frame.labelInk,
    labelRoughness: dev.frame.labelRoughness,
    labelOpacity: dev.frame.labelOpacity,
    loadTexture: svgToTexture,
  })
  // 4. The title below the border, then everything that was built added to the scene.
  handles.title = buildTitle(context, settings)
  scene.add(handles.sheet.object, handles.frame.object)
  if (handles.labels) scene.add(handles.labels.object)
  if (handles.title) scene.add(handles.title.object)
}
