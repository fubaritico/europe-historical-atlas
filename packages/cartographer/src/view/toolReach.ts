import { screenToLonLat } from './projection'
import { kmPerScreenPixel } from './resolution'

import type { BackdropFrame } from './projection'
import type { PixelSize, Viewport } from './viewport'

/**
 * Whether the view is close enough for the drawing tools to act — `H-34`, the dev's call of 2026-10-12:
 * *"de loin, on a une vue d'ensemble. On voit ce qu'on a fait. […] Et là, on va éditer."*
 *
 * **The threshold is a distance on the ground, not a zoom level.** What goes wrong from afar is the snap
 * radius: a handful of screen pixels that, at continent scale, span tens of kilometres — so a click meant
 * for a field lands on a river (measured while drawing France remotely: three of four clicks did). Saying
 * the rule in kilometres makes it independent of the window's size and of the screen's pixel density, and
 * it names exactly the failure it prevents.
 *
 * **Measured at the latitude of the view's centre.** Web Mercator's scale changes with `cos φ`, so a
 * pixel covers less ground in the north; taking the pointer's latitude would make the cursor flip on and
 * off as it travels up and down one view. The centre gives one answer per view.
 */

/**
 * The farthest the snap may reach on the ground, in kilometres, for the drawing tools to act.
 *
 * **My estimate, to be tuned by the dev on sight** (2026-10-12): with France filling the screen the reach
 * is about 9 km and drawing there went well; at the opening view of the whole continent it is several
 * times that.
 */
export const MAX_SNAP_REACH_KM = 10

/**
 * The latitude at the centre of the view, held within the backdrop's own bounds — a centre over the
 * vellum is not a place, and a latitude extrapolated past the frame would be a number nobody can check.
 * @param viewport - the view
 * @param canvas - the canvas size, in screen pixels
 * @param frame - the backdrop's coordinate system
 * @returns the latitude in degrees
 */
function centreLatitude(viewport: Viewport, canvas: PixelSize, frame: BackdropFrame): number {
  const [, latitude] = screenToLonLat([canvas.width / 2, canvas.height / 2], frame, viewport)
  return Math.min(frame.bounds.north, Math.max(frame.bounds.south, latitude))
}

/**
 * How far the snap reaches on the ground, at the centre of the view.
 * @param viewport - the view
 * @param canvas - the canvas size, in screen pixels
 * @param frame - the backdrop's coordinate system
 * @param radiusPx - the snap radius, in screen pixels — `HANDLE_HIT_RADIUS` times the pixel ratio
 * @returns the reach in kilometres; `Infinity` for a view not framed yet (scale 0)
 */
export function snapReachKm(
  viewport: Viewport,
  canvas: PixelSize,
  frame: BackdropFrame,
  radiusPx: number
): number {
  if (viewport.scale <= 0) return Infinity
  const latitude = centreLatitude(viewport, canvas, frame)
  return radiusPx * kmPerScreenPixel(viewport, frame.size, frame.bounds, latitude)
}

/**
 * Whether the drawing tools may act at this reach.
 * @param reachKm - the snap's reach on the ground, from {@link snapReachKm}
 * @param maxKm - the threshold — {@link MAX_SNAP_REACH_KM} in the application, injected so a suite about
 *   something else can lift it
 * @returns `true` when the reach is within the threshold; `false` for a reach that is not a number
 */
export function closeEnoughToEdit(reachKm: number, maxKm: number): boolean {
  return reachKm <= maxKm
}
