/**
 * How an authored year's polities are laid on the relief as geometry (`fillLayer`), and when they are.
 */

import { cutYearFills, vassalBandCut } from '@europe-historical-atlas/core/pipeline/vassalBands'

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
import type { FillArrays } from '@europe-historical-atlas/core/pipeline/fillBuffers'
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
  const cut = vassalBandCut(regions, year.polities, year.bounds)
  const fills = cutYearFills(cut.regions, grid, cut.band)
  context.handles.fillCut = { regions, segX: grid.segX, segY: grid.segY, fills }
  return fills
}

/**
 * The relief's heights, one number a node, and the relief they were read from — taken in one step, so fills laid on
 * them are known to be that relief's (reviews QUAL-001, ARCH-001).
 */
export interface ReliefHeights {
  /** The relief mesh the heights were read from. */
  readonly relief: object
  /** Its height at every grid node, row by row from the north. */
  readonly heights: Float32Array
}

/** What fills laid in the worker were laid from — compared by identity with what the next build reads. */
export interface FillArraysKey {
  /** The polities — the very array the sources hold. */
  readonly regions: readonly Region[]
  /** The relief's subdivision. */
  readonly grid: { segX: number; segY: number }
  /** The tints by level — the very array the sources hold once the year is settled. */
  readonly tintLevels: object
  /** The relief whose heights they were laid on — read with the heights, never when they come back. */
  readonly relief: object
}

/**
 * Hand the fills arrays laid in the worker (ATLAS-396), for the year about to be laid on the relief on screen: the next
 * build takes them as they are when it reads the very same polities, grid, tints and relief — and lays nothing here.
 * @param context - the layers, whose handles hold the arrays
 * @param key - what they were laid from
 * @param arrays - the fills' arrays
 */
export function primeFillArrays(
  context: LayerContext,
  key: FillArraysKey,
  arrays: FillArrays
): void {
  const { grid, ...from } = key
  context.handles.fillArrays = { ...from, ...grid, arrays }
}

/**
 * The arrays laid in the worker, when they were laid from what this build reads.
 * @param laid - the arrays handed, already let go by the handles — taken once, the GPU holds them after
 * @param key - what this build reads
 * @returns the arrays, or `null` to lay the fills here
 */
function laidArraysFor(
  laid: LayerContext['handles']['fillArrays'],
  key: FillArraysKey
): FillArrays | null {
  if (laid === null) return null
  const { regions, grid, tintLevels, relief } = key
  const same =
    laid.regions === regions &&
    laid.segX === grid.segX &&
    laid.segY === grid.segY &&
    laid.tintLevels === tintLevels &&
    laid.relief === relief
  return same ? laid.arrays : null
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
  // The arrays the worker laid, let go by the handles whatever this build does: used now, or never (review QUAL-003).
  const laid = handles.fillArrays
  handles.fillArrays = null
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
  // Build the layer — from the arrays the worker laid when they are this very year's, laid here otherwise — scale it
  // with the relief's exaggeration, and add it to the scene.
  const look = {
    worldWidth: WORLD_WIDTH,
    worldDepth: meshWorldDepth(heightmap.meta, WORLD_WIDTH),
    map: texture,
    mode: dev.texture.politicalMode,
    strength: dev.texture.politicalStrength,
  }
  const arrays = laidArraysFor(laid, { regions, grid, tintLevels, relief })
  handles.fills = createFillLayer(
    arrays === null
      ? {
          ...look,
          fills: cutFills(
            context,
            { regions, polities: authored.year.registry.polities, bounds: authored.bbox },
            grid
          ),
          tintLevels,
          bandDepths,
          grid,
          nodes: meshNodeHeights(relief),
        }
      : { ...look, arrays }
  )
  handles.fills.object.scale.setY(relief.scale.y)
  scene.add(handles.fills.object)
  releaseAfterUpload(handles.fills.object)
  // The tribes are laid on the same grid, over the same regions.
  rebuildTribes(context, grid, regions)
}
