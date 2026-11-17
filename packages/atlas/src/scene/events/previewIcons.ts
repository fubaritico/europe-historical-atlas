/**
 * Icons stood on the map at places no event of the content names — the dev's preview of a kind that has no event type
 * yet (the cathedral, ATLAS-434). Data in, data out, so it is exercised with literals; who asks for them is the
 * composition root's to say (`app/devPreview`), never this module's.
 */

import {
  latitudeToVertical,
  longitudeToHorizontal,
} from '@europe-historical-atlas/core/geo/mercator'

import type { PlacedEventIcon } from './icons/forms'
import type { EventIconKind } from './icons/kinds'
import type { WorldPoint } from '../relief/drapeProjection'
import type { GeoBounds } from '@europe-historical-atlas/core/geo/mercator'

/** An icon to stand at a place of the world. */
export interface PreviewIcon {
  /** The place's longitude, in degrees. */
  readonly lon: number
  /** Its latitude, in degrees. */
  readonly lat: number
  /** Which icon. */
  readonly kind: EventIconKind
}

/**
 * Place the preview's icons on the relief. One outside the map's frame cannot be drawn, and is said (no refusal is
 * silent).
 * @param icons - the icons asked for
 * @param bounds - the map's frame
 * @param draped - a point of the map's grid on the relief
 * @param warn - where an icon left out is said; the console in the atlas
 * @returns the icons placed, in the order asked
 */
export function placePreviewIcons(
  icons: readonly PreviewIcon[],
  bounds: GeoBounds,
  draped: (u: number, v: number) => WorldPoint,
  warn: (message: string) => void = (message) => {
    console.warn(message)
  }
): PlacedEventIcon[] {
  return icons.flatMap(({ lon, lat, kind }) => {
    const u = longitudeToHorizontal(lon, bounds)
    const v = latitudeToVertical(lat, bounds)
    if (u < 0 || u > 1 || v < 0 || v > 1) {
      warn(
        `[Atlas] the preview's ${kind} at ${String(lon)}, ${String(lat)} is outside the map's frame`
      )
      return []
    }
    return [{ ground: draped(u, v), kind }]
  })
}
