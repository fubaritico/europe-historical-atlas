/**
 * How an authored year's polities are laid on the relief as geometry (`fillLayer`), and when they are.
 */

import { VASSAL_BAND_REACH_KM } from '@europe-historical-atlas/core/data/vassalBand'
import { bandedFillRegions, cutYearFills } from '@europe-historical-atlas/core/pipeline/vassalBands'

import { disposeHandle } from '../../layers/disposeHandle'
import { releaseAfterUpload } from '../../layers/releaseAfterUpload'
import { meshNodeHeights, meshVertexGrid, meshWorldDepth } from '../../relief/reliefMesh'
import { WORLD_WIDTH } from '../../world'
import { paintsExactFills } from '../paintsExactFills'
import { rebuildTribes } from '../tribes/mapTribeLayer'

import { createFillLayer } from './fillLayer'

import type { LayerContext } from '../../layers/layerContext'
import type { Region } from '@europe-historical-atlas/core/data/regionSource'
import type { AuthoredYear } from '@europe-historical-atlas/core/data/yearFormat'
import type { GeoBounds } from '@europe-historical-atlas/core/geo/mercator'
import type { IndexedFill } from '@europe-historical-atlas/core/pipeline/indexFill'

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
 * Everything of the year the fills are built from, once it has all come in — or `null` while any of it is still loading.
 * @param sources - what has been loaded
 * @returns the regions, the authored year, the tints by level, the band depths and the elevation; `null` when one is missing
 */
function yearToFill(sources: LayerContext['sources']): {
  regions: readonly Region[]
  authored: NonNullable<NonNullable<LayerContext['sources']['regionSet']>['authored']>
  tintLevels: NonNullable<LayerContext['sources']['tintLevels']>
  bandDepths: NonNullable<LayerContext['sources']['bandDepths']>
  heightmap: NonNullable<LayerContext['sources']['heightmap']>
} | null {
  const { regionSet, tintLevels, bandDepths, heightmap } = sources
  const authored = regionSet?.authored
  if (!regionSet || !authored || !tintLevels || !bandDepths || !heightmap) return null
  return { regions: regionSet.regions, authored, tintLevels, bandDepths, heightmap }
}

/** An authored year as its fills are cut: its regions, its registry and its frame. */
interface FillYear {
  /** The year's polities, in the order the fills are laid. */
  readonly regions: readonly Region[]
  /** Its registry, which says who wears the vassals' band. */
  readonly polities: AuthoredYear['registry']['polities']
  /** The frame its rings were projected against. */
  readonly bounds: GeoBounds
}

/**
 * The fills of a year on a grid, cut once and kept until either changes — each vassal measured for its band, as the
 * worker measures it (`prepareYear`).
 * @param context - the layers, whose handles hold the last cut
 * @param year - the year's polities, its registry and its frame
 * @param grid - the relief's subdivision
 * @param grid.segX - cells across
 * @param grid.segY - cells down
 * @returns each polity's triangles
 */
function cutFills(
  context: LayerContext,
  year: FillYear,
  grid: { segX: number; segY: number }
): IndexedFill[] {
  // Reuse the last cut when neither the year's polities nor the grid has changed.
  const { regions } = year
  const last = context.handles.fillCut
  if (last?.regions === regions && last.segX === grid.segX && last.segY === grid.segY)
    return last.fills
  // Otherwise cut anew, and keep the cut for next time.
  const fills = cutYearFills(bandedFillRegions(regions, year.polities), grid, {
    bounds: year.bounds,
    reachKm: VASSAL_BAND_REACH_KM,
  })
  primeFillCut(context, regions, grid, fills)
  return fills
}

/**
 * Keep a cut of the fills as the last one made — whether cut here or handed from the worker (ATLAS-333): laid as it
 * is while the year's polities and the grid stay the very ones it was cut for.
 * @param context - the layers, whose handles hold the cut
 * @param regions - the polities it was cut from — the very array the sources hold, which the reuse compares
 * @param grid - the relief's subdivision it was cut on
 * @param grid.segX - cells across
 * @param grid.segY - cells down
 * @param fills - each polity's triangles
 */
export function primeFillCut(
  context: LayerContext,
  regions: readonly Region[],
  grid: { segX: number; segY: number },
  fills: IndexedFill[]
): void {
  context.handles.fillCut = { regions, segX: grid.segX, segY: grid.segY, fills }
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
  const year = yearToFill(sources)
  if (!relief || !texture || year === null) {
    // The bake has already dropped the tint for this year, so no fill means no colour at all: said, not
    // swallowed (rules/error-handling.md).
    console.warn(
      `[atlas] exact fills asked for, but ${missingForFills(relief, texture)} is not in yet — the year shows uncoloured until the next rebuild.`
    )
    return
  }
  const { regions, authored, tintLevels, bandDepths, heightmap } = year
  // The relief's own subdivision, and its vertex heights read straight from its mesh.
  const { segX, segY } = meshVertexGrid(heightmap.meta, dev.relief.segments)
  const grid = { segX, segY }
  // Build the layer, scale it with the relief's exaggeration, and add it to the scene.
  handles.fills = createFillLayer({
    fills: cutFills(
      context,
      { regions, polities: authored.year.registry.polities, bounds: authored.bbox },
      grid
    ),
    tintLevels,
    bandDepths,
    grid,
    nodes: meshNodeHeights(relief),
    worldWidth: WORLD_WIDTH,
    worldDepth: meshWorldDepth(heightmap.meta, WORLD_WIDTH),
    map: texture,
    mode: dev.texture.politicalMode,
    strength: dev.texture.politicalStrength,
  })
  handles.fills.object.scale.setY(relief.scale.y)
  scene.add(handles.fills.object)
  releaseAfterUpload(handles.fills.object)
  // The tribes are laid on the same grid, over the same regions.
  rebuildTribes(context, grid, regions)
}
