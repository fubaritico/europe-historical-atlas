import { DataTexture, LinearFilter, RGBAFormat, SRGBColorSpace, UnsignedByteType } from 'three'

import { hashInts } from '../utils/hash'

import type { Heightmap } from '../data/heightmap'

/**
 * A layer blend mode, applied per colour channel on normalized `[0, 1]` values (Photoshop-style).
 * `normal` = replace, `multiply` = darken (the cartographic hillshade blend), `overlay`/`softLight` =
 * contrast-preserving.
 */
export type BlendMode = 'normal' | 'multiply' | 'overlay' | 'softLight'

/** An 8-bit sRGB colour (channels in `[0, 255]`). */
export interface RgbColor {
  /** Red channel `[0, 255]`. */
  r: number
  /** Green channel `[0, 255]`. */
  g: number
  /** Blue channel `[0, 255]`. */
  b: number
}

/**
 * Options controlling the baked terrain texture: a parchment base, an elevation (hypsometric) tint, and a
 * DEM-derived hillshade composited over it — the "old map" look, painted into the bitmap so it reads the
 * same regardless of camera angle or scene lights.
 */
export interface TerrainTextureOptions {
  /** Elevation (metres) at/below which a sample is sea — flat parchment `sea` tone, no hillshade. */
  seaLevel: number
  /** Land base tone (the parchment paper colour under the tint). */
  parchment: RgbColor
  /** Sea/out-of-frame tone (uniform, no relief) — the hors-champ parchment. */
  sea: RgbColor
  /** Hypsometric tint at land start (just above `seaLevel`). */
  lowland: RgbColor
  /** Hypsometric tint at `peakReference` and above. */
  highland: RgbColor
  /** Elevation (metres) mapped to the full `highland` tint; higher samples clamp to it. */
  peakReference: number
  /** How the hypsometric tint blends over the parchment base. */
  tintMode: BlendMode
  /** Tint blend amount `[0, 1]` (0 = pure parchment, 1 = full blended tint). */
  tintStrength: number
  /** How the hillshade blends over the tinted land (usually `multiply`). */
  hillshadeMode: BlendMode
  /** Hillshade blend amount `[0, 1]` (0 = no shading, 1 = full shading). */
  hillshadeStrength: number
  /** Light source azimuth in degrees, clockwise from north (cartographic convention; 315 = NW). */
  lightAzimuthDeg: number
  /** Light source altitude in degrees above the horizon (45 = default cartographic sun). */
  lightAltitudeDeg: number
  /** Vertical exaggeration applied to slopes for shading only (higher = more pronounced relief). */
  zFactor: number
  /** Vellum grain amount `[0, 1]` (0 = flat colour; higher = more pronounced paper mottling). */
  grain: number
  /** Vellum grain spatial scale in pixels (larger = coarser, larger paper mottling). */
  grainScale: number
}

/**
 * Sensible vintage defaults for {@link TerrainTextureOptions} — a warm parchment, a warm-brown highland
 * tint, an NW light. Tunable live via the dev panel.
 */
export const DEFAULT_TERRAIN_OPTIONS: TerrainTextureOptions = {
  seaLevel: 0,
  parchment: { r: 228, g: 210, b: 172 },
  sea: { r: 210, g: 200, b: 174 },
  lowland: { r: 228, g: 212, b: 176 },
  highland: { r: 206, g: 182, b: 140 },
  peakReference: 3000,
  tintMode: 'multiply',
  tintStrength: 0.3,
  hillshadeMode: 'multiply',
  hillshadeStrength: 0.42,
  lightAzimuthDeg: 315,
  lightAltitudeDeg: 55,
  zFactor: 0.002,
  grain: 0.05,
  grainScale: 4,
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
 * Composite one land pixel's colour in `[0, 1]` per channel: hypsometric tint blended over the parchment
 * base, then the DEM hillshade blended over that (both with their own mode + strength).
 * @param elevation - sample elevation in metres (assumed above `seaLevel`)
 * @param shade - hillshade intensity `[0, 1]` at this pixel
 * @param options - the texture options
 * @returns the land colour as a normalized `[0, 1]` RGB triplet
 */
function landColor(
  elevation: number,
  shade: number,
  options: TerrainTextureOptions
): [number, number, number] {
  const tint = hypsometricTint(elevation, options)
  const parchment = [
    options.parchment.r / 255,
    options.parchment.g / 255,
    options.parchment.b / 255,
  ]
  const out: [number, number, number] = [0, 0, 0]
  for (let k = 0; k < 3; k++) {
    const baseC = parchment[k] ?? 0
    const tinted =
      baseC + (blendChannel(baseC, tint[k] ?? 0, options.tintMode) - baseC) * options.tintStrength
    out[k] =
      tinted +
      (blendChannel(tinted, shade, options.hillshadeMode) - tinted) * options.hillshadeStrength
  }
  return out
}

/**
 * Composite the terrain into an RGBA byte buffer: parchment base, hypsometric tint over land, DEM
 * hillshade multiplied on top (sea samples get the flat `sea` tone), then a vellum paper grain modulated
 * over everything. Row 0 is the heightmap's north row (pair with `DataTexture.flipY = true` to align
 * with `PlaneGeometry` UVs).
 * @param heightmap - the elevation source
 * @param options - the texture options
 * @returns an `RGBA` `Uint8Array` of length `width * height * 4`
 */
export function composeTerrainRgba(
  heightmap: Heightmap,
  options: TerrainTextureOptions
): Uint8Array {
  const { width, height } = heightmap.meta
  const src = heightmap.data
  const shade = computeHillshade(heightmap, options)
  const rgba = new Uint8Array(width * height * 4)
  const seaTone: [number, number, number] = [
    options.sea.r / 255,
    options.sea.g / 255,
    options.sea.b / 255,
  ]

  for (let p = 0; p < width * height; p++) {
    const e = src[p] ?? 0
    const x = p % width
    const y = Math.floor(p / width)
    const [cr, cg, cb] = e <= options.seaLevel ? seaTone : landColor(e, shade[p] ?? 1, options)

    // Vellum grain: a final multiplicative paper mottling over land AND sea, so the parchment fibre
    // reads uniformly across continents and ocean alike (centred on 1 → lightens/darkens patches).
    const modulation = 1 + (paperNoise(x, y, options.grainScale) - 0.5) * options.grain

    const o = p * 4
    rgba[o] = Math.round(Math.min(1, Math.max(0, cr * modulation)) * 255)
    rgba[o + 1] = Math.round(Math.min(1, Math.max(0, cg * modulation)) * 255)
    rgba[o + 2] = Math.round(Math.min(1, Math.max(0, cb * modulation)) * 255)
    rgba[o + 3] = 255
  }
  return rgba
}

/**
 * Build a {@link DataTexture} of the composited terrain, ready to drop onto an unlit material's `map`.
 * `flipY` is set so the buffer's north-first rows align with `PlaneGeometry` UVs; caller disposes it.
 * @param heightmap - the elevation source
 * @param options - the texture options
 * @returns the terrain texture (sRGB, linear-filtered, no mipmaps)
 */
export function createTerrainTexture(
  heightmap: Heightmap,
  options: TerrainTextureOptions
): DataTexture {
  const { width, height } = heightmap.meta
  const rgba = composeTerrainRgba(heightmap, options)
  const texture = new DataTexture(rgba, width, height, RGBAFormat, UnsignedByteType)
  texture.flipY = true // buffer row 0 = north; UV v=1 (north vertex) must sample it
  texture.colorSpace = SRGBColorSpace
  texture.magFilter = LinearFilter
  texture.minFilter = LinearFilter
  texture.needsUpdate = true
  return texture
}
