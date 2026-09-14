import type { Heightmap } from './heightmap'

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
  const level = options.seaLevel

  return {
    load(): CoastlineSegment[] {
      const segments: CoastlineSegment[] = []
      if (width < 2 || height < 2) return segments
      const uAt = (x: number): number => x / (width - 1)
      const vAt = (y: number): number => y / (height - 1)
      const val = (x: number, y: number): number => data[y * width + x] ?? 0

      for (let y = 0; y < height - 1; y++) {
        for (let x = 0; x < width - 1; x++) {
          const tl = val(x, y)
          const tr = val(x + 1, y)
          const br = val(x + 1, y + 1)
          const bl = val(x, y + 1)
          // Corner classification (1 = land, above the shoreline level).
          const code =
            (tl > level ? 8 : 0) |
            (tr > level ? 4 : 0) |
            (br > level ? 2 : 0) |
            (bl > level ? 1 : 0)
          if (code === 0 || code === 15) continue

          // Edge crossing points (top, right, bottom, left), in normalized coordinates.
          const top: UvPoint = { u: uAt(x + crossing(tl, tr, level)), v: vAt(y) }
          const right: UvPoint = { u: uAt(x + 1), v: vAt(y + crossing(tr, br, level)) }
          const bottom: UvPoint = { u: uAt(x + crossing(bl, br, level)), v: vAt(y + 1) }
          const left: UvPoint = { u: uAt(x), v: vAt(y + crossing(tl, bl, level)) }

          switch (code) {
            case 1:
            case 14:
              segments.push([left, bottom])
              break
            case 2:
            case 13:
              segments.push([bottom, right])
              break
            case 3:
            case 12:
              segments.push([left, right])
              break
            case 4:
            case 11:
              segments.push([top, right])
              break
            case 5:
              // Saddle: land at TR+BL — two segments isolating each land corner.
              segments.push([top, right], [bottom, left])
              break
            case 6:
            case 9:
              segments.push([top, bottom])
              break
            case 7:
            case 8:
              segments.push([left, top])
              break
            case 10:
              // Saddle: land at TL+BR — two segments isolating each land corner.
              segments.push([left, top], [bottom, right])
              break
            default:
              break
          }
        }
      }
      return segments
    },
  }
}
