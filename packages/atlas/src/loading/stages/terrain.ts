/**
 * The relief and the land mask, loaded together and checked to be about the same part of the world.
 */

import { assetError, boundsMatch } from '@europe-historical-atlas/core/data/assetError'

import { LAND_MASK_URL } from '../assets'

import type { PipelineContext } from '../pipelineContext'
import type { ByteReport } from '@europe-historical-atlas/core/utils/readBytes'

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
 * @param onProgress - where the two downloads' share received goes, `0..1` of their bytes together (ATLAS-333)
 * @returns once both have been settled into the sources
 */
export async function loadTerrain(
  context: PipelineContext,
  onProgress?: (fraction: number) => void
): Promise<void> {
  const { sources, ui } = context
  const count = onProgress === undefined ? undefined : countTwoDownloads(onProgress)
  // Fetch both at once: a failed mask is told and becomes null, a failed relief rejects.
  const [dem, mask] = await Promise.all([
    context.assets.heightmap.load(count?.relief),
    context.assets.landMask.load(count?.mask).catch((error: unknown) => {
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

/**
 * The relief's and the mask's downloads counted as one: the bytes received of both over the sizes their sidecars
 * state. **Nothing is told until both sizes are known** (review ARCH-002): counted over the first file alone, a mask in
 * before the relief's first chunk would fill the step at once, and the bar would stand still through the whole relief.
 * Each download tells its size before its first chunk (core's `readBytes`), and both sidecars are asked at once.
 * @param onProgress - where the share received of both goes, `0..1`
 * @returns the two reports, one per download
 */
export function countTwoDownloads(onProgress: (fraction: number) => void): {
  relief: ByteReport
  mask: ByteReport
} {
  const received = { relief: 0, mask: 0 }
  const total = { relief: 0, mask: 0 }
  const report =
    (file: 'relief' | 'mask'): ByteReport =>
    (bytes, size) => {
      received[file] = bytes
      total[file] = size
      if (total.relief === 0 || total.mask === 0) return
      onProgress((received.relief + received.mask) / (total.relief + total.mask))
    }
  return { relief: report('relief'), mask: report('mask') }
}
