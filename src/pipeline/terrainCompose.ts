/**
 * The terrain's painted look, computed as pixels on the CPU.
 *
 * It lives in `pipeline/` rather than `scene/` for one reason: **a worker must be able to run it**, and a
 * worker has no three.js and no DOM. The ESLint boundary on this layer forbids both, so the guarantee is
 * enforced rather than merely intended. `scene/terrainTexture` is the thin wrapper that turns the buffer
 * this module returns into a `DataTexture`.
 */

import { createElevationLandMask } from '../data/landMask'
import { verticalToLatitude } from '../geo/mercator'
import { hashInts } from '../utils/hash'

// Re-exported so the split changed no call site: the options and the compositor that consumes them are
// still one import away from each other.
export * from './terrainOptions'

import type { AreaTint, BlendMode, TerrainTextureOptions } from './terrainOptions'
import type { Heightmap } from '../data/heightmap'
import type { LandMask } from '../data/landMask'
import type { RgbColor } from '../utils/color'

/**
 * The pixel dimensions {@link composeTerrainRgba} will produce for a given heightmap and supersample
 * factor. Callers need this to size the texture without composing it first.
 * @param heightmap - the elevation source
 * @param options - the texture options (uses `supersample`)
 * @returns the output width and height in pixels
 */
export function terrainTextureSize(
  heightmap: Heightmap,
  options: TerrainTextureOptions
): { width: number; height: number } {
  const scale = Math.max(1, Math.floor(options.supersample))
  return { width: heightmap.meta.width * scale, height: heightmap.meta.height * scale }
}

const DEG2RAD = Math.PI / 180

/**
 * Blend two normalized `[0, 1]` channel values with the given mode.
 * @param base - the lower-layer channel value `[0, 1]`
 * @param top - the upper-layer channel value `[0, 1]`
 * @param mode - the blend mode
 * @returns the blended channel value `[0, 1]`
 */
export function blendChannel(base: number, top: number, mode: BlendMode): number {
  switch (mode) {
    case 'normal':
      return top
    case 'multiply':
      return base * top
    case 'overlay':
      return base < 0.5 ? 2 * base * top : 1 - 2 * (1 - base) * (1 - top)
    case 'softLight':
      // Pegtop formula — continuous, no branch discontinuity.
      return (1 - 2 * top) * base * base + 2 * top * base
  }
}

/** Linear interpolation between two 8-bit colours, returned as normalized `[0, 1]` triplets. */
function lerpColor(a: RgbColor, b: RgbColor, t: number): [number, number, number] {
  return [
    (a.r + (b.r - a.r) * t) / 255,
    (a.g + (b.g - a.g) * t) / 255,
    (a.b + (b.b - a.b) * t) / 255,
  ]
}

/**
 * Map a land elevation to its hypsometric tint (lowland → highland), clamped at `peakReference`.
 * @param elevation - sample elevation in metres (assumed above `seaLevel`)
 * @param options - the texture options (uses `seaLevel`, `peakReference`, `lowland`, `highland`)
 * @returns the tint as a normalized `[0, 1]` RGB triplet
 */
export function hypsometricTint(
  elevation: number,
  options: TerrainTextureOptions
): [number, number, number] {
  const span = Math.max(1, options.peakReference - options.seaLevel)
  const t = Math.min(1, Math.max(0, (elevation - options.seaLevel) / span))
  return lerpColor(options.lowland, options.highland, t)
}

/**
 * Map an elevation to its greyscale heightmap value, following the elevation-bitmap convention: the lower
 * the sample the blacker, the higher the whiter. Clamped outside `[elevationFloor, elevationCeiling]`.
 * @param elevation - sample elevation in metres
 * @param options - the texture options (uses `elevationFloor`, `elevationCeiling`)
 * @returns the grey value in `[0, 1]` (0 = black = floor and below, 1 = white = ceiling and above)
 */
export function elevationGrey(elevation: number, options: TerrainTextureOptions): number {
  const span = Math.max(1, options.elevationCeiling - options.elevationFloor)
  const t = (elevation - options.elevationFloor) / span
  return t < 0 ? 0 : t > 1 ? 1 : t
}

/**
 * Snow coverage at a given elevation: none below `snowStart`, full at/above `snowFull`, smoothstepped
 * between the two. Deliberately a band of its own rather than the top of the hypsometric ramp — the ramp
 * encodes lowland→highland *ground* colour across the whole elevation span, whereas snow is a surface
 * cover that starts at a line. Whitening the ramp's top instead would bleach the hills as well.
 * @param elevation - sample elevation in metres
 * @param options - the texture options (uses `snowStart`, `snowFull`)
 * @param lineDrop - metres to lower the whole band by (see {@link snowLineDrop}); 0 = no tilt
 * @returns the snow coverage in `[0, 1]` (0 = bare ground, 1 = fully covered)
 */
export function snowCoverage(
  elevation: number,
  options: TerrainTextureOptions,
  lineDrop = 0
): number {
  const start = options.snowStart - lineDrop
  const full = options.snowFull - lineDrop
  const span = full - start
  // A null or inverted band degenerates to a hard line at the top of the band.
  if (!(span > 0)) return elevation >= full ? 1 : 0
  const t = (elevation - start) / span
  if (t <= 0) return 0
  if (t >= 1) return 1
  return t * t * (3 - 2 * t) // smoothstep
}

/**
 * How far to lower the snow band at a given latitude. A single altitude threshold is wrong across a map
 * spanning the Sahara to the Arctic — the real snow line falls by roughly 55 m per degree north, so
 * Scandinavia is white from ~400 m while the Atlas stays bare to well over 2000 m. Positive north of
 * `snowLatitudeRef`, negative south of it.
 * @param latitudeDeg - the sample's latitude in degrees
 * @param options - the texture options (uses `snowLatitudeRef`, `snowLatitudeDrop`)
 * @returns the drop in metres (positive lowers the snow line)
 */
export function snowLineDrop(latitudeDeg: number, options: TerrainTextureOptions): number {
  return (latitudeDeg - options.snowLatitudeRef) * options.snowLatitudeDrop
}

/**
 * Blend a single-channel (greyscale) top layer over an RGB base, per channel, with a mode and a
 * strength, writing the result into `out`. Shared by the greyscale heightmap layer and the hillshade —
 * both are grey-over-colour composites. Writes in place rather than returning a fresh tuple: this runs
 * twice per pixel over the whole grid, so allocating here would add millions of short-lived arrays per
 * bake. `out` may alias `base`.
 * @param out - destination triplet, overwritten with the composited colour
 * @param base - the lower-layer colour as a normalized `[0, 1]` RGB triplet
 * @param grey - the top layer's value in `[0, 1]`
 * @param mode - the blend mode
 * @param strength - blend amount `[0, 1]` (0 = base untouched, 1 = fully blended)
 * @returns nothing; `out` holds the result
 */
function blendGreyInto(
  out: [number, number, number],
  base: readonly [number, number, number],
  grey: number,
  mode: BlendMode,
  strength: number
): void {
  for (let k = 0; k < 3; k++) {
    const c = base[k] ?? 0
    out[k] = c + (blendChannel(c, grey, mode) - c) * strength
  }
}

/** Smoothstep-interpolated value noise in `[0, 1]` — smooth mottling, not per-pixel static. */
function valueNoise(x: number, y: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const ux = fx * fx * (3 - 2 * fx)
  const uy = fy * fy * (3 - 2 * fy)
  const a = hashInts(ix, iy)
  const b = hashInts(ix + 1, iy)
  const c = hashInts(ix, iy + 1)
  const d = hashInts(ix + 1, iy + 1)
  const top = a + (b - a) * ux
  const bottom = c + (d - c) * ux
  return top + (bottom - top) * uy
}

/**
 * Fractal Brownian motion (4 octaves of {@link valueNoise}) sampled at a spatial `scale` (px), giving a
 * fibrous vellum-paper mottling in `[0, 1]`.
 * @param x - pixel x
 * @param y - pixel y
 * @param scale - spatial scale in pixels (larger = coarser mottling)
 * @returns the paper value in `[0, 1]`
 */
function paperNoise(x: number, y: number, scale: number): number {
  const s = Math.max(1, scale)
  let sum = 0
  let amplitude = 0.5
  let frequency = 1 / s
  let norm = 0
  for (let octave = 0; octave < 4; octave++) {
    sum += amplitude * valueNoise(x * frequency, y * frequency)
    norm += amplitude
    amplitude *= 0.5
    frequency *= 2
  }
  return sum / norm
}

/**
 * Compute a per-pixel hillshade intensity from the heightmap using Horn's 3×3 gradient and the standard
 * cartographic illumination model. Edge pixels replicate their nearest in-bounds neighbour.
 * @param heightmap - the elevation source
 * @param options - the texture options (uses `lightAzimuthDeg`, `lightAltitudeDeg`, `zFactor`)
 * @returns intensity per pixel in `[0, 1]` (row-major, `width * height`)
 */
export function computeHillshade(
  heightmap: Heightmap,
  options: TerrainTextureOptions
): Float32Array {
  const { width, height } = heightmap.meta
  const src = heightmap.data
  const out = new Float32Array(width * height)
  const zenith = (90 - options.lightAltitudeDeg) * DEG2RAD
  const azimuth = (360 - options.lightAzimuthDeg + 90) * DEG2RAD // math angle, CCW from +x
  const cosZenith = Math.cos(zenith)
  const sinZenith = Math.sin(zenith)

  const at = (x: number, y: number): number => {
    const cx = x < 0 ? 0 : x >= width ? width - 1 : x
    const cy = y < 0 ? 0 : y >= height ? height - 1 : y
    return src[cy * width + cx] ?? 0
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = at(x - 1, y - 1)
      const b = at(x, y - 1)
      const c = at(x + 1, y - 1)
      const d = at(x - 1, y)
      const f = at(x + 1, y)
      const g = at(x - 1, y + 1)
      const h = at(x, y + 1)
      const i = at(x + 1, y + 1)
      const dzdx = (c + 2 * f + i - (a + 2 * d + g)) / 8
      const dzdy = (g + 2 * h + i - (a + 2 * b + c)) / 8
      const slope = Math.atan(options.zFactor * Math.hypot(dzdx, dzdy))
      const aspect = Math.atan2(dzdy, -dzdx)
      const shade =
        cosZenith * Math.cos(slope) + sinZenith * Math.sin(slope) * Math.cos(azimuth - aspect)
      out[y * width + x] = shade < 0 ? 0 : shade > 1 ? 1 : shade
    }
  }
  return out
}

/**
 * Composite one land pixel's colour in `[0, 1]` per channel, layer by layer over the parchment base:
 * hypsometric tint, then the greyscale heightmap, then the snow band, then the DEM hillshade. The
 * elevation-driven layers sit together, all below the shading. Writes in place to keep the per-pixel
 * loop allocation-free.
 * @param out - destination triplet, overwritten with the land colour (normalized `[0, 1]` RGB)
 * @param elevation - sample elevation in metres
 * @param shade - hillshade intensity `[0, 1]` at this pixel
 * @param options - the texture options
 * @param snowDrop - metres to lower the snow band at this pixel's latitude ({@link snowLineDrop})
 * @param political - the political tint claimed here, or `null`
 * @returns nothing; `out` holds the result
 */
function landColorInto(
  out: [number, number, number],
  elevation: number,
  shade: number,
  options: TerrainTextureOptions,
  snowDrop: number,
  political: RgbColor | null
): void {
  const tint = hypsometricTint(elevation, options)
  const parchment = [
    options.parchment.r / 255,
    options.parchment.g / 255,
    options.parchment.b / 255,
  ]
  // The tint is an RGB layer, so it blends against its own triplet channel by channel.
  for (let k = 0; k < 3; k++) {
    const baseC = parchment[k] ?? 0
    out[k] =
      baseC + (blendChannel(baseC, tint[k] ?? 0, options.tintMode) - baseC) * options.tintStrength
  }
  blendGreyInto(
    out,
    out,
    elevationGrey(elevation, options),
    options.elevationMode,
    options.elevationStrength
  )
  // Snow sits above the ground colour but BELOW the hillshade on purpose: shading a snowfield is what
  // keeps a summit reading as a mountain instead of a flat white blob.
  const snow = snowCoverage(elevation, options, snowDrop) * options.snowStrength
  if (snow > 0) {
    out[0] += (options.snow.r / 255 - out[0]) * snow
    out[1] += (options.snow.g / 255 - out[1]) * snow
    out[2] += (options.snow.b / 255 - out[2]) * snow
  }
  // The political tint covers the ground colour but still sits BELOW the hillshade: a country painted
  // over the shading would flatten into a sticker, where under it the relief keeps reading through.
  if (political && options.politicalStrength > 0) {
    const tint = [political.r / 255, political.g / 255, political.b / 255] as const
    for (let k = 0; k < 3; k++) {
      const base = out[k] ?? 0
      out[k] =
        base +
        (blendChannel(base, tint[k] ?? 0, options.politicalMode) - base) * options.politicalStrength
    }
  }
  blendGreyInto(out, out, shade, options.hillshadeMode, options.hillshadeStrength)
}

/**
 * Composite the terrain into an RGBA byte buffer: parchment base, hypsometric tint over land, the
 * greyscale heightmap layer, DEM hillshade multiplied on top (sea samples get the flat `sea` tone, and
 * the greyscale layer only if `elevationIncludesSea`), then a vellum paper grain modulated over
 * everything. The shoreline comes from the injected {@link LandMask}, whose bilinear coverage mixes sea
 * and land across the edge instead of snapping to one or the other — and because the mask can be baked
 * finer than the DEM, the coast is no longer limited by the elevation grid. Row 0 is the heightmap's north row (pair with `DataTexture.flipY = true` to align with
 * `PlaneGeometry` UVs).
 * @param heightmap - the elevation source
 * @param options - the texture options
 * @param landMask - which cells are land; falls back to thresholding elevation when omitted
 * @param areaTint - an optional colour claimed over part of the map (the political layer)
 * @returns an `RGBA` `Uint8Array` of length `width * height * 4`
 */

/** Everything a row of the composite needs that does not change from one row to the next. */
interface TerrainRowContext {
  /** The elevation source. */
  heightmap: Heightmap
  /** Which cells are land — its bilinear coverage is what mixes sea and land across the shore. */
  mask: LandMask
  /** The look being composited. */
  options: TerrainTextureOptions
  /** A colour claimed over part of the map (the political layer), or `null`. */
  areaTint: AreaTint | null
  /**
   * The hillshade, bilinearly sampled at a fractional DEM position.
   * @param fx - fractional column
   * @param fy - fractional row
   * @returns the shading multiplier
   */
  shadeAt: (fx: number, fy: number) => number
  /** The flat sea tone, in `[0, 1]` channels. */
  baseSea: readonly [number, number, number]
  /** Scratch sea triplet, reused across the whole grid — the loop must stay allocation-free. */
  seaC: [number, number, number]
  /** Scratch land triplet, likewise. */
  landC: [number, number, number]
  /** Width of the output image in pixels. */
  outWidth: number
}

/**
 * How far the snow line drops, for each output row.
 *
 * Resolved once per row because it depends only on latitude, and latitude only on the row. Web Mercator
 * is non-linear in latitude, hence the projection round trip rather than a lerp down the image.
 * @param heightmap - the elevation source, for its geographic bounds
 * @param options - the snow-line settings
 * @param outHeight - the output image height in pixels
 * @returns one drop per output row
 */
export function snowLineDropByRow(
  heightmap: Heightmap,
  options: TerrainTextureOptions,
  outHeight: number
): Float32Array {
  const drops = new Float32Array(outHeight)
  for (let oy = 0; oy < outHeight; oy++) {
    const v = outHeight > 1 ? oy / (outHeight - 1) : 0
    drops[oy] = snowLineDrop(verticalToLatitude(v, heightmap.meta.bbox), options)
  }
  return drops
}

/**
 * Bilinearly sample a DEM-resolution greyscale field at a fractional grid position.
 *
 * A sampler rather than a per-call function so the grid dimensions are bound once: this is read once per
 * output pixel, which is over twenty million times at the 4x bake.
 * @param field - the field, row-major, length `width * height`
 * @param width - the field's width in samples
 * @param height - the field's height in samples
 * @returns the sampler
 */
export function createShadeSampler(
  field: Float32Array,
  width: number,
  height: number
): (fx: number, fy: number) => number {
  return (fx: number, fy: number): number => {
    // Clamp the POSITION, not just the indices it lands on. Clamping only the indices looks like a
    // guard and is not one: the interpolation weight stays `fx - x0`, so a position outside the field
    // extrapolates away from it instead of stopping at the edge. Identical for any position inside.
    const cx = Math.min(width - 1, Math.max(0, fx))
    const cy = Math.min(height - 1, Math.max(0, fy))
    const x0 = Math.floor(cx)
    const y0 = Math.floor(cy)
    const x1 = Math.min(width - 1, x0 + 1)
    const y1 = Math.min(height - 1, y0 + 1)
    const tx = cx - x0
    const ty = cy - y0
    const top = (field[y0 * width + x0] ?? 1) * (1 - tx) + (field[y0 * width + x1] ?? 1) * tx
    const bottom = (field[y1 * width + x0] ?? 1) * (1 - tx) + (field[y1 * width + x1] ?? 1) * tx
    return top * (1 - ty) + bottom * ty
  }
}

/**
 * The sea tone at a sample — flat, or carrying the greyscale elevation layer when asked.
 * @param out - the triplet to write into
 * @param baseSea - the flat sea tone
 * @param elevation - the sample elevation in metres
 * @param options - the texture options
 * @returns nothing; `out` is written in place
 */
export function seaColorInto(
  out: [number, number, number],
  baseSea: readonly [number, number, number],
  elevation: number,
  options: TerrainTextureOptions
): void {
  if (!options.elevationIncludesSea) {
    out[0] = baseSea[0]
    out[1] = baseSea[1]
    out[2] = baseSea[2]
    return
  }
  blendGreyInto(
    out,
    baseSea,
    elevationGrey(elevation, options),
    options.elevationMode,
    options.elevationStrength
  )
}

/**
 * Mix sea and land by coverage, apply the paper grain, and write one RGBA pixel.
 * @param rgba - the output buffer
 * @param offset - the pixel's byte offset
 * @param seaC - the sea tone, valid when coverage is below one
 * @param landC - the land tone, valid when coverage is above zero
 * @param coverage - how much of the sample is land, in `[0, 1]`
 * @param modulation - the grain multiplier, centred on one
 * @returns nothing; `rgba` is written in place
 */
export function writeTerrainPixel(
  rgba: Uint8Array,
  offset: number,
  seaC: readonly [number, number, number],
  landC: readonly [number, number, number],
  coverage: number,
  modulation: number
): void {
  for (let k = 0; k < 3; k++) {
    const sea = coverage < 1 ? (seaC[k] ?? 0) : 0
    const land = coverage > 0 ? (landC[k] ?? 0) : 0
    const mixed = sea + (land - sea) * coverage
    rgba[offset + k] = Math.round(Math.min(1, Math.max(0, mixed * modulation)) * 255)
  }
  rgba[offset + 3] = 255
}

/**
 * Composite one output row.
 * @param rgba - the output buffer
 * @param context - everything that does not change from row to row
 * @param oy - the output row
 * @param fy - that row's fractional position in the DEM
 * @param snowDrop - how far the snow line drops at this latitude
 * @returns nothing; `rgba` is written in place
 */
function composeTerrainRow(
  rgba: Uint8Array,
  context: TerrainRowContext,
  oy: number,
  fy: number,
  snowDrop: number
): void {
  const { heightmap, mask, options, outWidth } = context
  const { width, height } = heightmap.meta
  for (let ox = 0; ox < outWidth; ox++) {
    const fx = outWidth > 1 ? (ox * (width - 1)) / (outWidth - 1) : 0
    // Bilinear elevation: at scale 1 this lands exactly on the DEM samples, so the 1:1 bake is
    // unchanged; above 1 it interpolates between them.
    const u = width > 1 ? fx / (width - 1) : 0
    const v = height > 1 ? fy / (height - 1) : 0
    const e = heightmap.sample(u, v)
    const coverage = mask.coverage(u, v)

    if (coverage < 1) seaColorInto(context.seaC, context.baseSea, e, options)
    if (coverage > 0) {
      landColorInto(
        context.landC,
        e,
        context.shadeAt(fx, fy),
        options,
        snowDrop,
        context.areaTint?.at(u, v) ?? null
      )
    }

    // Vellum grain: a final multiplicative paper mottling over land AND sea, so the parchment fibre
    // reads uniformly across continents and ocean alike (centred on 1 -> lightens/darkens patches).
    // Sampled in output pixels, so a finer bake buys finer fibre — the point of supersampling.
    const modulation = 1 + (paperNoise(ox, oy, options.grainScale) - 0.5) * options.grain
    writeTerrainPixel(
      rgba,
      (oy * outWidth + ox) * 4,
      context.seaC,
      context.landC,
      coverage,
      modulation
    )
  }
}

export function composeTerrainRgba(
  heightmap: Heightmap,
  options: TerrainTextureOptions,
  landMask?: LandMask,
  areaTint?: AreaTint
): Uint8Array {
  // The elevation fallback is a documented degraded mode, not an equivalent: it drowns land lying below
  // sea level and dries out every lake above it.
  const mask = landMask ?? createElevationLandMask(heightmap, options.seaLevel)
  const { width, height } = heightmap.meta
  const { width: outWidth, height: outHeight } = terrainTextureSize(heightmap, options)
  const rgba = new Uint8Array(outWidth * outHeight * 4)
  const snowDropByRow = snowLineDropByRow(heightmap, options, outHeight)
  const context: TerrainRowContext = {
    heightmap,
    mask,
    options,
    areaTint: areaTint ?? null,
    shadeAt: createShadeSampler(computeHillshade(heightmap, options), width, height),
    baseSea: [options.sea.r / 255, options.sea.g / 255, options.sea.b / 255],
    // Scratch triplets reused across the whole grid — the loop must stay allocation-free.
    seaC: [0, 0, 0],
    landC: [0, 0, 0],
    outWidth,
  }

  for (let oy = 0; oy < outHeight; oy++) {
    const fy = outHeight > 1 ? (oy * (height - 1)) / (outHeight - 1) : 0
    composeTerrainRow(rgba, context, oy, fy, snowDropByRow[oy] ?? 0)
  }
  return rgba
}
