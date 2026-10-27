/**
 * The relief and the land mask, loaded together and checked to be about the same part of the world.
 */

import { assetError, boundsMatch } from '@europe-historical-atlas/core/data/assetError'

import { LAND_MASK_URL } from '../assets'

import type { PipelineContext } from '../pipelineContext'

/**
 * How far the land mask's frame may differ from the relief's before the two are declared to be about
 * different parts of the world. A JSON round trip rounds; a different crop does not miss by a degree.
 */
const BBOX_TOLERANCE_DEG = 1e-6

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
export async function loadTerrain(context: PipelineContext): Promise<void> {
  const { sources, ui } = context
  // Fetch both at once: a failed mask is told and becomes null, a failed relief rejects.
  const [dem, mask] = await Promise.all([
    context.assets.heightmap.load(),
    context.assets.landMask.load().catch((error: unknown) => {
      ui.reportAssetFailure('landMask', error)
      return null
    }),
  ])
  if (context.isDisposed()) return
  sources.heightmap = dem
  // A mask cropped to another frame than the relief's is refused and told; the map goes on.
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
