/**
 * How the events are pinned on the relief (CMS-224).
 *
 * Same shape as every family's builder (`map…Layer`): it takes the layers' context, holds nothing, and leaves its
 * handle in the context.
 */

import { createCityMarkers } from '../cities/cityMarkers'
import { cityPins } from '../cities/cityPins'
import { disposeHandle } from '../layers/disposeHandle'
import { svgToTexture } from '../svgTexture'

import { eventPins } from './eventPins'
import { createEventIconMarkers } from './icons/eventIconMarkers'
import { createMarkerLights } from './markerLights'
import { combineEventMarkers } from './markers'
import { EVENT_MARKER_STYLE, createPinMarkers, pinMeasures } from './pin'
import { groundAtFrom } from './shadows/groundAt'
import { createGroundShadows } from './shadows/groundShadows'
import { SHADOW_SUN, pinFootprint } from './shadows/shadowFootprint'

import type { LayerContext } from '../layers/layerContext'

/**
 * Stand the contribution's events on the relief: its type's icon where one is chosen (ATLAS-156), a pin otherwise —
 * and its cities, each with its mark and its name (ATLAS-295).
 * A no-op until the content is in and the map is drawn (`mapDrawn`) — whichever comes last draws them. The markers
 * follow the relief's exaggeration from the next frame on.
 * @param context - the layers and what they read
 * @returns nothing
 */
export function rebuildEvents(context: LayerContext): void {
  const { scene, sources, handles, projection, blurMethod } = context
  // 1. The markers drawn before, if any, removed and freed.
  disposeHandle(scene, handles.events)
  handles.events = null
  if (
    !sources.mapDrawn ||
    !sources.heightmap ||
    !sources.reliefSource ||
    (sources.events.length === 0 && sources.cities.length === 0)
  ) {
    return
  }

  // 2. Each event that has a place on the map, at its point on the relief, with the icon its type chose.
  const pins = eventPins(sources.events, sources.heightmap.meta.bbox)
  const placed = pins.map((pin) => ({
    ground: projection.draped(pin.u, pin.v),
    icon: pin.event.type.icon,
    colour: pin.event.type.colour,
  }))

  // 3. Split in two: the events whose type chose a shaped icon, and the plain pins.
  const shaped = placed.flatMap(({ ground, icon }) =>
    icon === 'pin' ? [] : [{ ground, kind: icon }]
  )

  // 4. The lights, the pins' shadows and both kinds built, held as one handle, and added to the scene: one rig lights
  // the pins and the icons alike, whichever the map holds; each pin and each icon casts its shadow to the south-east, on the relief.
  const plain = placed.flatMap(({ ground, icon, colour }) =>
    icon === 'pin' ? [{ ground, colour }] : []
  )
  const groundAt = groundAtFrom(projection)
  handles.events = combineEventMarkers([
    createMarkerLights(),
    createGroundShadows(
      plain.map(({ ground }) => ground),
      pinFootprint(pinMeasures(EVENT_MARKER_STYLE), SHADOW_SUN),
      groundAt
    ),
    createPinMarkers(plain, svgToTexture),
    createEventIconMarkers(shaped, svgToTexture, groundAt, blurMethod),
    // 5. The cities, lit by the level of detail (ATLAS-295) — held with the events, moved and freed with them.
    createCityMarkers(
      cityPins(sources.cities, sources.heightmap.meta.bbox).map(({ city, u, v }) => ({
        ground: projection.draped(u, v),
        importance: city.importance,
        name: city.place.name.fr,
        u,
        v,
      })),
      svgToTexture,
      context.cityLabels
    ),
  ])
  // The countries' names already placed, if any: the cities' points on them yield (ATLAS-323).
  handles.events.setNameCover?.(sources.yearNames)
  scene.add(handles.events.object)
}
