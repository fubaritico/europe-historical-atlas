/**
 * A name's candidates in one piece, and the one chosen (ATLAS-301): the dev's algorithm, 2026-10-28 — *« on
 * collecte, on teste, on compare et on affiche »*.
 *
 * **Collected**: three lines — the gentle arc through the middle along the space's length (`nameArc`), the
 * horizontal through its centre of mass, and the spine of its thickest part (`nameLine`'s ridge) — each keeping the
 * margin to the borders, and each spilling over them by the overflow allowed, carried on past its ends by as much
 * (the dev, 2026-10-28: *« un texte peut dépasser un peu de sa zone »*) — and the horizontal on two lines too. **Tested**: the largest size each
 * holds (`nameFit`). **Compared**: by their score (`nameChoice`), the smallest size ruled out.
 */

import { axisArc, spaceShape } from './nameArc'
import { scoreName, slantOf } from './nameChoice'
import { largestSize, lineLength, pointAlong, ridgeFit } from './nameFit'
import { MAX_BEND, extendLine, horizontalLine } from './nameLine'

import type { SpaceShape } from './nameArc'
import type { NameWeights } from './nameChoice'
import type { Fitting, NameExtent } from './nameFit'
import type { NameLine } from './nameLine'

/** The line a name is set on, its size, and whether it is broken over two lines. */
export interface ChosenLine {
  /** The line, in the piece's crop. */
  readonly line: NameLine
  /** The size, in cells. */
  readonly size: number
  /** Whether the name is broken over two lines. */
  readonly broken: boolean
}

/** One candidate, measured. */
interface Candidate extends ChosenLine {
  /** Whether it keeps the margin to the borders — otherwise it may spill over them. */
  readonly withMargin: boolean
}

/** What a choice reads: the name's extents, the margin, the smallest size and the weights. */
export interface ChoiceInput {
  /** The name on one line, at a size of one. */
  readonly one: NameExtent
  /** The name broken over two lines, as one block — `null` for a name of one word. */
  readonly two: NameExtent | null
  /** The margin to the borders, in cells, when a candidate keeps it. */
  readonly margin: number
  /** How far the letters may spill over the borders, in cells, when a candidate does — `0`, up to them. */
  readonly overflow: number
  /** The smallest size worth writing, in cells. */
  readonly minSize: number
  /** The largest size written, in cells: a candidate that holds more is written at this. */
  readonly maxSize: number
  /** How much each criterion weighs. */
  readonly weights: NameWeights
}

/**
 * Every candidate of a name in a piece, measured.
 * @param fitting - the piece and its distances
 * @param input - the name's extents and the margin
 * @returns the candidates, sized; a line the piece gives none of is left out
 */
function collect(fitting: Fitting, input: ChoiceInput): Candidate[] {
  const { space, distances } = fitting
  const horizontal = horizontalLine(space.mask, distances, space.width)
  const lines = [
    axisArc(space.mask, space.width),
    horizontal,
    ridgeFit(fitting, input.one, input.margin)?.line ?? null,
  ]
  const candidates: Candidate[] = []
  for (const withMargin of [true, false]) {
    const margin = withMargin ? input.margin : -input.overflow
    const reach = (line: NameLine): NameLine =>
      withMargin ? line : extendLine(line, input.overflow)
    for (const line of lines) {
      if (line === null) continue
      const along = reach(line)
      const size = Math.min(input.maxSize, largestSize(fitting, along, input.one, margin))
      candidates.push({ line: along, size, broken: false, withMargin })
    }
    if (input.two !== null) {
      const along = reach(horizontal)
      const size = Math.min(input.maxSize, largestSize(fitting, along, input.two, margin))
      candidates.push({ line: along, size, broken: true, withMargin })
    }
  }
  return candidates
}

/**
 * A line's bend: the turn from its first step to its last, over the most a line may bend.
 * @param line - the line
 * @returns `0` straight, `1` at the most
 */
function bendOf(line: NameLine): number {
  const first = pointAlong(line, 0).angle
  const last = pointAlong(line, lineLength(line)).angle
  const turn = Math.abs(Math.atan2(Math.sin(last - first), Math.cos(last - first)))
  return Math.min(1, turn / MAX_BEND)
}

/**
 * A candidate's score.
 * @param candidate - the candidate
 * @param shape - the piece's centre, length and reach
 * @param input - the name's extent and the weights
 * @param largest - the largest size any candidate of the piece holds
 * @returns the score
 */
function scoreOf(
  candidate: Candidate,
  shape: SpaceShape,
  input: ChoiceInput,
  largest: number
): number {
  const middle = pointAlong(candidate.line, lineLength(candidate.line) / 2)
  const extent = candidate.broken && input.two !== null ? input.two : input.one
  return scoreName(
    {
      size: candidate.size,
      offCentre:
        Math.hypot(middle.x - shape.centre[0], middle.y - shape.centre[1]) /
        Math.max(1, shape.reach),
      cover: (extent.length * candidate.size) / Math.max(1, shape.length),
      bend: bendOf(candidate.line),
      slant: slantOf(middle.angle),
      touchesBorder: !candidate.withMargin,
      twoLines: candidate.broken,
    },
    largest,
    input.weights
  )
}

/**
 * The best line for a name in a piece.
 * @param fitting - the piece and its distances
 * @param input - the name's extents, the margin, the smallest size and the weights
 * @returns the chosen line and size, or `null` when no candidate reaches the smallest size
 */
export function chooseLine(fitting: Fitting, input: ChoiceInput): ChosenLine | null {
  const candidates = collect(fitting, input).filter(({ size }) => size > 0 && size >= input.minSize)
  if (candidates.length === 0) return null
  const shape = spaceShape(fitting.space.mask, fitting.space.width)
  const largest = Math.max(...candidates.map(({ size }) => size))
  let best: Candidate | null = null
  let bestScore = -Infinity
  for (const candidate of candidates) {
    const score = scoreOf(candidate, shape, input, largest)
    if (score > bestScore) {
      best = candidate
      bestScore = score
    }
  }
  return best === null ? null : { line: best.line, size: best.size, broken: best.broken }
}
