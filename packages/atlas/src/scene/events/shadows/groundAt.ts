/**
 * The relief's height under a point of the world, read through the projection every overlay shares — so a shadow is
 * laid on the very surface the relief draws (`drapeProjection`).
 */

import type { GroundAt } from './groundShadows'
import type { DrapeProjection } from '../../relief/drapeProjection'

/**
 * Turn the projection's grid mapping into a lookup by world position: the map's corners give how a world `x` and `z`
 * become the grid's `u` and `v`.
 * @param projection - the shared projection
 * @returns the height under any world point, before exaggeration
 */
export function groundAtFrom(projection: Pick<DrapeProjection, 'toWorld' | 'draped'>): GroundAt {
  const [x0, , z0] = projection.toWorld(0, 0)
  const [x1, , z1] = projection.toWorld(1, 1)
  return (x, z) => projection.draped((x - x0) / (x1 - x0), (z - z0) / (z1 - z0))[1]
}
