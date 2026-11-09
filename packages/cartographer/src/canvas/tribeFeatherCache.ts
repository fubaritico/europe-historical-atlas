import { createGridProjection, sameSignature, tribeFeatherPlans } from './paint/tribeFeathers'

import type {
  FeatherGround,
  FeatherSignature,
  TribeFeatherPlan,
  TribeFeatherRaster,
} from './paint/tribeFeathers'
import type { Rect } from '../geometry/marquee'
import type { YearDocument } from '@europe-historical-atlas/core/data/yearDocument'

/**
 * The tribes' fading colour as images, each made again only when what it reads changed (ATLAS-258).
 *
 * **Two keys, one inside the other.** The edition's version counter first, as `anchorCache` is keyed and for
 * the same reason: the document is mutated in place, so the counter is what moves when anything does, and a
 * pan, which repaints at one version on every pointer move, costs a comparison. When the version moves, each
 * tribe is matched against its last image by what its raster reads (`FeatherSignature`: its colour, its
 * rings, and in outset the rings of the polities near it) — so an edit elsewhere reuses every image
 * (ARCH-002 / QUAL-002). Measured 2026-10-18 on 1100's seventeen tribes, against a frame budget of ~8 ms: a
 * full recompute on every edit was ~95 ms in inset and ~136 ms in outset; measuring the neighbours only where
 * they decide brought it to ~25 and ~75; an unrelated edit now costs ~0.4 and ~3 ms, the anchors that did
 * not move kept projected (`createGridProjection`).
 *
 * The view is deliberately in neither key, and the frame, the fade and the land are fixed for the life of
 * the cache. The colours are derived from the document, cached on the same counter
 * (`state/polityColourSource`), so they move with it.
 *
 * **Reference identity is the contract**: two calls at the same version hand back the same array, an image
 * reused is the same object, and a version that changed no tribe hands back the same array again — so
 * "nothing was recomputed" is observable rather than a claim.
 */

/** One tribe's fade, ready to paint. */
export interface TribeFeatherImage {
  /** The image — the tribe's colour, its fade as alpha. */
  image: CanvasImageSource
  /** Where it lies, in backdrop pixels. */
  box: Rect
}

/** The cache. */
export interface TribeFeatherCache {
  /**
   * Each tribe's fade, as an image over its box.
   * @param document - the document to read
   * @param version - the edition's version counter
   * @param colours - each polity's colour, by id
   * @returns the images, back to front, each made again only if what it reads moved
   */
  feathersOf: (
    document: YearDocument,
    version: number,
    colours: ReadonlyMap<string, string>
  ) => readonly TribeFeatherImage[]
}

/**
 * Turn a raster into something a 2D context can draw.
 * @param raster - the pixels and their size
 * @returns the image
 */
export type RasterToImage = (raster: TribeFeatherRaster) => CanvasImageSource

/** A raster to make, as a plan says it: whose, what it reads, and how to measure it — a tribe's fade or a vassal's band. */
export interface RasterPlan {
  /** The polity's id. */
  polity: string
  /** What its raster reads — compared with the last one's before measuring again. */
  signature: FeatherSignature
  /**
   * Measure it.
   * @returns the raster, or `null` when there is nothing to draw
   */
  raster: () => TribeFeatherRaster | null
}

/** One plan as last made: its plan, and its image — `null` when it had nothing to draw. */
export interface MadeRaster<P extends RasterPlan> {
  /** The plan it was made from, or the earlier one it was matched to. */
  plan: P
  /** Its image, or `null` when there was nothing to draw or its measure was not a number. */
  image: TribeFeatherImage | null
}

/**
 * Make each plan's image, reusing the last one made from the same polity and the same signature — the reuse both the
 * tribes' fades and the vassals' bands are cached by. The plan kept is always the new one, so what it points at (a
 * claim) is the document's of now.
 * @param plans - this version's plans, in painting order
 * @param previous - the last version's, consumed as each is matched
 * @param toImage - how a raster becomes an image
 * @returns one entry per plan, in the same order
 */
export function makeFromPlans<P extends RasterPlan>(
  plans: readonly P[],
  previous: MadeRaster<P>[],
  toImage: RasterToImage
): MadeRaster<P>[] {
  return plans.map((plan) => {
    const index = previous.findIndex(
      (last) =>
        last.plan.polity === plan.polity && sameSignature(last.plan.signature, plan.signature)
    )
    const reused = previous[index]
    if (reused !== undefined) {
      // Taken once: a polity with two claims of the same signature is matched to each in turn.
      previous.splice(index, 1)
      return { plan, image: reused.image }
    }
    const raster = plan.raster()
    return { plan, image: raster === null ? null : { image: toImage(raster), box: raster.box } }
  })
}

/**
 * Whether two lists hold the same images, in the same order.
 * @param a - one list
 * @param b - the other
 * @returns `true` when each image is the same object
 */
function sameImages(a: readonly TribeFeatherImage[], b: readonly TribeFeatherImage[]): boolean {
  return a.length === b.length && a.every((image, index) => image === b[index])
}

/**
 * Open a cache over one backdrop frame, one fade and one land mask, fixed for the life of the cache.
 * @param ground - the backdrop's frame, the fade — `TRIBE_FEATHER` in the application — and the land mask
 * @param toImage - how a raster becomes an image: a canvas in the browser, a stand-in in a test
 * @returns the cache
 */
export function createTribeFeatherCache(
  ground: FeatherGround,
  toImage: RasterToImage
): TribeFeatherCache {
  // `null` rather than empty, so the first call is a miss even for a document with no tribe.
  let images: readonly TribeFeatherImage[] | null = null
  let at = Number.NaN
  let made: MadeRaster<TribeFeatherPlan>[] = []
  const projection = createGridProjection(ground.frame)
  return {
    feathersOf(document, version, colours) {
      if (images !== null && version === at) return images
      made = makeFromPlans(tribeFeatherPlans(document, colours, ground, projection), made, toImage)
      const next = made.flatMap((entry) => (entry.image === null ? [] : [entry.image]))
      // The same array when every image is the one already handed out: nothing was made again.
      if (images === null || !sameImages(images, next)) images = next
      // Only once every image is made: a maker that threw leaves this version to be asked again.
      at = version
      return images
    },
  }
}

/**
 * A raster as a canvas of its own size — the browser's {@link RasterToImage}, for a tribe's fade and a vassal's band
 * alike.
 * @param raster - the pixels and their size
 * @returns the canvas
 * @throws when the browser gives no 2D context — a browser that cannot run this application at all, the
 *   same decision `startCanvasController` takes; an image drawn from nothing would hide a tribe or a vassal's band
 *   silently
 */
export function rasterToCanvas(raster: TribeFeatherRaster): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = raster.box.width
  canvas.height = raster.box.height
  const ctx = canvas.getContext('2d')
  if (ctx === null)
    throw new Error(
      'Cartographer: the canvas gave no 2D context — no tribe and no vassal band can be drawn.'
    )
  ctx.putImageData(new ImageData(raster.pixels, raster.box.width, raster.box.height), 0, 0)
  return canvas
}
