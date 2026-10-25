/**
 * How the events are pinned on the relief (CMS-224).
 *
 * Out of `mapLayerBuilders` for its length; same shape as the builders there: it takes the layers' context, holds
 * nothing, and leaves its handle in the context.
 */

import { eventPins } from './eventPins'
import { disposeHandle } from './mapLayerContext'
import { createEventMarkers } from './scene/eventMarkers'

import type { LayerContext } from './mapLayerContext'

/**
 * Pin the contribution's events on the relief. A no-op until both the events and the relief are in — whichever
 * lands last draws them, like the rivers. The pins follow the relief's exaggeration from the next frame on.
 * @param context - the layers and what they read
 * @returns nothing
 */
export function rebuildEvents(context: LayerContext): void {
  const { scene, sources, handles, projection } = context
  disposeHandle(scene, handles.events)
  handles.events = null
  if (!sources.heightmap || !sources.reliefSource || sources.events.length === 0) return
  const pins = eventPins(sources.events, sources.heightmap.meta.bbox)
  if (pins.length === 0) return
  handles.events = createEventMarkers(pins.map((pin) => projection.draped(pin.u, pin.v)))
  scene.add(handles.events.object)
}
