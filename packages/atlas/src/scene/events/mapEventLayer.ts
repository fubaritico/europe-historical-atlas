/**
 * How the events are pinned on the relief (CMS-224).
 *
 * Same shape as every family's builder (`map…Layer`): it takes the layers' context, holds nothing, and leaves its
 * handle in the context.
 */

import { createCityMarkers } from '../cities/cityMarkers'
import { cityPins } from '../cities/cityPins'
import { iconOver } from '../cities/iconFootprint'
import { disposeHandle } from '../layers/disposeHandle'
import { svgToTexture } from '../svgTexture'

import { eventPins } from './eventPins'
import { eventsOfYear } from './eventsOfYear'
import { iconFootprint } from './icons/crossFade'
import { createEventIconMarkers } from './icons/eventIconMarkers'
import { BUILDING_LIGHTING } from './icons/light/lighting'
import { EVENT_ICON_HEIGHT, ICON_BUILDING } from './icons/settings'
import { createMarkerLights } from './markerLights'
import { combineEventMarkers } from './markers'
import { EVENT_MARKER_STYLE, createPinMarkers, pinMeasures } from './pin'
import { placePreviewIcons } from './previewIcons'
import { groundAtFrom } from './shadows/groundAt'
import { createGroundShadows } from './shadows/groundShadows'
import { SHADOW_SUN, pinFootprint } from './shadows/shadowFootprint'

import type { PlacedEventIcon } from './icons/forms'
import type { PlacedCity } from '../cities/cityMarkers'
import type { StandingIcon } from '../cities/iconFootprint'
import type { LayerContext } from '../layers/layerContext'
import type { GeoBounds } from '@europe-historical-atlas/core/geo/mercator'

/**
 * Whether the events can be pinned: the map drawn on its relief, a year asked, and something to pin.
 * @param sources - what the map has been given
 * @param previewed - how many icons the dev's preview stands
 * @returns `true` once all of it is in
 */
function readyToPin(sources: LayerContext['sources'], previewed: number): boolean {
  return (
    sources.mapDrawn &&
    sources.heightmap !== null &&
    sources.reliefSource !== null &&
    sources.askedYear !== null &&
    (sources.events.length > 0 || sources.cities.length > 0 || previewed > 0)
  )
}

/**
 * The cities to draw, each at its point on the relief — and, one sign per place (the dev, 2026-11-17), with the room of
 * the event's icon standing on it, for that city to give the icon its point and start its name past it.
 * @param context - the layers and what they read
 * @param bounds - the map's frame
 * @param standing - the events' shaped icons on the map
 * @returns the cities, in the order of the content's
 */
function placedCities(
  context: LayerContext,
  bounds: GeoBounds,
  standing: readonly StandingIcon[]
): PlacedCity[] {
  return cityPins(context.sources.cities, bounds).map(({ city, u, v }) => {
    const ground = context.projection.draped(u, v)
    const icon = iconOver(ground, standing)
    return {
      ground,
      importance: city.importance,
      name: city.place.name.fr,
      u,
      v,
      // Absent, never `undefined`: a city with no icon on it keeps its point.
      ...(icon === undefined ? {} : { icon }),
    }
  })
}

/**
 * Stand the contribution's events on the relief: its type's icon where one is chosen (ATLAS-156), a pin otherwise —
 * and its cities, each with its mark and its name (ATLAS-295).
 * Only the events of the year asked are pinned; the cities are pinned whatever their date, for now (the dev, 2026-11-02).
 * A no-op until the content is in, a year is asked and the map is drawn (`mapDrawn`) — whichever comes last draws them. The markers
 * follow the relief's exaggeration from the next frame on.
 * The dev's preview icons, on the dev server alone (`context.previewIcons`), are stood with the events and count as
 * something to pin, whatever the content holds; a building among the icons takes the counter-light with it.
 * @param context - the layers and what they read
 * @returns nothing
 */
export function rebuildEvents(context: LayerContext): void {
  const { scene, sources, handles, projection, blurMethod } = context
  // 1. The markers drawn before, if any, removed and freed.
  disposeHandle(scene, handles.events)
  handles.events = null
  const previewed = context.previewIcons.length
  if (!readyToPin(sources, previewed) || !sources.heightmap || sources.askedYear === null) return

  // 2. Each event of the year asked that has a place on the map, at its point on the relief, with the icon its type chose.
  const pins = eventPins(
    eventsOfYear(sources.events, sources.askedYear),
    sources.heightmap.meta.bbox
  )
  const placed = pins.map((pin) => ({
    ground: projection.draped(pin.u, pin.v),
    icon: pin.event.type.icon,
    colour: pin.event.type.colour,
  }))

  // 3. Split in two: the events whose type chose a shaped icon — and the dev's preview, if any — and the plain pins.
  const shaped: PlacedEventIcon[] = [
    ...placed.flatMap(({ ground, icon }) => (icon === 'pin' ? [] : [{ ground, kind: icon }])),
    ...placePreviewIcons(context.previewIcons, sources.heightmap.meta.bbox, projection.draped),
  ]

  // 4. The lights, the pins' shadows and both kinds built, held as one handle, and added to the scene: one rig lights
  // the pins and the icons alike, whichever the map holds; each pin and each icon casts its shadow to the south-east, on the relief.
  const plain = placed.flatMap(({ ground, icon, colour }) =>
    icon === 'pin' ? [{ ground, colour }] : []
  )
  const groundAt = groundAtFrom(projection)
  // One sign per place: the room each shaped icon takes, for the city under it to give it its point.
  const standing = shaped.map(({ ground, kind }) => ({
    ground,
    footprint: iconFootprint(kind, EVENT_ICON_HEIGHT),
  }))
  handles.events = combineEventMarkers([
    // A building on the map takes the counter-light with it (`ICON_BUILDING`).
    createMarkerLights(
      shaped.some(({ kind }) => ICON_BUILDING[kind]) ? BUILDING_LIGHTING : undefined
    ),
    createGroundShadows(
      plain.map(({ ground }) => ground),
      pinFootprint(pinMeasures(EVENT_MARKER_STYLE), SHADOW_SUN),
      groundAt
    ),
    createPinMarkers(plain, svgToTexture),
    // The one height the icons are built at and their room is told from.
    createEventIconMarkers(shaped, svgToTexture, groundAt, blurMethod, EVENT_ICON_HEIGHT),
    // 5. The cities, lit by the level of detail (ATLAS-295) — held with the events, moved and freed with them.
    createCityMarkers(
      placedCities(context, sources.heightmap.meta.bbox, standing),
      svgToTexture,
      context.cityLabels
    ),
  ])
  // The countries' names already placed, if any: the cities' points on them yield (ATLAS-323).
  handles.events.setNameCover?.(sources.yearNames)
  scene.add(handles.events.object)
}
