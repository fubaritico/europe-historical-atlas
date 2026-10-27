/**
 * The projection every overlay is drawn through, read live from the tunables and the sources.
 */

import { createDrapeProjection } from '../relief/drapeProjection'
import { WORLD_WIDTH } from '../world'

import type { DevState } from '../../devState'
import type { MapSources } from '../../mapSources'
import type { DrapeProjection } from '../relief/drapeProjection'

/**
 * Build the projection every overlay is drawn through.
 *
 * Accessors rather than values: the grid reloads and the height curve is dragged live, so a projection
 * built from a snapshot would quietly stop matching the terrain.
 * @param dev - the live tunables
 * @param sources - what has been loaded
 * @returns the projection
 */
export function createLayerProjection(dev: DevState, sources: MapSources): DrapeProjection {
  return createDrapeProjection({
    worldWidth: WORLD_WIDTH,
    segments: () => dev.relief.segments,
    frame: () => sources.heightmap?.meta ?? null,
    source: () => sources.reliefSource,
    curve: () => ({ plainsCeiling: dev.relief.plainsCeiling, peakTarget: dev.relief.peakTarget }),
    flatLift: () => dev.coast.yLift,
    shoreLift: () => dev.coast.shoreLift,
  })
}
