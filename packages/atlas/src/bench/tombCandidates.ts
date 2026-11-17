/**
 * The grave's candidates on the icons' bench, `/icons.html?tomb` (ATLAS-288): the map's stone cut with each faith's
 * sign (`scene/events/icons/meshes/tomb`), then two other graves kept beside it.
 */

import { BoxGeometry } from 'three'

import { crescentSign, engraved, starSign, tombParts } from '../scene/events/icons/meshes/tomb'

import type { Part } from '../scene/events/icons/meshes/parts'

/** One candidate: its letter, what it tries, and its parts. */
export interface TombCandidate {
  /** The letter he names it by. */
  readonly letter: string
  /** Its one idea, in his language. */
  readonly idea: string
  /** Its parts, built as the map builds a kind's. */
  readonly parts: () => Part[]
}

/**
 * A Latin cross as two bars, standing upright.
 * @param height - its height
 * @param span - its arms' width
 * @param bar - how wide and how thick its bars are
 * @param at - where its foot stands
 * @param colour - its colour
 * @returns its parts
 */
function latinCross(
  height: number,
  span: number,
  bar: [number, number],
  at: [number, number, number],
  colour: Part['colour']
): Part[] {
  const [wide, thick] = bar
  const [x, y, z] = at
  return [
    { geometry: new BoxGeometry(wide, height, thick), colour, at: [x, y + height / 2, z] },
    // The arms, two thirds of the way up.
    { geometry: new BoxGeometry(span, wide, thick), colour, at: [x, y + height * 0.68, z] },
  ]
}

/**
 * D — a standing cross of stone on two steps.
 * @returns its parts
 */
function standingCrossParts(): Part[] {
  return [
    { geometry: new BoxGeometry(0.62, 0.09, 0.62), colour: 'rock', at: [0, 0.045, 0] },
    { geometry: new BoxGeometry(0.4, 0.09, 0.4), colour: 'rock', at: [0, 0.135, 0] },
    ...latinCross(0.86, 0.5, [0.13, 0.11], [0, 0.18, 0], 'limestone'),
  ]
}

/**
 * E — a grave: a slab lying on the ground, a cross raised along it, and a small cross standing at its head.
 * @returns its parts
 */
function graveParts(): Part[] {
  return [
    // The slab, lying south to north, its foot toward the reader.
    { geometry: new BoxGeometry(0.46, 0.09, 0.92), colour: 'limestoneShade', at: [0, 0.045, 0.1] },
    // The cross raised on it, lying.
    { geometry: new BoxGeometry(0.07, 0.03, 0.6), colour: 'limestone', at: [0, 0.1, 0.1] },
    { geometry: new BoxGeometry(0.26, 0.03, 0.07), colour: 'limestone', at: [0, 0.1, -0.06] },
    // The cross standing at its head, on a foot.
    { geometry: new BoxGeometry(0.3, 0.08, 0.2), colour: 'rock', at: [0, 0.04, -0.46] },
    ...latinCross(0.56, 0.34, [0.09, 0.08], [0, 0.08, -0.46], 'limestone'),
  ]
}

/** The candidates tried for the deaths' icon: one stone cut with each faith's sign, then two other graves. */
export const TOMB_CANDIDATES: readonly TombCandidate[] = [
  {
    letter: 'A',
    idea: 'pierre dressée, croix gravée (chrétien)',
    parts: tombParts,
  },
  { letter: 'B', idea: 'croissant gravé (musulman)', parts: () => engraved(crescentSign()) },
  { letter: 'C', idea: 'étoile gravée (juif)', parts: () => engraved(starSign()) },
  { letter: 'D', idea: 'croix de pierre sur deux marches', parts: standingCrossParts },
  { letter: 'E', idea: 'dalle couchée, sa croix, une petite croix à la tête', parts: graveParts },
]
