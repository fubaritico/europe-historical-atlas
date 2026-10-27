/**
 * The accession icon: a crown. A first draft, waiting for its own pass on sight (ATLAS-287).
 */

import { ConeGeometry, LatheGeometry, OctahedronGeometry, Vector2 } from 'three'

import type { Part } from './parts'

/** How many fleurons the crown carries. */
const CROWN_FLEURONS = 5

/**
 * A crown: a band turned from a ring's section, pointed fleurons each tipped with a pearl, a stone between two.
 * @returns its parts
 */
export function crownParts(): Part[] {
  // The band's cross-section, a thin rectangle away from the axis; turned about the axis, it gives a ring.
  const section = [
    new Vector2(0.3, 0),
    new Vector2(0.36, 0),
    new Vector2(0.36, 0.26),
    new Vector2(0.3, 0.26),
    new Vector2(0.3, 0),
  ]

  // The angles of the fleurons, evenly spaced around the band.
  const around = Array.from(
    { length: CROWN_FLEURONS },
    (_, index) => (index * Math.PI * 2) / CROWN_FLEURONS
  )

  return [
    // The band.
    { geometry: new LatheGeometry(section, 10), colour: 'gold' },
    // A pointed fleuron on the band at each angle.
    ...around.map((angle): Part => ({
      geometry: new ConeGeometry(0.08, 0.3, 4),
      colour: 'gold',
      at: [Math.sin(angle) * 0.33, 0.41, Math.cos(angle) * 0.33],
      turn: angle,
    })),
    // A pearl on the tip of each.
    ...around.map((angle): Part => ({
      geometry: new OctahedronGeometry(0.05),
      colour: 'gold',
      at: [Math.sin(angle) * 0.33, 0.6, Math.cos(angle) * 0.33],
    })),
    // A stone set in the band, halfway between two fleurons.
    ...around.map((angle): Part => {
      const between = angle + Math.PI / CROWN_FLEURONS
      return {
        geometry: new OctahedronGeometry(0.045),
        colour: 'jewel',
        at: [Math.sin(between) * 0.37, 0.13, Math.cos(between) * 0.37],
      }
    }),
  ]
}
