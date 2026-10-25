/**
 * Which events can be pinned on the map, and where — data in, data out, so it is exercised with literals.
 *
 * An event with no place is not an error: it is listed, not pinned (`core/data/contentFormat`). An event whose place
 * falls outside the map's frame cannot be drawn, and is said with `console.warn` (no refusal is silent).
 */

import {
  latitudeToVertical,
  longitudeToHorizontal,
} from '@europe-historical-atlas/core/geo/mercator'

import type { ContentEvent } from '@europe-historical-atlas/core/data/contentFormat'
import type { GeoBounds } from '@europe-historical-atlas/core/geo/mercator'

/** An event placed on the map's grid. */
export interface EventPin {
  /** The event. */
  event: ContentEvent
  /** West→east, 0..1. */
  u: number
  /** North→south, 0..1. */
  v: number
}

/**
 * Place every event that has a place inside the frame.
 * @param events - the content's events
 * @param bounds - the map's frame
 * @param warn - where an event left out is said; the console in the atlas
 * @returns the pins, in the order of the events
 */
export function eventPins(
  events: readonly ContentEvent[],
  bounds: GeoBounds,
  warn: (message: string) => void = (message) => {
    console.warn(message)
  }
): EventPin[] {
  const pins: EventPin[] = []
  for (const event of events) {
    if (event.place === null) continue
    const u = longitudeToHorizontal(event.place.lon, bounds)
    const v = latitudeToVertical(event.place.lat, bounds)
    if (u < 0 || u > 1 || v < 0 || v > 1) {
      warn(
        `[Atlas] event ${event.id} (${event.title.fr}) is outside the map's frame and is not pinned`
      )
      continue
    }
    pins.push({ event, u, v })
  }
  return pins
}
