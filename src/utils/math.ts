/**
 * Clamp a value to the inclusive range `[min, max]`.
 * @param value - the value to clamp
 * @param min - lower bound
 * @param max - upper bound
 * @returns the clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value
}

/**
 * Clamp a value to `[0, 1]`.
 * @param value - the value to clamp
 * @returns the value clamped to `[0, 1]`
 */
export function clamp01(value: number): number {
  return clamp(value, 0, 1)
}

/**
 * Linear interpolation between `a` and `b`.
 * @param a - value at `t = 0`
 * @param b - value at `t = 1`
 * @param t - interpolation factor (not clamped)
 * @returns `a + (b - a) * t`
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/**
 * Smoothstep easing: still at both ends, quickest in the middle.
 *
 * Deliberately not the ease-OUT the inertia uses. Inertia answers an input that has just happened, so it
 * must snap and then glide; a flight is a move the reader did not make by hand, so it has to start
 * gently too or the map appears to be yanked out from under them.
 * @param t - progress in `[0, 1]`; values outside are clamped
 * @returns the eased progress
 */
export function easeInOut(t: number): number {
  const x = clamp01(t)
  return x * x * (3 - 2 * x)
}
