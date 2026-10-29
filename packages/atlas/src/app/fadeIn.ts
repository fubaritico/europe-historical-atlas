/**
 * A fade from nothing to whole, frame by frame — the year's layers coming in together over the relief at startup (the
 * dev, 2026-10-29: *« tout apparaît d'un seul coup en fondu »*).
 *
 * Pure but for the clock it is handed: the frames and the time are injected, so a test drives it frame by frame and
 * the page hands it `requestAnimationFrame` and `performance.now` (`pageFadeIn`).
 */

import { prefersReducedMotion } from '../utils/motion'

/** How long the year's layers take to fade in over the relief at startup, in milliseconds — Claude's start, to judge. */
export const REVEAL_MS = 700

/** What a fade reads the time from and waits for its frames on. */
export interface FadeClock {
  /**
   * The time now.
   * @returns milliseconds, from any origin
   */
  now: () => number
  /**
   * Run a step at the next frame.
   * @param step - the step
   */
  nextFrame: (step: () => void) => void
}

/**
 * Ease in and out: slow to start, slow to settle.
 * @param t - how far through, `0..1`
 * @returns the eased share, `0..1`
 */
function easeInOut(t: number): number {
  return t * t * (3 - 2 * t)
}

/**
 * Fade a share from nothing to whole.
 * @param set - where each frame's share is written, `0` first and `1` last
 * @param durationMs - how long it lasts; nought or less sets it whole at once (reduced motion)
 * @param clock - the time and the frames
 * @returns once the share is whole
 */
export function fadeIn(
  set: (share: number) => void,
  durationMs: number,
  clock: FadeClock
): Promise<void> {
  if (!(durationMs > 0)) {
    set(1)
    return Promise.resolve()
  }
  const start = clock.now()
  set(0)
  return new Promise((resolve) => {
    const step = (): void => {
      const t = Math.min(1, (clock.now() - start) / durationMs)
      set(easeInOut(t))
      if (t < 1) clock.nextFrame(step)
      else resolve()
    }
    clock.nextFrame(step)
  })
}

/**
 * The year's layers faded in on the page, at startup: over its frames and its clock, at once under reduced motion.
 * @param set - where each frame's share is written
 * @returns once whole
 */
export function pageFadeIn(set: (share: number) => void): Promise<void> {
  return fadeIn(set, prefersReducedMotion() ? 0 : REVEAL_MS, {
    now: () => performance.now(),
    nextFrame: (step) => {
      requestAnimationFrame(step)
    },
  })
}
