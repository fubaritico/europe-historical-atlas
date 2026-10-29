/**
 * The space a name is written in (ATLAS-301, `files/plans/atlas/country-names.md`): a realm of an owner's cells, cropped
 * from the grid with a ring of cells around it — the contract `nameRealm` builds, and `nameFit`, `nameOccupancy` and
 * `nameConstruction` read.
 *
 * **An owner** is whoever wears a colour at the display level being named — the caller resolves each cell to it (a
 * polity, or its suzerain from afar, through `editor/homageLevels`). So the space of a suzerain whose vassals are shown
 * is what is left to it, with nothing computed here: its vassals' cells already carry their own owner.
 */

import { readAt } from '../utils/math'

/** A realm of an owner's cells, cropped from the grid with a ring of cells around it — at least one cell wide. */
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

/** A grid of owners, as a realm's neighbours are read from it. */
export interface OwnerGrid {
  /** Row-major, the owner of each cell, negative for none. */
  readonly owners: ArrayLike<number>
  /** The grid's width in cells. */
  readonly width: number
  /** The grid's height in cells. */
  readonly height: number
}

/** Where a crop stands on the grid, and its size. */
export interface CropFrame {
  /** The grid's column of the crop's column 0. */
  readonly left: number
  /** The grid's row of the crop's row 0. */
  readonly top: number
  /** The crop's width in cells. */
  readonly width: number
  /** The crop's height in cells. */
  readonly height: number
}

/** What a neighbour's cell, or one past the grid's frame, reads as in a space's `blocked`. */
export const NEIGHBOUR = 1

/** What a cell another piece's name covers reads as in a space's `blocked` (`nameOccupancy`) — never covered again. */
export const COVERED = 2

/**
 * The cells of a crop a name may never reach: another owner's, and those past the grid's frame.
 * @param owner - the piece's owner
 * @param grid - the grid
 * @param frame - where the crop stands
 * @returns row-major over the crop, {@link NEIGHBOUR} where blocked
 */
export function blockedAround(owner: number, grid: OwnerGrid, frame: CropFrame): Uint8Array {
  const blocked = new Uint8Array(frame.width * frame.height)
  for (let y = 0; y < frame.height; y += 1)
    for (let x = 0; x < frame.width; x += 1) {
      const gx = x + frame.left
      const gy = y + frame.top
      const inGrid = gx >= 0 && gy >= 0 && gx < grid.width && gy < grid.height
      const other = inGrid ? readAt(grid.owners, gy * grid.width + gx) : owner
      if (!inGrid || (other >= 0 && other !== owner)) blocked[y * frame.width + x] = NEIGHBOUR
    }
  return blocked
}
