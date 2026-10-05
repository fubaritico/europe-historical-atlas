import type { PixelSize, Viewport } from './viewport'
import type { GeoBounds } from '@europe-historical-atlas/core/geo/mercator'

/**
 * How coarse the view is, in ground units — the status bar's number, and the backdrop's own limit.
 *
 * `s01` asks the status bar for "km per screen pixel", and warns when "backdrop resolution exceeded".
 * Both come out of the same arithmetic, and the second one turns out to need **no threshold at all**.
 *
 * **Why a latitude has to be supplied.** The backdrop is Web Mercator, so a pixel covers less ground the
 * further north it is — by `cos φ`. There is no single number for the whole image, which is why this
 * module asks *where*, and why the repository's own 7.6 km figure is quoted at 45°N (`known-issues.md`).
 * Verified against it: 40 075 016.686 m × (123.75° / 360°) / 1280 px = 10 762 m at the equator, × cos 45°
 * = **7 610 m**, which is the recorded 7.6 km. (A first pass asserted 7 611, from a circumference rounded
 * by hand; the test said otherwise and the test was right.)
 */

/** The WGS-84 equatorial circumference in metres, which is what Web Mercator's x axis spans. */
export const EQUATORIAL_CIRCUMFERENCE_M = 40075016.686

/**
 * How much ground one backdrop pixel covers, at a given latitude.
 *
 * Longitude is the axis to measure on because Mercator's x is linear in it: the fraction of the world
 * the backdrop spans is exactly its longitude span over 360°, with no projection maths needed. The
 * vertical axis gives the same answer to within the 0.031 % by which the backdrop's pixels are not
 * perfectly square, which is why one figure serves both.
 * @param backdrop - the backdrop's size, in its own pixels
 * @param bounds - the backdrop's geographic bounds
 * @param latitudeDeg - where on the map to measure
 * @returns metres of ground per backdrop pixel
 */
export function metresPerBackdropPixel(
  backdrop: PixelSize,
  bounds: GeoBounds,
  latitudeDeg: number
): number {
  const worldFraction = (bounds.east - bounds.west) / 360
  const atEquator = (EQUATORIAL_CIRCUMFERENCE_M * worldFraction) / backdrop.width
  return atEquator * Math.cos((latitudeDeg * Math.PI) / 180)
}

/**
 * How much ground one screen pixel covers — what the status bar prints.
 * @param viewport - the view
 * @param backdrop - the backdrop's size, in its own pixels
 * @param bounds - the backdrop's geographic bounds
 * @param latitudeDeg - where on the map to measure
 * @returns kilometres of ground per screen pixel
 */
export function kmPerScreenPixel(
  viewport: Viewport,
  backdrop: PixelSize,
  bounds: GeoBounds,
  latitudeDeg: number
): number {
  return metresPerBackdropPixel(backdrop, bounds, latitudeDeg) / viewport.scale / 1000
}

/**
 * Whether the backdrop is being shown beyond its own resolution.
 *
 * **There is no threshold here, and that is the finding rather than a simplification.** `s01` phrases the
 * warning as "zoomed past 7.6 km per pixel", which reads like a constant to configure — but 7.6 km/px
 * *is* the backdrop's own resolution at 45°N, so the condition it describes is simply one backdrop pixel
 * covering more than one screen pixel. A magic number would also have been wrong twice over: it is
 * latitude-dependent, and it would have to be re-derived every time the backdrop is regenerated at a
 * different size.
 *
 * What it drives is a message, never a limit: the scenario zooms past this point on purpose, because the
 * vectors stay sharp and the coastline keeps the position. The warning says the *picture* has given out,
 * not the data.
 * @param viewport - the view
 * @returns `true` once the backdrop is magnified past its native resolution
 */
export function isBackdropExceeded(viewport: Viewport): boolean {
  return viewport.scale > 1
}
