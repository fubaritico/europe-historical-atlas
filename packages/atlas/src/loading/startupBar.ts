/**
 * The startup's one bar, on the splash (ATLAS-333, the dev, 2026-11-08: *"as long as the first map is not loaded, the
 * splash stays, with the bar taking stock of the progress"*).
 *
 * **The slices are measured, not estimated**: two startups in Chrome on the built site served locally, 2026-11-08, each
 * ~5.9 s — the relief and the mask downloaded and handed to the worker 0.5 s, the texture composed 2.3 s, the relief
 * raised with the sheet and decor 1.6–2.0 s, the year read, cut and laid 1.2 s, its names 0.36 s; the events are a file
 * loaded beside the startup, in by then. The download is a tenth of a second served locally and may be the longest wait
 * online: its bytes are not counted yet (s01, the declared gap).
 */

import { createSlicedProgress } from '@europe-historical-atlas/core/utils/slicedProgress'

import type { ProgressSlices } from '@europe-historical-atlas/core/utils/slicedProgress'

/** The steps of the startup, in the order they run. */
export type StartupStep = 'terrain' | 'texture' | 'scene' | 'year' | 'names' | 'events'

/** Where each step starts and ends on the bar — the shares measured on 2026-11-08 (see above). */
export const STARTUP_SLICES: ProgressSlices<StartupStep> = {
  terrain: [0, 0.09],
  texture: [0.09, 0.48],
  scene: [0.48, 0.75],
  year: [0.75, 0.95],
  names: [0.95, 0.99],
  // The last point: a bar full while the events are still awaited would read as hung (review ARCH-004).
  events: [0.99, 1],
}

/** The bar as the startup drives it. */
export interface StartupBar {
  /**
   * Say a step is running, how far into it, and in what words.
   * @param step - the step
   * @param within - progress inside the step, in `[0, 1]`
   * @param label - the words shown for it, in the reader's language
   */
  step: (step: StartupStep, within: number, label: string) => void
}

/**
 * The bar over the startup's slices, which never goes back.
 * @param report - where the whole startup's progress goes, with the words of the step running
 * @returns the bar to drive
 */
export function createStartupBar(report: (fraction: number, label: string) => void): StartupBar {
  let words = ''
  const sliced = createSlicedProgress(STARTUP_SLICES, (fraction) => {
    report(fraction, words)
  })
  return {
    step(step, within, label) {
      words = label
      sliced(step, within)
    },
  }
}
