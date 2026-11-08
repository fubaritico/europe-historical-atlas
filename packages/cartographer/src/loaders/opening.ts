import type { ProgressReport } from '@europe-historical-atlas/core/pipeline/mapCompute'

/**
 * The opening of the Cartographer, as one bar (CARTO-393).
 *
 * **Why four steps and not the bake's own fraction**: the bake was the only thing that reported, once, at 0 —
 * so the bar sat at 0 % for the whole wait and then the map appeared. Measured on 2026-11-08 on a loaded machine:
 * the two downloads 0.3 s, the relief 5.2 s, the coast and the rivers 1.6 s, the canvas's first start 0.6 s
 * (twice in development, where `StrictMode` mounts it twice). The slices below follow those shares, so the bar
 * moves at roughly the pace of the wait; on a quiet machine the whole is about 3.4 s.
 *
 * **Not a stream**: the downloads are a twentieth of the wait, so counting their bytes would move a sliver of
 * the bar. What takes the time is computed, and only the computation can say how far it has got.
 */

/** The steps of the opening, in the order they run. */
export type OpeningStep = 'download' | 'relief' | 'coast' | 'surface'

/**
 * Told how far the opening has got.
 * @param fraction - the whole opening's progress, in `[0, 1]`
 * @param step - the step running now
 */
export type OpeningProgress = (fraction: number, step: OpeningStep) => void

/** Where each step starts and ends on the bar — the shares measured on 2026-11-08 (see above). */
export const OPENING_SLICES: Readonly<Record<OpeningStep, readonly [from: number, to: number]>> = {
  download: [0, 0.05],
  relief: [0.05, 0.73],
  coast: [0.73, 0.92],
  surface: [0.92, 1],
}

/** The bar as the opening drives it. */
export interface OpeningBar {
  /**
   * Say a step is running, and how far into it.
   * @param step - the step
   * @param within - progress inside the step, in `[0, 1]`; its start when omitted
   */
  step: (step: OpeningStep, within?: number) => void
  /** The bake's own report, laid on the relief's slice. */
  bake: ProgressReport
}

/**
 * The bar over the four slices, which **never goes back**: a report below what was already shown keeps the
 * value shown — a bar that recoils reads as a restart.
 * @param report - where the whole opening's progress goes
 * @returns the bar to drive
 */
export function createOpeningBar(report: OpeningProgress): OpeningBar {
  let reached = 0
  const step = (running: OpeningStep, within = 0): void => {
    const [from, to] = OPENING_SLICES[running]
    reached = Math.max(reached, from + (to - from) * Math.min(1, Math.max(0, within)))
    report(reached, running)
  }
  return {
    step,
    bake: (fraction) => {
      step('relief', fraction)
    },
  }
}

/** What the opening runs, each part injected. */
export interface OpeningDeps<Backdrop, Vectors> {
  /**
   * Download the relief and the mask, and bake. The bake's first report is the downloads' end.
   * @param onBake - the bake's report
   * @returns the baked backdrop
   */
  loadBackdrop: (onBake: ProgressReport) => Promise<Backdrop>
  /**
   * Trace the coast and project the rivers, once the backdrop is in.
   * @param backdrop - the baked backdrop
   * @returns the vector layers
   */
  loadVectors: (backdrop: Backdrop) => Promise<Vectors>
  /**
   * Resolve once the page has painted what was last reported. The canvas's start then holds the thread, so
   * without this wait its step would never reach the screen.
   * @returns once painted
   */
  afterPaint: () => Promise<void>
}

/**
 * Run the opening, reporting each step to one bar. **Nothing is caught**: a failed download or bake rejects
 * as before, and the area shows its failure notice (`BackdropFailure`).
 * @param deps - the loads and the paint wait
 * @param onProgress - the bar's sink
 * @returns the backdrop and the vector layers
 */
export async function openEditor<Backdrop, Vectors>(
  deps: OpeningDeps<Backdrop, Vectors>,
  onProgress: OpeningProgress
): Promise<{ backdrop: Backdrop; vectors: Vectors }> {
  const bar = createOpeningBar(onProgress)
  bar.step('download')
  const backdrop = await deps.loadBackdrop(bar.bake)
  bar.step('coast')
  const vectors = await deps.loadVectors(backdrop)
  bar.step('surface')
  await deps.afterPaint()
  return { backdrop, vectors }
}
