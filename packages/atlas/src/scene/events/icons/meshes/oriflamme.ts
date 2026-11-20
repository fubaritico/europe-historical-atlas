/**
 * The conquest's icon: an oriflamme on its staff (ATLAS-477). The dev, 2026-11-19: *"it would be good to use an
 * oriflamme"*, and of its cloth *"that it floats a little […] it is the only animation I will ask of you"* — chosen
 * on the icons' bench, « A », on 2026-11-20, among a flag, a pennant and two hanging banners: a gilded staff with a
 * ball on its tip, standing on a foot of two steps, and a red cloth edged with gold that forks into two points.
 *
 * **The cloth floats as the trebuchet throws**: it is cut into upright strips, each a moving part placed by its own
 * motion along one travelling wave, still at the staff and freer toward its points — no vertex is moved, no shader
 * written.
 */

import { CylinderGeometry, ExtrudeGeometry, Shape, SphereGeometry } from 'three'

import type { EventIconPalette } from '../palette'
import type { Motions, Part } from './parts'

/** How tall the staff stands, in build units — the model is fitted to its box afterwards. */
export const STAFF_HEIGHT = 1.5
/** The staff's radius. */
const STAFF_RADIUS = 0.025
/** How thick the cloth is: enough for a faceted edge to catch the light. */
const CLOTH_THICKNESS = 0.024
/** How much wider a strip is cut than its share, so two neighbours never show a gap as they turn. */
const STRIP_OVERLAP = 1.08
/**
 * How far the cloth's points swing either side, in build units. Raised from 0.07 on the bench (the dev, 2026-11-20:
 * *"can they wave a little more?"*).
 */
export const SWING = 0.13
/** How long one swing takes, in seconds. */
export const PERIOD = 2.4
/** How long the wave is that runs along the cloth, in build units: about one over the cloth. */
const WAVELENGTH = 1
/**
 * How many strips the cloth is cut into (the dev, 2026-11-20: *"more segments"*) — nine at first, then eighteen. A
 * multiple of three, so a strip starts where the cloth forks, at two thirds of its length.
 */
export const STRIPS = 24
/** How far the cloth flies from the staff. */
export const CLOTH_LENGTH = 0.9
/** How tall the cloth is at the staff. */
const CLOTH_HEIGHT = 0.46
/** The height of the cloth's middle line: hung a little under the staff's tip. */
const CLOTH_MIDDLE = STAFF_HEIGHT - 0.08 - CLOTH_HEIGHT / 2
/** How wide the gold edge of the cloth is, above and below. */
const GOLD_EDGE = 0.05
/** One strip's share of the cloth's length. */
const STRIP_WIDTH = CLOTH_LENGTH / STRIPS

/** A piece of the cloth across one cut of it: from where to where, and in which colour. */
interface Span {
  /** Its lower edge, measured across the cloth from its middle line. */
  from: number
  /** Its upper edge. */
  to: number
  /** Its colour — the cloth's, or the gold of its edge. */
  colour: keyof EventIconPalette
}

/**
 * The name of a strip's motion.
 * @param index - which strip, counted from the staff
 * @returns the name its parts and `ORIFLAMME_MOTIONS` share
 */
function stripMotion(index: number): string {
  return `strip${String(index)}`
}

/**
 * Where a point of the cloth sits on the wave at a moment: how far aside, and how steeply the cloth runs there. The
 * swing grows from nought at the staff to whole at the points.
 * @param seconds - the moment
 * @param distance - how far the point is from the staff
 * @returns the offset aside and the slope
 */
export function onWave(seconds: number, distance: number): { aside: number; slope: number } {
  const phase = 2 * Math.PI * (seconds / PERIOD - distance / WAVELENGTH)
  const reach = (SWING * distance) / CLOTH_LENGTH
  return {
    aside: reach * Math.sin(phase),
    slope: ((-2 * Math.PI) / WAVELENGTH) * reach * Math.cos(phase),
  }
}

/**
 * The cloth's outline at a distance from the staff: whole at first, then forked into two points — a swallow's tail —
 * with a gold edge above and below (the dev, 2026-11-20: *"for A, the oriflamme, the same gold edge as B's"*). Along
 * a tongue the edge thins with it, never more than half its width, so the red runs to the point.
 * @param distance - how far from the staff
 * @returns the lower edge, the cloth, the upper edge — or, past the fork, each tongue's edge and cloth
 */
export function swallowTail(distance: number): Span[] {
  const fork = CLOTH_LENGTH * (2 / 3)
  const half = CLOTH_HEIGHT / 2
  if (distance <= fork) {
    return [
      { from: -half, to: -half + GOLD_EDGE, colour: 'gold' },
      { from: -half + GOLD_EDGE, to: half - GOLD_EDGE, colour: 'cloth' },
      { from: half - GOLD_EDGE, to: half, colour: 'gold' },
    ]
  }
  // The notch opens from the fork to the whole height at the tip, each tongue ending on a point.
  const notch = Math.min(half - 0.012, ((distance - fork) / (CLOTH_LENGTH - fork)) * half)
  const edge = Math.min(GOLD_EDGE, (half - notch) / 2)
  return [
    { from: -half, to: -half + edge, colour: 'gold' },
    { from: -half + edge, to: -notch, colour: 'cloth' },
    { from: notch, to: half - edge, colour: 'cloth' },
    { from: half - edge, to: half, colour: 'gold' },
  ]
}

/**
 * One piece of a strip: a flat quadrilateral between two cuts of the cloth, built about the strip's own middle.
 * @param corners - its four corners, in order round it
 * @returns the geometry
 */
function stripGeometry(corners: [number, number][]): ExtrudeGeometry {
  const shape = new Shape()
  for (const [index, [x, y]] of corners.entries()) {
    if (index === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  shape.closePath()
  const geometry = new ExtrudeGeometry(shape, { depth: CLOTH_THICKNESS, bevelEnabled: false })
  geometry.translate(0, 0, -CLOTH_THICKNESS / 2)
  return geometry
}

/**
 * The gilded staff with a ball on its tip, standing on the origin on a stepped foot: two slices of cylinder, the
 * lower one wider (the dev, 2026-11-20: *"in place of the cone at its foot, rather two slices of cylinder, one wider
 * than the other"*).
 * @returns its parts
 */
function staff(): Part[] {
  return [
    {
      geometry: new CylinderGeometry(STAFF_RADIUS, STAFF_RADIUS, STAFF_HEIGHT, 10),
      colour: 'gold',
      at: [0, STAFF_HEIGHT / 2, 0],
    },
    { geometry: new SphereGeometry(0.06, 10, 8), colour: 'gold', at: [0, STAFF_HEIGHT + 0.04, 0] },
    { geometry: new CylinderGeometry(0.12, 0.12, 0.04, 14), colour: 'gold', at: [0, 0.02, 0] },
    { geometry: new CylinderGeometry(0.075, 0.075, 0.04, 14), colour: 'gold', at: [0, 0.06, 0] },
  ]
}

/**
 * Where a strip's middle stands along the cloth.
 * @param index - which strip, counted from the staff
 * @returns its distance from the staff's axis
 */
function stripCentre(index: number): number {
  return STAFF_RADIUS + (index + 0.5) * STRIP_WIDTH
}

/**
 * The cloth, cut into upright strips: each strip's pieces — its gold edges, its red — are moving parts under the
 * strip's motion, placed where they rest when the cloth hangs flat.
 * @returns the parts
 * @throws when a strip's two cuts do not show the same pieces — the fork fell inside a strip, a defect of `STRIPS`
 */
function cloth(): Part[] {
  const half = (STRIP_WIDTH * STRIP_OVERLAP) / 2
  const parts: Part[] = []
  for (let index = 0; index < STRIPS; index++) {
    // Read just inside the strip, so a strip that starts where the outline forks has the fork's spans at both ends.
    const near = swallowTail(index * STRIP_WIDTH + STRIP_WIDTH * 0.001)
    const far = swallowTail((index + 1) * STRIP_WIDTH - STRIP_WIDTH * 0.001)
    for (const [at, span] of near.entries()) {
      const end = far[at]
      if (end === undefined || near.length !== far.length) {
        throw new Error(`[atlas] the oriflamme's strip ${String(index)} is cut across its fork`)
      }
      parts.push({
        geometry: stripGeometry([
          [-half, span.from],
          [half, end.from],
          [half, end.to],
          [-half, span.to],
        ]),
        colour: span.colour,
        at: [stripCentre(index), CLOTH_MIDDLE, 0],
        moves: stripMotion(index),
      })
    }
  }
  return parts
}

/**
 * The oriflamme's parts: its staff and foot, standing still, and its cloth's strips, each moving.
 * @returns the parts, built anew at each call — a model owns its geometries
 */
export function oriflammeParts(): Part[] {
  return [...staff(), ...cloth()]
}

/**
 * How each strip of the cloth is placed at a moment: moved aside along the wave, and turned so it runs along it — a
 * turn about the upright by θ sends the cloth's run to −tan θ.
 */
export const ORIFLAMME_MOTIONS: Motions = Object.fromEntries(
  Array.from({ length: STRIPS }, (_, index) => [
    stripMotion(index),
    {
      place: (seconds, into) => {
        const { aside, slope } = onWave(seconds, (index + 0.5) * STRIP_WIDTH)
        return into
          .makeRotationY(-Math.atan(slope))
          .setPosition(stripCentre(index), CLOTH_MIDDLE, aside)
      },
    },
  ])
)
