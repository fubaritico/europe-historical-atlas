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

import type { FillGrid } from './fillTriangles'
import type { IndexedFill } from './indexFill'
import type { SettleRequest, SettledYear } from './settleYear'
import type { TerrainTextureOptions } from './terrainCompose'
import type { TribeGround, TribeOutline, TribePatch } from './tribePatches'
import type { YearNames, YearNamesRequest } from './yearNames'
import type { UvPoint } from '../data/coastlineSource'
import type { HeightmapMeta } from '../data/heightmap'
import type { LandMaskMeta } from '../data/landMask'
import type { RegionBorders } from '../data/regionBorders'
import type { Region } from '../data/regionSource'
import type { RgbColor } from '../utils/color'

/**
 * The phases a computation announces, in the order they run. Identifiers rather than sentences: a
 * compute module has no business holding the wording of a user-facing panel, let alone its language.
 */
export type ComputePhase = 'rasterise' | 'expand' | 'colours' | 'cut' | 'bake' | 'borders' | 'names'

/**
 * Announce what a computation is *about to* spend time on. Announced before the phase, never after —
 * a label that names what has just finished tells the reader about a wait that is already over. A long
 * phase may then report its own progress under the same name: the bake does, row by row (CARTO-393).
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
  /**
   * The colour of each region, indexed as `regions` — given for an authored year, whose colours are the
   * Cartographer's (`core/editor/polityColours`). When present it replaces the automatic palette, the
   * editorial name rules and `colorBySuzerain`: the author already chose.
   */
  colours?: readonly RgbColor[]
}

/**
 * A computed political year.
 *
 * The grid stays in the compute. It used to come back as raw parts, which costs 45 MB a year at the 4×
 * raster and served one caller only — the legacy ring-path comparison, now deleted. When picking lands it
 * should ask the compute *what is at this point* rather than hold a copy to answer that here: a click is
 * one query, and a query is a message.
 */
export interface PoliticalResult {
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
   * @param onProgress - announces the bake before it runs, then tells its rows as they go
   * @returns the composited pixels and their dimensions
   */
  bakeTerrain(
    options: TerrainTextureOptions,
    onProgress?: ProgressReport
  ): Promise<TerrainBakeResult>
}

/** Place a year's country names at every display level (ATLAS-301). */
export interface NameCompute {
  /**
   * Place a year's names, every level at once — about two seconds a level on 1100, so asked once per year.
   * Reads none of the installed state: the request carries its regions, so the names never wait on a bake.
   * @param request - the regions, the bearers by level, the names, the measured characters and the options
   * @param onProgress - announces the placement before it runs
   * @returns the names of each level
   */
  placeYearNames(request: YearNamesRequest, onProgress?: ProgressReport): Promise<YearNames>
}

/** A polity's outline as the fills are cut from it — its rings in `(u, v)`, outer and holes alike. */
export interface FillRegion {
  /** The rings. */
  readonly rings: readonly (readonly UvPoint[])[]
}

/**
 * Cut an authored year's polities into triangles lying on the relief's planes (ATLAS-333) — the cut that held the
 * main thread 0.36 s on a change of year, ~1 s the first time.
 */
export interface FillCompute {
  /**
   * Cut every polity on the relief's grid. Reads none of the installed state.
   * @param regions - the polities' outlines, in the order the fills are laid
   * @param grid - the relief's subdivision
   * @returns each polity's triangles, their vertices shared (`indexFill`)
   */
  cutFills(regions: readonly FillRegion[], grid: FillGrid): Promise<IndexedFill[]>
}

/** What a year's tribes are measured against in the compute — {@link TribeGround} with the land left to it. */
export interface TribeCutRequest extends Omit<TribeGround, 'land'> {
  /** The elevation the land is thresholded at when the land mask failed — the compute holds the mask, or not. */
  readonly seaLevel: number
}

/** Measure a year's tribes (ATLAS-333) — 559 ms of the main thread for 1100's four, before it moved. */
export interface TribeCompute {
  /**
   * Measure each tribe's patch against the land the compute holds — its land mask, or the elevation thresholded at
   * the sea level when the mask failed, as the map does.
   * @param tribes - each tribe's rings and colour
   * @param request - everyone's ground, the frame, the grid, the reach, the spill and the sea level
   * @returns one patch per tribe with any ground
   * @throws when no elevation is installed — the land cannot be read
   */
  cutTribes(tribes: readonly TribeOutline[], request: TribeCutRequest): Promise<TribePatch[]>
}

/**
 * Settle an authored year (ATLAS-333) — its colours, tints by level, exact border lines and tribes, 60 to 385 ms of the
 * page in Chrome before it moved.
 */
export interface SettleCompute {
  /**
   * Settle the year against the land mask the compute holds — or none, when it failed, as the map does.
   * @param request - the year, its frame, its regions and the palette
   * @returns the year settled
   */
  settleYear(request: SettleRequest): Promise<SettledYear>
}

/**
 * The jobs, and the state two of them share — the names and the fills read none. Consumers should depend on the
 * narrow slice they use
 * ({@link TerrainBake} for a texture tunable, {@link PoliticalCompute} for a change of year); this is
 * the handle the composition root holds, sets up and tears down.
 */
export interface MapCompute
  extends PoliticalCompute, TerrainBake, NameCompute, FillCompute, TribeCompute, SettleCompute {
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
