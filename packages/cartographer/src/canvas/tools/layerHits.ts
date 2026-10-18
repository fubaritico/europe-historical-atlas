import { nearestLineVertex } from '../../geometry/lineSnap'
import { isFollowingMode } from '../../state/toolSlice'
import { screenToBackdrop } from '../../viewport/viewport'

import type { SnapLayers } from './snapLayers'
import type { SnapLayer, SnapVertex } from './toolSession'
import type { SnapLine } from '../../geometry/lineSnap'
import type { CartographerStoreHook } from '../../state/store'
import type { Point } from '../../viewport/viewport'

/*
 * What the coast and the rivers offer a gesture: the layer a mode follows, the lines of a layer, the
 * vertex under the pointer, and which of the two waters is nearer — read by the Pen, the Pencil and the
 * overlay alike.
 */

/** What a layer lookup needs: the store for the mode and the view, the layers, and the reach in pixels. */
export interface LayerHitContext {
  /** The store holding the Pen's mode and the viewport. */
  store: CartographerStoreHook
  /** The coast and the rivers, by layer. */
  layers: SnapLayers
  /** The snapping radius, in screen pixels. */
  radius: number
}

/** The layers a click may snap to — the coast first, so an exact tie goes to the shore. */
const SNAP_LAYERS: readonly SnapLayer[] = ['coast', 'river']

/**
 * The layer the Pen follows in its current mode, or `null` for the free Pen.
 * @param context - the store
 * @returns the layer
 */
export function followedLayer(context: LayerHitContext): SnapLayer | null {
  const mode = context.store.getState().penMode
  return isFollowingMode(mode) ? mode : null
}

/**
 * The coast or the river a click at `at` snaps to: whichever has a vertex within reach, and the nearer
 * when both do — the one criterion that favours neither (`s02`, 2026-10-12). Every mode snaps to both,
 * the plain Pen and the Pencil included: the Pen finds the water by itself.
 * @param context - the snap layers and the view
 * @param at - the pointer, in screen pixels
 * @returns the layer, or `null` when neither is within reach
 */
export function nearestLayer(context: LayerHitContext, at: Point): SnapLayer | null {
  const viewport = context.store.getState().viewport
  const pointer = screenToBackdrop(viewport, at)
  let nearest: { layer: SnapLayer; distance: number } | null = null
  for (const layer of SNAP_LAYERS) {
    const hit = snapHit(context, layer, at)
    const vertex =
      hit === null ? undefined : layerLines(context, layer)[hit.contour]?.points[hit.vertex]
    if (vertex === undefined) continue
    const distance = Math.hypot(vertex[0] - pointer[0], vertex[1] - pointer[1])
    if (nearest === null || distance < nearest.distance) nearest = { layer, distance }
  }
  return nearest?.layer ?? null
}

/**
 * The lines of a layer, in backdrop pixels.
 * @param context - the snap layers
 * @param layer - which layer
 * @returns its lines
 */
export function layerLines(context: LayerHitContext, layer: SnapLayer): readonly SnapLine[] {
  return context.layers[layer].lines
}

/**
 * What the line under a hit is called — `"coastline"`, a river's name verbatim (`snapLayersOf`).
 * @param context - the snap layers
 * @param hit - the vertex
 * @returns the line's label
 */
export function lineLabel(context: LayerHitContext, hit: SnapVertex): string {
  return context.layers[hit.layer].label(hit.contour)
}

/**
 * The layer vertex under the pointer, or `null` when the layer is out of reach.
 *
 * The pointer is brought into the layer's own grid — one point — rather than the 95 233 coast points
 * onto the screen; the radius follows it, divided by the scale.
 * @param context - the snap layers and the view
 * @param layer - which layer
 * @param at - the pointer, in screen pixels
 * @returns the vertex, or `null`
 */
export function snapHit(context: LayerHitContext, layer: SnapLayer, at: Point): SnapVertex | null {
  const viewport = context.store.getState().viewport
  if (viewport.scale <= 0) return null
  const hit = nearestLineVertex(
    layerLines(context, layer),
    screenToBackdrop(viewport, at),
    context.radius / viewport.scale
  )
  return hit === null ? null : { ...hit, layer }
}
