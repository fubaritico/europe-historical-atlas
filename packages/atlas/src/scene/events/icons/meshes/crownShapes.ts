/**
 * What a crown is built from (ATLAS-287): a moulded band, plates cut from a flat outline, beads on a ring — so each
 * crown says its own idea and nothing else. Read by the map's crown (`crown.ts`) and by the crowns kept aside on the
 * bench for the regional ones (`bench/crownCandidates.ts`).
 */

import {
  BoxGeometry,
  ExtrudeGeometry,
  IcosahedronGeometry,
  LatheGeometry,
  Shape,
  TorusGeometry,
  Vector2,
} from 'three'

import type { Part } from './parts'
import type { BufferGeometry } from 'three'

/** A colour of the icons' palette. */
export type Colour = Part['colour']

/** The radius every crown's band is turned at. */
export const CROWN_RADIUS = 0.5

/**
 * A band turned about the vertical axis, with a moulding along its foot and its rim — facets the light runs along.
 * @param inner - its inner radius
 * @param outer - its outer radius
 * @param height - its height
 * @param lift - how high its foot stands
 * @returns its geometry
 */
export function band(inner: number, outer: number, height: number, lift = 0): BufferGeometry {
  const lip = outer + 0.022
  const edge = Math.min(0.04, height / 4)
  const section = [
    new Vector2(inner, 0),
    new Vector2(lip, 0),
    new Vector2(lip, edge),
    new Vector2(outer, edge + 0.012),
    new Vector2(outer, height - edge - 0.012),
    new Vector2(lip, height - edge),
    new Vector2(lip, height),
    new Vector2(inner, height),
    new Vector2(inner, 0),
  ]
  return new LatheGeometry(section, 28).translate(0, lift, 0)
}

/**
 * An angle in radians.
 * @param degrees - the angle in degrees
 * @returns the angle
 */
export function radians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/**
 * Evenly spaced angles around the vertical axis.
 * @param count - how many
 * @param offset - a turn added to each, in radians
 * @returns the angles
 */
export function around(count: number, offset = 0): number[] {
  return Array.from({ length: count }, (_, index) => offset + (index * Math.PI * 2) / count)
}

/**
 * A point on a ring about the vertical axis, moved along the ring's tangent — a stone set on a plate facing outward.
 * @param angle - where on the ring, 0 facing the viewer
 * @param radius - the ring's radius
 * @param height - how high
 * @param along - how far along the tangent
 * @returns the point
 */
export function onRing(
  angle: number,
  radius: number,
  height: number,
  along = 0
): [number, number, number] {
  return [
    Math.sin(angle) * radius + Math.cos(angle) * along,
    height,
    Math.cos(angle) * radius - Math.sin(angle) * along,
  ]
}

/**
 * A plate cut from flat outlines, standing in the plane facing the viewer, centred on its thickness — its edges
 * bevelled, so each catches the light as a facet of its own.
 * @param shapes - its outlines
 * @param depth - its thickness
 * @param bevel - how wide its bevelled edge is, 0 for a sharp edge
 * @returns its geometry
 */
export function plate(shapes: Shape | Shape[], depth: number, bevel = 0.012): BufferGeometry {
  return new ExtrudeGeometry(shapes, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: 1,
    curveSegments: 8,
  }).translate(0, 0, -depth / 2)
}

/**
 * Lift a geometry, then lean it outward about its foot — a point of a crown opening out.
 * @param geometry - the geometry, changed in place
 * @param lift - how high it is lifted first
 * @param angle - the lean, in radians, positive outward
 * @returns `geometry`
 */
export function leaned(geometry: BufferGeometry, lift: number, angle: number): BufferGeometry {
  return geometry.translate(0, lift, 0).rotateX(angle)
}

/**
 * A faceted bead — a pearl, a knob.
 * @param size - its radius
 * @param flatten - its depth as a share of its radius, 1 for a ball
 * @returns its geometry
 */
export function bead(size: number, flatten = 1): BufferGeometry {
  return new IcosahedronGeometry(size, 0).scale(1, 1, flatten)
}

/**
 * A cut stone set on a face: a cabochon of many facets, half sunk.
 * @param size - its radius
 * @returns its geometry
 */
export function stone(size: number): BufferGeometry {
  return new IcosahedronGeometry(size, 1).scale(1, 1, 0.55)
}

/**
 * Beads evenly set on a ring.
 * @param count - how many
 * @param radius - the ring's radius
 * @param height - how high
 * @param size - a bead's radius
 * @param colour - their colour
 * @returns the beads
 */
export function beads(
  count: number,
  radius: number,
  height: number,
  size: number,
  colour: Colour
): Part[] {
  return around(count).map((angle): Part => ({
    geometry: bead(size),
    colour,
    at: onRing(angle, radius, height),
  }))
}

/**
 * Cut stones set around a band, red and blue in turn.
 * @param count - how many
 * @param height - how high on the band
 * @param size - a stone's radius
 * @param offset - a turn added to each
 * @returns the stones
 */
export function stones(count: number, height: number, size: number, offset = 0): Part[] {
  return around(count, offset).map((angle, index): Part => ({
    geometry: stone(size),
    colour: index % 2 === 0 ? 'jewel' : 'sapphire',
    at: onRing(angle, CROWN_RADIUS + 0.02, height),
    turn: angle,
  }))
}

/**
 * A band with a row of beads along its foot and its rim.
 * @param height - the band's height
 * @param lift - how high its foot stands
 * @param colour - the beads' colour
 * @param metal - the band's colour
 * @returns the band and its two rows
 */
export function beadedBand(
  height: number,
  lift: number,
  colour: Colour,
  metal: Colour = 'gold'
): Part[] {
  return [
    { geometry: band(0.44, CROWN_RADIUS, height, lift), colour: metal },
    ...beads(36, CROWN_RADIUS + 0.03, lift + 0.045, 0.017, colour),
    ...beads(36, CROWN_RADIUS + 0.03, lift + height - 0.045, 0.017, colour),
  ]
}

/**
 * An arch over the crown, from one side to the other, standing in the plane facing the viewer.
 * @param radius - half its span
 * @param rise - its height as a share of its half span
 * @param tube - its thickness
 * @param sides - how many faces its section has
 * @param wide - its width as a multiple of its thickness: above 1, a strap
 * @returns its geometry
 */
export function arch(
  radius: number,
  rise: number,
  tube: number,
  sides = 5,
  wide = 1
): BufferGeometry {
  return new TorusGeometry(radius, tube, sides, 24, Math.PI).scale(1, rise, wide)
}

/**
 * Beads set up an arch, on both of its sides.
 * @param turn - the arch's turn about the vertical
 * @param reach - how far from the axis the beads stand at the arch's foot
 * @param rise - the arch's height as a share of its half span
 * @param foot - where the arch springs
 * @param degrees - where up the arch each bead sits, 0 its foot and 90 its top
 * @param size - a bead's radius
 * @returns the beads
 */
export function upArch(
  turn: number,
  reach: number,
  rise: number,
  foot: number,
  degrees: readonly number[],
  size: number
): Part[] {
  return degrees.map((degree): Part => {
    const along = Math.cos(radians(degree)) * reach
    return {
      geometry: bead(size),
      colour: 'pearl',
      at: [
        along * Math.cos(turn),
        foot + Math.sin(radians(degree)) * reach * rise,
        -along * Math.sin(turn),
      ],
    }
  })
}

/**
 * A plain cross: an upright and a bar.
 * @param height - its height
 * @param span - its bar's length
 * @param thickness - its arms' thickness
 * @returns its two geometries, standing on the origin
 */
export function cross(height: number, span: number, thickness: number): BufferGeometry[] {
  return [
    new BoxGeometry(thickness, height, thickness).translate(0, height / 2, 0),
    new BoxGeometry(span, thickness, thickness).translate(0, height * 0.68, 0),
  ]
}

/**
 * A point's outline: wide at its foot, its sides drawn in to a narrow neck — two feet side by side make the sweep
 * between two points of a crown.
 * @param width - its foot
 * @param height - its height
 * @param neck - its width at the top
 * @returns the outline
 */
export function pointOutline(width: number, height: number, neck: number): Shape {
  const shape = new Shape()
  shape.moveTo(-width / 2, 0)
  shape.quadraticCurveTo(-width * 0.1, height * 0.22, -neck / 2, height)
  shape.lineTo(neck / 2, height)
  shape.quadraticCurveTo(width * 0.1, height * 0.22, width / 2, 0)
  shape.closePath()
  return shape
}

/**
 * A plate's outline with a rounded top — a panel of the Empire's crown.
 * @param width - its width
 * @param height - its height, the round included
 * @returns the outline
 */
export function archedOutline(width: number, height: number): Shape {
  const shape = new Shape()
  shape.moveTo(-width / 2, 0)
  shape.lineTo(width / 2, 0)
  shape.lineTo(width / 2, height - width / 2)
  shape.absarc(0, height - width / 2, width / 2, 0, Math.PI, false)
  shape.closePath()
  return shape
}

/**
 * A fleur-de-lis's outlines: the tall middle petal, the two curled side petals, the foot under the tie.
 * @param size - its height
 * @returns the outlines
 */
export function lysOutlines(size: number): Shape[] {
  const at = (x: number, y: number): [number, number] => [x * size, y * size]
  const middle = new Shape()
  middle.moveTo(...at(0, 1))
  middle.bezierCurveTo(...at(0.22, 0.75), ...at(0.17, 0.5), ...at(0.05, 0.3))
  middle.lineTo(...at(-0.05, 0.3))
  middle.bezierCurveTo(...at(-0.17, 0.5), ...at(-0.22, 0.75), ...at(0, 1))
  const side = (hand: 1 | -1): Shape => {
    const petal = new Shape()
    petal.moveTo(...at(hand * 0.04, 0.3))
    petal.bezierCurveTo(...at(hand * 0.1, 0.56), ...at(hand * 0.3, 0.76), ...at(hand * 0.46, 0.62))
    petal.bezierCurveTo(...at(hand * 0.52, 0.5), ...at(hand * 0.43, 0.4), ...at(hand * 0.35, 0.46))
    petal.bezierCurveTo(...at(hand * 0.33, 0.57), ...at(hand * 0.22, 0.5), ...at(hand * 0.17, 0.3))
    petal.closePath()
    return petal
  }
  const foot = new Shape()
  foot.moveTo(...at(-0.17, 0.3))
  foot.lineTo(...at(0.17, 0.3))
  foot.lineTo(...at(0.17, 0.22))
  foot.quadraticCurveTo(...at(0.1, 0.08), ...at(0, 0))
  foot.quadraticCurveTo(...at(-0.1, 0.08), ...at(-0.17, 0.22))
  foot.closePath()
  return [middle, side(1), side(-1), foot]
}

/**
 * One lily, leaning outward, with its tie.
 * @param angle - where it stands
 * @param foot - where it springs
 * @param size - its height
 * @param lean - its lean
 * @returns its parts
 */
export function lily(angle: number, foot: number, size: number, lean: number): Part[] {
  const at = onRing(angle, CROWN_RADIUS - 0.02, foot)
  return [
    {
      geometry: leaned(plate(lysOutlines(size), size * 0.09, size * 0.02), 0, lean),
      colour: 'gold',
      at,
      turn: angle,
    },
    {
      geometry: leaned(new BoxGeometry(size * 0.38, size * 0.08, size * 0.16), size * 0.27, lean),
      colour: 'gold',
      at,
      turn: angle,
    },
  ]
}
