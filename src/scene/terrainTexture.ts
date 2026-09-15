import {
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  RGBAFormat,
  SRGBColorSpace,
  UnsignedByteType,
} from 'three'

import { verticalToLatitude } from '../geo/mercator'
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
 * Options controlling the baked terrain texture: a parchment base, an elevation (hypsometric) tint, a
 * greyscale heightmap layer, and a DEM-derived hillshade composited over it — the "old map" look, painted
 * into the bitmap so it reads the same regardless of camera angle or scene lights.
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
  /** Elevation (metres) where snow starts to appear. */
  snowStart: number
  /** Elevation (metres) where snow fully covers the ground; smoothstepped up from `snowStart`. */
  snowFull: number
  /** The snow colour (a warm white reads better on parchment than a pure white). */
  snow: RgbColor
  /** Snow amount `[0, 1]` at full coverage (0 = no snow band at all). */
  snowStrength: number
  /** Latitude (degrees) at which `snowStart`/`snowFull` apply unmodified. */
  snowLatitudeRef: number
  /** Metres the snow line drops per degree of latitude north of `snowLatitudeRef` (0 = no tilt). */
  snowLatitudeDrop: number
  /** Elevation (metres) mapped to pure black in the greyscale heightmap layer. */
  elevationFloor: number
  /** Elevation (metres) mapped to pure white in the greyscale heightmap layer; higher samples clamp. */
  elevationCeiling: number
  /** How the greyscale heightmap layer blends over the tinted land. */
  elevationMode: BlendMode
  /** Greyscale heightmap blend amount `[0, 1]` (0 = layer off, 1 = full). */
  elevationStrength: number
  /** Whether the greyscale heightmap layer also applies to sea samples (else sea stays a flat tone). */
  elevationIncludesSea: boolean
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
  /**
   * How many texture pixels to bake per DEM sample, per axis (1 = one-to-one, 2 = double resolution).
   * This buys no new terrain detail — the DEM caps that — but the grain, the snow line and the coast
   * antialiasing are all evaluated per output pixel, so they get genuinely finer. Costs the square of
   * this factor in bake time, so drop it to 1 while tuning.
   */
  supersample: number
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
  snowStart: 1300,
  snowFull: 2300,
  snow: { r: 250, g: 248, b: 242 },
  snowStrength: 0.9,
  // Referenced on the Alps: the thresholds above are the alpine snow line, and every other latitude is
  // offset from it. ~55 m per degree tracks the real snow line closely enough across the frame — it puts
  // Scandinavia and Iceland under snow from ~400 m while keeping the Atlas bare below ~2100 m.
  snowLatitudeRef: 46,
  snowLatitudeDrop: 55,
  elevationFloor: 0,
  // Low ceiling on purpose: Europe is mostly under 1500 m, so a high reference (say 4000) crushes the
  // whole continent into the darkest few percent of the ramp and the valley detail disappears.
  elevationCeiling: 1500,
  elevationMode: 'multiply',
  elevationStrength: 0.25,
  elevationIncludesSea: false,
  hillshadeMode: 'multiply',
  hillshadeStrength: 0.42,
  lightAzimuthDeg: 315,
  lightAltitudeDeg: 55,
  zFactor: 0.002,
  grain: 0.05,
  grainScale: 4,
  supersample: 2,
}

/**
 * How one tunable should be exposed by a control surface. Kept here rather than in the panel so a
 * value's valid range lives beside its default: they are two halves of the same statement, and when
 * they sit in different files nothing stops a default from drifting outside its own slider.
 */
export type ControlSpec =
  | {
      /** A numeric slider. */
      kind: 'number'
      /** Lowest selectable value. */
      min: number
      /** Highest selectable value. */
      max: number
      /** Slider increment. */
      step: number
      /** Text shown next to the control. */
      label: string
    }
  | {
      /** A checkbox. */
      kind: 'boolean'
      /** Text shown next to the control. */
      label: string
    }
  | {
      /** An RGB colour picker. */
      kind: 'color'
      /** Text shown next to the control. */
      label: string
    }
  | {
      /** A {@link BlendMode} dropdown. */
      kind: 'blend'
      /** Text shown next to the control. */
      label: string
    }

/** Pick the {@link ControlSpec} variant that matches a tunable's type. */
type SpecFor<T> = T extends number
  ? Extract<ControlSpec, { kind: 'number' }>
  : T extends boolean
    ? Extract<ControlSpec, { kind: 'boolean' }>
    : T extends RgbColor
      ? Extract<ControlSpec, { kind: 'color' }>
      : Extract<ControlSpec, { kind: 'blend' }>

/**
 * The range, step and label of every {@link TerrainTextureOptions} field. The mapped type is the point:
 * adding an option without describing it here is a compile error, so a new tunable can never silently
 * miss its control.
 */
export const TERRAIN_CONTROLS: {
  [K in keyof TerrainTextureOptions]: SpecFor<TerrainTextureOptions[K]>
} = {
  seaLevel: { kind: 'number', min: -200, max: 500, step: 10, label: 'sea level (m)' },
  parchment: { kind: 'color', label: 'parchment' },
  sea: { kind: 'color', label: 'sea' },
  tintStrength: { kind: 'number', min: 0, max: 1, step: 0.05, label: 'strength' },
  tintMode: { kind: 'blend', label: 'blend' },
  peakReference: { kind: 'number', min: 500, max: 5000, step: 100, label: 'peak ref (m)' },
  lowland: { kind: 'color', label: 'lowland' },
  highland: { kind: 'color', label: 'highland' },
  elevationStrength: { kind: 'number', min: 0, max: 1, step: 0.05, label: 'strength' },
  elevationMode: { kind: 'blend', label: 'blend' },
  elevationFloor: { kind: 'number', min: -8000, max: 2000, step: 100, label: 'black at (m)' },
  elevationCeiling: { kind: 'number', min: 500, max: 7000, step: 100, label: 'white at (m)' },
  elevationIncludesSea: { kind: 'boolean', label: 'over sea too' },
  snowStrength: { kind: 'number', min: 0, max: 1, step: 0.05, label: 'strength' },
  snowStart: { kind: 'number', min: 0, max: 5000, step: 50, label: 'starts at (m)' },
  snowFull: { kind: 'number', min: 0, max: 6000, step: 50, label: 'full at (m)' },
  snow: { kind: 'color', label: 'tone' },
  snowLatitudeDrop: { kind: 'number', min: 0, max: 120, step: 5, label: 'line tilt (m/°)' },
  snowLatitudeRef: { kind: 'number', min: 0, max: 80, step: 1, label: 'line ref (°N)' },
  hillshadeStrength: { kind: 'number', min: 0, max: 1, step: 0.05, label: 'strength' },
  hillshadeMode: { kind: 'blend', label: 'blend' },
  lightAzimuthDeg: { kind: 'number', min: 0, max: 360, step: 1, label: 'light azimuth' },
  lightAltitudeDeg: { kind: 'number', min: 5, max: 85, step: 1, label: 'light altitude' },
  zFactor: { kind: 'number', min: 0.0002, max: 0.006, step: 0.0002, label: 'relief strength' },
  grain: { kind: 'number', min: 0, max: 1, step: 0.05, label: 'grain (vellum)' },
  grainScale: { kind: 'number', min: 1, max: 40, step: 1, label: 'grain scale (px)' },
  supersample: { kind: 'number', min: 1, max: 3, step: 1, label: 'resolution (×DEM)' },
}

/** A named set of tunables presented together. */
export interface ControlGroup {
  /** The group's heading. */
  title: string
  /** The options it contains, in display order. */
  keys: (keyof TerrainTextureOptions)[]
}

/**
 * The tunables grouped by the layer they drive, in the order {@link composeTerrainRgba} applies them.
 * A panel built from this reads as the rendering stack, which is what makes the effect of any one
 * slider predictable: everything in a later group is composited on top of the earlier ones.
 */
export const TERRAIN_CONTROL_GROUPS: ControlGroup[] = [
  { title: '1 · base', keys: ['seaLevel', 'parchment', 'sea'] },
  {
    title: '2 · hypsometric tint',
    keys: ['tintStrength', 'tintMode', 'peakReference', 'lowland', 'highland'],
  },
  {
    title: '3 · heightmap (B&W)',
    keys: [
      'elevationStrength',
      'elevationMode',
      'elevationFloor',
      'elevationCeiling',
      'elevationIncludesSea',
    ],
  },
  {
    title: '4 · snow',
    keys: ['snowStrength', 'snowStart', 'snowFull', 'snow', 'snowLatitudeDrop', 'snowLatitudeRef'],
  },
  {
    title: '5 · hillshade',
    keys: ['hillshadeStrength', 'hillshadeMode', 'lightAzimuthDeg', 'lightAltitudeDeg', 'zFactor'],
  },
  { title: '6 · paper & bake', keys: ['grain', 'grainScale', 'supersample'] },
]

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
  base: [number, number, number],
  grey: number,
  mode: BlendMode,
  strength: number
): void {
  for (let k = 0; k < 3; k++) {
    const c = base[k] ?? 0
    out[k] = c + (blendChannel(c, grey, mode) - c) * strength
  }
}

/**
 * Estimate how much of a texel is land, by turning its height above `seaLevel` into a signed distance to
 * the shoreline (expressed in texels, via the local DEM gradient) and covering the ±½-texel band around
 * it. This is the CPU equivalent of a shader's `fwidth`-based antialiasing: it replaces the hard binary
 * sea/land test with a sub-texel coverage ratio, which removes the staircase along the coast. It does
 * NOT invent detail the DEM lacks — it only places the existing shoreline more precisely inside a texel.
 * @param elevation - the texel's elevation in metres
 * @param gradientPerTexel - local elevation gradient magnitude, in metres per texel
 * @param seaLevel - the shoreline elevation in metres
 * @returns land coverage in `[0, 1]` (0 = fully sea, 1 = fully land)
 */
export function coastCoverage(
  elevation: number,
  gradientPerTexel: number,
  seaLevel: number
): number {
  // A flat (or degenerate) neighbourhood gives no usable distance — fall back to the binary test.
  if (!(gradientPerTexel > 0)) return elevation <= seaLevel ? 0 : 1
  const t = (elevation - seaLevel) / gradientPerTexel + 0.5
  if (t <= 0) return 0
  if (t >= 1) return 1
  return t * t * (3 - 2 * t) // smoothstep
}

/**
 * Horn 3×3 gradient magnitude at a grid cell, in metres per texel. Edge cells replicate their nearest
 * in-bounds neighbour (same convention as {@link computeHillshade}).
 * @param heightmap - the elevation source
 * @param x - grid column
 * @param y - grid row
 * @returns the gradient magnitude in metres per texel
 */
function gradientAt(heightmap: Heightmap, x: number, y: number): number {
  const { width, height } = heightmap.meta
  const src = heightmap.data
  const at = (gx: number, gy: number): number => {
    const cx = gx < 0 ? 0 : gx >= width ? width - 1 : gx
    const cy = gy < 0 ? 0 : gy >= height ? height - 1 : gy
    return src[cy * width + cx] ?? 0
  }
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
  return Math.hypot(dzdx, dzdy)
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
 * @returns nothing; `out` holds the result
 */
function landColorInto(
  out: [number, number, number],
  elevation: number,
  shade: number,
  options: TerrainTextureOptions,
  snowDrop: number
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
  blendGreyInto(out, out, shade, options.hillshadeMode, options.hillshadeStrength)
}

/**
 * Composite the terrain into an RGBA byte buffer: parchment base, hypsometric tint over land, the
 * greyscale heightmap layer, DEM hillshade multiplied on top (sea samples get the flat `sea` tone, and
 * the greyscale layer only if `elevationIncludesSea`), then a vellum paper grain modulated over
 * everything. Texels straddling the shoreline mix sea and land by sub-texel coverage
 * ({@link coastCoverage}) instead of snapping to one or the other, which removes the staircase along
 * the coast. Row 0 is the heightmap's north row (pair with `DataTexture.flipY = true` to align with
 * `PlaneGeometry` UVs).
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
  const { width: outWidth, height: outHeight } = terrainTextureSize(heightmap, options)
  const scale = outWidth / width
  const rgba = new Uint8Array(outWidth * outHeight * 4)
  const baseSea: [number, number, number] = [
    options.sea.r / 255,
    options.sea.g / 255,
    options.sea.b / 255,
  ]
  // Scratch triplets reused across the whole grid — the loop must stay allocation-free.
  const seaC: [number, number, number] = [0, 0, 0]
  const landC: [number, number, number] = [0, 0, 0]

  const elevationAt = (gx: number, gy: number): number => {
    const cx = gx < 0 ? 0 : gx >= width ? width - 1 : gx
    const cy = gy < 0 ? 0 : gy >= height ? height - 1 : gy
    return src[cy * width + cx] ?? 0
  }

  // Which DEM cells straddle the shoreline. Resolved once on the source grid: the cheap 4-neighbour
  // sign test gates the ~0.1 % of cells that sit on a coast, so only those pay for a gradient below.
  const straddlesCoast = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const isSea = elevationAt(x, y) <= options.seaLevel
      straddlesCoast[y * width + x] =
        elevationAt(x - 1, y) <= options.seaLevel !== isSea ||
        elevationAt(x + 1, y) <= options.seaLevel !== isSea ||
        elevationAt(x, y - 1) <= options.seaLevel !== isSea ||
        elevationAt(x, y + 1) <= options.seaLevel !== isSea
          ? 1
          : 0
    }
  }

  // The snow line only depends on latitude, and latitude only on the row — so resolve it once per
  // output row. Web Mercator is non-linear in latitude, hence the projection round-trip, not a lerp.
  const snowDropByRow = new Float32Array(outHeight)
  for (let oy = 0; oy < outHeight; oy++) {
    const v = outHeight > 1 ? oy / (outHeight - 1) : 0
    snowDropByRow[oy] = snowLineDrop(verticalToLatitude(v, heightmap.meta.bbox), options)
  }

  /** Bilinearly sample the DEM-resolution hillshade at a fractional grid position. */
  const shadeAt = (fx: number, fy: number): number => {
    const x0 = Math.min(width - 1, Math.max(0, Math.floor(fx)))
    const y0 = Math.min(height - 1, Math.max(0, Math.floor(fy)))
    const x1 = Math.min(width - 1, x0 + 1)
    const y1 = Math.min(height - 1, y0 + 1)
    const tx = fx - x0
    const ty = fy - y0
    const top = (shade[y0 * width + x0] ?? 1) * (1 - tx) + (shade[y0 * width + x1] ?? 1) * tx
    const bottom = (shade[y1 * width + x0] ?? 1) * (1 - tx) + (shade[y1 * width + x1] ?? 1) * tx
    return top * (1 - ty) + bottom * ty
  }

  for (let oy = 0; oy < outHeight; oy++) {
    const fy = outHeight > 1 ? (oy * (height - 1)) / (outHeight - 1) : 0
    const cellY = Math.min(height - 1, Math.max(0, Math.round(fy)))
    const snowDrop = snowDropByRow[oy] ?? 0

    for (let ox = 0; ox < outWidth; ox++) {
      const fx = outWidth > 1 ? (ox * (width - 1)) / (outWidth - 1) : 0
      const cellX = Math.min(width - 1, Math.max(0, Math.round(fx)))
      // Bilinear elevation: at scale 1 this lands exactly on the DEM samples, so the 1:1 bake is
      // unchanged; above 1 it interpolates between them.
      const e = heightmap.sample(
        width > 1 ? fx / (width - 1) : 0,
        height > 1 ? fy / (height - 1) : 0
      )
      const isSea = e <= options.seaLevel
      // The gradient is metres per DEM cell; the antialiasing band is half an *output* pixel, which is
      // `scale` times smaller — so the coast stays a one-pixel edge however finely we bake.
      const coverage =
        straddlesCoast[cellY * width + cellX] === 1
          ? coastCoverage(e, gradientAt(heightmap, cellX, cellY) / scale, options.seaLevel)
          : isSea
            ? 0
            : 1

      if (coverage < 1) {
        if (options.elevationIncludesSea) {
          blendGreyInto(
            seaC,
            baseSea,
            elevationGrey(e, options),
            options.elevationMode,
            options.elevationStrength
          )
        } else {
          seaC[0] = baseSea[0]
          seaC[1] = baseSea[1]
          seaC[2] = baseSea[2]
        }
      }
      if (coverage > 0) landColorInto(landC, e, shadeAt(fx, fy), options, snowDrop)

      // Vellum grain: a final multiplicative paper mottling over land AND sea, so the parchment fibre
      // reads uniformly across continents and ocean alike (centred on 1 → lightens/darkens patches).
      // Sampled in output pixels, so a finer bake buys finer fibre — the point of supersampling.
      const modulation = 1 + (paperNoise(ox, oy, options.grainScale) - 0.5) * options.grain

      const o = (oy * outWidth + ox) * 4
      for (let k = 0; k < 3; k++) {
        const sea = coverage < 1 ? (seaC[k] ?? 0) : 0
        const land = coverage > 0 ? (landC[k] ?? 0) : 0
        const mixed = sea + (land - sea) * coverage
        rgba[o + k] = Math.round(Math.min(1, Math.max(0, mixed * modulation)) * 255)
      }
      rgba[o + 3] = 255
    }
  }
  return rgba
}

/**
 * Build a {@link DataTexture} of the composited terrain, ready to drop onto an unlit material's `map`.
 * `flipY` is set so the buffer's north-first rows align with `PlaneGeometry` UVs; caller disposes it.
 * @param heightmap - the elevation source
 * @param options - the texture options
 * @returns the terrain texture (sRGB, mipmapped, sized by `supersample`)
 */
export function createTerrainTexture(
  heightmap: Heightmap,
  options: TerrainTextureOptions
): DataTexture {
  const { width, height } = terrainTextureSize(heightmap, options)
  const rgba = composeTerrainRgba(heightmap, options)
  const texture = new DataTexture(rgba, width, height, RGBAFormat, UnsignedByteType)
  texture.flipY = true // buffer row 0 = north; UV v=1 (north vertex) must sample it
  texture.colorSpace = SRGBColorSpace
  texture.magFilter = LinearFilter
  // Mipmapped minification: zoomed out, one screen pixel covers many texels, and sampling a single one
  // of them makes the grain and the coastline shimmer as the camera moves.
  texture.minFilter = LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.needsUpdate = true
  return texture
}
