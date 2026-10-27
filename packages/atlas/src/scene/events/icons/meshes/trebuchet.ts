/**
 * The siege icon: a traction trebuchet that throws — the engine the contribution gives the sieges of 1100 (the dev,
 * 2026-10-27: *« un petit modèle animé d'un trébuchet, pour remplacer le modèle 3D de la tour »*, the traction one
 * chosen over the counterweight, which reaches Europe only in 1217). The tower stays in reserve, in `./tower`.
 *
 * The throw, whole (the dev, same evening: *« recréer complètement la dynamique du lancer »*): the arm rests up to the
 * west, its sling hanging from the tip; it is hauled down to load, the stone set in the pouch; the crew pull and the
 * arm whips over the top, the sling trailing behind then flung past it; at the top the pouch opens and the stone
 * flies east in an arc, lands, and is gone until the next load; the sling hangs again and the arm settles back.
 *
 * Seen from the south: X runs east, Y up, Z south. Everything is built in the units below (the axle at 0.6) and
 * fitted one unit high with the rest of the model (`iconModel`). The frame — two long skids, a post and two braces
 * on each, a windlass at the east end — was chosen on the icons' bench among three (`/icons.html`, « C », the dev,
 * 2026-10-27), drawn after a picture he gave.
 */

import {
  BoxGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  Matrix4,
  Quaternion,
  Vector3,
} from 'three'

import { clamp01 } from '@europe-historical-atlas/core/utils/math'

import type { Motions, Part } from './parts'

/** How high the axle stands. */
export const AXLE_HEIGHT = 0.6

/** The arm: its long end, with the sling, and its short end, where the crew pull — about three and a half to one. */
const ARM = { long: 0.95, short: 0.28 }

/**
 * The arm at rest, as a turn about Z from level, in radians: its long end up to the west, at about 55° — as in the
 * pictures the dev gave. A point `x` east of the axle along the level arm then stands at `alongArm(x, 0)`.
 */
const REST = -0.95

/** How far the pouch hangs below the tip, on its cords. */
const SLING = 0.3

/** How far the crew's ropes stop above the ground, hanging from the head. */
const ROPE_CLEARANCE = 0.08

/**
 * How far the arm turns from rest, in radians: hauled down to load until the long end stands a little above the
 * ground, the loaded pouch and its stone just clear of it; thrown past the top toward the east.
 */
const TURN = { loaded: 1.15, thrown: -1.44 }

/** The cycle, in seconds: at rest, loaded slowly, held, thrown at once, settled back — then again, every one in step. */
const CYCLE = { rest: 1.2, load: 1.3, hold: 0.3, throw: 0.35, settle: 0.9 }

/** Where in the throw the pouch opens: the arm about upright, the sling flung past it. */
const RELEASE = 0.45

/**
 * The stone's flight: fast and nearly straight, bent a little, fading out to nothing in under a second at its own
 * size — for the speed and the force of the throw, not its arc (the dev, 2026-10-27: *« beaucoup plus droit, moins
 * en cloche, disparaître progressivement une fois lancé »*, then *« elle ne doit pas changer de taille, juste un fade
 * out »*). Its speed east and up as it leaves the pouch and what bends it down, in build units per second; how long
 * it is seen.
 */
const FLIGHT = { east: 4, up: 0.5, gravity: 2.5, seconds: 0.8 }

/**
 * Where a point along the arm stands, about the axle, at a turn from rest.
 * @param x - how far along the level arm, east of the axle (the long end is west, negative)
 * @param turn - the arm's turn from rest, in radians
 * @returns `[x, y]` about the axle
 */
function alongArm(x: number, turn: number): [number, number] {
  return [x * Math.cos(REST + turn), x * Math.sin(REST + turn)]
}

/**
 * Ease a share of a move: slow at both ends.
 * @param share - how far through, 0 to 1
 * @returns how far it has gone, 0 to 1
 */
function easeInOut(share: number): number {
  const s = clamp01(share)
  return s * s * (3 - 2 * s)
}

/** A moment of the cycle: which phase, how far through it, and the time since the cycle began. */
interface Moment {
  /** The phase. */
  phase: keyof typeof CYCLE
  /** How far through it, 0 to 1. */
  share: number
  /** The time since the cycle began, in seconds. */
  since: number
}

/** The phases in their order. */
const PHASES = ['rest', 'load', 'hold', 'throw', 'settle'] as const

/** The cycle's length, in seconds. */
const CYCLE_LENGTH = PHASES.reduce((sum, phase) => sum + CYCLE[phase], 0)

/**
 * Where in the cycle a time falls — also a time before the map started.
 * @param seconds - the time since the map started
 * @returns the phase, the share of it, and the time since the cycle began
 */
function momentOf(seconds: number): Moment {
  const since = ((seconds % CYCLE_LENGTH) + CYCLE_LENGTH) % CYCLE_LENGTH
  let start = 0
  for (const phase of PHASES) {
    if (since < start + CYCLE[phase]) return { phase, share: (since - start) / CYCLE[phase], since }
    start += CYCLE[phase]
  }
  // Floating point can land `since` on the cycle's very end: the last instant of the last phase.
  return { phase: 'settle', share: 1, since }
}

/**
 * How far the arm has turned from rest at a moment: hauled down slowly to load, held, whipped up at once past the
 * top, settled back — then still until the next.
 * @param seconds - the time since the map started
 * @returns the turn from rest, in radians
 */
export function armTurn(seconds: number): number {
  const { phase, share } = momentOf(seconds)
  switch (phase) {
    case 'rest':
      return 0
    case 'load':
      return TURN.loaded * easeInOut(share)
    case 'hold':
      return TURN.loaded
    case 'throw':
      // Fast at once, as the crew pull all together, slowing at the top.
      return TURN.loaded + (TURN.thrown - TURN.loaded) * (1 - (1 - share) * (1 - share))
    case 'settle':
      return TURN.thrown * (1 - easeInOut(share))
  }
}

/**
 * Which way the sling points from the tip at a moment, in radians about Z: straight down, hanging — but for the
 * throw, where it is swept round a full turn with the arm, trailing behind it up to the release, flung past it
 * after, and hanging again as the arm settles.
 * @param seconds - the time since the map started
 * @returns the direction from the tip to the pouch, in radians
 */
export function slingAngle(seconds: number): number {
  const { phase, share } = momentOf(seconds)
  return phase === 'throw' ? -Math.PI / 2 - 2 * Math.PI * share : -Math.PI / 2
}

/**
 * Where the tip of the long arm stands at a moment, in build units.
 * @param seconds - the time since the map started
 * @returns `[x, y]`
 */
function tipAt(seconds: number): [number, number] {
  const [x, y] = alongArm(-ARM.long, armTurn(seconds))
  return [x, AXLE_HEIGHT + y]
}

/**
 * Where the pouch hangs at a moment: below the tip at rest, swept round it in the throw.
 * @param seconds - the time since the map started
 * @returns `[x, y]`, in build units
 */
function pouchAt(seconds: number): [number, number] {
  const [x, y] = tipAt(seconds)
  const angle = slingAngle(seconds)
  return [x + SLING * Math.cos(angle), y + SLING * Math.sin(angle)]
}

/** The moment of the release, since the cycle began. */
const RELEASE_AT = CYCLE.rest + CYCLE.load + CYCLE.hold + CYCLE.throw * RELEASE

/** Where the stone leaves the pouch. */
const LAUNCH = pouchAt(RELEASE_AT)

/**
 * Where the stone is at a moment, in build units, and how much of it shows — or nowhere: set in the pouch as the arm
 * is held loaded, carried in it up to the release, then flying east, nearly straight, fading out until it is gone;
 * nowhere the rest of the cycle.
 * @param seconds - the time since the map started
 * @returns `[x, y, shows]`, `shows` 1 whole and falling to 0 as it flies away — or `null` while there is no stone
 */
export function stoneAt(seconds: number): [number, number, number] | null {
  const { phase, since } = momentOf(seconds)
  if (phase === 'hold' || (phase === 'throw' && since < RELEASE_AT)) return [...pouchAt(seconds), 1]
  const flown = since - RELEASE_AT
  if (flown < 0 || flown >= FLIGHT.seconds) return null
  return [
    LAUNCH[0] + FLIGHT.east * flown,
    LAUNCH[1] + FLIGHT.up * flown - (FLIGHT.gravity * flown * flown) / 2,
    1 - easeInOut(flown / FLIGHT.seconds),
  ]
}

/** The motions of a trebuchet, by the names its parts use, in build units. */
export const TREBUCHET_MOTIONS: Motions = {
  // The arm, turned about the axle.
  arm: {
    place: (seconds, into) => into.makeRotationZ(armTurn(seconds)).setPosition(0, AXLE_HEIGHT, 0),
  },
  // The crew's ropes, hanging upright from the head wherever it is.
  ropes: {
    place: (seconds, into) => {
      const [x, y] = alongArm(ARM.short, armTurn(seconds))
      return into.makeTranslation(x, AXLE_HEIGHT + y, 0)
    },
  },
  // The sling, built hanging straight down, turned to point where it swings.
  sling: {
    place: (seconds, into) => {
      const [x, y] = tipAt(seconds)
      return into.makeRotationZ(slingAngle(seconds) + Math.PI / 2).setPosition(x, y, 0)
    },
  },
  // The stone where it is, at its own size, fading as it flies — or nowhere: scaled to nothing.
  stone: {
    place: (seconds, into) => {
      const at = stoneAt(seconds)
      return at === null ? into.makeScale(0, 0, 0) : into.makeTranslation(at[0], at[1], 0)
    },
    fade: (seconds) => {
      const at = stoneAt(seconds)
      return at === null ? 0 : at[2]
    },
  },
}

/**
 * A piece of the arm built level along X, the short end east: laid at rest, moving with the arm.
 * @param geometry - its geometry, level
 * @returns the part
 */
function armPart(geometry: Part['geometry']): Part {
  return { geometry: geometry.rotateZ(REST), colour: 'wood', at: [0, AXLE_HEIGHT, 0], moves: 'arm' }
}

/**
 * The pole of the arm: tapered, thick at the short end and thin at the tip, as in the pictures.
 * @param thick - its radius at the short end
 * @param thin - its radius at the tip
 * @returns the part, moving with the arm
 */
function polePart(thick: number, thin: number): Part {
  const geometry = new CylinderGeometry(thick, thin, ARM.long + ARM.short, 6)
    .rotateZ(-Math.PI / 2)
    .translate((ARM.short - ARM.long) / 2, 0, 0)
  return armPart(geometry)
}

/**
 * The crew's ropes, hanging straight down from the head, side by side, to a hand's height off the ground.
 * @param count - how many
 * @param spread - how far apart, front to back
 * @returns their parts
 */
function ropeParts(count: number, spread: number): Part[] {
  const [x, y] = alongArm(ARM.short, 0)
  const length = AXLE_HEIGHT + y - ROPE_CLEARANCE
  return Array.from({ length: count }, (_, index) => ({
    geometry: new BoxGeometry(0.01, length, 0.01).translate(
      0,
      -length / 2,
      (index - (count - 1) / 2) * spread
    ),
    colour: 'stone' as const,
    at: [x, AXLE_HEIGHT + y, 0] as [number, number, number],
    moves: 'ropes',
  }))
}

/**
 * The sling: two cords from the tip and the pouch at their foot, built hanging straight down.
 * @returns its parts
 */
function slingParts(): Part[] {
  const [x, y] = tipAt(0)
  const at: [number, number, number] = [x, y, 0]
  return [
    ...[0.018, -0.018].map((z) => ({
      geometry: new BoxGeometry(0.008, SLING, 0.008).translate(0, -SLING / 2, z),
      colour: 'stone' as const,
      at,
      moves: 'sling',
    })),
    {
      geometry: new BoxGeometry(0.07, 0.09, 0.06).translate(0, -SLING - 0.03, 0),
      colour: 'leather',
      at,
      moves: 'sling',
    },
  ]
}

/**
 * The stone: a small grey ball (the dev, 2026-10-27: *« une petite boule grise »*), where the pouch holds it loaded.
 * @returns its part
 */
function stonePart(): Part {
  const [x, y] = pouchAt(CYCLE.rest + CYCLE.load)
  return {
    geometry: new IcosahedronGeometry(0.045, 0),
    colour: 'rock',
    at: [x, y, 0],
    moves: 'stone',
  }
}

/**
 * A beam of the frame between two points, square in section.
 * @param from - one end, `[x, y, z]`
 * @param to - the other end
 * @param side - its width
 * @returns its part, in wood
 */
function beam(from: [number, number, number], to: [number, number, number], side: number): Part {
  const [a, b] = [new Vector3(...from), new Vector3(...to)]
  const along = b.clone().sub(a)
  // A box laid along X, turned onto the line between the two ends, its middle between them.
  const turn = new Quaternion().setFromUnitVectors(new Vector3(1, 0, 0), along.clone().normalize())
  const geometry = new BoxGeometry(along.length(), side, side).applyMatrix4(
    new Matrix4().makeRotationFromQuaternion(turn).setPosition(a.add(b).multiplyScalar(0.5))
  )
  return { geometry, colour: 'wood' }
}

/** How far each side of the frame stands from the arm, front to back. */
const SIDE_Z = 0.16

/**
 * The frame that stays still: two long skids on the ground, joined at both ends; on each, a thick post straight
 * under the axle and two braces leaning into it from the skid; the axle across; a windlass across the east end, to
 * haul the arm down.
 * @returns its parts
 */
function frame(): Part[] {
  const z = SIDE_Z
  const sides = [-1, 1].flatMap((side) => [
    beam([-0.7, 0.035, side * z], [0.55, 0.035, side * z], 0.07),
    beam([0, 0.07, side * z], [0, AXLE_HEIGHT - 0.02, side * z], 0.07),
    beam([-0.3, 0.07, side * z], [0, 0.38, side * z], 0.045),
    beam([0.3, 0.07, side * z], [0, 0.38, side * z], 0.045),
  ])
  const ends = [
    beam([-0.65, 0.07, -z], [-0.65, 0.07, z], 0.06),
    beam([0.5, 0.07, -z], [0.5, 0.07, z], 0.06),
  ]
  const axle: Part = {
    geometry: new CylinderGeometry(0.028, 0.028, z * 2 + 0.12, 8)
      .rotateX(Math.PI / 2)
      .translate(0, AXLE_HEIGHT, 0),
    colour: 'steel',
  }
  // The windlass: a drum across the skids near the east end, a handle out of its side.
  const windlass: Part[] = [
    {
      geometry: new CylinderGeometry(0.04, 0.04, z * 2 + 0.08, 8)
        .rotateX(Math.PI / 2)
        .translate(0.42, 0.13, 0),
      colour: 'wood',
    },
    beam([0.42, 0.13, z + 0.04], [0.5, 0.26, z + 0.04], 0.025),
  ]
  return [...sides, ...ends, axle, ...windlass]
}

/**
 * A traction trebuchet: the frame, which stands still, then what moves (`TREBUCHET_MOTIONS`) — a thin pole through
 * a swollen club at its short end, two ropes hanging from the club, the sling at the tip, the stone.
 * @returns its parts
 */
export function trebuchetParts(): Part[] {
  const club = new CylinderGeometry(0.075, 0.05, 0.34, 8)
    .rotateZ(-Math.PI / 2)
    .translate(ARM.short - 0.14, 0, 0)
  return [
    ...frame(),
    polePart(0.024, 0.012),
    armPart(club),
    ...ropeParts(2, 0.05),
    ...slingParts(),
    stonePart(),
  ]
}
