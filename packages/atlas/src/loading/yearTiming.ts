/**
 * What a change of year costs, step by step, measured in the reader's own browser (ATLAS-333, the dev, 2026-11-08: *« je
 * ne peux pas vraiment te dire »* — the eye cannot tell 0.7 s from 1.1 s). Each step leaves a browser measure,
 * `atlas year <year> <step>`, read in the developer tools' Performance panel or by
 * `performance.getEntriesByType('measure')` — nothing written to the console. The measured loading bar (part D of the
 * plan) will weigh its steps by these.
 */

/**
 * The steps of a change of year that are measured — and, at the startup, the three before the year: the relief and the
 * mask downloaded (`terrain`), the bare terrain baked (`texture`), the sheet, relief and decor built (`scene`).
 */
export type YearStep =
  | 'terrain'
  | 'texture'
  | 'scene'
  | 'fetch'
  | 'prepare'
  | 'cut'
  | 'tribes'
  | 'settle'
  | 'fills'
  | 'borders'
  | 'restore'
  | 'names'
  | 'events'
  | 'total'

/** A clock and a place for measures — the browser's `performance`, a stand-in in a test. */
export interface YearClock {
  /**
   * The time now, in milliseconds.
   * @returns it
   */
  now: () => number
  /**
   * Record a measure.
   * @param name - its name
   * @param options - when it started and ended
   * @param options.start - its start
   * @param options.end - its end
   * @returns the measure; not read here
   */
  measure: (name: string, options: { start: number; end: number }) => unknown
}

/**
 * The name a step's measure takes.
 * @param year - the year asked for
 * @param step - the step
 * @returns the measure's name
 */
export function yearMeasureName(year: number, step: YearStep): string {
  return `atlas year ${String(year)} ${step}`
}

/**
 * Start timing a step; the returned call ends it and records the measure.
 * @param clock - the clock and where measures go
 * @param year - the year asked for
 * @param step - the step
 * @returns ends the step
 */
export function startStep(clock: YearClock, year: number, step: YearStep): () => void {
  const start = clock.now()
  return () => {
    clock.measure(yearMeasureName(year, step), { start, end: clock.now() })
  }
}

/**
 * Time a step's work, started here and ended when its promise settles — resolved or not. The work is a call, not a
 * promise: an async step does its first part before its first wait, and a clock started after the call would miss it
 * (a year put back from the shelf is all first part — measured at 40 ms total for a 69 ms return, 2026-11-08).
 * @param clock - the clock and where measures go
 * @param year - the year asked for
 * @param step - the step
 * @param work - starts the step's work
 * @returns the work's own promise, its value or its failure untouched
 */
export function timedStep<T>(
  clock: YearClock,
  year: number,
  step: YearStep,
  work: () => Promise<T>
): Promise<T> {
  const end = startStep(clock, year, step)
  return work().finally(end)
}
