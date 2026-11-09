/**
 * Every overlap of a year at once — what the atlas hatches (ATLAS-399), from the very computation the Cartographer
 * hatches with (CARTO-364, `overlaps`). The Cartographer keeps its own cache, recomputing only what a gesture moved; the
 * atlas reads a year whole, once, so it computes every shape and every pair here.
 *
 * **A shape or a pair the geometry refuses is skipped, and handed back** — the dev's rule for the same computation in the
 * Cartographer (2026-11-06): the pair left unhatched, and said. Here the caller says it, on the thread it runs on.
 *
 * Measured 2026-11-09 on the working copies: 1100, 25 overlaps; 1200, 16; ~1.3 s a year.
 */

import { addOverlap, overlapCandidates, pairOverlap, polityShape } from './overlaps'

import type { Overlap, PolityShape } from './overlaps'
import type { YearDocument } from './yearDocument'

/** One refusal of the geometry, said by the caller. */
export interface OverlapRefusal {
  /** The polity, or the first of the pair. */
  readonly a: string
  /** The second of the pair; `null` when the refusal is the shape of `a` alone, whose overlaps then all go unhatched. */
  readonly b: string | null
  /** What the geometry said. */
  readonly reason: string
}

/** A year's overlaps, and what the geometry refused on the way. */
export interface YearOverlaps {
  /** The pieces of ground two polities or more cover, none sharing ground with another. */
  readonly pieces: Overlap[]
  /** The shapes and pairs left unhatched because the geometry refused them. */
  readonly refused: OverlapRefusal[]
}

/**
 * The message of what was thrown.
 * @param error - what was thrown
 * @returns its message
 */
function reasonOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Every polity's shape, the refused ones handed back.
 * @param document - the year
 * @param refused - where a refusal is written
 * @returns the shapes of the polities that enclose ground
 */
function shapesOf(document: YearDocument, refused: OverlapRefusal[]): PolityShape[] {
  const shapes: PolityShape[] = []
  for (const { id } of document.polities) {
    try {
      const shape = polityShape(document, id)
      if (shape !== null) shapes.push(shape)
    } catch (error) {
      refused.push({ a: id, b: null, reason: reasonOf(error) })
    }
  }
  return shapes
}

/**
 * Every overlap of a year: each pair of polities that may share ground intersected, each share cut against the
 * pieces before it, so three polities over one ground come out as one piece of three.
 * @param document - the year
 * @returns the pieces, and the shapes and pairs the geometry refused
 */
export function yearOverlaps(document: YearDocument): YearOverlaps {
  const refused: OverlapRefusal[] = []
  let pieces: Overlap[] = []
  for (const [a, b] of overlapCandidates(document, shapesOf(document, refused))) {
    try {
      const area = pairOverlap(a, b)
      if (area.length > 0)
        pieces = addOverlap(document, pieces, { polities: [a.polity, b.polity], area })
    } catch (error) {
      refused.push({ a: a.polity, b: b.polity, reason: reasonOf(error) })
    }
  }
  return { pieces, refused }
}
