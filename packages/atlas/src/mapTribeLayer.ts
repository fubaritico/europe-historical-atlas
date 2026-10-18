/**
 * How the tribe layer is built (ATLAS-258) — beside the fills, on the same relief and the same texture.
 *
 * Out of `mapLayerBuilders` for its length; same shape as the builders there: it takes the layers' context,
 * holds nothing, and leaves its handle in the context.
 */

import { TRIBE_FEATHER_REACH_KM } from '@europe-historical-atlas/core/editor/tribeFeather'

import { WORLD_WIDTH, maskOrFallback } from './mapLayerContext'
import { meshWorldDepth } from './scene/reliefMesh'
import { createTribeLayer } from './scene/tribeLayer'
import { tribePatches } from './tribePatches'

import type { LayerContext, TribeCutKey } from './mapLayerContext'
import type { TribePatch } from './tribePatches'
import type { Region } from '@europe-historical-atlas/core/data/regionSource'
import type { GeoBounds } from '@europe-historical-atlas/core/geo/mercator'

/**
 * Whether two frames are the same, by value.
 * @param a - one frame
 * @param b - the other
 * @returns `true` when every edge agrees
 */
function sameBounds(a: GeoBounds, b: GeoBounds): boolean {
  return a.west === b.west && a.south === b.south && a.east === b.east && a.north === b.north
}

/**
 * Whether two cut keys read the same land.
 * @param a - one key
 * @param b - the other
 * @returns `true` for the same mask asset, or — with none — the same elevation at the same sea level
 */
function sameLand(a: TribeCutKey, b: TribeCutKey): boolean {
  if (a.landMask !== b.landMask) return false
  // The threshold and its elevation only shape the land when there is no mask to read it from.
  return a.landMask !== null || (a.heightmap === b.heightmap && a.seaLevel === b.seaLevel)
}

/**
 * Whether two cut keys would measure the same patches.
 * @param a - one key
 * @param b - the other
 * @returns `true` when nothing `tribePatches` reads differs
 */
export function sameTribeCut(a: TribeCutKey, b: TribeCutKey): boolean {
  return (
    a.tribes === b.tribes &&
    a.claims === b.claims &&
    a.segX === b.segX &&
    a.segY === b.segY &&
    sameBounds(a.bounds, b.bounds) &&
    sameLand(a, b)
  )
}

/**
 * The tribe patches of a year on a grid, built once and kept until anything they read changes — so a
 * height-curve slider re-lays them instead of measuring every distance again.
 * @param context - the layers, whose handles hold the last build
 * @param ground - the frame the year's rings were projected against, and every region of the year
 * @param ground.bounds - the frame
 * @param ground.claims - the regions, whose ground cuts a tribe's spill
 * @param grid - the relief's subdivision
 * @param grid.segX - cells across
 * @param grid.segY - cells down
 * @returns each tribe's patch
 */
function cutTribes(
  context: LayerContext,
  ground: { bounds: GeoBounds; claims: readonly Region[] },
  grid: { segX: number; segY: number }
): TribePatch[] {
  const { sources, dev } = context
  const key: TribeCutKey = {
    tribes: sources.tribes,
    claims: ground.claims,
    bounds: { ...ground.bounds },
    segX: grid.segX,
    segY: grid.segY,
    landMask: sources.landMask,
    heightmap: sources.heightmap,
    seaLevel: dev.texture.seaLevel,
  }
  const last = context.handles.tribeCut
  if (last && sameTribeCut(last.key, key)) return last.patches
  const patches = tribePatches(sources.tribes, {
    claims: ground.claims,
    land: maskOrFallback(context),
    bounds: ground.bounds,
    grid,
    reachKm: TRIBE_FEATHER_REACH_KM,
  })
  context.handles.tribeCut = { key, patches }
  return patches
}

/**
 * Lay the year's tribes on the relief, their colour fading at their limit — beside the fills, on the same
 * relief and the same texture, so built at the same moment (`rebuildFills`, which has disposed the last).
 * @param context - the layers and what they read; the fills' preconditions already checked
 * @param grid - the relief's subdivision
 * @param grid.segX - cells across
 * @param grid.segY - cells down
 * @param regions - every region of the year, whose ground cuts a tribe's spill
 * @returns nothing
 */
export function rebuildTribes(
  context: LayerContext,
  grid: { segX: number; segY: number },
  regions: readonly Region[]
): void {
  const { scene, dev, sources, handles } = context
  const bounds = sources.regionSet?.authored?.bbox
  const relief = handles.relief
  const texture = handles.texture
  // An authored year with no tribe draws none — the common case, not a refusal.
  if (sources.tribes.length === 0 || !bounds || !relief || !texture || !sources.heightmap) return
  const heights = relief.geometry.getAttribute('position')
  handles.tribes = createTribeLayer({
    patches: cutTribes(context, { bounds, claims: regions }, grid),
    grid,
    nodeY: (ix, iy) => heights.getY(iy * (grid.segX + 1) + ix),
    worldWidth: WORLD_WIDTH,
    worldDepth: meshWorldDepth(sources.heightmap.meta, WORLD_WIDTH),
    map: texture,
    mode: dev.texture.politicalMode,
    strength: dev.texture.politicalStrength,
    feather: dev.tribes,
  })
  handles.tribes.object.scale.setY(relief.scale.y)
  scene.add(handles.tribes.object)
}
