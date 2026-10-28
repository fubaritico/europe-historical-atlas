/**
 * Who carries a name in each cell of a grid, at one display level (ATLAS-301): the regions' raster
 * (`data/regionRaster`), one region index per cell, read through the bearer of each region at that level
 * (`editor/regionBearers`, computed by the page). The grid `namePlacement` names.
 */

/** A grid of owners at one display level, and whose each owner is. */
export interface OwnerGrid {
  /** Row-major, the owner of each cell — an index into `ids` — or `-1` where no region lies. */
  readonly owners: Int32Array
  /** The polity each owner stands for, by owner. */
  readonly ids: readonly string[]
}

/**
 * The owners of a grid's cells, from each region's bearer.
 * @param cells - row-major, each cell's region index, `-1` where none
 * @param bearers - the polity each region's colour belongs to at the level, in the regions' order
 * @returns each cell's owner, and the polity id of each owner
 * @throws when a cell names a region the list does not hold — the raster and the list are built from one
 *   list of regions, so a miss is a defect
 */
export function ownerGrid(cells: Int16Array, bearers: readonly string[]): OwnerGrid {
  const ids: string[] = []
  const indexOf = new Map<string, number>()
  const ownerOfRegion = bearers.map((bearer) => {
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
      throw new Error(`[atlas] a cell names region ${String(region)} of ${String(bearers.length)}`)
    owners[at] = owner
  })
  return { owners, ids }
}
