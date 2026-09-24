/**
 * What the terrain's painted look is made of: the layers, their defaults, and the range and label of
 * every control.
 *
 * Split out of `terrainCompose` so the compositor holds the computation and this holds the declaration —
 * the same separation `devParams/` makes for every other panel folder. Nothing here computes a pixel.
 */

import type { RgbColor } from '../utils/color'
import type { ControlGroup, ControlTable } from '../utils/controlSpec'

/**
 * A layer blend mode, applied per colour channel on normalized `[0, 1]` values (Photoshop-style).
 * `normal` = replace, `multiply` = darken (the cartographic hillshade blend), `overlay`/`softLight` =
 * contrast-preserving.
 */
export type BlendMode = 'normal' | 'multiply' | 'overlay' | 'softLight'

export type { RgbColor } from '../utils/color'

/**
 * A colour claimed over part of the map — the seam through which a political layer reaches the
 * compositor.
 *
 * Declared here, by the consumer, rather than in the data layer: the terrain compositor needs to know
 * that *some* area carries *some* tint, and nothing about polities, dates or borders.
 */
export interface AreaTint {
  /**
   * The tint at a normalized coordinate, or `null` where nothing claims it.
   * @param u - horizontal coordinate `[0, 1]` (0 = west edge)
   * @param v - vertical coordinate `[0, 1]` (0 = north edge)
   * @returns the tint, or `null`
   */
  at(u: number, v: number): RgbColor | null
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
  /** How the political tint blends over the ground colour. */
  politicalMode: BlendMode
  /** Political tint amount `[0, 1]` (0 = no political layer at all). */
  politicalStrength: number
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
  // `normal` rather than `multiply`: multiply can only darken, so on pale parchment every polity slid
  // toward the same muddy olive. A straight interpolation keeps the hue, and the hillshade applied
  // afterwards is what keeps the relief legible under the colour.
  politicalMode: 'overlay',
  politicalStrength: 1,
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

/** The blend modes a {@link BlendMode} dropdown offers, in panel order. */
export const BLEND_MODES = ['multiply', 'overlay', 'softLight', 'normal'] as const

/**
 * The range, step and label of every {@link TerrainTextureOptions} field. Declared beside the defaults
 * it bounds, so the two cannot drift apart; the mapped type makes an undescribed option a compile error.
 */
export const TERRAIN_CONTROLS: ControlTable<TerrainTextureOptions> = {
  seaLevel: { kind: 'number', min: -200, max: 500, step: 10, label: 'sea level (m)' },
  parchment: { kind: 'color', label: 'parchment' },
  sea: { kind: 'color', label: 'sea' },
  tintStrength: { kind: 'number', min: 0, max: 1, step: 0.05, label: 'strength' },
  tintMode: { kind: 'choice', options: BLEND_MODES, label: 'blend' },
  peakReference: { kind: 'number', min: 500, max: 5000, step: 100, label: 'peak ref (m)' },
  lowland: { kind: 'color', label: 'lowland' },
  highland: { kind: 'color', label: 'highland' },
  elevationStrength: { kind: 'number', min: 0, max: 1, step: 0.05, label: 'strength' },
  elevationMode: { kind: 'choice', options: BLEND_MODES, label: 'blend' },
  politicalStrength: { kind: 'number', min: 0, max: 1, step: 0.05, label: 'strength' },
  politicalMode: { kind: 'choice', options: BLEND_MODES, label: 'blend' },
  elevationFloor: { kind: 'number', min: -8000, max: 2000, step: 100, label: 'black at (m)' },
  elevationCeiling: { kind: 'number', min: 500, max: 7000, step: 100, label: 'white at (m)' },
  elevationIncludesSea: { kind: 'boolean', label: 'over sea too' },
  snowStrength: { kind: 'number', min: 0, max: 1, step: 0.05, label: 'strength' },
  snowStart: { kind: 'number', min: 0, max: 5000, step: 50, label: 'starts at (m)' },
  snowFull: { kind: 'number', min: 0, max: 6000, step: 50, label: 'full at (m)' },
  snow: { kind: 'color', label: 'tone' },
  snowLatitudeDrop: { kind: 'number', min: 0, max: 120, step: 5, label: 'line tilt (m/\u00b0)' },
  snowLatitudeRef: { kind: 'number', min: 0, max: 80, step: 1, label: 'line ref (\u00b0N)' },
  hillshadeStrength: { kind: 'number', min: 0, max: 1, step: 0.05, label: 'strength' },
  hillshadeMode: { kind: 'choice', options: BLEND_MODES, label: 'blend' },
  lightAzimuthDeg: { kind: 'number', min: 0, max: 360, step: 1, label: 'light azimuth' },
  lightAltitudeDeg: { kind: 'number', min: 5, max: 85, step: 1, label: 'light altitude' },
  zFactor: { kind: 'number', min: 0.0002, max: 0.006, step: 0.0002, label: 'relief strength' },
  grain: { kind: 'number', min: 0, max: 1, step: 0.05, label: 'grain (vellum)' },
  grainScale: { kind: 'number', min: 1, max: 40, step: 1, label: 'grain scale (px)' },
  supersample: { kind: 'number', min: 1, max: 3, step: 1, label: 'resolution (\u00d7DEM)' },
}

/**
 * The tunables grouped by the layer they drive, in the order {@link composeTerrainRgba} applies them.
 * A panel built from this reads as the rendering stack, which is what makes the effect of any one
 * slider predictable: everything in a later group is composited on top of the earlier ones.
 */
export const TERRAIN_CONTROL_GROUPS: ControlGroup<TerrainTextureOptions>[] = [
  { title: '1 \u00b7 base', keys: ['seaLevel', 'parchment', 'sea'] },
  {
    title: '2 \u00b7 hypsometric tint',
    keys: ['tintStrength', 'tintMode', 'peakReference', 'lowland', 'highland'],
  },
  {
    title: '3 \u00b7 heightmap (B&W)',
    keys: [
      'elevationStrength',
      'elevationMode',
      'elevationFloor',
      'elevationCeiling',
      'elevationIncludesSea',
    ],
  },
  {
    title: '4 \u00b7 snow',
    keys: ['snowStrength', 'snowStart', 'snowFull', 'snow', 'snowLatitudeDrop', 'snowLatitudeRef'],
  },
  { title: '5 \u00b7 political', keys: ['politicalStrength', 'politicalMode'] },
  {
    title: '6 \u00b7 hillshade',
    keys: ['hillshadeStrength', 'hillshadeMode', 'lightAzimuthDeg', 'lightAltitudeDeg', 'zFactor'],
  },
  { title: '7 \u00b7 paper & bake', keys: ['grain', 'grainScale', 'supersample'] },
]
