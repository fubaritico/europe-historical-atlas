/**
 * How many screen pixels one world unit covers, at a given distance from a perspective camera.
 *
 * A fat line's width is in pixels, but its dash pattern is measured along the line in world units, so a
 * dash fixed in world units grows on screen as the camera comes in — the dev, 2026-10-16: the dashes are
 * *« trop allongés »*. Scaling the pattern by this each frame keeps a dash the same size on screen, as the
 * Cartographer's canvas dashes are.
 */

/**
 * Screen pixels per world unit at `distance` from the camera, on the screen's vertical axis.
 * @param distance - from the camera to the point looked at, in world units
 * @param fovDegrees - the camera's vertical field of view
 * @param viewportHeight - the viewport's height in CSS pixels
 * @returns the scale; `Infinity` at zero distance, carried through rather than clamped
 */
export function pixelsPerWorldUnit(
  distance: number,
  fovDegrees: number,
  viewportHeight: number
): number {
  const visibleHeight = 2 * distance * Math.tan((fovDegrees * Math.PI) / 360)
  return viewportHeight / visibleHeight
}
