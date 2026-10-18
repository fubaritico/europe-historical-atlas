import type { PixelSize } from './viewport'

/**
 * The map's edges and corners for a free point (CARTO-257, the dev, 2026-10-18: *« c'est compliqué d'avoir un
 * point parfaitement dans le coin »*): within reach of an edge, a point lands on it; within reach of two, in
 * their corner.
 *
 * **A clamp, not a layer to follow.** The backdrop's edges are meridians and parallels, straight in the
 * projection, so two points on an edge already draw it — following it would only add points. Pure, in
 * backdrop pixels: the caller converts the reach from screen pixels and the result to degrees.
 */

/** What a point near the frame became. */
export interface FrameEdgeSnap {
  /** The point, on the edge or in the corner when it came within reach, as it was otherwise. */
  point: [number, number]
  /** `'corner'`, `'edge'`, or `null` when no edge was within reach. */
  snapped: 'corner' | 'edge' | null
}

/**
 * Clamp one coordinate to an edge of its axis when within reach, on either side of it — a point far outside
 * stays where it is, for the caller to refuse.
 * @param value - the coordinate
 * @param size - the axis's extent, from 0
 * @param reach - how near counts, in the same pixels
 * @returns the coordinate, and whether it was clamped
 */
function clampAxis(value: number, size: number, reach: number): [number, boolean] {
  if (Math.abs(value) <= reach) return [0, true]
  if (Math.abs(value - size) <= reach) return [size, true]
  return [value, false]
}

/**
 * Put a point on the frame's edge or in its corner when it is within reach.
 * @param point - the point, in backdrop pixels
 * @param size - the backdrop's size, in its pixels
 * @param reach - how near counts, in backdrop pixels — never negative
 * @returns the point and what it became
 */
export function snapToFrameEdge(
  point: readonly [number, number],
  size: PixelSize,
  reach: number
): FrameEdgeSnap {
  const [x, onX] = clampAxis(point[0], size.width, reach)
  const [y, onY] = clampAxis(point[1], size.height, reach)
  const snapped = onX && onY ? 'corner' : onX || onY ? 'edge' : null
  return { point: [x, y], snapped }
}
