/**
 * The conquest's candidates on the icons' bench, `/icons.html?conquest` (ATLAS-477). The dev, 2026-11-19: *"ce serait
 * bien d'utiliser une oriflamme"*, and of whichever is chosen — an oriflamme, a banner, a flag — *"que ça flotte un
 * petit peu […] c'est la seule animation que je te demanderai"*. Five ideas, one each, a gilded staff and a carmine
 * cloth. **The cloth floats as the trebuchet throws**: it is cut into strips, each a moving part placed by its own
 * motion along one travelling wave, still at the staff or the crossbar and freer toward its end — no vertex is moved,
 * no shader written.
 */

import { CylinderGeometry, ExtrudeGeometry, Shape, SphereGeometry } from 'three'

import type { Motions, Part } from '../scene/events/icons/meshes/parts'
import type { EventIconPalette } from '../scene/events/icons/palette'

/**
 * The cloth's red on the bench: a carmine brighter than a crown's velvet, which the icons' lights leave nearly black on
 * a flat cloth. A candidate's colour, tuned by eye; the palette gains a key of its own when one is chosen.
 */
export const CONQUEST_CLOTH_RED = '#f0283c'

/** One candidate: its letter, what it tries, its parts and how its cloth moves. */
export interface ConquestCandidate {
  /** The letter he names it by. */
  readonly letter: string
  /** Its one idea, in his language. */
  readonly idea: string
  /** Its parts, built as the map builds a kind's. */
  readonly parts: () => Part[]
  /** How its cloth's strips are placed at a moment. */
  readonly motions: Motions
}

/** A piece of the cloth across one cut of it: from where to where, and in which colour. */
interface Span {
  /** Its lower or left edge, measured across the cloth from its middle line. */
  from: number
  /** Its upper or right edge. */
  to: number
  /** Its colour — the cloth's, or the gold of a border. */
  colour: keyof EventIconPalette
}

/** A cloth's outline: the spans it shows at a distance from where it is held — the same number all along a strip. */
type Outline = (distance: number) => Span[]

/** How tall the staff stands, in build units — the model is fitted to its box afterwards. */
const STAFF_HEIGHT = 1.5
/** The staff's radius. */
const STAFF_RADIUS = 0.025
/** How thick the cloth is: enough for a faceted edge to catch the light. */
const CLOTH_THICKNESS = 0.024
/** How much wider a strip is cut than its share, so two neighbours never show a gap as they turn. */
const STRIP_OVERLAP = 1.08
/**
 * How far the free end of a cloth flying from its staff swings either side, in build units. Raised from 0.07 (the dev,
 * 2026-11-20, of the oriflamme, the flag and the pennant: *"est-ce qu'ils peuvent onduler un petit peu plus ?"*).
 */
const FLYING_SWING = 0.13
/** How far the foot of a hanging banner swings: left as first set (the dev, same day: *"pour le D et le E, ça va"*). */
const HANGING_SWING = 0.05
/** How long one swing takes, in seconds. */
const PERIOD = 2.4
/** How long the wave is that runs along the cloth, in build units: about one over a cloth. */
const WAVELENGTH = 1
/** The cloth's colour. */
const CLOTH: keyof EventIconPalette = 'velvet'

/**
 * A gilded staff with a ball on its tip, standing on the origin on a stepped foot: two slices of cylinder, the lower
 * one wider (the dev, 2026-11-20: *"à la place du cône au pied, plutôt deux tranches de cylindre, une plus large que
 * l'autre"*).
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
 * Where a strip of cloth sits on the wave at a moment: how far aside, and how steeply the cloth runs there.
 * @param seconds - the moment
 * @param distance - how far the strip is from where the cloth is held
 * @param length - the cloth's whole length: the swing grows from nought where it is held to whole at its end
 * @param swing - how far its free end swings either side
 * @returns the offset aside and the slope
 */
function onWave(
  seconds: number,
  distance: number,
  length: number,
  swing: number
): { aside: number; slope: number } {
  const phase = 2 * Math.PI * (seconds / PERIOD - distance / WAVELENGTH)
  const reach = (swing * distance) / length
  return {
    aside: reach * Math.sin(phase),
    slope: ((-2 * Math.PI) / WAVELENGTH) * reach * Math.cos(phase),
  }
}

/**
 * One strip's geometry: a flat piece between two cuts of the cloth, built about its own middle.
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

/** A cloth cut into strips: its parts, and the motion of each strip. */
interface Cloth {
  /** The strips, each a moving part. */
  parts: Part[]
  /** Each strip's motion, by the name its parts use. */
  motions: Motions
}

/**
 * A cloth flying from the side of a staff: cut into upright strips, the wave running away from the staff.
 * @param name - what its motions are named after, one cloth of a model from another
 * @param outline - its spans, bottom to top, at a distance from the staff
 * @param size - its length, how many strips it is cut into, and the height of its middle line
 * @param size.length - how far it flies from the staff
 * @param size.strips - how many strips
 * @param size.middle - the height of its middle line
 * @returns its strips and their motions
 */
function flying(
  name: string,
  outline: Outline,
  size: { length: number; strips: number; middle: number }
): Cloth {
  const { length, strips, middle } = size
  const width = length / strips
  const half = (width * STRIP_OVERLAP) / 2
  const parts: Part[] = []
  const motions: Motions = {}
  for (let index = 0; index < strips; index++) {
    const centre = STAFF_RADIUS + (index + 0.5) * width
    const moves = `${name}${String(index)}`
    // Read just inside the strip, so a strip that starts where the outline forks has the fork's spans at both ends.
    const near = outline(index * width + width * 0.001)
    const far = outline((index + 1) * width - width * 0.001)
    for (const [at, span] of near.entries()) {
      const end = far[at] ?? span
      parts.push({
        geometry: stripGeometry([
          [-half, span.from],
          [half, end.from],
          [half, end.to],
          [-half, span.to],
        ]),
        colour: span.colour,
        at: [centre, middle, 0],
        moves,
      })
    }
    motions[moves] = {
      place: (seconds, into) => {
        const { aside, slope } = onWave(seconds, (index + 0.5) * width, length, FLYING_SWING)
        // Turned so the strip runs along the wave: a turn about the upright by θ sends the cloth's run to −tan θ.
        return into.makeRotationY(-Math.atan(slope)).setPosition(centre, middle, aside)
      },
    }
  }
  return { parts, motions }
}

/**
 * A cloth hanging from a crossbar: cut into level strips, the wave running down from the bar.
 * @param name - what its motions are named after
 * @param outline - its spans, left to right, at a depth under the bar
 * @param size - its drop, how many strips it is cut into, and the bar's height
 * @param size.length - how far it hangs
 * @param size.strips - how many strips
 * @param size.middle - the height it hangs from
 * @returns its strips and their motions
 */
function hanging(
  name: string,
  outline: Outline,
  size: { length: number; strips: number; middle: number }
): Cloth {
  const { length, strips, middle: top } = size
  const height = length / strips
  const half = (height * STRIP_OVERLAP) / 2
  const parts: Part[] = []
  const motions: Motions = {}
  for (let index = 0; index < strips; index++) {
    const level = top - (index + 0.5) * height
    const moves = `${name}${String(index)}`
    const upper = outline(index * height + height * 0.001)
    const lower = outline((index + 1) * height - height * 0.001)
    for (const [at, span] of upper.entries()) {
      const end = lower[at] ?? span
      parts.push({
        geometry: stripGeometry([
          [span.from, half],
          [span.to, half],
          [end.to, -half],
          [end.from, -half],
        ]),
        colour: span.colour,
        // Just in front of the staff it hangs before.
        at: [0, level, STAFF_RADIUS + CLOTH_THICKNESS],
        moves,
      })
    }
    motions[moves] = {
      place: (seconds, into) => {
        const { aside, slope } = onWave(seconds, (index + 0.5) * height, length, HANGING_SWING)
        // A turn about the bar's line by θ sends the cloth's fall to −tan θ.
        return into
          .makeRotationX(-Math.atan(slope))
          .setPosition(0, level, STAFF_RADIUS + CLOTH_THICKNESS + aside)
      },
    }
  }
  return { parts, motions }
}

/**
 * The crossbar a banner hangs from, across the top of the staff, a small ball at each end.
 * @param width - how wide it is
 * @param height - where it sits
 * @returns its parts
 */
function crossbar(width: number, height: number): Part[] {
  const bar = new CylinderGeometry(0.02, 0.02, width, 8)
  bar.rotateZ(Math.PI / 2)
  return [
    { geometry: bar, colour: 'gold', at: [0, height, STAFF_RADIUS + CLOTH_THICKNESS] },
    ...[-1, 1].map((side): Part => ({
      geometry: new SphereGeometry(0.035, 8, 6),
      colour: 'gold',
      at: [(side * width) / 2, height, STAFF_RADIUS + CLOTH_THICKNESS],
    })),
  ]
}

/**
 * How many strips every cloth is cut into, the flying and the hanging alike (the dev, 2026-11-20: *"le même nombre de
 * segments pour tous, plus de segments"*) — nine at first, then eighteen for the flying ones. A multiple of three, so
 * a strip starts where a cloth forks, at two thirds of its length.
 */
const STRIPS = 24
/** How tall a flying cloth is, and how far it flies. */
const FLAG = { height: 0.46, length: 0.9, strips: STRIPS, middle: STAFF_HEIGHT - 0.08 - 0.23 }
/** How wide a hanging banner is, how far it hangs, and the height of its bar. */
const BANNER = { width: 0.56, length: 0.9, strips: STRIPS, middle: STAFF_HEIGHT - 0.1 }

/** How wide the gold edge of a flying cloth is, above and below. */
const GOLD_EDGE = 0.05

/**
 * An oriflamme's outline: whole near the staff, then forked into two points — a swallow's tail — with the flag's gold
 * edge above and below (the dev, 2026-11-20: *"pour le A, l'oriflamme, mets le même bord doré que pour le B"*). Along
 * a tongue the edge thins with it, never more than half its width, so the red runs to the point.
 * @param distance - how far from the staff
 * @returns the lower edge, the cloth, the upper edge — or, past the fork, each tongue's edge and cloth
 */
function swallowTail(distance: number): Span[] {
  const fork = FLAG.length * (2 / 3)
  const half = FLAG.height / 2
  if (distance <= fork) return borderedFlag()
  // The notch opens from the fork to the whole height at the tip, each tongue ending on a point.
  const notch = Math.min(half - 0.012, ((distance - fork) / (FLAG.length - fork)) * half)
  const edge = Math.min(GOLD_EDGE, (half - notch) / 2)
  return [
    { from: -half, to: -half + edge, colour: 'gold' },
    { from: -half + edge, to: -notch, colour: CLOTH },
    { from: notch, to: half - edge, colour: CLOTH },
    { from: half - edge, to: half, colour: 'gold' },
  ]
}

/**
 * A flag's outline with a gold edge above and below.
 * @returns the lower edge, the cloth, the upper edge
 */
function borderedFlag(): Span[] {
  const half = FLAG.height / 2
  return [
    { from: -half, to: -half + GOLD_EDGE, colour: 'gold' },
    { from: -half + GOLD_EDGE, to: half - GOLD_EDGE, colour: CLOTH },
    { from: half - GOLD_EDGE, to: half, colour: 'gold' },
  ]
}

/**
 * A pennant's outline: a long triangle, narrowing to its point.
 * @param distance - how far from the staff
 * @returns one span
 */
function pennant(distance: number): Span[] {
  const half = Math.max(0.012, (FLAG.height / 2) * (1 - distance / FLAG.length))
  return [{ from: -half, to: half, colour: CLOTH }]
}

/**
 * A hanging banner's outline, forked at its foot into two points, a gold band across its upper part.
 * @param depth - how far under the bar
 * @returns its spans, left to right
 */
function forkedBanner(depth: number): Span[] {
  const half = BANNER.width / 2
  const colour: keyof EventIconPalette = depth > 0.1 && depth < 0.2 ? 'gold' : CLOTH
  const fork = BANNER.length * (2 / 3)
  if (depth <= fork) return [{ from: -half, to: half, colour }]
  const notch = Math.min(half - 0.012, ((depth - fork) / (BANNER.length - fork)) * half)
  return [
    { from: -half, to: -notch, colour },
    { from: notch, to: half, colour },
  ]
}

/**
 * A hanging banner's outline ending in three tongues, a gold band across its upper part.
 * @param depth - how far under the bar
 * @returns its spans, left to right
 */
function tonguedBanner(depth: number): Span[] {
  const half = BANNER.width / 2
  const colour: keyof EventIconPalette = depth > 0.1 && depth < 0.2 ? 'gold' : CLOTH
  if (depth <= BANNER.length * (2 / 3)) return [{ from: -half, to: half, colour }]
  const tongue = BANNER.width / 5
  return [
    { from: -half, to: -half + tongue, colour },
    { from: -tongue / 2, to: tongue / 2, colour },
    { from: half - tongue, to: half, colour },
  ]
}

/** Each candidate's cloth, cut anew at each ask — a model owns its geometries; the motions depend on no geometry. */
const CLOTHS = {
  oriflamme: () => flying('oriflamme', swallowTail, FLAG),
  flag: () => flying('flag', borderedFlag, FLAG),
  pennant: () => flying('pennant', pennant, FLAG),
  forked: () => hanging('forked', forkedBanner, BANNER),
  tongued: () => hanging('tongued', tonguedBanner, BANNER),
} satisfies Record<string, () => Cloth>

/** The candidates tried for the conquests' icon. */
export const CONQUEST_CANDIDATES: readonly ConquestCandidate[] = [
  {
    letter: 'A',
    idea: 'l’oriflamme sur sa hampe, deux pointes',
    parts: () => [...staff(), ...CLOTHS.oriflamme().parts],
    motions: CLOTHS.oriflamme().motions,
  },
  {
    letter: 'B',
    idea: 'le drapeau bordé d’or',
    parts: () => [...staff(), ...CLOTHS.flag().parts],
    motions: CLOTHS.flag().motions,
  },
  {
    letter: 'C',
    idea: 'le fanion en triangle',
    parts: () => [...staff(), ...CLOTHS.pennant().parts],
    motions: CLOTHS.pennant().motions,
  },
  {
    letter: 'D',
    idea: 'la bannière pendue à sa traverse, queue d’aronde',
    parts: () => [
      ...staff(),
      ...crossbar(BANNER.width + 0.1, BANNER.middle),
      ...CLOTHS.forked().parts,
    ],
    motions: CLOTHS.forked().motions,
  },
  {
    letter: 'E',
    idea: 'la bannière pendue, trois langues',
    parts: () => [
      ...staff(),
      ...crossbar(BANNER.width + 0.1, BANNER.middle),
      ...CLOTHS.tongued().parts,
    ],
    motions: CLOTHS.tongued().motions,
  },
]
