import { fetchWithin } from '../utils/fetchWithin'

import {
  assetError,
  expectBounds,
  expectInteger,
  expectNumber,
  expectString,
  field,
  parseAsset,
} from './assetError'

/**
 * Metadata sidecar for a raw elevation grid (matches the `.json` emitted by `files/spikes/fetch-dem`).
 */
export interface HeightmapMeta {
  /** Grid width in samples. */
  width: number
  /** Grid height in samples. */
  height: number
  /** Web Mercator tile zoom the grid was sampled at. */
  zoom: number
  /** Geographic extent (degrees) the grid covers. */
  bbox: { west: number; south: number; east: number; north: number }
  /** Minimum elevation in the grid (metres; may be negative = bathymetry). */
  min: number
  /** Maximum elevation in the grid (metres). */
  max: number
  /** Binary encoding of the companion `.bin` (e.g. `int16-le-metres`). */
  encoding: string
}

/**
 * A loaded elevation grid: real metres, plus bilinear sampling in normalized coordinates.
 */
export interface Heightmap {
  /** The grid metadata. */
  meta: HeightmapMeta
  /** Elevation in metres, row-major, length = `width * height`. */
  data: Int16Array | Float32Array
  /**
   * Bilinearly sampled elevation, in metres.
   * @param u - horizontal coordinate in `[0, 1]` (0 = west edge)
   * @param v - vertical coordinate in `[0, 1]` (0 = north edge / top row)
   * @returns interpolated elevation in metres
   */
  sample(u: number, v: number): number
}

/**
 * A pluggable source of {@link Heightmap} data (fetch, mock, generated…).
 */
export interface HeightmapSource {
  /**
   * Load the heightmap.
   * @returns the loaded grid
   */
  load(): Promise<Heightmap>
}

/**
 * Wrap raw meta + elevation data into a {@link Heightmap} with bilinear sampling.
 * @param meta - the grid metadata
 * @param data - row-major elevation samples in metres
 * @returns the heightmap
 */
export function createHeightmap(meta: HeightmapMeta, data: Int16Array | Float32Array): Heightmap {
  const { width, height } = meta
  const at = (x: number, y: number): number => data[y * width + x] ?? 0
  return {
    meta,
    data,
    sample(u: number, v: number): number {
      const fx = Math.min(width - 1, Math.max(0, u * (width - 1)))
      const fy = Math.min(height - 1, Math.max(0, v * (height - 1)))
      const x0 = Math.floor(fx)
      const y0 = Math.floor(fy)
      const x1 = Math.min(width - 1, x0 + 1)
      const y1 = Math.min(height - 1, y0 + 1)
      const tx = fx - x0
      const ty = fy - y0
      const top = at(x0, y0) * (1 - tx) + at(x1, y0) * tx
      const bottom = at(x0, y1) * (1 - tx) + at(x1, y1) * tx
      return top * (1 - ty) + bottom * ty
    },
  }
}

/**
 * Create a {@link HeightmapSource} that fetches `<basePath>.json` + `<basePath>.bin` (Int16 LE metres).
 * @param basePath - path without extension, e.g. `/heightmaps/europe-dem-z5`
 * @returns a fetch-backed heightmap source
 */
export function createFetchHeightmapSource(basePath: string): HeightmapSource {
  return {
    async load(): Promise<Heightmap> {
      const metaPath = `${basePath}.json`
      const metaRes = await fetchWithin(metaPath)
      if (!metaRes.ok)
        throw assetError('heightmap', 'transport', metaPath, `HTTP ${String(metaRes.status)}`)
      const meta = parseHeightmapMeta(await metaRes.json(), metaPath)

      const binPath = `${basePath}.bin`
      const binRes = await fetchWithin(binPath)
      if (!binRes.ok)
        throw assetError('heightmap', 'transport', binPath, `HTTP ${String(binRes.status)}`)
      const data = new Int16Array(await binRes.arrayBuffer())

      // The grid says how many samples it holds; the file has to hold that many. Short of it, the map
      // renders as a plain with a cliff where the data ran out — and says nothing.
      const expected = meta.width * meta.height
      if (data.length < expected)
        throw assetError(
          'heightmap',
          'consistency',
          binPath,
          `${String(data.length)} samples for a ${String(meta.width)}×${String(meta.height)} grid, expected ${String(expected)}`
        )

      return createHeightmap(meta, data)
    },
  }
}

/**
 * Read a fetched value as {@link HeightmapMeta}, or fail naming the field that is wrong.
 * @param value - the parsed JSON, of no known shape
 * @param source - where it came from, for the message
 * @returns the metadata
 */
export function parseHeightmapMeta(value: unknown, source: string): HeightmapMeta {
  return parseAsset('heightmap', source, () => {
    const at = field(value, 'meta')
    return {
      width: expectInteger(at('width'), 'meta.width', 1),
      height: expectInteger(at('height'), 'meta.height', 1),
      zoom: expectInteger(at('zoom'), 'meta.zoom', 0),
      bbox: expectBounds(at('bbox'), 'meta.bbox'),
      min: expectNumber(at('min'), 'meta.min'),
      max: expectNumber(at('max'), 'meta.max'),
      encoding: expectString(at('encoding'), 'meta.encoding'),
    }
  })
}

/**
 * One axis of a separable box blur.
 *
 * Written once and run twice rather than spelled out per axis: the two passes differ only in how far
 * apart their taps sit in the buffer, and a copy of this that drifted would blur the map more in one
 * direction than the other — which reads as a smeared relief, not as a bug.
 *
 * The axis is named rather than inferred from the tap spacing. On a one-column grid both axes step by
 * one, so a stride cannot tell them apart, and the column pass would silently blur along rows instead.
 * @param src - the samples to read
 * @param out - where the blurred samples are written
 * @param width - the grid width
 * @param height - the grid height
 * @param radius - taps either side of each sample
 * @param axis - `row` to blur across, `column` to blur down
 * @returns nothing; `out` is written in place
 */
export function boxBlurAxis(
  src: ArrayLike<number>,
  out: Float32Array,
  width: number,
  height: number,
  radius: number,
  axis: 'row' | 'column'
): void {
  const alongRow = axis === 'row'
  const stride = alongRow ? 1 : width
  const limit = alongRow ? width : height
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const position = alongRow ? x : y
      const index = y * width + x
      // Bounded rather than tested tap by tap, so a sample near an edge averages what actually exists
      // there instead of a repeated edge value pulling it outward.
      const from = Math.max(0, position - radius)
      const to = Math.min(limit - 1, position + radius)
      let sum = 0
      for (let at = from; at <= to; at++) sum += src[index + (at - position) * stride] ?? 0
      out[index] = sum / (to - from + 1)
    }
  }
}

/**
 * Return a smoothed copy of a heightmap using a separable box blur of the given radius. Rounds off
 * high-frequency spikes / DEM outliers (needles) into coherent hills. `radius <= 0` returns the source.
 * @param source - the heightmap to smooth
 * @param radius - box-blur radius in grid cells (per axis)
 * @returns a new smoothed heightmap (same metadata)
 */
export function smoothHeightmap(source: Heightmap, radius: number): Heightmap {
  if (radius <= 0) return source
  const { width, height } = source.meta
  const r = Math.floor(radius)
  const horizontal = new Float32Array(width * height)
  const out = new Float32Array(width * height)
  boxBlurAxis(source.data, horizontal, width, height, r, 'row')
  boxBlurAxis(horizontal, out, width, height, r, 'column')
  return createHeightmap(source.meta, out)
}
