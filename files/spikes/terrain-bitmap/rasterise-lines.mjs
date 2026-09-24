/**
 * Draw polylines into an RGBA buffer, anti-aliased, at a given width in pixels.
 *
 * Kept separate from the spike that uses it because the coastline will want the same thing, and because
 * it is the one piece here with arithmetic worth reading on its own.
 *
 * **Coverage is accumulated before compositing, never composited per segment.** Consecutive segments of
 * a polyline overlap at every joint, and blending each one in turn darkens those joints into a string of
 * beads. Taking the maximum coverage first, then blending once, draws a stroke of even weight.
 */

/**
 * Squared distance from a point to a segment.
 * @param {number} px - point x
 * @param {number} py - point y
 * @param {number} ax - segment start x
 * @param {number} ay - segment start y
 * @param {number} bx - segment end x
 * @param {number} by - segment end y
 * @returns {number} the squared distance in pixels
 */
function distanceToSegmentSquared(px, py, ax, ay, bx, by) {
  const dx = bx - ax
  const dy = by - ay
  const lengthSquared = dx * dx + dy * dy
  // A degenerate segment is a point: the projection below would divide by zero, and a polyline with a
  // repeated vertex is ordinary in real data.
  const t =
    lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared))
  const cx = ax + t * dx - px
  const cy = ay + t * dy - py
  return cx * cx + cy * cy
}

/**
 * Accumulate a polyline's coverage into a float buffer, keeping the maximum per pixel.
 * @param {Float32Array} coverage - buffer of `width * height`, values in `[0, 1]`
 * @param {number} width - buffer width in pixels
 * @param {number} height - buffer height in pixels
 * @param {{x: number, y: number}[]} points - the polyline, in pixel coordinates
 * @param {number} strokeWidth - stroke width in pixels
 * @returns {void}
 */
export function accumulatePolyline(coverage, width, height, points, strokeWidth) {
  const radius = strokeWidth / 2
  const reach = Math.ceil(radius + 1)

  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1]
    const b = points[i]
    const minX = Math.max(0, Math.floor(Math.min(a.x, b.x)) - reach)
    const maxX = Math.min(width - 1, Math.ceil(Math.max(a.x, b.x)) + reach)
    const minY = Math.max(0, Math.floor(Math.min(a.y, b.y)) - reach)
    const maxY = Math.min(height - 1, Math.ceil(Math.max(a.y, b.y)) + reach)

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        // Sample at the pixel's centre, not its corner: a half-pixel bias is invisible on a thick line
        // and shifts a 1 px stroke by half its own width.
        const d = Math.sqrt(distanceToSegmentSquared(x + 0.5, y + 0.5, a.x, a.y, b.x, b.y))
        const alpha = Math.max(0, Math.min(1, radius + 0.5 - d))
        if (alpha === 0) continue
        const at = y * width + x
        if (alpha > coverage[at]) coverage[at] = alpha
      }
    }
  }
}

/**
 * Blend an accumulated coverage buffer into an RGBA image, in one pass.
 * @param {Uint8Array} rgba - the image, `width * height * 4`
 * @param {Float32Array} coverage - the accumulated coverage
 * @param {{r: number, g: number, b: number}} ink - the stroke colour, 0…255
 * @param {number} opacity - the stroke opacity in `[0, 1]`
 * @returns {void}
 */
export function compositeCoverage(rgba, coverage, ink, opacity) {
  for (let p = 0; p < coverage.length; p += 1) {
    const alpha = coverage[p] * opacity
    if (alpha === 0) continue
    const at = p * 4
    rgba[at] = Math.round(ink.r * alpha + rgba[at] * (1 - alpha))
    rgba[at + 1] = Math.round(ink.g * alpha + rgba[at + 1] * (1 - alpha))
    rgba[at + 2] = Math.round(ink.b * alpha + rgba[at + 2] * (1 - alpha))
  }
}

/**
 * Parse a `#rrggbb` string into channels.
 * @param {string} hex - the colour, with or without its leading hash
 * @returns {{r: number, g: number, b: number}} the channels, 0…255
 */
export function parseHexColor(hex) {
  const clean = hex.startsWith('#') ? hex.slice(1) : hex
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) throw new Error(`not a #rrggbb colour: ${hex}`)
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  }
}
