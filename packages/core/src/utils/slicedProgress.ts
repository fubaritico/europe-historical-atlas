/**
 * One bar over several steps, each given its slice of it (CARTO-393, the Cartographer's opening; ATLAS-333, the
 * atlas's). Pure: the steps' slices and where the progress goes are handed in.
 */

/** Where each step starts and ends on the bar, in `[0, 1]`, in the order the steps run. */
export type ProgressSlices<Step extends string> = Readonly<
  Record<Step, readonly [from: number, to: number]>
>

/**
 * Told how far the whole has got.
 * @param fraction - the whole's progress, in `[0, 1]`
 * @param step - the step running now
 */
export type SlicedReport<Step extends string> = (fraction: number, step: Step) => void

/**
 * Say a step is running, and how far into it.
 * @param step - the step
 * @param within - progress inside the step, in `[0, 1]`; its start when omitted
 */
export type SlicedStep<Step extends string> = (step: Step, within?: number) => void

/**
 * A bar over the slices that **never goes back**: a report below what was already shown keeps the value shown — a bar
 * that recoils reads as a restart. A progress inside a step outside `[0, 1]` is held to it.
 * @param slices - each step's slice
 * @param report - where the whole's progress goes
 * @returns the step to drive
 */
export function createSlicedProgress<Step extends string>(
  slices: ProgressSlices<Step>,
  report: SlicedReport<Step>
): SlicedStep<Step> {
  let reached = 0
  return (running, within = 0) => {
    const [from, to] = slices[running]
    reached = Math.max(reached, from + (to - from) * Math.min(1, Math.max(0, within)))
    report(reached, running)
  }
}
