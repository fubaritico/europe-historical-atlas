/**
 * The page's paint wait (ATLAS-333): core's `afterPaint` on this window's frames, tasks and visibility — what the
 * startup's bar waits on before each step that holds the page, so the step is on screen first. A hidden tab waits for
 * nothing.
 */

import { createAfterPaint } from '@europe-historical-atlas/core/utils/afterPaint'

/**
 * Resolve once the page has painted what was last written to it — at once in a hidden tab.
 * @returns once painted
 */
export const pageAfterPaint: () => Promise<void> = createAfterPaint({
  hidden: () => document.visibilityState === 'hidden',
  requestFrame: (callback) => {
    window.requestAnimationFrame(callback)
  },
  queueTask: (callback) => {
    window.setTimeout(callback, 0)
  },
})
