/**
 * The siege icon: a crenellated tower. A first draft, waiting for its own pass on sight (ATLAS-286).
 */

import { BoxGeometry, LatheGeometry, Vector2 } from 'three'

import type { Part } from './parts'

/** How many sides the tower has; a merlon stands on every other one. */
const TOWER_SIDES = 8

/**
 * A crenellated tower: an octagonal body turned from a profile, a merlon on every other side, a door.
 * @returns its parts
 */
export function towerParts(): Part[] {
  // Half the tower's silhouette, from its axis outward and bottom to top: a flared foot, the wall, the parapet that
  // juts out at the top. Turned about the axis, it gives the whole body.
  const profile = [
    new Vector2(0, 0),
    new Vector2(0.3, 0),
    new Vector2(0.26, 0.1),
    new Vector2(0.25, 0.66),
    new Vector2(0.31, 0.72),
    new Vector2(0.31, 0.78),
    new Vector2(0, 0.78),
  ]

  // A merlon on every other side of the parapet, each turned to face outward.
  const merlons: Part[] = Array.from({ length: TOWER_SIDES / 2 }, (_, index) => {
    const angle = (index * 2 * Math.PI * 2) / TOWER_SIDES
    return {
      geometry: new BoxGeometry(0.13, 0.14, 0.1),
      colour: 'stone',
      at: [Math.sin(angle) * 0.25, 0.85, Math.cos(angle) * 0.25],
      turn: angle,
    }
  })

  // The body, its merlons, and a door at its foot, on the front.
  return [
    { geometry: new LatheGeometry(profile, TOWER_SIDES), colour: 'stone' },
    ...merlons,
    { geometry: new BoxGeometry(0.12, 0.2, 0.04), colour: 'door', at: [0, 0.12, 0.27] },
  ]
}
