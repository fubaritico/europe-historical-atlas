/**
 * The map's CPU work, run on whichever thread calls it.
 *
 * This is the reference implementation of {@link MapCompute}: the test double, the fallback when a
 * worker cannot be spawned, and the body the worker itself runs. Keeping one implementation is the
 * point — a worker that re-derived the same image from its own code would be a second source of truth
 * for how the map looks.
 */

import { createHeightmap } from '../data/heightmap'
import { createElevationLandMask, createPackedLandMask } from '../data/landMask'
import { extractRegionBorders } from '../data/regionBorders'
import { pinnedRegionColor } from '../data/regionPalette'
import { assignRegionColors, expandRegionsOverLand, rasteriseRegions } from '../data/regionRaster'

import { composeTerrainRgba, terrainTextureSize } from './terrainCompose'
import { placeYearNames } from './yearNames'

import type {
  ComputeSources,
  MapCompute,
  PoliticalRequest,
  PoliticalResult,
  ProgressReport,
  TerrainBakeResult,
} from './mapCompute'
import type { AreaTint, TerrainTextureOptions } from './terrainCompose'
import type { YearNames, YearNamesRequest } from './yearNames'
import type { Heightmap } from '../data/heightmap'
import type { LandMask } from '../data/landMask'
import type { RegionBorders } from '../data/regionBorders'
import type { RegionRaster } from '../data/regionRaster'
import type { RgbColor } from '../utils/color'

/**
 * Narrow a progress callback to a slice of an outer bar, so two jobs can drive one panel.
 *
 * A job reports its own `[0, 1]`: it has no idea it is the third of five things a year costs, and
 * teaching it would tie the compute to the sequence its caller happens to use.
 * @param report - the outer callback, or `undefined`
 * @param from - where this job's 0 lands on the outer bar
 * @param to - where its 1 lands
 * @returns a callback reporting into `[from, to]`, or `undefined` when there was nothing to report to
 */
export function scaleProgress(
  report: ProgressReport | undefined,
  from: number,
  to: number
): ProgressReport | undefined {
  if (!report) return undefined
  return (fraction, phase) => {
    report(from + (to - from) * Math.min(1, Math.max(0, fraction)), phase)
  }
}

/**
 * What an inline compute may have swapped out.
 */
export interface InlineComputeOptions {
  /**
   * Hand control back to the host between phases. Defaults to doing nothing, which is right inside a
   * worker (where there is no paint to wait for) and wrong on the main thread — a flag raised before a
   * synchronous block is a flag nobody sees, so the composition root injects a frame wait.
   * @returns once the host has had its turn
   */
  yieldControl?: () => Promise<void>
  /**
   * The editorial colour pinned to a polity, if any. Injected so a test can assert the colouring
   * without depending on which powers the project happens to pin this month.
   * @param name - the polity's name, or `null`
   * @returns the pinned colour, or `null` to let the automatic palette decide
   */
  pinnedFor?: (name: string | null) => RgbColor | null
}

/**
 * The colours a request gave, checked against its regions.
 * @param colours - one colour per region
 * @param count - how many regions there are
 * @returns the colours, as tints
 * @throws when the two counts differ — a colour would land on the wrong polity, which no caller does
 */
function givenColours(colours: readonly RgbColor[], count: number): RgbColor[] {
  if (colours.length !== count)
    throw new Error(
      `map compute: ${String(colours.length)} colours given for ${String(count)} regions`
    )
  return [...colours]
}

/** Announce a phase, then let the host paint before it starts. */
export type Announce = (fraction: number, phase: Parameters<ProgressReport>[1]) => Promise<void>

/**
 * Bind a progress callback and a yield into the one call a phase makes before it starts.
 *
 * The yield is what makes the flag visible: on the main thread a report raised immediately before a
 * synchronous block is a report nobody paints.
 * @param report - where to announce, when a caller is showing a panel
 * @param yieldControl - hand control back to the host
 * @returns the announce call the phases use
 */
export function announcer(
  report: ProgressReport | undefined,
  yieldControl: () => Promise<void>
): Announce {
  return async (fraction, phase) => {
    report?.(fraction, phase)
    await yieldControl()
  }
}

/**
 * How to trace borders out of a raster, with the land test attached when there is a mask.
 *
 * Shared rather than spelled out at each call site: without the mask a raster of claims cannot tell
 * unclaimed land from open sea, so the frontier line has to stay off rather than double the shoreline —
 * and a copy of that rule that drifted would put a second coastline on the map.
 * @param mask - which cells are land, when it is known
 * @param smoothing - how many corner-cutting rounds to apply to the traced line
 * @returns the options for `extractRegionBorders`
 */
export function borderTraceOptions(
  mask: LandMask | null,
  smoothing: number
): Parameters<typeof extractRegionBorders>[1] {
  return {
    smoothing,
    ...(mask ? { isLand: (u: number, v: number): boolean => mask.isLand(u, v) } : {}),
  }
}

/** A year rasterised, grown, coloured and traced. */
export interface PoliticalRaster {
  /** One polity index per cell. */
  raster: RegionRaster
  /** The colour each polity was given, by index. */
  tints: RgbColor[]
  /** The border lines derived from that very grid. */
  borders: RegionBorders
}

/**
 * Turn a year's polygons into a coloured grid and the borders that are its own edges.
 *
 * The whole cost of changing year, and the reason it lives off the main thread. Written as a function of
 * its inputs rather than as a method on the compute so that a test can drive it with a literal raster
 * and no installed sources at all.
 * @param dem - the elevation grid, which sizes the political raster
 * @param mask - which cells are land, when it is known
 * @param request - the year and how to draw it
 * @param pinnedFor - the editorial colour for a polity, if it has one
 * @param announce - where each phase reports
 * @returns the grid, its colours and its borders
 */
export async function rasterisePolitical(
  dem: Heightmap,
  mask: LandMask | null,
  request: PoliticalRequest,
  pinnedFor: (name: string | null) => RgbColor | null,
  announce: Announce
): Promise<PoliticalRaster> {
  // The political grid can be finer than the DEM, so everything measured in cells scales with it here,
  // once — `snapToCoast` above all, whose reach in kilometres would otherwise halve with the grid and
  // leave the colours stopping short of the coastline again.
  const scale = Math.max(1, Math.round(request.rasterScale))

  await announce(0, 'rasterise')
  const claimed = rasteriseRegions(request.regions, dem.meta.width * scale, dem.meta.height * scale)

  // Grow the claims over any land the schematic polygons missed, so the coloured areas end on our
  // coastline rather than on theirs. The longest phase by far: it walks every land cell.
  await announce(0.2, 'expand')
  const raster = mask
    ? expandRegionsOverLand(claimed, (u, v) => mask.isLand(u, v), request.snapToCoast * scale)
    : claimed

  // Colouring reads adjacency off the raster, so it has to run after the claims have grown: two
  // polities may only become neighbours once they both reach the coast.
  await announce(0.7, 'colours')
  const named = request.regions.map((region) => ({
    name: request.colorBySuzerain ? (region.subjectTo ?? region.name) : region.name,
  }))
  const tints = request.colours
    ? givenColours(request.colours, request.regions.length)
    : assignRegionColors(raster, named, request.palette, pinnedFor)

  await announce(0.9, 'borders')
  return {
    raster,
    tints,
    borders: extractRegionBorders(raster, borderTraceOptions(mask, request.borderSmoothing)),
  }
}

/**
 * Bake the terrain pixels, tinted by the installed year when there is one.
 * @param dem - the elevation grid
 * @param mask - which cells are land, or `null` to fall back on an elevation threshold
 * @param textureOptions - the look being composited
 * @param political - the installed year, or `null` for bare terrain
 * @returns the pixels and the size they were baked at
 */
export function bakeTerrainPixels(
  dem: Heightmap,
  mask: LandMask | null,
  textureOptions: TerrainTextureOptions,
  political: Pick<PoliticalRaster, 'raster' | 'tints'> | null
): TerrainBakeResult {
  // The seam the compositor sees: a colour claimed at a coordinate, and nothing about history.
  const tint: AreaTint | undefined = political
    ? {
        at: (u: number, v: number): RgbColor | null => {
          const index = political.raster.indexAt(u, v)
          return index < 0 ? null : (political.tints[index] ?? null)
        },
      }
    : undefined

  // The elevation fallback is a documented degraded mode, not an equivalent — it drowns land below sea
  // level and dries out every lake above it.
  const rgba = composeTerrainRgba(
    dem,
    textureOptions,
    mask ?? createElevationLandMask(dem, textureOptions.seaLevel),
    tint
  )
  const { width, height } = terrainTextureSize(dem, textureOptions)
  return { rgba, width, height }
}

/**
 * Rebuild the live sources from the plain buffers that crossed the wire.
 * @param sources - the elevation grid, and the packed land mask when there is one
 * @returns the sources in the form the compute reads them
 */
export function installSources(sources: ComputeSources): {
  heightmap: Heightmap
  landMask: LandMask | null
} {
  return {
    heightmap: createHeightmap(sources.heightmap.meta, sources.heightmap.data),
    landMask: sources.landMask
      ? createPackedLandMask(sources.landMask.meta, sources.landMask.bits)
      : null,
  }
}

/**
 * The elevation source, or a stated failure — never a silent no-op that leaves a blank map.
 * @param heightmap - what has been installed so far
 * @returns the elevation grid
 */
export function requireHeightmap(heightmap: Heightmap | null): Heightmap {
  if (!heightmap) throw new Error('map compute: no heightmap installed — call setSources first')
  return heightmap
}

/**
 * Re-trace the borders of the installed year, or none when no year is installed.
 *
 * Empty rather than a failure: asking for borders before a year has been computed is what a dev-panel
 * slider does on a bare map, and it is not a mistake — there is simply nothing to draw yet.
 * @param political - the installed year, or `null`
 * @param mask - which cells are land, when it is known
 * @param smoothing - how many corner-cutting rounds to apply
 * @returns the border lines
 */
export function deriveInstalledBorders(
  political: Pick<PoliticalRaster, 'raster'> | null,
  mask: LandMask | null,
  smoothing: number
): RegionBorders {
  if (!political) return { between: [], frontier: [] }
  return extractRegionBorders(political.raster, borderTraceOptions(mask, smoothing))
}

/**
 * Place a year's names on this thread, once the placement is announced — the announcer yields a frame, so a
 * progress panel shows before the seconds the placement takes.
 * @param request - the year's names to place
 * @param announce - announces a phase, yielding before it runs
 * @returns the names of each level
 */
async function announcedNames(request: YearNamesRequest, announce: Announce): Promise<YearNames> {
  await announce(0, 'names')
  return placeYearNames(request)
}

/**
 * Build a {@link MapCompute} that runs on the calling thread.
 * @param options - collaborators to swap out; every one has a working default
 * @returns the compute
 */
export function createInlineMapCompute(options: InlineComputeOptions = {}): MapCompute {
  const yieldControl = options.yieldControl ?? ((): Promise<void> => Promise.resolve())
  const pinnedFor = options.pinnedFor ?? pinnedRegionColor

  let heightmap: Heightmap | null = null
  let landMask: LandMask | null = null
  let political: PoliticalRaster | null = null

  return {
    setSources(sources: ComputeSources): Promise<void> {
      ;({ heightmap, landMask } = installSources(sources))
      return Promise.resolve()
    },

    clearPolitical(): Promise<void> {
      political = null
      return Promise.resolve()
    },

    async computePolitical(
      request: PoliticalRequest,
      onProgress?: ProgressReport
    ): Promise<PoliticalResult> {
      const computed = await rasterisePolitical(
        requireHeightmap(heightmap),
        landMask,
        request,
        pinnedFor,
        announcer(onProgress, yieldControl)
      )
      political = computed
      return { tints: computed.tints, borders: computed.borders }
    },

    deriveBorders(smoothing: number): Promise<RegionBorders> {
      return Promise.resolve(deriveInstalledBorders(political, landMask, smoothing))
    },

    async bakeTerrain(
      textureOptions: TerrainTextureOptions,
      onProgress?: ProgressReport
    ): Promise<TerrainBakeResult> {
      const dem = requireHeightmap(heightmap)
      await announcer(onProgress, yieldControl)(0, 'bake')
      return bakeTerrainPixels(dem, landMask, textureOptions, political)
    },

    placeYearNames(request: YearNamesRequest, onProgress?: ProgressReport): Promise<YearNames> {
      return announcedNames(request, announcer(onProgress, yieldControl))
    },

    dispose(): void {
      heightmap = null
      landMask = null
      political = null
    },
  }
}
