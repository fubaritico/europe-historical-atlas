/**
 * How the rivers are put on the map: each mouth bridged to the drawn shore, then draped on the relief.
 */

import {
  DEFAULT_RIVER_EXTENSION,
  extendRiversToSea,
} from '@europe-historical-atlas/core/data/riverSource'

import { maskOrFallback } from '../landMask'
import { disposeHandle } from '../layers/disposeHandle'
import { DRAPED_DEPTH_BIAS } from '../lines/depthBias'

import { createRiverLayer } from './riverLayer'

import type { LayerContext } from '../layers/layerContext'

/**
 * Redrape the rivers.
 * @param context - the layers and what they read
 * @returns nothing
 */
export function rebuildRivers(context: LayerContext): void {
  const { scene, dev, sources, handles, projection } = context
  // The old network out; nothing more to do before the elevation and the rivers have loaded.
  disposeHandle(scene, handles.rivers)
  handles.rivers = null
  if (!sources.heightmap || sources.riverData.length === 0) return
  // Natural Earth stops its centrelines at the estuary head, so bridge each mouth to the shoreline we
  // actually draw. Done here, not baked into the asset, because it keys off the live sea level.
  const connected = extendRiversToSea(
    sources.riverData,
    maskOrFallback(context),
    DEFAULT_RIVER_EXTENSION
  )
  // Draped on the relief and cut to its surface, styled from the dev panel's river settings.
  handles.rivers = createRiverLayer(connected, {
    project: projection.draped,
    split: projection.split,
    depthBias: DRAPED_DEPTH_BIAS,
    color: dev.river.color,
    opacity: dev.river.opacity,
    revealStart: dev.river.revealStart,
    revealEnd: dev.river.revealEnd,
    fade: dev.river.fade,
    includeLakeCenterlines: dev.river.includeLakeCenterlines,
    jitter: dev.river.jitter,
    widthMajor: dev.river.widthMajor,
    widthMinor: dev.river.widthMinor,
  })
  // The fat lines need the viewport size before their first frame, or their width is wrong.
  handles.rivers.setResolution(window.innerWidth, window.innerHeight)
  scene.add(handles.rivers.object)
}
