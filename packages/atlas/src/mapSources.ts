/**
 * What the map has been given so far.
 *
 * Deliberately a plain mutable record rather than a store with setters: every field arrives from its own
 * fetch, at its own time, and both the drawing and the computing side read the same one. Anything richer
 * would only add ceremony around "this landed, that has not".
 *
 * The one rule it does carry is the relief source: overlays must sample the *mesh's* grid, not the raw
 * DEM, so the smoothed and shore-lowered copy is derived here and read from here rather than recomputed
 * per layer.
 */

import { smoothHeightmap } from '@europe-historical-atlas/core/data/heightmap'
import { createElevationLandMask } from '@europe-historical-atlas/core/data/landMask'
import { taperHeightmapToShore } from '@europe-historical-atlas/core/data/shoreRamp'

import type { BorderPattern } from '@europe-historical-atlas/core/data/borderStyles'
import type { UvPoint } from '@europe-historical-atlas/core/data/coastlineSource'
import type { Heightmap } from '@europe-historical-atlas/core/data/heightmap'
import type { LandMask } from '@europe-historical-atlas/core/data/landMask'
import type { RegionBorders } from '@europe-historical-atlas/core/data/regionRaster'
import type { RegionSet } from '@europe-historical-atlas/core/data/regionSource'
import type { River } from '@europe-historical-atlas/core/data/riverSource'
import type { RgbColor } from '@europe-historical-atlas/core/utils/color'

/** Everything loaded, and everything derived from it. */
export interface MapSources {
  /** The elevation grid, or `null` before it has loaded. */
  heightmap: Heightmap | null
  /**
   * Which cells are land, or `null` when the asset failed.
   *
   * A DEM cannot answer this — a polder is dry below sea level, a lake is wet above it — so it comes
   * from its own asset, with an elevation threshold as the documented degraded fallback.
   */
  landMask: LandMask | null
  /** The grid the mesh is built from and every draped overlay samples: smoothed, and lowered to the shore. */
  reliefSource: Heightmap | null
  /**
   * What {@link MapSources.reliefSource} was derived from, so asking again with the same inputs costs
   * nothing — the shore ramp takes ~180 ms on the full DEM, and startup asks twice.
   */
  reliefInputs: ReliefInputs | null
  /** The polities of the year on screen, or `null` before one has been chosen. */
  regionSet: RegionSet | null
  /**
   * Each polity's tint, in `regionSet` order, as the compute settled them — `null` for a tribe, which has
   * no fill (`core/editor/tribes`); `null` as a whole before a year.
   */
  regionTints: (RgbColor | null)[] | null
  /** The river centrelines, empty until they land. */
  riverData: River[]
  /**
   * The border lines as the compute derived them.
   *
   * Kept so that restyling a stroke redraws rather than re-traces: only the smoothing changes the
   * geometry, and that is the one border tunable that asks for a fresh derivation.
   */
  derivedBorders: RegionBorders | null
  /**
   * The pattern of each border group when the year is authored — its hand, not a name rule — keyed by the
   * group's pair as `"a:b"`; `null` for a year read from the per-century payloads.
   */
  borderPatterns: ReadonlyMap<string, BorderPattern> | null
  /**
   * Each tribe's rings in its colour, stroked dashed in place of a fill and of its borders — empty for a
   * year with no tribe, and for a year read from the per-century payloads, which has no ranks.
   */
  tribeOutlines: TribeOutline[]
}

/** One tribe's claim as the border layer strokes it. */
export interface TribeOutline {
  /** The `#rrggbb` the tribe would have been filled in. */
  colour: string
  /** Its rings, closed, in grid coordinates. */
  rings: UvPoint[][]
}

/**
 * An empty set of sources — nothing loaded, nothing derived.
 * @returns the sources
 */
export function createMapSources(): MapSources {
  return {
    heightmap: null,
    landMask: null,
    reliefSource: null,
    reliefInputs: null,
    regionSet: null,
    regionTints: null,
    riverData: [],
    derivedBorders: null,
    borderPatterns: null,
    tribeOutlines: [],
  }
}

/**
 * The shoreline the map is drawn against: the land mask, or the documented degraded fallback.
 *
 * Thresholding elevation drowns land below sea level and dries out every lake above it — visibly wrong
 * in the Dutch polders — but a degraded map beats a blank canvas. One function for the coastline and the
 * relief alike, so the line and the land always end at the same place.
 * @param sources - what has been loaded
 * @param seaLevel - the elevation threshold used when the mask failed
 * @returns a mask, or `null` before the elevation has loaded
 */
export function shorelineMask(sources: MapSources, seaLevel: number): LandMask | null {
  if (sources.landMask) return sources.landMask
  return sources.heightmap ? maskOver(sources.heightmap, null, seaLevel) : null
}

/**
 * The rule behind {@link shorelineMask}, once the elevation is known to be there.
 * @param heightmap - the elevation grid
 * @param landMask - the land mask, or `null` when it failed
 * @param seaLevel - the elevation threshold standing in for it
 * @returns the mask, or the threshold over the elevation
 */
function maskOver(heightmap: Heightmap, landMask: LandMask | null, seaLevel: number): LandMask {
  return landMask ?? createElevationLandMask(heightmap, seaLevel)
}

/** How the relief source is derived from the DEM. */
export interface ReliefShaping {
  /** Box-blur radius in grid cells; zero leaves the DEM unblurred. */
  smoothing: number
  /** Width (km) of the ramp down to sea level at the shore; zero leaves the DEM's own coast. */
  shoreRamp: number
}

/** Everything the relief source depends on, compared by identity and value. */
export interface ReliefInputs extends ReliefShaping {
  /** The elevation grid it was derived from. */
  heightmap: Heightmap
  /** The land mask it was lowered against, or `null` when it was the elevation threshold. */
  landMask: LandMask | null
  /** The threshold standing in for a failed mask. */
  seaLevel: number
}

/**
 * Whether two sets of relief inputs would derive the same grid.
 * @param a - one set
 * @param b - the other
 * @returns `true` when nothing differs
 */
function sameReliefInputs(a: ReliefInputs, b: ReliefInputs): boolean {
  return (
    a.heightmap === b.heightmap &&
    a.landMask === b.landMask &&
    a.smoothing === b.smoothing &&
    a.shoreRamp === b.shoreRamp &&
    // The threshold only shapes the shore when there is no mask to read it from.
    (a.landMask !== null || a.seaLevel === b.seaLevel)
  )
}

/**
 * Re-derive the grid the mesh is built from and every draped overlay samples.
 *
 * Derived once per set of inputs: asking again with nothing changed hands back the same grid.
 *
 * Kept apart from the mesh build so that draping stops depending on build order: an overlay created
 * before the relief mesh exists would otherwise be laid flat at sea level and stay there. That order
 * dependency was latent until the bake became asynchronous and the mesh stopped being first.
 * @param sources - the sources to refresh in place
 * @param shaping - the smoothing and the shore ramp
 * @param seaLevel - the elevation threshold standing in for a failed land mask
 * @returns the grid, or `null` before the elevation has loaded
 */
export function refreshReliefSource(
  sources: MapSources,
  shaping: ReliefShaping,
  seaLevel: number
): Heightmap | null {
  const { heightmap, landMask } = sources
  if (!heightmap) {
    sources.reliefSource = null
    sources.reliefInputs = null
    return null
  }
  const inputs: ReliefInputs = {
    heightmap,
    landMask,
    smoothing: shaping.smoothing,
    shoreRamp: shaping.shoreRamp,
    seaLevel,
  }
  if (
    sources.reliefSource &&
    sources.reliefInputs &&
    sameReliefInputs(sources.reliefInputs, inputs)
  )
    return sources.reliefSource
  const mask = maskOver(heightmap, landMask, seaLevel)
  sources.reliefSource = taperHeightmapToShore(
    smoothHeightmap(heightmap, shaping.smoothing),
    mask,
    shaping.shoreRamp
  )
  sources.reliefInputs = inputs
  return sources.reliefSource
}
