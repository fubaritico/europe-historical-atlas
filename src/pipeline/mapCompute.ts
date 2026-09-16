/**
 * The contracts for the map's expensive CPU work, stated so it can run anywhere — on the calling thread
 * or in a worker — without either side knowing which.
 *
 * Two jobs, deliberately separate: the political layer and the terrain bake. They are separate because
 * **the bake is not political**. It is what every texture tunable triggers, what the relief load
 * triggers, and what the land mask triggers; the political layer is merely one of its callers, and all
 * it contributes is a tint. Folding the bake into a political port would have left a second, untouched
 * bake behind for the other four callers — one image with two implementations, which is the failure the
 * raster-derived borders were built to abolish.
 */

import type { TerrainTextureOptions } from './terrainCompose'
import type { HeightmapMeta } from '../data/heightmap'
import type { LandMaskMeta } from '../data/landMask'
import type { RegionBorders } from '../data/regionRaster'
import type { Region } from '../data/regionSource'
import type { RgbColor } from '../utils/color'

/**
 * The phases a computation announces, in the order they run. Identifiers rather than sentences: a
 * compute module has no business holding the wording of a user-facing panel, let alone its language.
 */
export type ComputePhase = 'rasterise' | 'expand' | 'colours' | 'bake' | 'borders'

/**
 * Announce what a computation is *about to* spend time on. Announced before the phase, never after —
 * a label that names what has just finished tells the reader about a wait that is already over.
 * @param fraction - progress so far, in `[0, 1]`
 * @param phase - the phase about to run
 */
export type ProgressReport = (fraction: number, phase: ComputePhase) => void

/**
 * The shared sources both jobs read, in the plain form a worker can be handed: metadata plus a typed
 * array. Neither `Heightmap` nor `LandMask` survives a `postMessage` — both are closures — so what
 * crosses is what they rebuild from.
 */
export interface ComputeSources {
  /** The elevation grid: its metadata, and the row-major metres it wraps. */
  heightmap: { meta: HeightmapMeta; data: Int16Array | Float32Array }
  /** The land mask, packed; `null` falls the compute back on thresholding elevation. */
  landMask: { meta: LandMaskMeta; bits: Uint8Array } | null
}

/**
 * One political year, as asked for rather than as computed.
 *
 * `rasterScale` and `snapToCoast` arrive unmultiplied on purpose. Anything measured in *cells* has to
 * scale with the grid or its reach in kilometres silently halves, and the one place that cannot forget
 * is the module that owns the grid — not each caller in turn.
 */
export interface PoliticalRequest {
  /** The polities to draw, as rings in normalized grid coordinates. */
  regions: readonly Region[]
  /** Political grid cells per DEM cell, per axis (1 = the DEM's own resolution). */
  rasterScale: number
  /** How far a claim may grow over unclaimed land, in *DEM* cells. */
  snapToCoast: number
  /** Colour by the power a polity answers to rather than by the polity itself. */
  colorBySuzerain: boolean
  /** The automatic palette, for every polity no editorial rule pins. */
  palette: readonly RgbColor[]
  /** Chaikin rounds applied to the derived border lines. */
  borderSmoothing: number
}

/**
 * A computed political year. The raster comes back as its raw parts rather than as a `RegionRaster`,
 * for the same reason the sources go out that way: a closure does not cross a worker boundary.
 */
export interface PoliticalResult {
  /** Political grid width in cells. */
  width: number
  /** Political grid height in cells. */
  height: number
  /** Per-cell region indices, row-major, `-1` where unclaimed. */
  cells: Int16Array
  /** The colour each region takes, indexed as `regions` was. */
  tints: RgbColor[]
  /** The border lines, derived from the cells above so the two cannot disagree. */
  borders: RegionBorders
}

/** A composited terrain image, ready for the renderer to wrap as a texture. */
export interface TerrainBakeResult {
  /** The composited `RGBA` bytes, of length `width * height * 4`. */
  rgba: Uint8Array
  /** Image width in pixels. */
  width: number
  /** Image height in pixels. */
  height: number
}

/** Rasterise a political year, grow it to the coast, colour it, and derive its borders. */
export interface PoliticalCompute {
  /**
   * Compute one year.
   *
   * It also **installs the result as the tint subsequent bakes paint** — which is what lets a texture
   * tunable be re-baked without re-sending a raster that can reach 48 MB. Use {@link MapCompute.clearPolitical}
   * to take it back off.
   * @param request - the year to compute
   * @param onProgress - announces each phase before it runs
   * @returns the raster, the colours and the borders
   */
  computePolitical(request: PoliticalRequest, onProgress?: ProgressReport): Promise<PoliticalResult>
  /**
   * Re-derive the border lines from the installed political layer, without rasterising anything.
   *
   * This is what a smoothing tunable costs: tracing the boundary of a grid that already exists, rather
   * than the whole year again. Empty when no political layer is installed.
   * @param smoothing - Chaikin rounds to apply
   * @returns the border lines
   */
  deriveBorders(smoothing: number): Promise<RegionBorders>
}

/** Composite the terrain image on the CPU. */
export interface TerrainBake {
  /**
   * Bake the terrain, tinted by whichever political layer is currently installed.
   * @param options - the texture options
   * @param onProgress - announces the bake before it runs
   * @returns the composited pixels and their dimensions
   */
  bakeTerrain(
    options: TerrainTextureOptions,
    onProgress?: ProgressReport
  ): Promise<TerrainBakeResult>
}

/**
 * Both jobs plus the state they share. Consumers should depend on the narrow slice they use
 * ({@link TerrainBake} for a texture tunable, {@link PoliticalCompute} for a change of year); this is
 * the handle the composition root holds, sets up and tears down.
 */
export interface MapCompute extends PoliticalCompute, TerrainBake {
  /**
   * Install the sources both jobs read. Safe to call again when one of them arrives late — the relief
   * and the mask load independently, and whichever lands second must not discard the first.
   * @param sources - the elevation grid and, when it has loaded, the land mask
   * @returns once the compute holds them
   */
  setSources(sources: ComputeSources): Promise<void>
  /**
   * Drop the installed political layer, so the next bake paints bare terrain.
   * @returns once it is gone
   */
  clearPolitical(): Promise<void>
  /** Release whatever the implementation holds — a worker, above all. */
  dispose(): void
}
