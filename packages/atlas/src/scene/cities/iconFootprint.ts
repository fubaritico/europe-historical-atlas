/**
 * One sign per place (the dev, 2026-11-17, ATLAS-287): a city on whose point an event's icon stands gives its point
 * up to the icon and starts its name past it — the name set against the sign's edge, never under it (Imhof). Before,
 * the crown stood on Jerusalem's point and hid the « J » of its name. Which icon stands on which city is told here —
 * data in, data out, so it is exercised with literals.
 */

import type { WorldPoint } from '../relief/drapeProjection'

/** The room an event's icon takes about its place. */
export interface IconFootprint {
  /** Its width, in world units. */
  readonly width: number
  /** The fewest pixels it keeps across on screen, however far the camera stands. */
  readonly minPixels: number
}

/** An event's icon on the relief: where it stands and the room it takes. */
export interface StandingIcon {
  /** Its place on the relief. */
  readonly ground: WorldPoint
  /** The room it takes. */
  readonly footprint: IconFootprint
}

/**
 * The icon standing on a city's point, if one does: the nearest whose half width, on the map's plane, reaches the
 * point. Decided once, in the world: `minPixels` never chooses the city, it only pushes its name (`cityMarkers`) — so
 * from afar, where the flat drawing keeps its fewest pixels, a city beside the icon's place keeps its point, and may
 * show under the drawing; the crowding of places close to one another is ATLAS-470.
 * @param ground - the city's point
 * @param icons - the events' icons on the map
 * @returns the room that icon takes, or `undefined` when none stands on the city
 */
export function iconOver(
  ground: WorldPoint,
  icons: readonly StandingIcon[]
): IconFootprint | undefined {
  let nearest: { footprint: IconFootprint; distance: number } | undefined
  for (const icon of icons) {
    const distance = Math.hypot(icon.ground[0] - ground[0], icon.ground[2] - ground[2])
    if (distance > icon.footprint.width / 2) continue
    if (nearest === undefined || distance < nearest.distance) {
      nearest = { footprint: icon.footprint, distance }
    }
  }
  return nearest?.footprint
}
