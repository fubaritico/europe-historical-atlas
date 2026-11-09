/**
 * Documents whose polities are squares of ground, to overlap on purpose (ATLAS-399).
 */

import { createYearDocument } from '../yearDocument'

import type { YearDocument } from '../yearDocument'

/** A square: its west edge, its south edge and its side, in degrees. */
export type Square = readonly [west: number, south: number, side: number]

/** One polity of a fixture: its id, its square, its colour, and its suzerain if it has one. */
export interface SquarePolity {
  /** Its id. */
  readonly id: string
  /** Its ground. */
  readonly square: Square
  /** Its colour, `#rrggbb`. */
  readonly colour: string
  /** Its suzerain, if any. */
  readonly suzerain?: string
}

/**
 * A document of square polities, each claiming its own four anchors.
 * @param polities - the polities, in registry order
 * @returns the document
 */
export function squaresDocument(polities: readonly SquarePolity[]): YearDocument {
  const document = createYearDocument(1100)
  for (const { id, square, colour, suzerain } of polities) {
    const [west, south, side] = square
    const from = document.anchors.length
    document.anchors.push(
      [west, south],
      [west + side, south],
      [west + side, south + side],
      [west, south + side]
    )
    document.anchorSource.push(0, 0, 0, 0)
    document.polities.push({
      id,
      name: id,
      rank: 'kingdom',
      status: 'country',
      suzerain: suzerain ?? null,
      existsFrom: null,
      existsTo: null,
      colour,
      wikidata: null,
    })
    document.claims.push({ polity: id, rings: [[from, from + 1, from + 2, from + 3]] })
  }
  return document
}

/** Two kingdoms overlapping on a band one degree wide — the dev's test1 and test2 of 2026-11-09. */
export const TWO_OVERLAPPING: readonly SquarePolity[] = [
  { id: 'test1', square: [0, 40, 2], colour: '#ff2000' },
  { id: 'test2', square: [1, 40, 2], colour: '#2040ff' },
]
