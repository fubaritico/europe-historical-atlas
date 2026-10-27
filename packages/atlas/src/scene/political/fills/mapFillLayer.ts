/**
 * How an authored year's polities are laid on the relief as geometry (`fillLayer`), and when they are.
 */

import { fillTriangles } from '@europe-historical-atlas/core/pipeline/fillTriangles'

import { disposeHandle } from '../../layers/disposeHandle'
import { meshVertexGrid, meshWorldDepth } from '../../relief/reliefMesh'
import { WORLD_WIDTH } from '../../world'
import { paintsExactFills } from '../paintsExactFills'
import { rebuildTribes } from '../tribes/mapTribeLayer'

import { createFillLayer } from './fillLayer'

import type { LayerContext } from '../../layers/layerContext'
import type { Region } from '@europe-historical-atlas/core/data/regionSource'

/**
 * Name what a fill is waiting for, for the warning.
 * @param relief - the relief mesh, if built
 * @param texture - the baked texture, if hung
 * @returns what is missing
 */
function missingForFills(relief: unknown, texture: unknown): string {
  if (!relief) return 'the relief'
  return texture ? 'the year' : 'the texture'
}

/**
 * The fills of a year on a grid, cut once and kept until either changes.
 * @param context - the layers, whose handles hold the last cut
 * @param regions - the year's polities
 * @param grid - the relief's subdivision
 * @param grid.segX - cells across
 * @param grid.segY - cells down
 * @returns each polity's triangles
 */
function cutFills(
  context: LayerContext,
  regions: readonly Region[],
  grid: { segX: number; segY: number }
): Float32Array[] {
  // Reuse the last cut when neither the year's polities nor the grid has changed.
  const last = context.handles.fillCut
  if (last?.regions === regions && last.segX === grid.segX && last.segY === grid.segY)
    return last.fills
  // Otherwise cut anew, and keep the cut for next time.
  const fills = fillTriangles(regions, grid)
  context.handles.fillCut = { regions, segX: grid.segX, segY: grid.segY, fills }
  return fills
}

/**
 * Lay an authored year's polities on the relief as geometry, or clear them when the texture carries the
 * colour (a payload year, or the panel's switch off).
 *
 * Built against the relief mesh on screen — its subdivision and its very vertex heights — so a new relief
 * asks for new fills; and composited onto the texture on screen, which `setTexture` keeps current.
 * @param context - the layers and what they read
 * @returns nothing
 */
export function rebuildFills(context: LayerContext): void {
  // Clear the fills and the tribes on screen; the tribes are rebuilt with the fills, at the end.
  const { scene, dev, sources, handles } = context
  disposeHandle(scene, handles.fills)
  handles.fills = null
  disposeHandle(scene, handles.tribes)
  handles.tribes = null
  // Nothing to draw when the texture carries the colour.
  if (!paintsExactFills(dev, sources)) return
  // Everything the fills are built from; any of it may still be loading.
  const relief = handles.relief
  const texture = handles.texture
  const regions = sources.regionSet?.regions
  const tintLevels = sources.tintLevels
  if (!relief || !texture || !regions || !tintLevels || !sources.heightmap) {
    // The bake has already dropped the tint for this year, so no fill means no colour at all: said, not
    // swallowed (rules/error-handling.md).
    console.warn(
      `[atlas] exact fills asked for, but ${missingForFills(relief, texture)} is not in yet — the year shows uncoloured until the next rebuild.`
    )
    return
  }
  // The relief's own subdivision, and its vertex heights read straight from its mesh.
  const { segX, segY } = meshVertexGrid(sources.heightmap.meta, dev.relief.segments)
  const grid = { segX, segY }
  const heights = relief.geometry.getAttribute('position')
  // Build the layer, scale it with the relief's exaggeration, and add it to the scene.
  handles.fills = createFillLayer({
    fills: cutFills(context, regions, grid),
    tintLevels,
    grid,
    nodeY: (ix, iy) => heights.getY(iy * (segX + 1) + ix),
    worldWidth: WORLD_WIDTH,
    worldDepth: meshWorldDepth(sources.heightmap.meta, WORLD_WIDTH),
    map: texture,
    mode: dev.texture.politicalMode,
    strength: dev.texture.politicalStrength,
  })
  handles.fills.object.scale.setY(relief.scale.y)
  scene.add(handles.fills.object)
  // The tribes are laid on the same grid, over the same regions.
  rebuildTribes(context, grid, regions)
}
