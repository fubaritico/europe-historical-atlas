/**
 * The places a country is named in: its realms (ATLAS-301, « The gap to the reference », axis C, 29/10).
 *
 * **A realm is the country's land with the narrow seas inside it**: its pieces parted by a strait no wider than
 * {@link RealmOptions.strait} are one place to name, as the reference maps name Byzantium once, across the Aegean, where
 * the grid saw five pieces. **A far piece is named only when it counts**: a realm smaller than
 * {@link RealmOptions.farShare} of the country's largest carries no name — Norway's islets, which the grid named one by
 * one (55 names on the fixture) — unless it is as large as a country in its own right ({@link RealmOptions.farCells}):
 * Norway's mainland, 11 299 cells, is under a fifth of the Greenland 1100 gives it, and larger than all of France.
 *
 * Each realm is cropped as a {@link NameSpace}: its land the mask, its neighbours blocked, the sea open — the name may
 * cross it.
 */

import { distanceToOutside } from '../geo/distanceTransform'
import { readAt } from '../utils/math'

import { blockedAround } from './nameSpace'

import type { NameSpace, OwnerGrid } from './nameSpace'

/** How a country's pieces are gathered into realms. */
export interface RealmOptions {
  /** The widest strait a realm spans, in cells: pieces parted by less are one realm. */
  readonly strait: number
  /** The smallest realm named, as a share of the country's largest, by land. */
  readonly farShare: number
  /** A realm of this many land cells is named whatever its share: as large as a country of its own. */
  readonly farCells: number
  /** The ring of cells kept around a realm's crop, past its land and its straits — where a name's letters may reach. */
  readonly ring: number
}

/** An owner's cells and their frame on the grid. */
interface OwnerCells {
  /** The cells, as indices of the grid. */
  readonly cells: number[]
  /** The westmost column. */
  minX: number
  /** The eastmost column. */
  maxX: number
  /** The northmost row. */
  minY: number
  /** The southmost row. */
  maxY: number
}

/**
 * Every owner's cells, gathered in one pass.
 * @param owners - row-major, the owner of each cell, negative for none
 * @param width - the grid's width
 * @returns each owner's cells and frame
 */
function cellsByOwner(owners: ArrayLike<number>, width: number): Map<number, OwnerCells> {
  const byOwner = new Map<number, OwnerCells>()
  for (let at = 0; at < owners.length; at += 1) {
    const owner = readAt(owners, at)
    if (owner < 0) continue
    const x = at % width
    const y = (at - x) / width
    let held = byOwner.get(owner)
    if (held === undefined) {
      held = { cells: [], minX: x, maxX: x, minY: y, maxY: y }
      byOwner.set(owner, held)
    }
    held.cells.push(at)
    held.minX = Math.min(held.minX, x)
    held.maxX = Math.max(held.maxX, x)
    held.minY = Math.min(held.minY, y)
    held.maxY = Math.max(held.maxY, y)
  }
  return byOwner
}

/** A realm found in an owner's crop: its land cells and its frame, in the crop's cells. */
interface Found {
  /** Its land cells, as indices of the crop. */
  readonly land: number[]
  /** The westmost column of its land and straits. */
  minX: number
  /** The eastmost. */
  maxX: number
  /** The northmost row. */
  minY: number
  /** The southmost. */
  maxY: number
}

/** An owner's crop: its frame on the grid, its land, and what a realm may span. */
interface Crop {
  /** The grid's column of the crop's column 0. */
  readonly left: number
  /** The grid's row of the crop's row 0. */
  readonly top: number
  /** Its width. */
  readonly width: number
  /** Its height. */
  readonly height: number
  /** `1` on the owner's land. */
  readonly land: Uint8Array
  /** `1` on its land and on the sea or unclaimed ground within half a strait of it — never a neighbour's cell. */
  readonly spanned: Uint8Array
}

/**
 * Whether a cell of the grid is open water or ground no one holds — past the grid's frame, never.
 * @param grid - the grid
 * @param x - the column
 * @param y - the row
 * @returns whether it is open
 */
function openAt(grid: OwnerGrid, x: number, y: number): boolean {
  const inGrid = x >= 0 && y >= 0 && x < grid.width && y < grid.height
  return inGrid && readAt(grid.owners, y * grid.width + x) < 0
}

/**
 * An owner's crop, its land and what its realms span.
 * @param grid - the grid
 * @param held - the owner's cells and frame
 * @param halfStrait - half the widest strait spanned, in cells: how far from its land the straits reach
 * @returns the crop
 */
function cropOf(grid: OwnerGrid, held: OwnerCells, halfStrait: number): Crop {
  const reach = Math.ceil(halfStrait)
  const left = held.minX - reach - 1
  const top = held.minY - reach - 1
  const width = held.maxX - held.minX + 1 + 2 * (reach + 1)
  const height = held.maxY - held.minY + 1 + 2 * (reach + 1)
  const land = new Uint8Array(width * height)
  for (const at of held.cells)
    land[(Math.floor(at / grid.width) - top) * width + (at % grid.width) - left] = 1
  // Each cell's distance to the owner's land: the straits are the open cells close enough to it.
  const toLand = distanceToOutside(
    land.map((cell) => 1 - cell),
    width,
    height
  )
  const spanned = land.map((cell, at) =>
    cell === 1 ||
    (readAt(toLand, at) <= halfStrait &&
      openAt(grid, (at % width) + left, Math.floor(at / width) + top))
      ? 1
      : 0
  )
  return { left, top, width, height, land, spanned }
}

/**
 * The cells sharing a side with a cell of a crop.
 * @param at - the cell
 * @param width - the crop's width
 * @param size - the crop's cells
 * @returns their indices
 */
function sidesOf(at: number, width: number, size: number): number[] {
  const x = at % width
  const next = [at - width, at + width]
  if (x > 0) next.push(at - 1)
  if (x < width - 1) next.push(at + 1)
  return next.filter((cell) => cell >= 0 && cell < size)
}

/**
 * One realm of a crop, grown from one of its cells over the spanned cells, sides touching.
 * @param crop - the crop
 * @param start - a spanned cell not seen yet
 * @param seen - the cells already in a realm — written
 * @returns the realm, its land and its frame
 */
function grown(crop: Crop, start: number, seen: Uint8Array): Found {
  const { width, height, spanned, land } = crop
  const realm: Found = { land: [], minX: width, maxX: -1, minY: height, maxY: -1 }
  const stack = [start]
  seen[start] = 1
  for (let at = stack.pop(); at !== undefined; at = stack.pop()) {
    const x = at % width
    const y = (at - x) / width
    if (land[at] === 1) realm.land.push(at)
    realm.minX = Math.min(realm.minX, x)
    realm.maxX = Math.max(realm.maxX, x)
    realm.minY = Math.min(realm.minY, y)
    realm.maxY = Math.max(realm.maxY, y)
    for (const next of sidesOf(at, width, spanned.length))
      if (spanned[next] === 1 && seen[next] === 0) {
        seen[next] = 1
        stack.push(next)
      }
  }
  return realm
}

/**
 * The realms of one owner's crop: each run of spanned cells, sides touching, and the land in it.
 * @param crop - the crop
 * @returns the realms that hold land
 */
function realmsIn(crop: Crop): Found[] {
  const seen = new Uint8Array(crop.spanned.length)
  const found: Found[] = []
  for (let start = 0; start < crop.spanned.length; start += 1) {
    if (crop.spanned[start] === 0 || seen[start] === 1) continue
    const realm = grown(crop, start, seen)
    if (realm.land.length > 0) found.push(realm)
  }
  return found
}

/**
 * A realm cropped as a space: its land the mask, with a ring around its land and straits.
 * @param grid - the grid
 * @param owner - the realm's owner
 * @param crop - the owner's crop
 * @param realm - the realm
 * @param ring - the ring's width, in cells
 * @returns the space
 */
function spaceOf(
  grid: OwnerGrid,
  owner: number,
  crop: Crop,
  realm: Found,
  ring: number
): NameSpace {
  const left = crop.left + realm.minX - ring
  const top = crop.top + realm.minY - ring
  const width = realm.maxX - realm.minX + 1 + 2 * ring
  const height = realm.maxY - realm.minY + 1 + 2 * ring
  const mask = new Uint8Array(width * height)
  for (const at of realm.land) {
    const x = (at % crop.width) + crop.left - left
    const y = Math.floor(at / crop.width) + crop.top - top
    mask[y * width + x] = 1
  }
  const frame = { left, top, width, height }
  return { ...frame, mask, blocked: blockedAround(owner, grid, frame), cells: realm.land.length }
}

/**
 * Every owner's realms on a grid.
 * @param owners - row-major, the owner of each cell, any negative value for none (the sea, unclaimed land)
 * @param width - the grid's width in cells
 * @param height - the grid's height in cells
 * @param options - the widest strait spanned, the smallest far realm named by share and by size, the ring kept
 *   around each
 * @returns each owner's realms worth naming, by owner, the largest first
 * @throws when the grid's size is not `width × height`, the strait is below zero, the ring is not a whole cell at
 *   least, or the share is not between nought and one
 */
export function ownerRealms(
  owners: ArrayLike<number>,
  width: number,
  height: number,
  options: RealmOptions
): Map<number, NameSpace[]> {
  if (owners.length !== width * height)
    throw new Error(
      `[atlas] a grid of ${String(owners.length)} cells is not ${String(width)} × ${String(height)}`
    )
  if (!(options.strait >= 0) || !(options.ring >= 1) || !Number.isInteger(options.ring))
    throw new Error(
      `[atlas] a strait of ${String(options.strait)} and a ring of ${String(options.ring)} cells`
    )
  if (!(options.farShare >= 0 && options.farShare <= 1))
    throw new Error(`[atlas] a far share of ${String(options.farShare)}: between 0 and 1`)
  const grid = { owners, width, height }
  const spaces = new Map<number, NameSpace[]>()
  for (const [owner, held] of cellsByOwner(owners, width)) {
    const crop = cropOf(grid, held, options.strait / 2)
    const found = realmsIn(crop).sort((a, b) => b.land.length - a.land.length)
    const largest = found[0]?.land.length ?? 0
    spaces.set(
      owner,
      found
        .filter(
          ({ land }) => land.length >= options.farShare * largest || land.length >= options.farCells
        )
        .map((realm) => spaceOf(grid, owner, crop, realm, options.ring))
    )
  }
  return spaces
}
