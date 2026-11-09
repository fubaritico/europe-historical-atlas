import { createGridProjection } from './paint/tribeFeathers'
import { vassalBandPlans } from './paint/vassalBands'
import { makeFromPlans } from './tribeFeatherCache'

import type { VassalBandPlan } from './paint/vassalBands'
import type { MadeRaster, RasterToImage, TribeFeatherImage } from './tribeFeatherCache'
import type { BackdropFrame } from '../viewport/projection'
import type { YearDocument } from '@europe-historical-atlas/core/data/yearDocument'

/**
 * The vassals' bands as images (ATLAS-398), each made again only when what it reads changed — **keyed as the tribes'
 * fades are** (`tribeFeatherCache`): the edition's version first, so a pan costs one comparison, then each vassal's
 * colour and rings, so an edit elsewhere reuses its image (`makeFromPlans`, shared with the tribes).
 *
 * **Answered by claim**, the document's own object: the scene lays each band on the fill of that very claim
 * (`projectedFills`), drawn clipped by its outline.
 */

/** Each vassal claim's band, by the claim it fills. */
export type VassalBandImages = ReadonlyMap<YearDocument['claims'][number], TribeFeatherImage>

/** The cache. */
export interface VassalBandCache {
  /**
   * Each vassal's band, as an image over its box, by the claim it fills.
   * @param document - the document to read
   * @param version - the edition's version counter
   * @param colours - each polity's colour, by id
   * @returns the images, by claim; the same map at the same version
   */
  bandsOf: (
    document: YearDocument,
    version: number,
    colours: ReadonlyMap<string, string>
  ) => VassalBandImages
}

/**
 * Open a cache over one backdrop frame, fixed for its life.
 * @param frame - the backdrop's coordinate system
 * @param toImage - how a raster becomes an image: a canvas in the browser, a stand-in in a test
 * @returns the cache
 */
export function createVassalBandCache(
  frame: BackdropFrame,
  toImage: RasterToImage
): VassalBandCache {
  // `null` rather than empty, so the first call is a miss even for a document with no vassal.
  let bands: VassalBandImages | null = null
  let at = Number.NaN
  let made: MadeRaster<VassalBandPlan>[] = []
  const projection = createGridProjection(frame)
  return {
    bandsOf(document, version, colours) {
      if (bands !== null && version === at) return bands
      made = makeFromPlans(vassalBandPlans(document, colours, frame, projection), made, toImage)
      const next = new Map<YearDocument['claims'][number], TribeFeatherImage>()
      for (const { plan, image } of made) if (image !== null) next.set(plan.claim, image)
      bands = next
      // Only once every image is made: a maker that threw leaves this version to be asked again.
      at = version
      return bands
    },
  }
}
