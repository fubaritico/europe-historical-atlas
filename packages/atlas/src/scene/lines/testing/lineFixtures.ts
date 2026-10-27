/**
 * The lines' test fixtures: the simplest chain a line layer can draw.
 */

import type { UvPoint } from '@europe-historical-atlas/core/data/coastlineSource'

/**
 * A vertical two-point run, enough to make a pass non-empty.
 * @param u - where it stands, west→east
 * @returns its two points, north to south
 */
export function run(u: number): UvPoint[] {
  return [
    { u, v: 0 },
    { u, v: 1 },
  ]
}
