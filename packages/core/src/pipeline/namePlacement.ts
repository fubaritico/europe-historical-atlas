/**
 * Where each country's name is written, and how large (ATLAS-301, `files/plans/atlas/country-names.md`):
 * inside the space it occupies, **as large as that space allows**, with a margin to its borders, along a
 * line that follows its shape.
 *
 * **Worked on a grid, not on outlines** (the dev's call, 2026-10-28). One distance field answers all of it:
 * the margin is a distance to keep, the most inner point is the farthest cell, and a name fits when every
 * point of its line lies at least half a letter's height plus the margin from the outside. The precision is
 * a cell — a few kilometres, invisible at a country's scale.
 *
 * **No two names can overlap, by construction**: each stays inside its own owner's space, and no cell has
 * two owners. The collision pass the plan planned has nothing to do.
 *
 * **The text is measured by whoever calls**: `core` has no canvas, so the advances of the letters come
 * through {@link MeasureName} — `CanvasRenderingContext2D.measureText` in the atlas, fixed widths in tests.
 */

import { distanceToOutside } from '../geo/distanceTransform'
import { readAt } from '../utils/math'

import { horizontalLine, innermostCell, ridgeLine } from './nameLine'
import { largestPieces } from './nameSpace'

import type { NameLine } from './nameLine'
import type { NameSpace } from './nameSpace'

/** A name's letters measured at a font size of one, in whatever unit the grid's cells are drawn at. */
export interface NameMetrics {
  /** Each letter's advance — its width plus the spacing after it — in the order of the text's code points. */
  readonly advances: readonly number[]
  /** The letters' height, top of the capitals to the baseline (or to the descenders, if the caller wants room for them). */
  readonly height: number
}

/**
 * Measure a name at a font size of one.
 * @param text - the name, as it will be written
 * @returns its letters' advances and height
 */
export type MeasureName = (text: string) => NameMetrics

/** One name to place: the owner whose space it goes in, and its text. */
export interface NameRequest {
  /** The owner, as the grid writes it. */
  readonly owner: number
  /** The name, as it will be written. */
  readonly text: string
}

/** What every name keeps to, in cells of the grid. */
export interface NamePlacementOptions {
  /** The least room between a letter and its space's edge — a border, the coast or the map's frame. */
  readonly margin: number
  /** The smallest font size worth writing; a name that only fits smaller is left for a closer zoom. */
  readonly minSize: number
}

/** One letter placed: its centre on the line, and the line's direction there. */
export interface PlacedGlyph {
  /** Column of the grid, a cell's centre at its integer index. */
  readonly x: number
  /** Row of the grid, `y` downward. */
  readonly y: number
  /** The line's direction under the letter, radians from `+x` towards `+y`. */
  readonly angle: number
}

/** A name written: its owner, its size and every letter's place. */
export interface PlacedName {
  /** Whose name it is. */
  readonly owner: number
  /** The name. */
  readonly text: string
  /** The font size, in cells. */
  readonly size: number
  /** Each letter's place, one per code point of the text, in reading order. */
  readonly glyphs: readonly PlacedGlyph[]
}

/** The names of one display level. */
export interface NamePlacement {
  /** The names written, largest first. */
  readonly placed: readonly PlacedName[]
  /** The owners whose name fits only under `minSize` — left for a closer zoom. */
  readonly tooSmall: readonly number[]
  /**
   * The owners asked for with no cell on the grid: not shown at this level — a vassal seen from afar — or an
   * owner the caller got wrong. Returned rather than logged, since the first is ordinary at every zoom: the
   * caller, which knows which owners it expects, tells the two apart.
   */
  readonly absent: readonly number[]
}

/**
 * The thicknesses of the space the ridge is walked through, as fractions of its thickest point: a thin
 * threshold lets the line run long, a thick one keeps it where the letters can be tall. Each gives a
 * candidate and the largest name wins.
 */
const RIDGE_THRESHOLDS = [0.25, 0.5, 0.75] as const

/**
 * How much smaller the horizontal may be than the best curved line and still be chosen. A map writes a name
 * straight when the shape allows, and bends it only when the bend is worth it: in a round space every
 * direction gives nearly the same size, and the straight one is the one to read.
 */
export const HORIZONTAL_PREFERENCE = 0.9

/** How many halvings the search for the size makes — far past a cell's precision. */
const SIZE_HALVINGS = 40

/**
 * A distance read between the cells' centres, linearly in both directions.
 * @param distances - each cell's distance to the outside, row-major
 * @param width - the crop's width
 * @param height - the crop's height
 * @param x - the column
 * @param y - the row
 * @returns the distance there
 */
function distanceAt(
  distances: Float32Array,
  width: number,
  height: number,
  x: number,
  y: number
): number {
  const cx = Math.min(width - 1, Math.max(0, x))
  const cy = Math.min(height - 1, Math.max(0, y))
  const x0 = Math.min(width - 2, Math.floor(cx))
  const y0 = Math.min(height - 2, Math.floor(cy))
  const fx = cx - x0
  const fy = cy - y0
  const at = (col: number, row: number): number => readAt(distances, row * width + col)
  return (
    at(x0, y0) * (1 - fx) * (1 - fy) +
    at(x0 + 1, y0) * fx * (1 - fy) +
    at(x0, y0 + 1) * (1 - fx) * fy +
    at(x0 + 1, y0 + 1) * fx * fy
  )
}

/** A place on a line: a point, and the line's direction there. */
interface LinePlace {
  /** The column, in the crop's cells. */
  readonly x: number
  /** The row, `y` downward. */
  readonly y: number
  /** The line's direction, radians from `+x` towards `+y`. */
  readonly angle: number
}

/**
 * The point a length along a line reaches, and the line's direction there.
 * @param line - the line
 * @param length - the length walked, in cells
 * @returns the point and the direction of the segment it lies on
 */
function pointAlong(line: NameLine, length: number): LinePlace {
  const { points, lengths } = line
  let i = 0
  while (i < lengths.length - 2 && readAt(lengths, i + 1) < length) i += 1
  const a = points[i]
  const b = points[i + 1]
  // `sampled` gives every line two points at least and one length per point: a miss is a line built wrong.
  if (a === undefined || b === undefined)
    throw new Error(
      `[atlas] a name line of ${String(points.length)} points has none at ${String(i)}`
    )
  const span = readAt(lengths, i + 1) - readAt(lengths, i)
  const f = span > 0 ? Math.min(1, Math.max(0, (length - readAt(lengths, i)) / span)) : 0
  return {
    x: a[0] + (b[0] - a[0]) * f,
    y: a[1] + (b[1] - a[1]) * f,
    angle: Math.atan2(b[1] - a[1], b[0] - a[0]),
  }
}

/** A space prepared for fitting: its crop and its distances. */
interface Fitting {
  readonly space: NameSpace
  readonly distances: Float32Array
}

/**
 * How far apart the points read across a letter's height are, in cells. The same spacing as along the line
 * (`nameLine`'s step), chosen on its own: the two samplings answer different questions and may part.
 */
const CROSS_STEP = 0.5

/** How far a cell's centre lies inside its own edge, in cells: a distance between centres less this is a distance to the edge. */
const HALF_CELL = 0.5

/**
 * Whether the cross-section of the letters at one place on the line keeps clear of the space's edge: every
 * point from the letters' foot to their top, across the line, at least `margin` from it.
 * @param fitting - the space and its distances
 * @param place - the point on the line, and the line's direction there
 * @param half - half the letters' height at the size tried, in cells
 * @param margin - the room to keep, in cells
 * @returns whether it keeps clear
 */
function crossClear(fitting: Fitting, place: LinePlace, half: number, margin: number): boolean {
  const { distances, space } = fitting
  // The letters' up: the line's direction turned a quarter towards the top of the page.
  const ux = Math.sin(place.angle)
  const uy = -Math.cos(place.angle)
  const count = Math.max(1, Math.ceil((2 * half) / CROSS_STEP))
  for (let i = 0; i <= count; i += 1) {
    const t = -half + (2 * half * i) / count
    const x = place.x + t * ux
    const y = place.y + t * uy
    if (distanceAt(distances, space.width, space.height, x, y) - HALF_CELL < margin) return false
  }
  return true
}

/**
 * Whether a name of a size fits along a line, centred on it.
 *
 * It fits when the box the letters fill along the line keeps `margin` from the space's edge: across the line
 * at both ends of the name and at every point of the line in between, from the letters' foot to their top.
 * A point's distance to the **edge** is its distance to the nearest outside cell's centre less half a cell.
 * @param fitting - the space and its distances
 * @param line - the line
 * @param metrics - the name's length and its letters' height, at a size of one
 * @param size - the size tried
 * @param margin - the room to keep, in cells
 * @returns whether it fits
 */
function fits(
  fitting: Fitting,
  line: NameLine,
  metrics: NameExtent,
  size: number,
  margin: number
): boolean {
  const total = lineLength(line)
  const length = metrics.length * size
  if (length > total) return false
  const start = (total - length) / 2
  const end = start + length
  const half = (metrics.height * size) / 2
  const places = [start, ...line.lengths.filter((walked) => walked > start && walked < end), end]
  return places.every((walked) => crossClear(fitting, pointAlong(line, walked), half, margin))
}

/**
 * A line's length.
 * @param line - the line
 * @returns the length walked to its last point, in cells
 */
function lineLength(line: NameLine): number {
  return readAt(line.lengths, line.lengths.length - 1)
}

/** A name's measure as the fit reads it: its length and its letters' height, at a size of one. */
interface NameExtent {
  /** The sum of its advances. */
  readonly length: number
  /** Its letters' height. */
  readonly height: number
}

/**
 * The largest size a name fits at along a line.
 *
 * Searched by halving between nothing and a size that cannot fit — longer than the line, or taller than the
 * crop — since a name that fits at a size fits at every smaller one.
 * @param fitting - the space and its distances
 * @param line - the line
 * @param extent - the name's length and height at a size of one
 * @param margin - the room to keep, in cells
 * @returns the size, `0` when nothing fits
 */
function largestSize(fitting: Fitting, line: NameLine, extent: NameExtent, margin: number): number {
  const { width, height } = fitting.space
  let high = Math.min(lineLength(line) / extent.length, Math.max(width, height) / extent.height)
  if (fits(fitting, line, extent, high, margin)) return high
  let low = 0
  for (let i = 0; i < SIZE_HALVINGS; i += 1) {
    const middle = (low + high) / 2
    if (fits(fitting, line, extent, middle, margin)) low = middle
    else high = middle
  }
  return low
}

/**
 * The best line for a name in a space, and the size it is written at there.
 * @param fitting - the space and its distances
 * @param extent - the name's length and height at a size of one
 * @param margin - the room to keep, in cells
 * @returns the line chosen and its size
 */
function bestLine(
  fitting: Fitting,
  extent: NameExtent,
  margin: number
): { line: NameLine; size: number } {
  const { space, distances } = fitting
  const straight = horizontalLine(space.mask, distances, space.width)
  const straightSize = largestSize(fitting, straight, extent, margin)
  const thickest = readAt(distances, innermostCell(distances))
  let curved: { line: NameLine; size: number } | null = null
  for (const fraction of RIDGE_THRESHOLDS) {
    const line = ridgeLine(distances, space.width, space.height, Math.max(1, thickest * fraction))
    if (line === null) continue
    const size = largestSize(fitting, line, extent, margin)
    if (curved === null || size > curved.size) curved = { line, size }
  }
  if (curved === null || straightSize >= curved.size * HORIZONTAL_PREFERENCE)
    return { line: straight, size: straightSize }
  return curved
}

/**
 * A name's measure, checked: one advance per code point, a positive height and a positive length.
 * @param request - the name
 * @param measure - the measure
 * @returns its advances, their sum and its height
 * @throws when the measure does not describe the text — a defect of the caller, said rather than drawn wrong
 */
function measured(
  request: NameRequest,
  measure: MeasureName
): { advances: readonly number[]; length: number; height: number } {
  const letters = Array.from(request.text).length
  if (letters === 0)
    throw new Error(`[atlas] owner ${String(request.owner)} has an empty name to place`)
  const { advances, height } = measure(request.text)
  if (advances.length !== letters)
    throw new Error(
      `[atlas] "${request.text}" has ${String(letters)} letters and was measured with ${String(advances.length)} advances`
    )
  const length = advances.reduce((sum, advance) => sum + advance, 0)
  if (!(length > 0) || !(height > 0))
    throw new Error(`[atlas] "${request.text}" was measured with no length or no height`)
  return { advances, length, height }
}

/**
 * Each letter's place along a line, the name centred on it, in the grid's cells.
 * @param line - the line, in the crop's cells
 * @param advances - each letter's advance at a size of one
 * @param size - the size the name is written at
 * @param space - the crop, whose offset brings the places back to the grid
 * @returns one place per letter, in reading order
 */
function layOut(
  line: NameLine,
  advances: readonly number[],
  size: number,
  space: NameSpace
): PlacedGlyph[] {
  const length = advances.reduce((sum, advance) => sum + advance, 0) * size
  let walked = (lineLength(line) - length) / 2
  return advances.map((advance) => {
    const centre = pointAlong(line, walked + (advance * size) / 2)
    walked += advance * size
    return { x: centre.x + space.left, y: centre.y + space.top, angle: centre.angle }
  })
}

/**
 * Place the names of one display level on a grid of owners.
 * @param owners - row-major, the owner of each cell at this level, any negative value for none
 * @param width - the grid's width in cells
 * @param height - the grid's height in cells
 * @param names - the names to place, one per owner at most
 * @param measure - measures a name at a font size of one
 * @param options - the margin and the smallest size, in cells
 * @returns the names written, largest first; the owners left for a closer zoom; the owners with no cell
 * @throws when the grid's size is not `width × height`, an owner is asked for twice — two names in one
 *   space would be laid on each other — or a name's measure does not describe its text
 */
export function placeNames(
  owners: ArrayLike<number>,
  width: number,
  height: number,
  names: readonly NameRequest[],
  measure: MeasureName,
  options: NamePlacementOptions
): NamePlacement {
  const asked = new Set<number>()
  for (const { owner } of names) {
    if (asked.has(owner))
      throw new Error(`[atlas] owner ${String(owner)} is asked for twice; one name per space`)
    asked.add(owner)
  }
  const spaces = largestPieces(owners, width, height)
  const placed: PlacedName[] = []
  const tooSmall: number[] = []
  const absent: number[] = []

  for (const request of names) {
    const space = spaces.get(request.owner)
    if (space === undefined) {
      absent.push(request.owner)
      continue
    }
    const metrics = measured(request, measure)
    const fitting: Fitting = {
      space,
      distances: distanceToOutside(space.mask, space.width, space.height),
    }
    const { line, size } = bestLine(fitting, metrics, options.margin)
    if (size < options.minSize || size <= 0) {
      tooSmall.push(request.owner)
      continue
    }

    const glyphs = layOut(line, metrics.advances, size, space)
    placed.push({ owner: request.owner, text: request.text, size, glyphs })
  }

  placed.sort((a, b) => b.size - a.size)
  return { placed, tooSmall, absent }
}
