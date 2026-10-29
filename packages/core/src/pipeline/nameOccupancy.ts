/**
 * The cells of a display level's grid the names already placed cover (ATLAS-301): what keeps two names from being written
 * over each other — the dev, 2026-10-29: *« il faudrait que ça ne se chevauche pas »*.
 *
 * Each name placed marks the cells its letters cover, half a cell wider for their white edge, with the tag of its piece.
 * A later name sees the cells of every **other** piece as covered (`nameSpace`'s `blocked`), never to be entered — a
 * neighbour's cells it may bite into a little, another name's not at all:
 * its size search keeps off them by itself, smaller or on another line. Its own piece's cells stay open, so a piece's
 * forms — its abbreviation, its short name, its full one, never shown at once — do not push each other out.
 */

import { readAt } from '../utils/math'

import type { NameSpace } from './nameSpace'

/** The cells covered so far, by the tag of the piece whose name covers them; `0` where none does. */
export interface NameOccupancy {
  /** The grid's width in cells. */
  readonly width: number
  /** The grid's height in cells. */
  readonly height: number
  /** Row-major, the tag of the piece whose name covers each cell, `0` for none. */
  readonly cells: Float64Array
}

/** What a cell another piece's name covers reads as in a space's `blocked` — never covered again. */
export const COVERED = 2

/** How many pieces one owner's tags leave room for: an owner's islands, every one named, stay far below it. */
const PIECES_PER_OWNER = 1 << 16

/** How far a name's mark reaches past its letters, in cells — the white edge drawn around them. */
const EDGE_ROOM = 0.5

/** How finely a letter's box is walked when its cells are marked, at most, in cells. */
const MARK_STEP = 0.5

/**
 * Points from one value to another, both ends included, no further apart than {@link MARK_STEP}.
 * @param from - the first
 * @param to - the last
 * @returns the points
 */
function steps(from: number, to: number): number[] {
  const count = Math.max(1, Math.ceil((to - from) / MARK_STEP))
  return Array.from({ length: count + 1 }, (_, i) => from + ((to - from) * i) / count)
}

/**
 * An empty occupancy over a grid.
 * @param width - the grid's width in cells
 * @param height - the grid's height in cells
 * @returns no cell covered
 */
export function createOccupancy(width: number, height: number): NameOccupancy {
  return { width, height, cells: new Float64Array(width * height) }
}

/**
 * The tag of one piece of one owner — never `0`, which stands for no name.
 * @param owner - the owner, `0` or more
 * @param piece - which of its pieces, `0` or more
 * @returns the tag
 */
export function pieceTag(owner: number, piece: number): number {
  return owner * PIECES_PER_OWNER + piece + 1
}

/**
 * A space with the cells other pieces' names cover added to what it may never reach.
 * @param space - the space, cropped from the grid
 * @param occupancy - the cells covered so far
 * @param tag - the space's own tag: the cells its own names cover stay open
 * @returns the space, its blocked cells widened; the space itself when no other name covers any of its crop
 */
export function withOccupied(space: NameSpace, occupancy: NameOccupancy, tag: number): NameSpace {
  let blocked: Uint8Array | null = null
  for (let y = 0; y < space.height; y += 1)
    for (let x = 0; x < space.width; x += 1) {
      if (!coveredByOther(occupancy, x + space.left, y + space.top, tag)) continue
      blocked ??= Uint8Array.from(space.blocked)
      blocked[y * space.width + x] = COVERED
    }
  return blocked === null ? space : { ...space, blocked }
}

/**
 * Whether a cell of the grid is covered by another piece's name.
 * @param occupancy - the cells covered so far
 * @param x - the cell's column, past the grid at times
 * @param y - its row
 * @param tag - the piece asking
 * @returns whether another piece's name covers it — never past the grid
 */
function coveredByOther(occupancy: NameOccupancy, x: number, y: number, tag: number): boolean {
  if (x < 0 || y < 0 || x >= occupancy.width || y >= occupancy.height) return false
  const covering = readAt(occupancy.cells, y * occupancy.width + x)
  return covering !== 0 && covering !== tag
}

/** A name placed, as its cells are marked: its letters, their places and their reach. */
export interface MarkedName {
  /** The name. */
  readonly text: string
  /** Each letter's advance, at a size of one, one per code point. */
  readonly advances: readonly number[]
  /** How far the letters reach above their baseline, at a size of one. */
  readonly ascent: number
  /** How far below. */
  readonly descent: number
  /** The size written at, in cells. */
  readonly size: number
  /** Each letter's place, in the grid's cells: the middle of its foot on the baseline, and its line's direction. */
  readonly glyphs: readonly { readonly x: number; readonly y: number; readonly angle: number }[]
}

/**
 * Mark the cells a name's letters cover, and their white edge, with its piece's tag. A space draws nothing and marks
 * nothing. Cells past the grid are left out.
 * @param occupancy - the cells covered so far — written
 * @param tag - the piece's tag
 * @param name - the name placed
 */
export function occupy(occupancy: NameOccupancy, tag: number, name: MarkedName): void {
  const letters = Array.from(name.text)
  name.glyphs.forEach((glyph, at) => {
    if (letters[at] === ' ') return
    const half = (readAt(name.advances, at) * name.size) / 2 + EDGE_ROOM
    const foot = -name.descent * name.size - EDGE_ROOM
    const top = name.ascent * name.size + EDGE_ROOM
    // Along the line, and the letters' up: the line turned a quarter towards the top of the page.
    const [dx, dy] = [Math.cos(glyph.angle), Math.sin(glyph.angle)]
    const [ux, uy] = [Math.sin(glyph.angle), -Math.cos(glyph.angle)]
    for (const along of steps(-half, half))
      for (const across of steps(foot, top)) {
        const x = Math.round(glyph.x + along * dx + across * ux)
        const y = Math.round(glyph.y + along * dy + across * uy)
        if (x >= 0 && y >= 0 && x < occupancy.width && y < occupancy.height)
          occupancy.cells[y * occupancy.width + x] = tag
      }
  })
}
