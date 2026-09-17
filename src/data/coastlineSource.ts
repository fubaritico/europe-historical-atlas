import type { Heightmap } from './heightmap'
import type { LandMask } from './landMask'

/** A point in normalized grid coordinates: `u` in `[0, 1]` (0 = west), `v` in `[0, 1]` (0 = north). */
export interface UvPoint {
  /** Horizontal coordinate `[0, 1]` (0 = west edge). */
  u: number
  /** Vertical coordinate `[0, 1]` (0 = north edge / top row). */
  v: number
}

/** A single coastline line segment (two endpoints in normalized grid coordinates). */
export type CoastlineSegment = readonly [UvPoint, UvPoint]

/**
 * A pluggable source of coastline geometry, in projection-agnostic normalized grid coordinates so any
 * consumer (a draped 3D line layer, a rasteriser) can project it. Swap the DEM-derived implementation for
 * a vector one (e.g. Natural Earth reprojected into the same bbox) without touching the consumer.
 */
export interface CoastlineSource {
  /**
   * Extract the coastline as independent line segments.
   * @returns the segments (may be empty for an all-land or all-sea grid)
   */
  load(): CoastlineSegment[]
}

/** Options for the DEM-derived coastline source. */
export interface DemCoastlineOptions {
  /** Elevation (metres) treated as the shoreline; the extracted iso-line follows this level. */
  seaLevel: number
}

/**
 * Linear interpolation of the crossing fraction where a cell edge passes through `level`.
 * @param a - value at the edge start
 * @param b - value at the edge end
 * @param level - the iso level
 * @returns the fraction `[0, 1]` along the edge (guards a zero denominator at 0.5)
 */
function crossing(a: number, b: number, level: number): number {
  const d = b - a
  return d === 0 ? 0.5 : (level - a) / d
}

/**
 * Create a {@link CoastlineSource} that extracts the shoreline (the `seaLevel` iso-line) from a heightmap
 * via marching squares. Each grid cell contributes 0–2 segments; endpoints are returned in normalized
 * grid coordinates. Aligned with the relief by construction (same grid).
 * @param heightmap - the elevation source
 * @param options - the shoreline level
 * @returns the coastline source
 */
export function createDemCoastlineSource(
  heightmap: Heightmap,
  options: DemCoastlineOptions
): CoastlineSource {
  const { width, height } = heightmap.meta
  const data = heightmap.data
  return createFieldCoastlineSource({
    width,
    height,
    level: options.seaLevel,
    valueAt: (x, y) => data[y * width + x] ?? 0,
  })
}

/**
 * The scalar field a shoreline is traced through.
 */
export interface FieldCoastlineOptions {
  /** Grid width in samples. */
  width: number
  /** Grid height in samples. */
  height: number
  /** The iso-value that separates land (above) from water (at or below). */
  level: number
  /**
   * The field value at a grid cell.
   * @param x - grid column
   * @param y - grid row
   * @returns the value at that cell
   */
  valueAt: (x: number, y: number) => number
}

/**
 * Which pair of edge crossings a marching-squares cell joins, by its corner code.
 *
 * Indices into `[top, right, bottom, left]`. A table rather than a switch: sixteen rows, one per code,
 * checkable at a glance against the standard marching-squares figure — and the two saddles, the only
 * rows with two entries, stand out as the special cases they are instead of hiding among ten branches.
 *
 * Codes 0 and 15 are all water and all land: no shoreline crosses them at all.
 */
export const MARCHING_SQUARES_EDGES: readonly (readonly (readonly [number, number])[])[] = [
  [], //  0 — all water
  [[3, 2]], //  1 — BL
  [[2, 1]], //  2 — BR
  [[3, 1]], //  3 — BR+BL, the bottom edge
  [[0, 1]], //  4 — TR
  [
    [0, 1],
    [2, 3],
  ], //  5 — saddle: TR and BL, each isolated
  [[0, 2]], //  6 — TR+BR, the right edge
  [[3, 0]], //  7 — all but TL
  [[3, 0]], //  8 — TL
  [[0, 2]], //  9 — TL+BL, the left edge
  [
    [3, 0],
    [2, 1],
  ], // 10 — saddle: TL and BR, each isolated
  [[0, 1]], // 11 — all but TR
  [[3, 1]], // 12 — TL+TR, the top edge
  [[2, 1]], // 13 — all but BR
  [[3, 2]], // 14 — all but BL
  [], // 15 — all land
]

/**
 * Classify a cell's four corners against the iso-level.
 * @param tl - top-left value
 * @param tr - top-right value
 * @param br - bottom-right value
 * @param bl - bottom-left value
 * @param level - the iso-value separating land (above) from water (at or below)
 * @returns a four-bit code, top-left in the high bit, going clockwise
 */
export function cornerCode(tl: number, tr: number, br: number, bl: number, level: number): number {
  return (tl > level ? 8 : 0) | (tr > level ? 4 : 0) | (br > level ? 2 : 0) | (bl > level ? 1 : 0)
}

/**
 * Create a {@link CoastlineSource} that traces the `level` iso-line of an arbitrary scalar field by
 * marching squares.
 *
 * Kept independent of what the field *is* so the shoreline can be traced through a land/water mask
 * rather than through elevation — the two are not the same question, and only the mask can tell a
 * polder from the sea.
 * @param options - the field, its grid and the iso-level
 * @returns the coastline source
 */
export function createFieldCoastlineSource(options: FieldCoastlineOptions): CoastlineSource {
  const { width, height, level } = options

  return {
    load(): CoastlineSegment[] {
      const segments: CoastlineSegment[] = []
      if (width < 2 || height < 2) return segments
      const uAt = (x: number): number => x / (width - 1)
      const vAt = (y: number): number => y / (height - 1)
      const val = options.valueAt

      for (let y = 0; y < height - 1; y++) {
        for (let x = 0; x < width - 1; x++) {
          const tl = val(x, y)
          const tr = val(x + 1, y)
          const br = val(x + 1, y + 1)
          const bl = val(x, y + 1)
          const edges = MARCHING_SQUARES_EDGES[cornerCode(tl, tr, br, bl, level)]
          if (!edges) continue

          // Edge crossing points, in the table's order: top, right, bottom, left.
          const crossings: readonly UvPoint[] = [
            { u: uAt(x + crossing(tl, tr, level)), v: vAt(y) },
            { u: uAt(x + 1), v: vAt(y + crossing(tr, br, level)) },
            { u: uAt(x + crossing(bl, br, level)), v: vAt(y + 1) },
            { u: uAt(x), v: vAt(y + crossing(tl, bl, level)) },
          ]
          for (const [from, to] of edges) {
            const a = crossings[from]
            const b = crossings[to]
            if (a && b) segments.push([a, b])
          }
        }
      }
      return segments
    },
  }
}

/**
 * Trace the shoreline through a land/water mask instead of through elevation.
 *
 * `resolution` caps the grid marching squares walks: the shipped mask is four times finer than the DEM
 * (23 million cells), and tracing every one of them costs far more than the extra fidelity is worth at
 * the zoom levels the coastline is drawn at.
 * @param mask - the land/water mask
 * @param resolution - maximum grid width to trace at; defaults to the mask's own
 * @returns the coastline source
 */
export function createMaskCoastlineSource(mask: LandMask, resolution?: number): CoastlineSource {
  const cap = resolution ?? mask.meta.width
  const width = Math.max(2, Math.min(mask.meta.width, Math.round(cap)))
  const height = Math.max(2, Math.round((width * mask.meta.height) / mask.meta.width))
  return createFieldCoastlineSource({
    width,
    height,
    level: 0.5, // half-covered is the shore
    valueAt: (x, y) => mask.coverage(x / (width - 1), y / (height - 1)),
  })
}
