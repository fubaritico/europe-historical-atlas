/**
 * Who carries a name in each cell of a grid, at a display level (ATLAS-301, `files/plans/atlas/country-names.md`):
 * the polity whose colour the cell wears there — its own, or its suzerain's from afar (ATLAS-253, `homageLevels`).
 *
 * The grid is the regions' raster (`data/regionRaster`), one region index per cell. Read through the homage at a
 * level, it becomes the grid `pipeline/namePlacement` names: a suzerain whose vassals are shown owns only what they
 * leave it, and a vassal seen from afar has no cell of its own.
 */

import type { HomageLevels } from './homageLevels'

/** A grid of owners at one display level, and whose each owner is. */
export interface NameOwners {
  /** Row-major, the owner of each cell — an index into `ids` — or `-1` where no region lies. */
  readonly owners: Int32Array
  /** The polity each owner stands for, by owner. */
  readonly ids: readonly string[]
}

/**
 * The owners of a grid's cells at a display level.
 * @param cells - row-major, each cell's region index, `-1` where none
 * @param regionPolities - each region's polity id, in the regions' order
 * @param homage - the year's homage
 * @param level - the display level, `0` and up
 * @returns each cell's owner, and the polity id of each owner
 * @throws when a cell names a region the list does not hold — the raster and the regions are built from one
 *   list, so a miss is a defect
 */
export function nameOwners(
  cells: Int16Array,
  regionPolities: readonly string[],
  homage: HomageLevels,
  level: number
): NameOwners {
  const ids: string[] = []
  const indexOf = new Map<string, number>()
  const ownerOfRegion = regionPolities.map((id) => {
    const bearer = homage.ancestorAt(id, level)
    let owner = indexOf.get(bearer)
    if (owner === undefined) {
      owner = ids.length
      ids.push(bearer)
      indexOf.set(bearer, owner)
    }
    return owner
  })
  const owners = new Int32Array(cells.length)
  cells.forEach((region, at) => {
    if (region < 0) {
      owners[at] = -1
      return
    }
    const owner = ownerOfRegion[region]
    if (owner === undefined)
      throw new Error(
        `[atlas] a cell names region ${String(region)} of ${String(regionPolities.length)}`
      )
    owners[at] = owner
  })
  return { owners, ids }
}
