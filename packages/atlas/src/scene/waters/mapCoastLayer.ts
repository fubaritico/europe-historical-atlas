/**
 * How the shoreline is put on the map: traced from the land mask, drawn as a line laid along the shore.
 */

import { createMaskCoastlineSource } from '@europe-historical-atlas/core/data/coastlineSource'

import { maskOrFallback } from '../landMask'
import { disposeHandle } from '../layers/disposeHandle'
import { createLineLayer } from '../lines/lineLayer'

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
  // Traced at twice the DEM rather than at the mask's full four times: the extra fidelity is invisible
  // at the zooms the coastline is drawn at, and marching 23 million cells is not.
  const segments = createMaskCoastlineSource(
    maskOrFallback(context),
    sources.heightmap.meta.width * 2
  ).load()
  // Drawn on the shore projection, styled from the dev panel's coast settings, and added to the scene.
  handles.coastline = createLineLayer(segments, {
    project: projection.shore,
    depthBias: dev.coast.depthBias,
    color: dev.coast.color,
    opacity: dev.coast.opacity,
    jitter: dev.coast.jitter,
    strokes: dev.coast.strokes,
  })
  scene.add(handles.coastline.object)
}
