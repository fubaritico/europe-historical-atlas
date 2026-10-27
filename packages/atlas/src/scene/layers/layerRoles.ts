/**
 * What each layer is to the relief, in one table both the frame and the teardown read (ATLAS-293): laid on it and
 * following its exaggeration, or flat on the sheet, or no drawing at all. Typed over every handle, so a layer added
 * to `LayerHandles` without a role here fails type-check — the two hand-kept lists this replaces could each miss it.
 */

import type { LayerHandles } from './layerContext'

/** What a handle is to the relief. */
export type LayerRole =
  /** The relief mesh itself — scaled and freed on its own terms. */
  | 'relief'
  /** Laid on the relief: built against its unexaggerated heights, so it follows its `scale.y`. */
  | 'draped'
  /** Drawn on the scene but not on the relief — the sheet, the frame, the decor: it never follows the relief. */
  | 'flat'
  /** A texture held apart from the mesh it hangs on: freed at teardown, never drawn as a layer. */
  | 'texture'
  /** A cut kept to avoid recomputing it: nothing to draw, nothing to free. */
  | 'cache'

/** Every handle's role. The rhumbs are flat: they are projected on the map's plane, not draped on the relief. */
export const LAYER_ROLES = {
  relief: 'relief',
  edge: 'draped',
  texture: 'texture',
  coastline: 'draped',
  rhumb: 'flat',
  rivers: 'draped',
  borders: 'draped',
  fills: 'draped',
  fillCut: 'cache',
  tribes: 'draped',
  tribeCut: 'cache',
  events: 'draped',
  compass: 'flat',
  sheet: 'flat',
  frame: 'flat',
  labels: 'flat',
  title: 'flat',
  sheetTexture: 'texture',
} as const satisfies Record<keyof LayerHandles, LayerRole>

/** The handles of one role, as a type — what lets a caller reach the methods that role's layers share. */
export type LayersWithRole<R extends LayerRole> = {
  [K in keyof typeof LAYER_ROLES]: (typeof LAYER_ROLES)[K] extends R ? K : never
}[keyof typeof LAYER_ROLES]

/**
 * The handles that play a role, in the table's order.
 * @param role - the role asked for
 * @returns their keys
 */
export function layersWithRole<R extends LayerRole>(role: R): LayersWithRole<R>[] {
  return (Object.keys(LAYER_ROLES) as (keyof typeof LAYER_ROLES)[]).filter(
    (key): key is LayersWithRole<R> => LAYER_ROLES[key] === role
  )
}
