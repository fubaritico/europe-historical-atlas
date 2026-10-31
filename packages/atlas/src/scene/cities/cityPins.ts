/**
 * Which cities can be placed on the map, and where — data in, data out, so it is exercised with literals. A city whose
 * place falls outside the map's frame cannot be drawn, and is said with `console.warn` (no refusal is silent).
 */

import {
  latitudeToVertical,
  longitudeToHorizontal,
} from '@europe-historical-atlas/core/geo/mercator'

import type { ContentCity } from '@europe-historical-atlas/core/data/contentFormat'
import type { GeoBounds } from '@europe-historical-atlas/core/geo/mercator'

/** A city placed on the map's grid. */
export interface CityPin {
  /** The city at its date. */
  city: ContentCity
  /** West→east, 0..1. */
  u: number
  /** North→south, 0..1. */
  v: number
}

/**
 * Place every city inside the frame.
 * @param cities - the content's cities
 * @param bounds - the map's frame
 * @param warn - where a city left out is said; the console in the atlas
 * @returns the pins, in the order of the cities
 */
export function cityPins(
  cities: readonly ContentCity[],
  bounds: GeoBounds,
  warn: (message: string) => void = (message) => {
    console.warn(message)
  }
): CityPin[] {
  const pins: CityPin[] = []
  for (const city of cities) {
    const u = longitudeToHorizontal(city.place.lon, bounds)
    const v = latitudeToVertical(city.place.lat, bounds)
    if (u < 0 || u > 1 || v < 0 || v > 1) {
      warn(
        `[Atlas] city ${city.id} (${city.place.name.fr}) is outside the map's frame and is not drawn`
      )
      continue
    }
    pins.push({ city, u, v })
  }
  return pins
}
