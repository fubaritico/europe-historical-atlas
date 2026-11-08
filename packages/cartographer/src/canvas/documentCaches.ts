import { TRIBE_FEATHER } from '@europe-historical-atlas/core/editor/tribeFeather'

import { createAnchorCache } from './anchorCache'
import { createCityAlertCache } from './cityAlertCache'
import { canvasOverlaps } from './overlapsOnCanvas'
import { createTribeFeatherCache } from './tribeFeatherCache'

import type { CanvasControllerDeps } from './controllerDeps'
import type { LiveCanvas } from './liveCanvas'

/**
 * The caches a canvas keeps on the edition's version — what a paint reads of the document without computing it again
 * on every pointer move: the anchors projected, the tribes' fades, the overlaps (CARTO-364), the cities' alerts
 * (CARTO-389).
 * @param deps - the frame, the land mask and how a tribe's raster becomes an image
 * @returns the four caches, empty
 */
export function documentCaches(
  deps: Pick<CanvasControllerDeps, 'frame' | 'landMask' | 'tribeImage'>
): Pick<LiveCanvas, 'anchors' | 'tribeFeathers' | 'overlaps' | 'cityAlerts'> {
  return {
    anchors: createAnchorCache(deps.frame),
    tribeFeathers: createTribeFeatherCache(
      { frame: deps.frame, feather: TRIBE_FEATHER, land: deps.landMask },
      deps.tribeImage
    ),
    overlaps: canvasOverlaps(deps.frame),
    cityAlerts: createCityAlertCache(),
  }
}
