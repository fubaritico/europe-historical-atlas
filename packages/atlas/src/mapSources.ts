/**
 * What the map has been given so far.
 *
 * Deliberately a plain mutable record rather than a store with setters: every field arrives from its own
 * fetch, at its own time, and both the drawing and the computing side read the same one. Anything richer
 * would only add ceremony around "this landed, that has not".
 *
 * The one rule it does carry is the relief source: overlays must sample the *mesh's* grid, not the raw
 * DEM, so the smoothed copy is derived here and read from here rather than recomputed per layer.
 */

import { smoothHeightmap } from '@europe-historical-atlas/core/data/heightmap'

import type { Heightmap } from '@europe-historical-atlas/core/data/heightmap'
import type { LandMask } from '@europe-historical-atlas/core/data/landMask'
import type { RegionBorders } from '@europe-historical-atlas/core/data/regionRaster'
import type { RegionSet } from '@europe-historical-atlas/core/data/regionSource'
import type { River } from '@europe-historical-atlas/core/data/riverSource'

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
  /** The (possibly smoothed) grid every draped overlay samples. */
  reliefSource: Heightmap | null
  /** The polities of the year on screen, or `null` before one has been chosen. */
  regionSet: RegionSet | null
  /** The river centrelines, empty until they land. */
  riverData: River[]
  /**
   * The border lines as the compute derived them.
   *
   * Kept so that restyling a stroke redraws rather than re-traces: only the smoothing changes the
   * geometry, and that is the one border tunable that asks for a fresh derivation.
   */
  derivedBorders: RegionBorders | null
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
    regionSet: null,
    riverData: [],
    derivedBorders: null,
  }
}

/**
 * Re-derive the grid every draped overlay samples.
 *
 * Kept apart from the mesh build so that draping stops depending on build order: an overlay created
 * before the relief mesh exists would otherwise be laid flat at sea level and stay there. That order
 * dependency was latent until the bake became asynchronous and the mesh stopped being first.
 * @param sources - the sources to refresh in place
 * @param smoothing - the box-blur radius in grid cells; zero returns the DEM itself
 * @returns the grid, or `null` before the elevation has loaded
 */
export function refreshReliefSource(sources: MapSources, smoothing: number): Heightmap | null {
  sources.reliefSource = sources.heightmap ? smoothHeightmap(sources.heightmap, smoothing) : null
  return sources.reliefSource
}
