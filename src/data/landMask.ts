import type { Heightmap } from './heightmap'
import type { GeoBounds } from '../geo/mercator'

/**
 * Metadata sidecar for a land/water mask (matches the `.json` emitted by `files/spikes/fetch-land`).
 */
export interface LandMaskMeta {
  /** Grid width in cells. */
  width: number
  /** Grid height in cells. */
  height: number
  /** How many mask cells per DEM cell, per axis. */
  scale: number
  /** Geographic extent the grid covers — the DEM's, so the two share a coordinate space. */
  bbox: GeoBounds
}

/**
 * Which parts of the map are land.
 *
 * This exists as its own port because a heightmap cannot answer the question. Elevation says "how
 * high", not "wet or dry": roughly a quarter of the Netherlands lies below sea level and stays dry
 * only through dikes and pumps, so a 0 m threshold drowns Amsterdam and Rotterdam, while a closed
 * basin like the Caspian sits below zero and genuinely is water. The two facts cannot be told apart
 * from elevation alone, at any resolution.
 */
export interface LandMask {
  /** The grid this mask is sampled on. */
  meta: LandMaskMeta
  /**
   * Whether the nearest cell to a normalized coordinate is land.
   * @param u - horizontal coordinate `[0, 1]` (0 = west edge)
   * @param v - vertical coordinate `[0, 1]` (0 = north edge)
   * @returns `true` over land
   */
  isLand(u: number, v: number): boolean
  /**
   * The land fraction around a normalized coordinate, bilinearly interpolated across the four
   * surrounding cells. A continuous `[0, 1]` value is what lets the shore be drawn with a soft,
   * sub-cell edge rather than a staircase of whole cells.
   * @param u - horizontal coordinate `[0, 1]` (0 = west edge)
   * @param v - vertical coordinate `[0, 1]` (0 = north edge)
   * @returns the land fraction in `[0, 1]` (0 = all water, 1 = all land)
   */
  coverage(u: number, v: number): number
}

/**
 * A pluggable source of {@link LandMask} data (fetch, mock, derived from elevation…).
 */
export interface LandMaskSource {
  /**
   * Load the mask.
   * @returns the loaded mask
   */
  load(): Promise<LandMask>
}

/**
 * Wrap a per-cell land predicate into a {@link LandMask}, adding nearest and bilinear sampling.
 * @param meta - the grid metadata
 * @param at - whether a given cell is land; called with in-range coordinates only
 * @returns the mask
 */
export function createLandMask(
  meta: LandMaskMeta,
  at: (col: number, row: number) => boolean
): LandMask {
  const { width, height } = meta
  const clampedAt = (col: number, row: number): number => {
    const cx = col < 0 ? 0 : col >= width ? width - 1 : col
    const cy = row < 0 ? 0 : row >= height ? height - 1 : row
    return at(cx, cy) ? 1 : 0
  }
  return {
    meta,
    isLand(u: number, v: number): boolean {
      const col = Math.round(Math.min(width - 1, Math.max(0, u * (width - 1))))
      const row = Math.round(Math.min(height - 1, Math.max(0, v * (height - 1))))
      return clampedAt(col, row) === 1
    },
    coverage(u: number, v: number): number {
      const fx = Math.min(width - 1, Math.max(0, u * (width - 1)))
      const fy = Math.min(height - 1, Math.max(0, v * (height - 1)))
      const x0 = Math.floor(fx)
      const y0 = Math.floor(fy)
      const tx = fx - x0
      const ty = fy - y0
      const top = clampedAt(x0, y0) * (1 - tx) + clampedAt(x0 + 1, y0) * tx
      const bottom = clampedAt(x0, y0 + 1) * (1 - tx) + clampedAt(x0 + 1, y0 + 1) * tx
      return top * (1 - ty) + bottom * ty
    },
  }
}

/**
 * Wrap a packed bitfield (MSB first, row-major, 1 = land) into a {@link LandMask}.
 * @param meta - the grid metadata
 * @param bits - the packed bits, `ceil(width * height / 8)` bytes
 * @returns the mask
 */
export function createPackedLandMask(meta: LandMaskMeta, bits: Uint8Array): LandMask {
  const { width } = meta
  return createLandMask(meta, (col, row) => {
    const index = row * width + col
    return ((bits[index >> 3] ?? 0) >> (7 - (index & 7))) % 2 === 1
  })
}

/**
 * Derive a mask from a heightmap by thresholding elevation — the pre-mask behaviour, kept as a fallback
 * when the asset is unavailable and as a dependency-free stand-in for tests.
 *
 * Known to be wrong wherever dry land sits below the threshold (the Dutch polders) or water sits above
 * it (any lake). That is the whole reason the real mask exists; this is a degraded mode, not an
 * equivalent.
 * @param heightmap - the elevation source
 * @param seaLevel - elevation (metres) at/below which a sample counts as water
 * @returns the derived mask
 */
export function createElevationLandMask(heightmap: Heightmap, seaLevel: number): LandMask {
  const { width, height, bbox } = heightmap.meta
  const data = heightmap.data
  return createLandMask({ width, height, scale: 1, bbox }, (col, row) => {
    return (data[row * width + col] ?? 0) > seaLevel
  })
}

/**
 * Create a {@link LandMaskSource} that fetches `<basePath>.json` + `<basePath>.bin`.
 * @param basePath - path without extension, e.g. `/masks/europe-land`
 * @returns a fetch-backed mask source
 */
export function createFetchLandMaskSource(basePath: string): LandMaskSource {
  return {
    async load(): Promise<LandMask> {
      const metaResponse = await fetch(`${basePath}.json`)
      if (!metaResponse.ok)
        throw new Error(`land mask meta ${basePath}.json → HTTP ${String(metaResponse.status)}`)
      const meta = (await metaResponse.json()) as LandMaskMeta

      const binResponse = await fetch(`${basePath}.bin`)
      if (!binResponse.ok)
        throw new Error(`land mask bin ${basePath}.bin → HTTP ${String(binResponse.status)}`)
      const bits = new Uint8Array(await binResponse.arrayBuffer())

      const expected = Math.ceil((meta.width * meta.height) / 8)
      if (bits.byteLength < expected)
        throw new Error(
          `land mask ${basePath}.bin: ${String(bits.byteLength)} bytes for a ${String(meta.width)}x${String(meta.height)} grid, expected ${String(expected)}`
        )
      return createPackedLandMask(meta, bits)
    },
  }
}
