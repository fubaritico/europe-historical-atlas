/**
 * The spaces a name is written in: each piece of an owner's cells on a grid (ATLAS-301,
 * `files/plans/atlas/country-names.md`, « the space »).
 *
 * **An owner** is whoever wears a colour at the display level being named — the caller resolves each cell
 * to it (a polity, or its suzerain from afar, through `editor/homageLevels`). So the space of a suzerain
 * whose vassals are shown is what is left to it, with nothing computed here: its vassals' cells already
 * carry their own owner.
 *
 * **A polity in pieces** — islands, exclaves — is named in every piece the name fits in (the dev, 2026-10-28;
 * its largest only, until then). Pieces touch by a side, never by a corner only: no name passes through a
 * pinch one cell wide anyway.
 */

import { readAt } from '../utils/math'

/** One piece of an owner's cells, cropped from the grid with a ring of outside cells around it — at least one cell wide. */
export interface NameSpace {
  /** The column of the grid the crop's column 0 stands on — the ring's width left of the piece, so may be negative. */
  readonly left: number
  /** The row of the grid the crop's row 0 stands on — the ring's width above the piece, so may be negative. */
  readonly top: number
  /** The crop's width in cells, the piece's plus the ring either side. */
  readonly width: number
  /** The crop's height in cells, the piece's plus the ring either side. */
  readonly height: number
  /** Row-major over the crop, `1` on the piece and `0` everywhere else — its first and last rows and columns always. */
  readonly mask: Uint8Array
  /**
   * Row-major over the crop, what a name may not cover freely: `1` on another owner's cell and past the grid's frame,
   * which a name may bite into by a little (the dev, 2026-10-29: *« faudrait quand même que ça puisse chevaucher un
   * petit peu entre voisins »*); `2` on another piece's name, which it never covers (`nameOccupancy`); `0` on the
   * piece, the sea and unclaimed land.
   */
  readonly blocked: Uint8Array
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

/** Where a crop stands on the grid, and its size. */
interface CropFrame {
  /** The grid's column of the crop's column 0. */
  readonly left: number
  /** The grid's row of the crop's row 0. */
  readonly top: number
  /** The crop's width in cells. */
  readonly width: number
  /** The crop's height in cells. */
  readonly height: number
}

/**
 * The cells of a crop a name may never reach: another owner's, and those past the grid's frame.
 * @param owner - the piece's owner
 * @param grid - the grid
 * @param frame - where the crop stands
 * @returns row-major over the crop, `1` where blocked
 */
function blockedAround(owner: number, grid: OwnerGrid, frame: CropFrame): Uint8Array {
  const blocked = new Uint8Array(frame.width * frame.height)
  for (let y = 0; y < frame.height; y += 1)
    for (let x = 0; x < frame.width; x += 1) {
      const gx = x + frame.left
      const gy = y + frame.top
      const inGrid = gx >= 0 && gy >= 0 && gx < grid.width && gy < grid.height
      const other = inGrid ? readAt(grid.owners, gy * grid.width + gx) : owner
      if (!inGrid || (other >= 0 && other !== owner)) blocked[y * frame.width + x] = 1
    }
  return blocked
}

/**
 * A piece cut out of the grid, with its ring of outside cells.
 * @param piece - the piece
 * @param id - its label
 * @param label - each cell's piece
 * @param grid - the grid
 * @param ring - the ring's width, in cells
 * @returns its space
 */
function cropOf(
  piece: Piece,
  id: number,
  label: Int32Array,
  grid: OwnerGrid,
  ring: number
): NameSpace {
  const { width } = grid
  const left = piece.minX - ring
  const top = piece.minY - ring
  const cropWidth = piece.maxX - piece.minX + 1 + 2 * ring
  const cropHeight = piece.maxY - piece.minY + 1 + 2 * ring
  const mask = new Uint8Array(cropWidth * cropHeight)
  for (let y = piece.minY; y <= piece.maxY; y += 1)
    for (let x = piece.minX; x <= piece.maxX; x += 1)
      if (label[y * width + x] === id) mask[(y - top) * cropWidth + (x - left)] = 1
  const frame = { left, top, width: cropWidth, height: cropHeight }
  return { ...frame, mask, blocked: blockedAround(piece.owner, grid, frame), cells: piece.cells }
}

/**
 * Every piece of every owner of a grid, each cropped as a space.
 *
 * The crop's ring of outside cells is what makes the frame of the map count as a border: a piece that
 * touches the grid's edge has outside cells beyond it, so a name keeps its margin from the edge too.
 * @param owners - row-major, the owner of each cell, any negative value for none (the sea, unclaimed land)
 * @param width - the grid's width in cells
 * @param height - the grid's height in cells
 * @param ring - the width of the ring of outside cells around each piece: one, or as wide as a name may spill over
 *   its borders (`nameFit`), so the distances outside are read within the crop
 * @returns each owner's pieces, by owner, the largest first — the first found first on a tie
 * @throws when the grid's size is not `width × height`, or the ring is not a whole number of cells, one at least
 */
export function ownerPieces(
  owners: ArrayLike<number>,
  width: number,
  height: number,
  ring = 1
): Map<number, NameSpace[]> {
  if (!Number.isInteger(ring) || ring < 1)
    throw new Error(`[atlas] a ring of ${String(ring)} cells: one whole cell at least`)
  if (owners.length !== width * height)
    throw new Error(
      `[atlas] a grid of ${String(owners.length)} cells is not ${String(width)} × ${String(height)}`
    )
  const grid: OwnerGrid = { owners, width, height }
  const label = new Int32Array(width * height).fill(-1)
  const spaces = new Map<number, NameSpace[]>()
  let id = 0
  for (let start = 0; start < width * height; start += 1) {
    if (readAt(owners, start) < 0 || label[start] !== -1) continue
    const piece = flood(grid, start, id, label)
    const space = cropOf(piece, id, label, grid, ring)
    const held = spaces.get(piece.owner)
    if (held === undefined) spaces.set(piece.owner, [space])
    else held.push(space)
    id += 1
  }
  // A stable sort: equal pieces keep the order the flood found them in.
  for (const held of spaces.values()) held.sort((a, b) => b.cells - a.cells)
  return spaces
}
