import { backdropToLonLat } from '../../viewport/projection'

import { SNAP_LAYERS, layerLines, snapHit } from './layerHits'
import { leaveLayer } from './layerSwitch'

import type { LayerHitContext } from './layerHits'
import type { LayerSwitchContext } from './layerSwitch'
import type { SnapVertex, ToolSession } from './toolSession'
import type { BackdropFrame } from '../../viewport/projection'
import type { Point } from '../../viewport/viewport'

/** What finding the water under an anchor needs: the layers, the backdrop's frame and the anchors on screen. */
export interface WaterVertexContext extends LayerHitContext {
  /** The backdrop's frame, to read a layer vertex in degrees. */
  frame: BackdropFrame
  /** Every anchor of the document, projected to the screen. */
  anchorsOnScreen: () => readonly Point[]
}

/** What resuming the water from the last point needs: the above, and the session it writes. */
export interface SnapFromAnchorContext extends WaterVertexContext, LayerSwitchContext {
  /** The session, whose last point and snap are read and written. */
  session: ToolSession
}

/**
 * The water vertex an anchor sits exactly on — so the next click on that water follows it from the anchor,
 * whether the run started there (the retrace) or the Pen took the anchor as a point (the dev, 2026-11-08).
 * Exact equality, as `anchorsByPosition` reads it: an anchor taken from the coast *is* the coast vertex.
 * @param context - the layers, the frame and the view
 * @param anchor - the anchor
 * @returns the vertex, or `null` for an anchor on no water
 */
export function waterVertexOf(context: WaterVertexContext, anchor: number): SnapVertex | null {
  const at = context.store.getState().document.anchors[anchor]
  const onScreen = context.anchorsOnScreen()[anchor]
  if (at === undefined || onScreen === undefined) return null
  for (const layer of SNAP_LAYERS) {
    const hit = snapHit(context, layer, onScreen)
    if (hit === null) continue
    const vertex = layerLines(context, layer)[hit.contour]?.points[hit.vertex]
    if (vertex === undefined) continue
    const lonLat = backdropToLonLat(vertex, context.frame)
    if (lonLat[0] === at[0] && lonLat[1] === at[1]) return hit
  }
  return null
}

/**
 * After the Pen took an anchor as a point (the dev, 2026-11-08: *"tu bascules de mode au clic sur un point"*):
 * the Pen leaves the water it followed, and says so — then, if that anchor sits on the coast or a river, the
 * next click on that water follows it from the anchor, as from a vertex the Pen snapped onto.
 * @param context - the session, the store, the layers, the frame and the view
 */
export function leaveLayerAtAnchor(context: SnapFromAnchorContext): void {
  leaveLayer(context)
  const anchor = context.session.outline.at(-1)?.anchor
  context.session.snap =
    anchor === undefined || anchor === null ? null : waterVertexOf(context, anchor)
}
