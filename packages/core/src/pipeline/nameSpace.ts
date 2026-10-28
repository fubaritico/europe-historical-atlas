/**
 * The space a name is written in: an owner's largest piece of a grid (ATLAS-301,
 * `files/plans/atlas/country-names.md`, « the space »).
 *
 * **An owner** is whoever wears a colour at the display level being named — the caller resolves each cell
 * to it (a polity, or its suzerain from afar, through `editor/homageLevels`). So the space of a suzerain
 * whose vassals are shown is what is left to it, with nothing computed here: its vassals' cells already
 * carry their own owner.
 *
 * **A polity in pieces** — islands, exclaves — is named in its largest, counted in cells. Pieces touch by a
 * side, never by a corner only: no name passes through a pinch one cell wide anyway.
 */

import { readAt } from '../utils/math'

/** One owner's largest piece, cropped from the grid with a ring of outside cells around it. */
export interface NameSpace {
  /** The column of the grid the crop's column 0 stands on — one left of the piece, so may be `-1`. */
  readonly left: number
  /** The row of the grid the crop's row 0 stands on — one above the piece, so may be `-1`. */
  readonly top: number
  /** The crop's width in cells, the piece's plus two. */
  readonly width: number
  /** The crop's height in cells, the piece's plus two. */
  readonly height: number
  /** Row-major over the crop, `1` on the piece and `0` everywhere else — its first and last rows and columns always. */
  readonly mask: Uint8Array
  /** How many cells the piece holds. */
  readonly cells: number
}

/** One piece found by the flood: whose it is, how big, and its box. */
interface Piece {
  /** The owner whose cells these are. */
  readonly owner: number
  /** How many cells. */
  cells: number
  /** The westmost column. */
  minX: number
  /** The eastmost column. */
  maxX: number
  /** The northmost row. */
  minY: number
  /** The southmost row. */
  maxY: number
}

/** A grid of owners, as the flood reads it. */
interface OwnerGrid {
  /** Row-major, the owner of each cell, negative for none. */
  readonly owners: ArrayLike<number>
  /** The grid's width in cells. */
  readonly width: number
  /** The grid's height in cells. */
  readonly height: number
}

/**
 * The cells sharing a side with a cell, inside the grid.
 * @param at - the cell
 * @param grid - the grid's size
 * @returns their indices
 */
function sides(at: number, grid: OwnerGrid): number[] {
  const { width, height } = grid
  const x = at % width
  const y = (at - x) / width
  const next: number[] = []
  if (x > 0) next.push(at - 1)
  if (x < width - 1) next.push(at + 1)
  if (y > 0) next.push(at - width)
  if (y < height - 1) next.push(at + width)
  return next
}

/**
 * Label every cell of one piece, from one of its cells, and measure the piece.
 * @param grid - the grid
 * @param start - a cell of the piece, not labelled yet
 * @param id - the piece's label
 * @param label - each cell's piece, `-1` where none yet — written
 * @returns the piece
 */
function flood(grid: OwnerGrid, start: number, id: number, label: Int32Array): Piece {
  const owner = readAt(grid.owners, start)
  const piece: Piece = { owner, cells: 0, minX: grid.width, maxX: -1, minY: grid.height, maxY: -1 }
  const stack = [start]
  label[start] = id
  for (let at = stack.pop(); at !== undefined; at = stack.pop()) {
    const x = at % grid.width
    const y = (at - x) / grid.width
    piece.cells += 1
    piece.minX = Math.min(piece.minX, x)
    piece.maxX = Math.max(piece.maxX, x)
    piece.minY = Math.min(piece.minY, y)
    piece.maxY = Math.max(piece.maxY, y)
    for (const next of sides(at, grid)) {
      if (label[next] !== -1 || grid.owners[next] !== owner) continue
      label[next] = id
      stack.push(next)
    }
  }
  return piece
}

/**
 * A piece cut out of the grid, with its ring of outside cells.
 * @param piece - the piece
 * @param id - its label
 * @param label - each cell's piece
 * @param width - the grid's width
 * @returns its space
 */
function cropOf(piece: Piece, id: number, label: Int32Array, width: number): NameSpace {
  const left = piece.minX - 1
  const top = piece.minY - 1
  const cropWidth = piece.maxX - piece.minX + 3
  const cropHeight = piece.maxY - piece.minY + 3
  const mask = new Uint8Array(cropWidth * cropHeight)
  for (let y = piece.minY; y <= piece.maxY; y += 1)
    for (let x = piece.minX; x <= piece.maxX; x += 1)
      if (label[y * width + x] === id) mask[(y - top) * cropWidth + (x - left)] = 1
  return { left, top, width: cropWidth, height: cropHeight, mask, cells: piece.cells }
}

/**
 * The largest piece of every owner of a grid.
 *
 * The crop's ring of outside cells is what makes the frame of the map count as a border: a piece that
 * touches the grid's edge has outside cells beyond it, so a name keeps its margin from the edge too.
 * @param owners - row-major, the owner of each cell, any negative value for none (the sea, unclaimed land)
 * @param width - the grid's width in cells
 * @param height - the grid's height in cells
 * @returns each owner's largest piece, by owner; the first found on a tie
 * @throws when the grid's size is not `width × height`
 */
export function largestPieces(
  owners: ArrayLike<number>,
  width: number,
  height: number
): Map<number, NameSpace> {
  if (owners.length !== width * height)
    throw new Error(
      `[atlas] a grid of ${String(owners.length)} cells is not ${String(width)} × ${String(height)}`
    )
  const grid: OwnerGrid = { owners, width, height }
  const label = new Int32Array(width * height).fill(-1)
  const largest = new Map<number, { piece: Piece; id: number }>()
  let id = 0
  for (let start = 0; start < width * height; start += 1) {
    if (readAt(owners, start) < 0 || label[start] !== -1) continue
    const piece = flood(grid, start, id, label)
    const best = largest.get(piece.owner)
    if (best === undefined || piece.cells > best.piece.cells)
      largest.set(piece.owner, { piece, id })
    id += 1
  }

  const spaces = new Map<number, NameSpace>()
  for (const [owner, { piece, id: pieceId }] of largest)
    spaces.set(owner, cropOf(piece, pieceId, label, width))
  return spaces
}
