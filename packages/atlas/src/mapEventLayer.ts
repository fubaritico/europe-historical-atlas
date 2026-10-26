/**
 * How the events are pinned on the relief (CMS-224).
 *
 * Out of `mapLayerBuilders` for its length; same shape as the builders there: it takes the layers' context, holds
 * nothing, and leaves its handle in the context.
 */

import { eventPins } from './eventPins'
import { disposeHandle } from './mapLayerContext'
import { createEventIconMarkers } from './scene/eventIconMarkers'
import { combineEventMarkers, createEventMarkers } from './scene/eventMarkers'
import { svgToTexture } from './scene/svgTexture'

import type { LayerContext } from './mapLayerContext'

/**
 * Stand the contribution's events on the relief: its type's icon where one is chosen (ATLAS-156), a pin otherwise.
 * A no-op until the events are in and the map is drawn (`mapDrawn`) — whichever comes last draws them. The markers
 * follow the relief's exaggeration from the next frame on.
 * @param context - the layers and what they read
 * @returns nothing
 */
export function rebuildEvents(context: LayerContext): void {
  const { scene, sources, handles, projection } = context
  disposeHandle(scene, handles.events)
  handles.events = null
  if (
    !sources.mapDrawn ||
    !sources.heightmap ||
    !sources.reliefSource ||
    sources.events.length === 0
  ) {
    return
  }
  const pins = eventPins(sources.events, sources.heightmap.meta.bbox)
  if (pins.length === 0) return
  const placed = pins.map((pin) => ({
    ground: projection.draped(pin.u, pin.v),
    icon: pin.event.type.icon,
  }))
  const shaped = placed.flatMap(({ ground, icon }) =>
    icon === 'pin' ? [] : [{ ground, kind: icon }]
  )
  handles.events = combineEventMarkers([
    createEventMarkers(placed.filter(({ icon }) => icon === 'pin').map(({ ground }) => ground)),
    createEventIconMarkers(shaped, svgToTexture),
  ])
  scene.add(handles.events.object)
}
