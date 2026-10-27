/**
 * The siege icon: a crenellated tower. A first draft, waiting for its own pass on sight (ATLAS-286).
 */

import { BoxGeometry, LatheGeometry, Vector2 } from 'three'

import type { Part } from './parts'

/**
 * How many faces the body is turned with — enough for a round tower rather than an octagon (the dev, 2026-10-27:
 * *« plus de facettes, plus de polygones pour être plus jolie »*).
 */
const TOWER_SEGMENTS = 32

/** How many merlons crown the parapet, evenly round it. */
const MERLONS = 8

/**
 * A crenellated tower: a round body turned from a profile, merlons round the parapet, a door.
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

  // The merlons evenly round the parapet, each turned to face outward.
  const merlons: Part[] = Array.from({ length: MERLONS }, (_, index) => {
    const angle = (index * 2 * Math.PI) / MERLONS
    return {
      geometry: new BoxGeometry(0.1, 0.14, 0.1),
      colour: 'stone',
      at: [Math.sin(angle) * 0.25, 0.85, Math.cos(angle) * 0.25],
      turn: angle,
    }
  })

  // The body, its merlons, and a door at its foot, on the front.
  return [
    { geometry: new LatheGeometry(profile, TOWER_SEGMENTS), colour: 'stone' },
    ...merlons,
    { geometry: new BoxGeometry(0.12, 0.2, 0.04), colour: 'door', at: [0, 0.12, 0.27] },
  ]
}
