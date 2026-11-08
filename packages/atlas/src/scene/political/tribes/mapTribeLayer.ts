/**
 * How the tribe layer is built (ATLAS-258) — beside the fills, on the same relief and the same texture.
 *
 * Same shape as every family's builder: it takes the layers' context, holds nothing, and leaves its handle in the
 * context.
 */

import {
  CLAIM_CUT_REACH_KM,
  TRIBE_FEATHER_REACH_KM,
} from '@europe-historical-atlas/core/editor/tribeFeather'
import { tribePatches } from '@europe-historical-atlas/core/pipeline/tribePatches'

import { maskOrFallback } from '../../landMask'
import { meshNodeHeights, meshWorldDepth } from '../../relief/reliefMesh'
import { WORLD_WIDTH } from '../../world'

import { createTribeLayer } from './tribeLayer'

import type { TribeCutKey } from './tribeCutKey'
import type { LayerContext } from '../../layers/layerContext'
import type { Region } from '@europe-historical-atlas/core/data/regionSource'
import type { GeoBounds } from '@europe-historical-atlas/core/geo/mercator'
import type { TribePatch } from '@europe-historical-atlas/core/pipeline/tribePatches'

/** What a tribe's patch is measured with, besides the year's own rings — read from the settings in one place. */
export interface TribeCutSettings {
  /** How far a tribe's fade may reach past its outline, in kilometres. */
  readonly reachKm: number
  /** How far a polity's ground cuts a spill, in kilometres. */
  readonly claimReachKm: number
  /** Whether the colour spills past the outline — the `outset` mode alone. */
  readonly spill: boolean
  /** The sea level the land is thresholded at, when no mask says where it is. */
  readonly seaLevel: number
}

/** Patches measured elsewhere, and the settings they were measured with. */
export interface MeasuredTribes {
  /** One patch per tribe. */
  readonly patches: TribePatch[]
  /** The settings read when the measure was asked — not those of when it lands. */
  readonly settings: TribeCutSettings
}

/**
 * The settings a tribe cut reads, now — the same for the worker's measure and this thread's (review R3).
 * @param dev - the live settings
 * @returns the reach, the spill and the sea level
 */
export function tribeCutSettings(dev: LayerContext['dev']): TribeCutSettings {
  return {
    reachKm: TRIBE_FEATHER_REACH_KM,
    claimReachKm: CLAIM_CUT_REACH_KM,
    spill: dev.tribes.mode === 'outset',
    seaLevel: dev.texture.seaLevel,
  }
}

/**
 * The key of the patches measured with these settings, for these regions in this frame on this grid.
 * @param context - the layers, whose sources the patches read
 * @param ground - the frame and every region of the year
 * @param ground.bounds - the frame
 * @param ground.claims - the regions
 * @param grid - the relief's subdivision
 * @param grid.segX - cells across
 * @param grid.segY - cells down
 * @param settings - the settings they were, or would be, measured with
 * @returns the key
 */
function tribeCutKey(
  context: LayerContext,
  ground: { bounds: GeoBounds; claims: readonly Region[] },
  grid: { segX: number; segY: number },
  settings: TribeCutSettings
): TribeCutKey {
  const { sources } = context
  return {
    tribes: sources.tribes,
    claims: ground.claims,
    bounds: { ...ground.bounds },
    segX: grid.segX,
    segY: grid.segY,
    landMask: sources.landMask,
    heightmap: sources.heightmap,
    seaLevel: settings.seaLevel,
    spill: settings.spill,
  }
}

/**
 * Hand the tribe layer patches measured elsewhere — in the worker (ATLAS-333) — for the year now in the sources, so
 * laying them measures nothing on this thread. Kept under the settings they were measured with: a setting moved while
 * they were measured makes the next lay measure them again, rather than pass them off as the new ones' (review R2).
 * @param context - the layers, the year's sources already settled
 * @param grid - the relief's subdivision the patches were measured on
 * @param grid.segX - cells across
 * @param grid.segY - cells down
 * @param measured - one patch per tribe, measured from the same tribes, regions, frame and land, and its settings
 * @returns nothing; nothing kept when the year in the sources has no frame
 */
export function primeTribeCut(
  context: LayerContext,
  grid: { segX: number; segY: number },
  measured: MeasuredTribes
): void {
  const { sources } = context
  const bounds = sources.regionSet?.authored?.bbox
  const claims = sources.regionSet?.regions
  // A year with no frame is not an authored year: `rebuildTribes` draws none for it, so none is kept.
  if (bounds === undefined || claims === undefined) return
  const key = tribeCutKey(context, { bounds, claims }, grid, measured.settings)
  context.handles.tribeCut = { key, patches: measured.patches }
}

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
function sameTribeCut(a: TribeCutKey, b: TribeCutKey): boolean {
  return (
    a.tribes === b.tribes &&
    a.claims === b.claims &&
    a.segX === b.segX &&
    a.segY === b.segY &&
    a.spill === b.spill &&
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
  // Everything the patches depend on, to tell whether the last build still holds.
  const { sources } = context
  const settings = tribeCutSettings(context.dev)
  const key = tribeCutKey(context, ground, grid, settings)
  // Reuse the last build when nothing it read has changed.
  const last = context.handles.tribeCut
  if (last && sameTribeCut(last.key, key)) return last.patches
  // Otherwise measure the patches anew, and keep them for next time.
  const patches = tribePatches(sources.tribes, {
    claims: ground.claims,
    land: maskOrFallback(context),
    bounds: ground.bounds,
    grid,
    reachKm: settings.reachKm,
    claimReachKm: settings.claimReachKm,
    spill: settings.spill,
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
  // What the tribes are laid on: the year's frame, the relief mesh and the baked texture.
  const { scene, dev, sources, handles } = context
  const bounds = sources.regionSet?.authored?.bbox
  const relief = handles.relief
  const texture = handles.texture
  // An authored year with no tribe draws none — the common case, not a refusal.
  if (sources.tribes.length === 0 || !bounds || !relief || !texture || !sources.heightmap) return
  // Build the layer on the relief's vertex heights, scale it like the relief, add it to the scene.
  handles.tribes = createTribeLayer({
    patches: cutTribes(context, { bounds, claims: regions }, grid),
    grid,
    nodes: meshNodeHeights(relief),
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
