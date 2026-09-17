/**
 * What the map costs, and the order it is paid in.
 *
 * The compute runs off this thread when the browser allows it, because the texture bake is one
 * indivisible synchronous block — no amount of yielding between phases could keep the tab alive through
 * it. The inline implementation stays as the fallback, and needs the frame wait the worker has no use
 * for: on the main thread, a flag raised before a synchronous block is a flag nobody sees.
 *
 * It owns the sequence too. The relief, the mask and the political layer used to land independently,
 * each triggering its own bake, so the map arrived in three visible instalments each throwing away the
 * last. Two deliberate stages replace them: the terrain, then the same map with its countries.
 */

import { COMPUTE_PHASE_LABELS } from './computeLabels'
import { assetError, boundsMatch } from './data/assetError'
import { createFetchHeightmapSource } from './data/heightmap'
import { createFetchLandMaskSource } from './data/landMask'
import { createFetchRegionSource } from './data/regionSource'
import { createFetchRiverSource } from './data/riverSource'
import { politicalPalette } from './devParams'
import { refreshReliefSource } from './mapSources'
import { createInlineMapCompute, scaleProgress } from './pipeline/inlineCompute'
import { createWorkerMapCompute } from './pipeline/workerCompute'
import { wrapTerrainTexture } from './scene/terrainTexture'
import { hexToRgb } from './utils/color'
import { createLatestOnly } from './utils/latestOnly'

import type { RegionSet } from './data/regionSource'
import type { DevState } from './devState'
import type { MapLayers } from './mapLayers'
import type { MapSources } from './mapSources'
import type { MapUi } from './mapUi'
import type { MapCompute, ProgressReport } from './pipeline/mapCompute'
import type { ComputeWorkerHandle } from './pipeline/workerCompute'
import type { LatestOnly } from './utils/latestOnly'

/**
 * How far the land mask's frame may differ from the relief's before the two are declared to be about
 * different parts of the world. A JSON round trip rounds; a different crop does not miss by a degree.
 */
const BBOX_TOLERANCE_DEG = 1e-6

/**
 * How a change of year divides the progress bar. Measured rather than chosen: the fetch is a local file,
 * the compute costs hundreds of milliseconds and the bake longer still. What is left above `bake` is the
 * border geometry, which is this thread's own work and quick.
 */
const POLITICAL_SPLIT = { fetch: 0.1, compute: 0.65, bake: 0.95 }

/** Where the assets live. */
const HEIGHTMAP_URL = '/heightmaps/europe-dem-z5'
const LAND_MASK_URL = '/masks/europe-land'
const RIVERS_URL = '/rivers/europe-rivers.json'

/** What the pipeline needs from its host. */
export interface MapPipelineDeps {
  /** The live tunables. */
  dev: DevState
  /** What has been loaded, written here as it arrives. */
  sources: MapSources
  /** What the results are hung on. */
  layers: MapLayers
  /** Where progress is shown and failures are told. */
  ui: MapUi
  /**
   * Create the compute worker. Injected because naming a worker module is bundler-specific, and a module
   * that carries one can neither be unit-tested nor moved to another bundler.
   * @returns the worker
   */
  spawn: () => ComputeWorkerHandle
  /**
   * Whether the app has been torn down.
   * @returns `true` once teardown has run
   */
  isDisposed: () => boolean
}

/** Everything a pipeline call reads, including the compute it may have had to replace. */
interface PipelineContext extends MapPipelineDeps {
  /** The compute, held in a box because a dying worker is replaced by the inline implementation. */
  box: { compute: MapCompute }
  /** Only the newest bake may write back. */
  bakeGate: LatestOnly
  /** Only the newest year may write back — its own gate, or a bake would needlessly cancel a year. */
  politicalGate: LatestOnly
  /**
   * Fetch a year's polities.
   * @param year - the year to load
   * @returns the polities
   */
  loadYear: (year: number) => Promise<RegionSet>
}

/** The map's compute, sequenced. */
export interface MapPipeline {
  /**
   * Bring the map up: the terrain first, then the same map with its countries.
   * @returns once the year is on screen
   */
  start(): Promise<void>
  /**
   * Re-bake the terrain texture and hang it on the relief.
   * @param onProgress - where to announce the bake, when a caller is showing a panel
   * @returns once the new texture is on screen, or once a newer bake has superseded this one
   */
  rebuildTexture(onProgress?: ProgressReport): Promise<void>
  /**
   * A change of year, end to end: fetch the polities, hand them to the compute, hang the result up.
   * @returns once the year is on screen
   */
  rebuildPolitical(): Promise<void>
  /**
   * Re-trace the border lines from the grid the compute already holds, then redraw them.
   *
   * The one border tunable that changes geometry rather than paint. It costs a trace, not a year.
   * @returns once the lines are back on screen
   */
  rebuildBorderGeometry(): Promise<void>
  /** Stop the worker and release what it holds. */
  dispose(): void
}

/**
 * Hand the compute the sources it reads.
 *
 * Copied across, never transferred: this thread keeps drawing the relief and draping overlays from the
 * very same buffers, so handing them over would leave the map without its terrain.
 * @param context - the pipeline's world
 * @returns once the compute holds them
 */
async function pushSources(context: PipelineContext): Promise<void> {
  const dem = context.sources.heightmap
  if (!dem) return
  const mask = context.sources.landMask
  await context.box.compute.setSources({
    heightmap: { meta: dem.meta, data: dem.data },
    landMask: mask ? { meta: mask.meta, bits: mask.pack() } : null,
  })
}

/**
 * Re-bake the terrain texture and hang it on the relief.
 * @param context - the pipeline's world
 * @param onProgress - where to announce the bake
 * @returns once it is on screen, or once a newer bake has superseded this one
 */
async function rebuildTexture(
  context: PipelineContext,
  onProgress?: ProgressReport
): Promise<void> {
  if (!context.sources.heightmap) return
  const isCurrent = context.bakeGate.begin()
  const baked = await context.box.compute.bakeTerrain(context.dev.texture, onProgress)
  if (context.isDisposed() || !isCurrent()) return
  context.layers.setTexture(wrapTerrainTexture(baked.rgba, baked.width, baked.height))
}

/**
 * A change of year, end to end.
 *
 * Every await below is a place a second rebuild can start — the palette pickers fire continuously, and a
 * year fetched from cache can overtake one still in flight. Checked before *every* side effect, not only
 * before the state write: a stale call whose raster was correctly suppressed would otherwise still go on
 * to overwrite the live texture and the border layer underneath the newer one.
 * @param context - the pipeline's world
 * @returns once the year is on screen
 */
async function rebuildPolitical(context: PipelineContext): Promise<void> {
  const { dev, sources, layers, ui } = context
  if (!sources.heightmap) return
  const isCurrent = context.politicalGate.begin()
  const year = Math.round(dev.political.year / 100) * 100
  ui.progress.begin(`Chargement de l'année ${String(year)}…`)
  try {
    const loaded = await context.loadYear(year)
    if (context.isDisposed() || !isCurrent()) return
    sources.regionSet = loaded

    // The bar spans two jobs, so each reports into its own slice rather than being told where it sits
    // in a sequence it knows nothing about.
    const report: ProgressReport = (fraction, phase) => {
      ui.progress.report(fraction, COMPUTE_PHASE_LABELS[phase])
    }
    const result = await context.box.compute.computePolitical(
      politicalRequest(dev, loaded),
      scaleProgress(report, POLITICAL_SPLIT.fetch, POLITICAL_SPLIT.compute)
    )
    if (context.isDisposed() || !isCurrent()) return
    sources.derivedBorders = result.borders

    await rebuildTexture(
      context,
      scaleProgress(report, POLITICAL_SPLIT.compute, POLITICAL_SPLIT.bake)
    )
    if (context.isDisposed() || !isCurrent()) return

    layers.rebuildBorders()
    ui.progress.report(1)
  } catch (error: unknown) {
    ui.reportAssetFailure('regions', error)
  } finally {
    ui.progress.end()
  }
}

/**
 * What the compute is asked for, gathered from the live tunables.
 * @param dev - the live tunables
 * @param loaded - the year's polities
 * @returns the request
 */
function politicalRequest(
  dev: DevState,
  loaded: RegionSet
): Parameters<MapCompute['computePolitical']>[0] {
  return {
    regions: loaded.regions,
    rasterScale: dev.political.rasterScale,
    snapToCoast: dev.political.snapToCoast,
    colorBySuzerain: dev.political.colorBySuzerain,
    palette: politicalPalette(dev.political).map(hexToRgb),
    borderSmoothing: dev.political.borderSmoothing,
  }
}

/**
 * Load the relief and the mask, and settle whether they are about the same part of the world.
 *
 * The mask is optional by design: without it the shoreline falls back to an elevation threshold, visibly
 * wrong in the Dutch polders, but a degraded map beats a blank canvas. A mask cropped to a *different*
 * frame is another matter — internally valid and completely wrong, with every coastline landing
 * somewhere it is not and nothing anywhere to say so.
 * @param context - the pipeline's world
 * @returns once both have been settled into the sources
 */
async function loadTerrain(context: PipelineContext): Promise<void> {
  const { sources, ui } = context
  const [dem, mask] = await Promise.all([
    createFetchHeightmapSource(HEIGHTMAP_URL).load(),
    createFetchLandMaskSource(LAND_MASK_URL)
      .load()
      .catch((error: unknown) => {
        ui.reportAssetFailure('landMask', error)
        return null
      }),
  ])
  if (context.isDisposed()) return
  sources.heightmap = dem
  if (mask && !boundsMatch(mask.meta.bbox, dem.meta.bbox, BBOX_TOLERANCE_DEG)) {
    ui.reportAssetFailure(
      'landMask',
      assetError(
        'landMask',
        'semantic',
        LAND_MASK_URL,
        'the mask covers a different frame from the relief'
      )
    )
    sources.landMask = null
    return
  }
  sources.landMask = mask
}

/**
 * Bring the map up in two deliberate stages.
 *
 * Two and not one is the dev's call, made on screen: waiting for everything meant a blank parchment for
 * the whole load, and Europe appearing at once late reads worse than Europe appearing early and then
 * being coloured in. The cost is real — **it bakes twice** — and what was removed is only the waste.
 * @param context - the pipeline's world
 * @returns once the map is on screen
 */
async function startup(context: PipelineContext): Promise<void> {
  const { dev, sources, layers, ui } = context
  await loadTerrain(context)
  if (context.isDisposed() || !sources.heightmap) return
  refreshReliefSource(sources, dev.relief.smoothing) // draping is correct from here on, mesh or no mesh
  await pushSources(context)
  if (context.isDisposed()) return

  // Stage one: the terrain alone. Awaited before the mesh is built, never fired and forgotten — a relief
  // built while the texture is still in the worker takes no map at all and shows as bare material
  // colour, which is exactly the flash this sequencing exists to remove.
  await rebuildTexture(context)
  if (context.isDisposed()) return

  layers.rebuildRelief()
  layers.rebuildCoastline()
  layers.rebuildRhumb()
  layers.rebuildRivers() // no-op until the river payload lands; whichever finishes last draws them
  layers.rebuildRose()
  // There is a map to look at now, so the silhouette has done its job. The countries arriving later is
  // the progress panel's business, not the splash's.
  ui.dismissSplash()

  // Stage two: the same map with the countries painted in and their borders drawn over it.
  await rebuildPolitical(context)
}

/**
 * Load the rivers, independently of everything else.
 *
 * Neither blocks the other, and the second to arrive triggers the build: the rebuild needs both the
 * terrain to drape on and the centrelines to drape.
 * @param context - the pipeline's world
 * @returns nothing; it settles on its own
 */
function loadRivers(context: PipelineContext): void {
  void createFetchRiverSource(RIVERS_URL)
    .load()
    .then((loaded) => {
      if (context.isDisposed()) return
      context.sources.riverData = loaded
      context.layers.rebuildRivers()
    })
    .catch((error: unknown) => {
      context.ui.reportAssetFailure('rivers', error)
    })
}

/**
 * Carry on after the worker dies, on this thread.
 *
 * The fallback starts empty — it holds neither the sources nor the year the dead worker was holding — so
 * recovering means redoing the setup, not just retrying the call that failed. A frozen map with one
 * console line is the outcome this exists to avoid.
 * @param context - the pipeline's world
 * @param error - what killed the worker
 * @returns nothing
 */
function failoverToInline(context: PipelineContext, error: Error): void {
  console.warn('map compute worker died — continuing on the main thread', error)
  if (context.isDisposed()) return
  context.box.compute = createInlineMapCompute({ yieldControl: nextFrame })
  void pushSources(context)
    .then(() => rebuildPolitical(context))
    .catch((failure: unknown) => {
      console.error('main-thread fallback could not restore the map', failure)
    })
}

/**
 * Hand control back to the browser for one frame.
 * @returns once a frame has been painted
 */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve()
    })
  })
}

/**
 * Build the compute, preferring a worker and falling back to this thread.
 * @param context - the pipeline's world
 * @returns the compute
 */
function createCompute(context: PipelineContext): MapCompute {
  try {
    return createWorkerMapCompute({
      spawn: context.spawn,
      onFatal: (error: Error) => {
        failoverToInline(context, error)
      },
    })
  } catch (error: unknown) {
    console.warn('map compute worker unavailable — computing on the main thread instead', error)
    return createInlineMapCompute({ yieldControl: nextFrame })
  }
}

/**
 * Build the pipeline. Nothing is fetched until {@link MapPipeline.start} is called.
 * @param deps - the tunables, the sources, the layers, the interface and the worker factory
 * @returns the pipeline
 */
export function createMapPipeline(deps: MapPipelineDeps): MapPipeline {
  const regionPort = createFetchRegionSource((year) => `/borders/europe-${String(year)}.json`)
  const context: PipelineContext = {
    ...deps,
    // Two gates, because two independent results race: a dev-panel slider fires a bake per change, and a
    // change of year fires a whole political rebuild. Sharing one would have a bake cancel a year.
    bakeGate: createLatestOnly(),
    politicalGate: createLatestOnly(),
    box: { compute: null as unknown as MapCompute },
    loadYear: (year: number) => regionPort.load(year),
  }
  context.box.compute = createCompute(context)

  return {
    async start(): Promise<void> {
      loadRivers(context)
      await startup(context).catch((error: unknown) => {
        // Anything escaping `startup` got past the mask's own catch, so it is the relief — the one asset
        // the map cannot do without. The splash stays up underneath the message.
        deps.ui.reportAssetFailure('heightmap', error)
      })
    },
    rebuildTexture(onProgress?: ProgressReport): Promise<void> {
      return rebuildTexture(context, onProgress)
    },
    rebuildPolitical(): Promise<void> {
      return rebuildPolitical(context)
    },
    async rebuildBorderGeometry(): Promise<void> {
      if (!deps.sources.regionSet) return
      try {
        const traced = await context.box.compute.deriveBorders(deps.dev.political.borderSmoothing)
        if (deps.isDisposed()) return
        deps.sources.derivedBorders = traced
        deps.layers.rebuildBorders()
      } catch (error: unknown) {
        console.error('border derivation failed', error)
      }
    },
    dispose(): void {
      // Terminate before anything else: the worker is the only part of this that outlives the page's own
      // teardown if left alone, and a bake in flight has nothing left to hand its pixels to.
      context.box.compute.dispose()
    },
  }
}
