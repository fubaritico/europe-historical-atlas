import { assetError, boundsMatch } from '@europe-historical-atlas/core/data/assetError'

import type { BackdropFrame } from './view/projection'
import type { AssetError } from '@europe-historical-atlas/core/data/assetError'
import type { HeightmapMeta, HeightmapSource } from '@europe-historical-atlas/core/data/heightmap'
import type { LandMask, LandMaskSource } from '@europe-historical-atlas/core/data/landMask'
import type {
  MapCompute,
  ProgressReport,
  TerrainBakeResult,
} from '@europe-historical-atlas/core/pipeline/mapCompute'
import type { TerrainTextureOptions } from '@europe-historical-atlas/core/pipeline/terrainOptions'

/**
 * The backdrop: the atlas's own baked terrain, under the canvas — loaded, baked, and framed.
 *
 * **It is the atlas's texture and not a picture of it** — `s99`, among the things settled and recorded so
 * they are not reopened: *"The backdrop is the atlas's own baked texture, with the political tint
 * cleared."* That is what makes it the only thing on this canvas georeferenced **by construction**: zero
 * registration, zero error, because it is literally the output image of the renderer the editor feeds.
 *
 * **The political tint is cleared by never installing one.** A bake paints whichever political layer is
 * installed, and this never calls `computePolitical` — so there is no state to clear and no
 * `clearPolitical` call to forget. Read off the port's contract rather than assumed: the tint seam is
 * built only when a raster is handed over.
 *
 * **The bake goes through the compute port, not through `bakeTerrainPixels` directly**, and that is what
 * this module stopped doing on 2026-10-07. The direct call was synchronous: ~1.8 s of frozen main thread
 * at supersample 2, during which a waiting state raised beforehand would never paint — the defect this
 * repository already recorded as *"a flag raised before a synchronous block is a flag nobody sees"*. The
 * port's worker implementation costs one import (`core/pipeline/computeWorker?worker`, exactly as
 * `atlas/src/main.ts` does it) and brings `onProgress` with it, so the waiting state has a real source of
 * progress instead of a guess.
 *
 * **Both assets are required, and a failure propagates.** The dev's call, 2026-10-07: if either file is
 * missing the canvas shows nothing and says so, rather than drawing a backdrop that is subtly wrong. So
 * the elevation threshold the atlas keeps as a declared degraded mode (`createElevationLandMask`) is
 * deliberately **not** wired here — in the atlas the relief *is* the map, while here the map is the
 * author's document and a wrong shoreline would be reported as a frontier error for the rest of the
 * year's life.
 */

/** A loaded, baked backdrop: the picture, and the coordinate system it defines. */
export interface Backdrop {
  /**
   * The frame everything on the canvas is georeferenced against.
   *
   * **Taken from the DEM's own metadata, never declared.** Until 2026-10-07 these four numbers and the
   * grid size were written out by hand in `view/backdropFrame.ts`, which made them a second source of
   * truth with a silent failure mode: project against one box while painting another and every border
   * slides off the terrain it borders, with no error anywhere. The DEM's reader already carries them.
   */
  frame: BackdropFrame
  /** The baked pixels, in a form the 2D context can blit. */
  image: CanvasImageSource
  /**
   * The land mask the bake read.
   *
   * **Handed back rather than dropped**, because the coastline is traced through it
   * (`vectorLayers.ts`) and it is three megabytes: loading it twice for the same picture would double
   * the startup download for nothing. It is the mask and not the relief because that is the one the
   * shoreline comes from — elevation says how high, not wet or dry.
   */
  mask: LandMask
}

/** Everything {@link loadBackdrop} needs, every one of them injectable. */
export interface BackdropDeps {
  /** Where the elevation grid comes from — a fetch in the application, a literal in a test. */
  heightmap: HeightmapSource
  /** Where the land mask comes from. */
  landMask: LandMaskSource
  /**
   * The compute to bake through.
   *
   * Typed as the whole {@link MapCompute} rather than the narrow `TerrainBake` slice because installing
   * the sources and releasing the worker are part of the job. The political half is simply never called,
   * which is what leaves the terrain bare.
   */
  compute: MapCompute
  /**
   * Turn baked bytes into something the canvas can draw.
   *
   * **Injected because `createImageBitmap` does not exist under jsdom**, so a module that reached for it
   * could not be exercised at all — and this is the seam where that is a one-line stub. It is also the
   * only place that knows whether the application is in a browser.
   * @param baked - the pixels and their size
   * @returns the drawable image
   */
  toImage: (baked: TerrainBakeResult) => Promise<CanvasImageSource>
  /** The look to composite; the atlas's own defaults keep the two pictures identical. */
  options: TerrainTextureOptions
  /** Announced before each phase, for whatever is showing the wait. */
  onProgress?: ProgressReport
}

/**
 * The canvas's coordinate system, read off the elevation grid that defines it.
 *
 * A pure function on the metadata so that the one thing which must not be got wrong can be checked with
 * a literal: the grid's own size in pixels, and the ground it covers.
 * @param meta - the DEM's metadata, as its reader parsed it
 * @returns the frame to project and paint against
 */
export function frameFromHeightmap(meta: HeightmapMeta): BackdropFrame {
  return {
    size: { width: meta.width, height: meta.height },
    bounds: meta.bbox,
  }
}

/**
 * Check that the mask covers the same ground as the relief.
 *
 * **This is the `semantic` class of the asset taxonomy** — each file is internally valid and the pair is
 * wrong for us. It is worth a check of its own because it is the failure nothing else can see: a mask
 * cropped to a different box still samples, still returns land and water, and simply puts the coastline
 * somewhere else. The author would read the disagreement as their own bad tracing.
 * @param dem - the elevation metadata
 * @param mask - the mask metadata
 * @param source - where the mask was loaded from, for the message
 * @returns the error to throw, or `null` when the two agree
 */
export function boundsDisagreement(
  dem: { bbox: HeightmapMeta['bbox'] },
  mask: { bbox: HeightmapMeta['bbox'] },
  source: string
): AssetError | null {
  if (boundsMatch(dem.bbox, mask.bbox)) return null
  const box = (b: HeightmapMeta['bbox']): string =>
    `W${String(b.west)} S${String(b.south)} E${String(b.east)} N${String(b.north)}`
  return assetError(
    'landMask',
    'semantic',
    source,
    `covers ${box(mask.bbox)} while the relief covers ${box(dem.bbox)} — the two must share one coordinate space`
  )
}

/**
 * Load both assets, bake the bare terrain, and return the picture with the frame it defines.
 *
 * **Nothing is caught.** A missing or malformed asset throws the `AssetError` its reader built, carrying
 * which file broke and how, and the caller decides what the reader is told — which is the loud
 * propagation `rules/error-handling.md` prefers over a plausible substitute. There is no value this
 * could stand in with: a backdrop that is almost right is the one outcome nobody can detect.
 *
 * **The two loads run together** rather than one after the other: they are independent fetches of 3 MB
 * each, and the bake needs both, so serialising them would add a round trip for nothing.
 * @param deps - the sources, the compute, the image converter and the look
 * @returns the drawable backdrop and its coordinate system
 * @throws AssetError when either asset fails to load, or when the mask covers different ground
 */
export async function loadBackdrop(deps: BackdropDeps): Promise<Backdrop> {
  const [dem, mask] = await Promise.all([deps.heightmap.load(), deps.landMask.load()])

  const disagreement = boundsDisagreement(dem.meta, mask.meta, 'the land mask')
  if (disagreement !== null) throw disagreement

  await deps.compute.setSources({
    heightmap: { meta: dem.meta, data: dem.data },
    landMask: { meta: mask.meta, bits: mask.pack() },
  })

  const baked = await deps.compute.bakeTerrain(deps.options, deps.onProgress)
  return { frame: frameFromHeightmap(dem.meta), image: await deps.toImage(baked), mask }
}

/**
 * The browser's answer to {@link BackdropDeps.toImage} — baked bytes to an `ImageBitmap`.
 *
 * **An `ImageBitmap` rather than an off-screen `<canvas>`**: it is decoded once and blitted by the
 * compositor on every repaint, where a canvas would be a second surface to keep in step with the first.
 * The view is repainted on every `pointermove` of a pan, so this is the one object on the canvas whose
 * cost per frame is worth choosing deliberately.
 *
 * **The bytes are wrapped, not copied.** `ImageData` wants a `Uint8ClampedArray` and the bake produces a
 * `Uint8Array`; a view over the same buffer costs nothing, where `new Uint8ClampedArray(rgba)` would
 * duplicate up to 24 MB at supersample 2.
 * @param baked - the pixels and their size
 * @returns the drawable bitmap
 */
export async function bakeToBitmap(baked: TerrainBakeResult): Promise<ImageBitmap> {
  const pixels = new Uint8ClampedArray(
    baked.rgba.buffer,
    baked.rgba.byteOffset,
    baked.rgba.byteLength
  )
  return createImageBitmap(new ImageData(pixels, baked.width, baked.height))
}
