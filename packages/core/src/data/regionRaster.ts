import { hslToRgb } from '../utils/color'
import { hashInts } from '../utils/hash'

// Re-exported so the split moved no call site: the raster and the borders it implies are still one
// import away from each other. A type-only import points the other way, so nothing cycles at runtime.
export * from './regionBorders'

import type { Region } from './regionSource'
import type { RgbColor } from '../utils/color'

/**
 * Which polity occupies each cell of a grid.
 */
export interface RegionRaster {
  /** Grid width in cells. */
  width: number
  /** Grid height in cells. */
  height: number
  /** The raw per-cell indices, row-major, `-1` where unclaimed. */
  cells: Int16Array
  /**
   * The index into the region list at a normalized coordinate, or `-1` where no polity claims it.
   * @param u - horizontal coordinate `[0, 1]` (0 = west edge)
   * @param v - vertical coordinate `[0, 1]` (0 = north edge)
   * @returns the region index, or `-1`
   */
  indexAt(u: number, v: number): number
}

/**
 * Wrap a cell grid as a {@link RegionRaster}.
 *
 * The nearest-neighbour lookup lives here alone: every raster in the module is built through this, so a
 * future change to the sampling rule — bilinear, say — cannot be applied to one producer and missed on
 * another. Tests build their fixtures through it too, so a fixture cannot silently drift from the real
 * lookup either.
 * @param width - grid width in cells
 * @param height - grid height in cells
 * @param cells - the per-cell indices, row-major, `-1` where unclaimed
 * @returns the raster
 */
export function createRegionRaster(width: number, height: number, cells: Int16Array): RegionRaster {
  return {
    width,
    height,
    cells,
    indexAt(u: number, v: number): number {
      const col = Math.round(Math.min(width - 1, Math.max(0, u * (width - 1))))
      const row = Math.round(Math.min(height - 1, Math.max(0, v * (height - 1))))
      return cells[row * width + col] ?? -1
    },
  }
}

/**
 * Rasterise dated polities into a per-cell index grid by even-odd scanline fill.
 *
 * Rasterised in the browser rather than shipped per year: the geometry is small (a few thousand
 * vertices), whereas an index grid is one byte per cell per year, which would make switching centuries
 * an asset download instead of a millisecond of work.
 *
 * Later polities win on overlap, which keeps enclaves drawn on top of the power surrounding them.
 * @param regions - the polities, in normalized grid coordinates
 * @param width - grid width in cells
 * @param height - grid height in cells
 * @returns the index grid
 */
/**
 * Bucket a polity's edges by the grid rows they span.
 *
 * Bucketed rather than tested row by row against every edge: a century holds thousands of vertices and a
 * raster holds thousands of rows, so the naive pairing is the difference between a millisecond and a
 * second. Each bucket holds flat `[au, av, bu, bv]` quadruples — a flat array rather than objects,
 * because this is allocated once per polity per year.
 * @param region - the polity
 * @param height - grid height in cells
 * @returns the edges that cross each row
 */
export function bucketEdgesByRow(region: Region, height: number): Map<number, number[]> {
  const table = new Map<number, number[]>()
  for (const ring of region.rings) {
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i]
      const b = ring[(i + 1) % ring.length]
      if (!a || !b || a.v === b.v) continue // horizontal edges contribute no crossing
      const from = Math.max(0, Math.ceil(Math.min(a.v, b.v) * (height - 1)))
      const to = Math.min(height - 1, Math.floor(Math.max(a.v, b.v) * (height - 1)))
      for (let row = from; row <= to; row++) {
        const bucket = table.get(row)
        if (bucket) bucket.push(a.u, a.v, b.u, b.v)
        else table.set(row, [a.u, a.v, b.u, b.v])
      }
    }
  }
  return table
}

/**
 * Where a row's scanline crosses a bucket of edges, sorted left to right.
 * @param bucket - flat `[au, av, bu, bv]` quadruples
 * @param v - the row's normalized vertical position
 * @param out - the array to fill; cleared first, so one array serves the whole raster
 * @returns nothing; `out` is written in place
 */
export function rowCrossings(bucket: readonly number[], v: number, out: number[]): void {
  out.length = 0
  for (let i = 0; i < bucket.length; i += 4) {
    const au = bucket[i] ?? 0
    const av = bucket[i + 1] ?? 0
    const bu = bucket[i + 2] ?? 0
    const bv = bucket[i + 3] ?? 0
    // Half-open, so a vertex shared by two edges is counted exactly once.
    if (v >= Math.min(av, bv) && v < Math.max(av, bv)) {
      out.push(au + ((bu - au) * (v - av)) / (bv - av))
    }
  }
  out.sort((a, b) => a - b)
}

/**
 * Claim the cells between each pair of crossings for one polity — the even-odd fill itself.
 * @param cells - the index grid
 * @param width - grid width in cells
 * @param row - the row being filled
 * @param crossings - that row's crossings, sorted
 * @param index - the polity claiming them
 * @returns nothing; `cells` is written in place
 */
export function fillRowSpans(
  cells: Int16Array,
  width: number,
  row: number,
  crossings: readonly number[],
  index: number
): void {
  for (let i = 0; i + 1 < crossings.length; i += 2) {
    const start = Math.max(0, Math.ceil((crossings[i] ?? 0) * (width - 1)))
    const end = Math.min(width - 1, Math.floor((crossings[i + 1] ?? 0) * (width - 1)))
    for (let col = start; col <= end; col++) cells[row * width + col] = index
  }
}

export function rasteriseRegions(
  regions: readonly Region[],
  width: number,
  height: number
): RegionRaster {
  const cells = new Int16Array(width * height).fill(-1)
  if (width >= 2 && height >= 2) {
    const crossings: number[] = []
    for (let index = 0; index < regions.length; index++) {
      const region = regions[index]
      if (!region) continue
      for (const [row, bucket] of bucketEdgesByRow(region, height)) {
        rowCrossings(bucket, row / (height - 1), crossings)
        fillRowSpans(cells, width, row, crossings, index)
      }
    }
  }

  return createRegionRaster(width, height, cells)
}

/**
 * Pick a stable colour for a polity from its name.
 *
 * Keyed on the name rather than the index so a power keeps its colour from one century to the next —
 * indices shuffle as polities appear and vanish, and a France that changes hue between 1500 and 1600
 * reads as a different country. Saturation and lightness stay in a narrow band so the tint sits on
 * parchment without fighting it.
 * @param name - the polity's name, or `null`
 * @returns the tint
 */
export function regionColor(name: string | null): RgbColor {
  let seed = 0
  const key = name ?? ''
  for (let i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) % 1_000_003
  const hue = hashInts(seed, 1) * 360
  const saturation = 0.34 + hashInts(seed, 2) * 0.22
  const lightness = 0.55 + hashInts(seed, 3) * 0.12
  return hslToRgb(hue, saturation, lightness)
}

/**
 * Grow the claimed areas into any land cell no polity reached, each taking its nearest claim.
 *
 * The political geometry and the coastline come from different sources at very different levels of
 * generalisation: the historical polygons are schematic, so where one falls short of the real shoreline
 * the land is left bare and the colour appears to stop before the coast. Since a tint can never spill
 * *into* the sea — the compositor only paints where the mask says land — the visible symptom is an
 * apparent offset, which no coordinate fix would address.
 *
 * Growing the claims settles it the way historical atlases do: the coastline is the modern one, and only
 * the internal divisions come from the historical source, which is exactly where its approximation is
 * legitimate. A breadth-first expansion from every claimed cell at once makes each unclaimed cell take
 * its nearest neighbour's polity.
 * @param raster - the rasterised claims
 * @param isLand - whether a normalized coordinate is land
 * @param maxCells - how far a claim may grow, in cells; keeps an island from adopting a distant power
 * @returns a new raster with the land gaps filled
 */
/** The four orthogonal steps a claim grows through — no diagonals, or it would leak across a strait. */
const NEIGHBOUR_STEPS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const

/**
 * Every cell already claimed by a polity — the wave front the growth starts from.
 * @param cells - the index grid
 * @returns the claimed cell indices
 */
export function claimedCells(cells: Int16Array): number[] {
  const claimed: number[] = []
  for (let i = 0; i < cells.length; i++) if ((cells[i] ?? -1) >= 0) claimed.push(i)
  return claimed
}

/**
 * Hand one cell's claim to every unclaimed land cell beside it.
 * @param cells - the index grid, written in place
 * @param width - grid width in cells
 * @param height - grid height in cells
 * @param index - the claimed cell doing the claiming
 * @param isLandCell - whether a cell is land
 * @param out - where newly claimed cells are appended, to seed the next wave
 * @returns nothing; `cells` and `out` are written in place
 */
export function claimNeighbours(
  cells: Int16Array,
  width: number,
  height: number,
  index: number,
  isLandCell: (col: number, row: number) => boolean,
  out: number[]
): void {
  const claim = cells[index] ?? -1
  const col = index % width
  const row = (index - col) / width
  for (const [dc, dr] of NEIGHBOUR_STEPS) {
    const nc = col + dc
    const nr = row + dr
    if (nc < 0 || nc >= width || nr < 0 || nr >= height) continue
    const target = nr * width + nc
    if ((cells[target] ?? -1) >= 0) continue // already spoken for; first claim wins
    if (!isLandCell(nc, nr)) continue // the growth never crosses water
    cells[target] = claim
    out.push(target)
  }
}

export function expandRegionsOverLand(
  raster: RegionRaster,
  isLand: (u: number, v: number) => boolean,
  maxCells: number
): RegionRaster {
  const { width, height } = raster
  const cells = Int16Array.from(raster.cells)
  const isLandCell = (col: number, row: number): boolean =>
    isLand(width > 1 ? col / (width - 1) : 0, height > 1 ? row / (height - 1) : 0)

  let frontier = claimedCells(cells)
  for (let step = 0; step < Math.max(0, Math.floor(maxCells)) && frontier.length > 0; step++) {
    const next: number[] = []
    for (const index of frontier) claimNeighbours(cells, width, height, index, isLandCell, next)
    frontier = next
  }

  return createRegionRaster(width, height, cells)
}

/**
 * Assign each polity a colour from a palette so that no two that share a border get the same one.
 *
 * A hash of the name spreads colours evenly over the wheel but has no idea what touches what, so two
 * neighbours regularly land on near-identical tints and the border between them stops reading. A map is
 * legible because adjacent areas contrast — the four-colour theorem is the formal version of the same
 * observation — so adjacency is what the assignment has to respect, not variety for its own sake.
 *
 * Adjacency is read off the raster rather than the geometry: polygons that merely look neighbourly may
 * not touch, and after the claims have grown over the coast the raster is the truth anyway. Polities are
 * coloured most-connected first, which is the greedy order that needs fewest colours.
 * Polities with a pinned colour take it and are skipped: an editorial choice outranks the automatic
 * one, and since the pinned colours sit outside the palette they cannot collide with it either.
 * @param raster - the rasterised claims
 * @param regions - the polities, in index order
 * @param palette - the colours to choose from, in preference order
 * @param pinnedFor - an editorial colour for a polity, or `null` to let the palette decide
 * @returns one colour per region index
 */
/**
 * Record that two polities touch, in both directions.
 * @param neighbours - the adjacency sets, by region index
 * @param here - one polity
 * @param other - the cell beside it, which may be unclaimed or the same polity
 * @returns nothing; `neighbours` is written in place
 */
function linkNeighbours(neighbours: Set<number>[], here: number, other: number): void {
  if (other < 0 || other === here) return
  neighbours[here]?.add(other)
  neighbours[other]?.add(here)
}

/**
 * Which polities touch which, read off the raster rather than the geometry.
 *
 * The raster is the truth here: polygons that merely look neighbourly may not touch, and once the claims
 * have grown over the coast two powers can become neighbours that were never drawn adjacent.
 * @param raster - the rasterised claims
 * @param regionCount - how many polities there are
 * @returns the adjacency set of each polity, by index
 */
export function buildAdjacency(raster: RegionRaster, regionCount: number): Set<number>[] {
  const { width, height, cells } = raster
  const neighbours: Set<number>[] = Array.from({ length: regionCount }, () => new Set<number>())
  const at = (col: number, row: number): number => cells[row * width + col] ?? -1
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const here = at(col, row)
      if (here < 0) continue
      // Right and down only: every pair is still seen once, at half the work.
      if (col + 1 < width) linkNeighbours(neighbours, here, at(col + 1, row))
      if (row + 1 < height) linkNeighbours(neighbours, here, at(col, row + 1))
    }
  }
  return neighbours
}

/**
 * Give each polity a palette slot no neighbour of its own is using.
 *
 * Most-connected first, which is the greedy order that needs fewest colours: a power hemmed in by six
 * others constrains the choice far more than an island does, so it picks while the palette is still open.
 * @param neighbours - who touches whom
 * @param skip - polities that already have an editorial colour and take no slot
 * @param paletteSize - how many slots there are
 * @returns the slot each polity takes, or `-1` for a skipped one
 */
export function chooseColorSlots(
  neighbours: readonly ReadonlySet<number>[],
  skip: readonly boolean[],
  paletteSize: number
): Int16Array {
  const order = Array.from({ length: neighbours.length }, (_, i) => i)
    .filter((index) => !skip[index])
    .sort((a, b) => (neighbours[b]?.size ?? 0) - (neighbours[a]?.size ?? 0))
  const chosen = new Int16Array(neighbours.length).fill(-1)
  for (const index of order) {
    const taken = new Set<number>()
    for (const neighbour of neighbours[index] ?? []) {
      const colour = chosen[neighbour] ?? -1
      if (colour >= 0) taken.add(colour)
    }
    let pick = 0
    while (pick < paletteSize && taken.has(pick)) pick++
    // More neighbours than colours: fall back to the least-used rather than leaving a hole.
    chosen[index] = pick < paletteSize ? pick : index % paletteSize
  }
  return chosen
}

export function assignRegionColors(
  raster: RegionRaster,
  regions: readonly { name: string | null }[],
  palette: readonly RgbColor[],
  pinnedFor: (name: string | null) => RgbColor | null = () => null
): RgbColor[] {
  const regionCount = regions.length
  const fallback: RgbColor = { r: 200, g: 190, b: 170 }
  if (palette.length === 0) return Array.from({ length: regionCount }, () => fallback)

  const neighbours = buildAdjacency(raster, regionCount)
  const pinned = regions.map((region) => pinnedFor(region.name))
  const chosen = chooseColorSlots(
    neighbours,
    pinned.map((colour) => colour !== null),
    palette.length
  )

  return Array.from(
    { length: regionCount },
    (_, i) => pinned[i] ?? palette[chosen[i] ?? 0] ?? fallback
  )
}
