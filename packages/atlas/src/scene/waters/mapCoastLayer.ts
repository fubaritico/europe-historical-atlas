/**
 * How the shoreline is put on the map: traced from the land mask, drawn as a line laid along the shore.
 */

import { createMaskCoastlineSource } from '@europe-historical-atlas/core/data/coastlineSource'

import { maskOrFallback } from '../landMask'
import { disposeHandle } from '../layers/disposeHandle'
import { createLineLayer } from '../lines/lineLayer'
import { BORDER_RENDER_ORDER } from '../political/borders/mapBorderLayer'

import type { LayerContext } from '../layers/layerContext'

/**
 * Retrace and redraw the shoreline.
 * @param context - the layers and what they read
 * @returns nothing
 */
export function rebuildCoastline(context: LayerContext): void {
  const { scene, dev, sources, handles, projection } = context
  // Nothing to trace before the elevation has loaded; otherwise the old line goes first.
  if (!sources.heightmap) return
  disposeHandle(scene, handles.coastline)
  // Traced on the mask's own grid, where the tints stop (CORE-421), and drawn in the frontier's ink over them — the
  // line the polities' frontiers drew when their outlines followed the coast; now their outlines run at sea, cut by
  // the mask. The trace costs ~2.5 s on this thread: to move to the build, as the bands were.
  const segments = createMaskCoastlineSource(maskOrFallback(context)).load()
  handles.coastline = createLineLayer(segments, {
    project: projection.shore,
    depthBias: dev.coast.depthBias,
    color: dev.political.frontierColor,
    opacity: dev.political.frontierOpacity,
    width: dev.political.frontierWidth,
    renderOrder: BORDER_RENDER_ORDER,
  })
  scene.add(handles.coastline.object)
}
