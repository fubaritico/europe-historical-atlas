/**
 * The council's icon: the pope's tiara, the tip of a crozier behind it (ATLAS-476). The dev, 2026-11-18: « il faudrait
 * que ce soit le chapeau que porte le pape, avec peut-être une composition avec juste le bout de la crosse » — chosen on
 * the icons' bench, « B2 »: « la B, très bien, avec la crosse dans l'autre sens : pas dirigée vers le chapeau, mais vers
 * l'extérieur […] simple et clair ». The tall white cap under its three crowns, the orb and the cross on its tip; the
 * crook curls away from it. **The three crowns are of the 14th century**: about 1100 the pope's cap was a white cone
 * under a single circlet — kept on the bench, « D » (`bench/councilCandidates`), for the day the icons follow their
 * century, as the crowns will their region.
 */

import {
  BoxGeometry,
  CylinderGeometry,
  LatheGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector2,
} from 'three'

import type { Part } from './parts'

/** How many faces a round part has about its upright: enough to read as round, few enough to keep its facets. */
const ROUND = 20

/** The cap's widest radius, and its height to the tip. */
const CAP = { radius: 0.34, height: 0.86 }

/** Where the crozier's staff stands beside the cap, a little behind it, and how high it rises before it curls. */
const CROZIER = { at: [0.46, 0, -0.12] as [number, number, number], height: 0.78 }

/**
 * A tall cap turned about its upright: a rounded foot, a swelling side, an ogival top.
 * @param radius - its widest radius
 * @param height - its height
 * @returns the part, standing on the origin
 */
export function cap(radius: number, height: number): Part {
  // The profile, from the foot to the tip, as shares of the radius and of the height.
  const profile: [number, number][] = [
    [0.9, 0],
    [0.97, 0.12],
    [1, 0.3],
    [0.93, 0.5],
    [0.74, 0.7],
    [0.42, 0.87],
    [0.14, 0.97],
    [0, 1],
  ]
  return {
    geometry: new LatheGeometry(
      profile.map(([across, up]) => new Vector2(across * radius, up * height)),
      ROUND
    ),
    colour: 'pearl',
  }
}

/**
 * A crown about the cap: a gold circlet and the beads standing on it — beads, not points: pointed, the three crowns
 * read as thorns.
 * @param radius - the circlet's radius
 * @param at - how high its foot stands
 * @param beads - how many beads stand on it
 * @returns its parts
 */
export function circlet(radius: number, at: number, beads: number): Part[] {
  const band: Part = {
    geometry: new CylinderGeometry(radius, radius, 0.07, ROUND),
    colour: 'gold',
    at: [0, at + 0.035, 0],
  }
  const standing = Array.from({ length: beads }, (_, index): Part => {
    const angle = (index / beads) * Math.PI * 2
    return {
      geometry: new SphereGeometry(0.032, 6, 5),
      colour: 'gold',
      at: [Math.sin(angle) * radius, at + 0.09, Math.cos(angle) * radius],
    }
  })
  return [band, ...standing]
}

/**
 * The orb and its cross on the cap's tip.
 * @param at - the tip's height
 * @returns its parts
 */
function orbAndCross(at: number): Part[] {
  return [
    { geometry: new SphereGeometry(0.055, 10, 8), colour: 'gold', at: [0, at + 0.03, 0] },
    { geometry: new BoxGeometry(0.03, 0.16, 0.03), colour: 'gold', at: [0, at + 0.15, 0] },
    { geometry: new BoxGeometry(0.11, 0.03, 0.03), colour: 'gold', at: [0, at + 0.17, 0] },
  ]
}

/**
 * The tiara alone: the tall white cap under its three crowns, the orb and the cross on its tip.
 * @returns its parts
 */
export function tiaraAloneParts(): Part[] {
  return [
    cap(CAP.radius, CAP.height),
    ...circlet(0.335, 0.03, 8),
    ...circlet(0.345, 0.27, 8),
    ...circlet(0.285, 0.52, 8),
    ...orbAndCross(CAP.height),
  ]
}

/**
 * The tip of a crozier: a length of its staff, its knop and the crook, in gold, seen from the front.
 * @param at - where the staff's foot stands
 * @param height - how high the staff rises before it curls
 * @param outward - whether the crook curls away from what stands beside it, to the right, rather than back over it
 * @returns its parts
 */
export function crook(at: [number, number, number], height: number, outward: boolean): Part[] {
  const [x, y, z] = at
  const curl = 0.15
  // Three quarters of a ring, springing from the staff's top. Turned about its upright, it springs the other way.
  const ring = new TorusGeometry(curl, 0.035, 6, 18, Math.PI * 1.5)
  if (outward) ring.rotateY(Math.PI)
  return [
    {
      geometry: new CylinderGeometry(0.035, 0.035, height, 8),
      colour: 'gold',
      at: [x, y + height / 2, z],
    },
    // The knop under the crook.
    { geometry: new SphereGeometry(0.06, 8, 6), colour: 'gold', at: [x, y + height * 0.72, z] },
    { geometry: ring, colour: 'gold', at: [outward ? x + curl : x - curl, y + height, z] },
  ]
}

/**
 * The council's icon: the tiara, and the tip of a crozier behind it, its crook curling away from the tiara.
 * @returns its parts
 */
export function tiaraParts(): Part[] {
  return [...tiaraAloneParts(), ...crook(CROZIER.at, CROZIER.height, true)]
}
