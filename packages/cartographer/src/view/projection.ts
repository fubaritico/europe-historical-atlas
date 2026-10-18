import {
  horizontalToLongitude,
  latitudeToVertical,
  longitudeToHorizontal,
  verticalToLatitude,
} from '@europe-historical-atlas/core/geo/mercator'

import { backdropToScreen, screenToBackdrop } from './viewport'

import type { PixelSize, Point, Viewport } from './viewport'
import type { GeoBounds } from '@europe-historical-atlas/core/geo/mercator'

/**
 * The bridge between the document's coordinates and the canvas's — lon/lat ↔ backdrop ↔ screen.
 *
 * **Neither `viewport.ts` nor `geometry/` would carry this, and that was deliberate in both cases.** The
 * viewport is three numbers over a pixel grid and has no geography in it; the gesture arithmetic works in
 * screen pixels on flat arrays. This module is the only place the two meet, which is also the only place
 * a projection mistake can hide.
 *
 * **The vertical axis is not linear and this is where that matters.** Web Mercator's `x` is linear in
 * longitude, so the horizontal mapping is a plain remap; `y` is a `log(tan(…))`, so a latitude has to go
 * through `core/geo`'s own conversion. Doing it by proportion would put Paris several kilometres from
 * where the backdrop paints it — which is exactly the failure `known-issues.md` describes under "two
 * geographic boxes", except on the other axis.
 *
 * **The frame is the backdrop's** (decided 2026-09-29). The baked terrain is georeferenced by
 * construction — it *is* the atlas's output image — so its bounds are the reference, and the only box.
 */

/** The backdrop as a coordinate system: how many pixels, and what ground they cover. */
export interface BackdropFrame {
  /** The backdrop's size, in its own pixels. */
  size: PixelSize
  /** The ground it covers — the DEM's bounds. */
  bounds: GeoBounds
}

/**
 * Where a longitude and latitude fall in the backdrop's pixel grid.
 * @param lonLat - the position, longitude first, as the document stores it
 * @param frame - the backdrop's coordinate system
 * @returns the position in backdrop pixels
 */
export function lonLatToBackdrop(lonLat: Point, frame: BackdropFrame): [number, number] {
  return [
    longitudeToHorizontal(lonLat[0], frame.bounds) * frame.size.width,
    latitudeToVertical(lonLat[1], frame.bounds) * frame.size.height,
  ]
}

/**
 * Which longitude and latitude a backdrop pixel covers — the inverse of {@link lonLatToBackdrop}.
 * @param point - the position in backdrop pixels
 * @param frame - the backdrop's coordinate system
 * @returns the position in degrees, longitude first
 */
export function backdropToLonLat(point: Point, frame: BackdropFrame): [number, number] {
  return [
    horizontalToLongitude(point[0] / frame.size.width, frame.bounds),
    verticalToLatitude(point[1] / frame.size.height, frame.bounds),
  ]
}

/**
 * Where a position lands on screen, through the whole chain.
 * @param lonLat - the position in degrees, longitude first
 * @param frame - the backdrop's coordinate system
 * @param viewport - the current view
 * @returns the position in screen pixels
 */
export function lonLatToScreen(
  lonLat: Point,
  frame: BackdropFrame,
  viewport: Viewport
): [number, number] {
  return backdropToScreen(viewport, lonLatToBackdrop(lonLat, frame))
}

/**
 * Which position the pointer is over — what the status bar reads.
 * @param screen - the pointer position in screen pixels
 * @param frame - the backdrop's coordinate system
 * @param viewport - the current view
 * @returns the position in degrees, longitude first
 */
export function screenToLonLat(
  screen: Point,
  frame: BackdropFrame,
  viewport: Viewport
): [number, number] {
  return backdropToLonLat(screenToBackdrop(viewport, screen), frame)
}

/**
 * Which position the pointer is over — or `null` off the backdrop.
 *
 * **The one rule for "on the map"**, read by the status bar and by the tools alike (ARCH-103, found in
 * review: it was written twice). The vellum around the backdrop is not a place, and a latitude
 * extrapolated past its edge would be arithmetic presented as a fact. The edges are inclusive.
 * @param screen - the pointer position in screen pixels
 * @param frame - the backdrop's coordinate system
 * @param viewport - the current view
 * @returns the position in degrees, longitude first, or `null`
 */
export function screenToLonLatOnBackdrop(
  screen: Point,
  frame: BackdropFrame,
  viewport: Viewport
): [number, number] | null {
  const point = screenToBackdrop(viewport, screen)
  const { width, height } = frame.size
  if (point[0] < 0 || point[0] > width || point[1] < 0 || point[1] > height) return null
  return backdropToLonLat(point, frame)
}

/**
 * The expensive half: a whole anchor table into **backdrop** pixels.
 *
 * **This is the half worth caching, and the only one.** Every anchor costs a `log(tan(…))` here, because
 * Mercator's vertical axis is not linear — and the result depends on the *document* alone, never on the
 * view. So it is recomputed when an anchor moves and at no other time.
 *
 * Splitting the projection in two is what makes that possible, and the naive alternative is worth naming:
 * memoising {@link projectAnchors} keyed on the document **and** the viewport would miss on every single
 * pointer move during a pan — a cache that never hits on the one operation it exists for.
 * @param anchors - the document's anchors, longitude first
 * @param frame - the backdrop's coordinate system
 * @returns the same positions in backdrop pixels, in the same order
 */
export function projectToBackdrop(
  anchors: readonly (readonly [number, number])[],
  frame: BackdropFrame
): [number, number][] {
  return anchors.map((anchor) => lonLatToBackdrop(anchor, frame))
}

/**
 * The cheap half: backdrop pixels through the view, onto the screen.
 *
 * One multiply and one add per axis — no transcendental call — so this runs on every viewport change
 * without a thought, which is what the split buys.
 * @param points - positions in backdrop pixels
 * @param viewport - the current view
 * @returns the same positions in screen pixels, in the same order
 */
export function remapToScreen(
  points: readonly (readonly [number, number])[],
  viewport: Viewport
): [number, number][] {
  return points.map((point) => backdropToScreen(viewport, point))
}

/**
 * Project a whole anchor table into screen pixels, once.
 *
 * **This is the call the caches exist for.** `s01` announces 16 579 vertices for 1100, and the vertical
 * axis costs a `log` and a `tan` each, so running this per `pointermove` would be tens of thousands of
 * transcendental calls a frame. It is meant to run **once per viewport change** — the painter and the
 * gesture arithmetic then work on the result, which is why `hitTest` takes a flat array rather than a
 * document.
 *
 * The result is **parallel to the input**, so an index into it is an anchor index. Nothing maps back.
 * @param anchors - the document's anchors, longitude first
 * @param frame - the backdrop's coordinate system
 * @param viewport - the current view
 * @returns the same positions in screen pixels, in the same order
 */
export function projectAnchors(
  anchors: readonly (readonly [number, number])[],
  frame: BackdropFrame,
  viewport: Viewport
): [number, number][] {
  return anchors.map((anchor) => lonLatToScreen(anchor, frame, viewport))
}
