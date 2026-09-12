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
      const metaRes = await fetch(`${basePath}.json`)
      if (!metaRes.ok)
        throw new Error(`heightmap meta ${basePath}.json → HTTP ${String(metaRes.status)}`)
      const meta = (await metaRes.json()) as HeightmapMeta

      const binRes = await fetch(`${basePath}.bin`)
      if (!binRes.ok)
        throw new Error(`heightmap bin ${basePath}.bin → HTTP ${String(binRes.status)}`)
      const data = new Int16Array(await binRes.arrayBuffer())

      return createHeightmap(meta, data)
    },
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
  const src = source.data
  const r = Math.floor(radius)
  const horizontal = new Float32Array(width * height)
  const out = new Float32Array(width * height)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0
      let count = 0
      for (let dx = -r; dx <= r; dx++) {
        const xx = x + dx
        if (xx < 0 || xx >= width) continue
        sum += src[y * width + xx] ?? 0
        count++
      }
      horizontal[y * width + x] = sum / count
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0
      let count = 0
      for (let dy = -r; dy <= r; dy++) {
        const yy = y + dy
        if (yy < 0 || yy >= height) continue
        sum += horizontal[yy * width + x] ?? 0
        count++
      }
      out[y * width + x] = sum / count
    }
  }

  return createHeightmap(source.meta, out)
}
