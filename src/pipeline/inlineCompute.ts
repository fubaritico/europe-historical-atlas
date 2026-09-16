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
import { pinnedRegionColor } from '../data/regionPalette'
import {
  assignRegionColors,
  createRegionRaster,
  expandRegionsOverLand,
  extractRegionBorders,
  rasteriseRegions,
} from '../data/regionRaster'

import { composeTerrainRgba, terrainTextureSize } from './terrainCompose'

import type {
  ComputeSources,
  MapCompute,
  PoliticalRequest,
  PoliticalResult,
  ProgressReport,
  TerrainBakeResult,
} from './mapCompute'
import type { AreaTint, TerrainTextureOptions } from './terrainCompose'
import type { Heightmap } from '../data/heightmap'
import type { LandMask } from '../data/landMask'
import type { RegionBorders, RegionRaster } from '../data/regionRaster'
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
 * Build a {@link MapCompute} that runs on the calling thread.
 * @param options - collaborators to swap out; every one has a working default
 * @returns the compute
 */
export function createInlineMapCompute(options: InlineComputeOptions = {}): MapCompute {
  const yieldControl = options.yieldControl ?? ((): Promise<void> => Promise.resolve())
  const pinnedFor = options.pinnedFor ?? pinnedRegionColor

  let heightmap: Heightmap | null = null
  let landMask: LandMask | null = null
  let political: { raster: RegionRaster; tints: RgbColor[] } | null = null

  /** Announce a phase, then let the host paint before it starts. */
  const announce = async (
    report: ProgressReport | undefined,
    fraction: number,
    phase: Parameters<ProgressReport>[1]
  ): Promise<void> => {
    report?.(fraction, phase)
    await yieldControl()
  }

  /** The elevation source, or a stated failure — never a silent no-op that leaves a blank map. */
  const requireHeightmap = (): Heightmap => {
    if (!heightmap) throw new Error('map compute: no heightmap installed — call setSources first')
    return heightmap
  }

  return {
    setSources(sources: ComputeSources): Promise<void> {
      heightmap = createHeightmap(sources.heightmap.meta, sources.heightmap.data)
      landMask = sources.landMask
        ? createPackedLandMask(sources.landMask.meta, sources.landMask.bits)
        : null
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
      const dem = requireHeightmap()
      // The political grid can be finer than the DEM, so everything measured in cells scales with it
      // here, once — `snapToCoast` above all, whose reach in kilometres would otherwise halve with the
      // grid and leave the colours stopping short of the coastline again.
      const scale = Math.max(1, Math.round(request.rasterScale))

      await announce(onProgress, 0, 'rasterise')
      const claimed = rasteriseRegions(
        request.regions,
        dem.meta.width * scale,
        dem.meta.height * scale
      )

      // Grow the claims over any land the schematic polygons missed, so the coloured areas end on our
      // coastline rather than on theirs. The longest phase by far: it walks every land cell.
      const mask = landMask
      await announce(onProgress, 0.2, 'expand')
      const raster = mask
        ? expandRegionsOverLand(claimed, (u, v) => mask.isLand(u, v), request.snapToCoast * scale)
        : claimed

      // Colouring reads adjacency off the raster, so it has to run after the claims have grown: two
      // polities may only become neighbours once they both reach the coast.
      await announce(onProgress, 0.7, 'colours')
      const named = request.regions.map((region) => ({
        name: request.colorBySuzerain ? (region.subjectTo ?? region.name) : region.name,
      }))
      const tints = assignRegionColors(raster, named, request.palette, pinnedFor)

      await announce(onProgress, 0.9, 'borders')
      const borders = extractRegionBorders(raster, {
        smoothing: request.borderSmoothing,
        // Without the mask a raster of claims cannot tell unclaimed land from open sea, and the
        // frontier line has to stay off rather than double the shoreline.
        ...(mask ? { isLand: (u: number, v: number): boolean => mask.isLand(u, v) } : {}),
      })

      political = { raster, tints }
      return { width: raster.width, height: raster.height, cells: raster.cells, tints, borders }
    },

    deriveBorders(smoothing: number): Promise<RegionBorders> {
      const installed = political
      if (!installed) return Promise.resolve({ between: [], frontier: [] })
      const mask = landMask
      return Promise.resolve(
        extractRegionBorders(installed.raster, {
          smoothing,
          ...(mask ? { isLand: (u: number, v: number): boolean => mask.isLand(u, v) } : {}),
        })
      )
    },

    async bakeTerrain(
      textureOptions: TerrainTextureOptions,
      onProgress?: ProgressReport
    ): Promise<TerrainBakeResult> {
      const dem = requireHeightmap()
      await announce(onProgress, 0, 'bake')

      const installed = political
      // The seam the compositor sees: a colour claimed at a coordinate, and nothing about history.
      const tint: AreaTint | undefined = installed
        ? {
            at: (u: number, v: number): RgbColor | null => {
              const index = installed.raster.indexAt(u, v)
              return index < 0 ? null : (installed.tints[index] ?? null)
            },
          }
        : undefined

      // The elevation fallback is a documented degraded mode, not an equivalent — it drowns land below
      // sea level and dries out every lake above it.
      const mask = landMask ?? createElevationLandMask(dem, textureOptions.seaLevel)
      const rgba = composeTerrainRgba(dem, textureOptions, mask, tint)
      const { width, height } = terrainTextureSize(dem, textureOptions)
      return { rgba, width, height }
    },

    dispose(): void {
      heightmap = null
      landMask = null
      political = null
    },
  }
}

/**
 * Rebuild a {@link RegionRaster} from the parts a {@link PoliticalResult} carries.
 *
 * The lookup is a closure, so it cannot cross a worker boundary; what crosses is the grid it closes
 * over. Going back through `createRegionRaster` is what keeps the worker's raster and the main thread's
 * answering with the same sampling rule.
 * @param result - a computed political year
 * @returns the raster
 */
export function rasterFromResult(result: PoliticalResult): RegionRaster {
  return createRegionRaster(result.width, result.height, result.cells)
}
