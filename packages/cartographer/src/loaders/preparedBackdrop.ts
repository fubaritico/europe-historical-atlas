import type { OpeningProgress, OpeningStep } from './opening'

/**
 * The backdrop prepared once, from the page's opening (CARTO-535, the dev's table of 2026-11-25): **the relief is baked
 * behind the sign-in screen**, so its seconds are not added after signing in — and signing out then in again finds it
 * ready instead of baking it anew.
 *
 * **A preparation that fails is said on the console and forgotten** — the dev's rule for a map prepared unasked
 * (`rules/error-handling.md`, 2026-11-08): the map's ordinary loading meets the failure again when it is shown, with its
 * « Réessayer », and the screen says it then.
 */

/**
 * A load that reports its progress — the map area's `BackdropLoad`, declared here structurally (`loaders/` reads no
 * component).
 */
export type ProgressiveLoad<Assets> = (onProgress: OpeningProgress) => Promise<Assets>

/** The backdrop prepared once. */
export interface PreparedBackdrop<Assets> {
  /** Start the preparation, once — later calls join it. */
  prepare: () => void
  /** The load the map area calls: the preparation, joined, its progress replayed to the area's bar. */
  load: ProgressiveLoad<Assets>
}

/**
 * Prepare a backdrop once and hand it to whoever asks.
 * @param loadOnce - the real load: fetch, bake, trace
 * @returns the preparation
 */
export function preparedBackdrop<Assets>(
  loadOnce: ProgressiveLoad<Assets>
): PreparedBackdrop<Assets> {
  let running: Promise<Assets> | null = null
  let last: { fraction: number; step: OpeningStep } | null = null
  let sink: OpeningProgress | null = null
  const prepare = (): Promise<Assets> => {
    if (running !== null) return running
    last = null
    const started = loadOnce((fraction, step) => {
      last = { fraction, step }
      sink?.(fraction, step)
    })
    running = started
    started.catch((error: unknown) => {
      console.error('[Cartographer] the backdrop could not be prepared:', error)
      if (running === started) running = null
    })
    return started
  }
  return {
    prepare: () => {
      void prepare()
    },
    load: (onProgress) => {
      sink = onProgress
      const joined = prepare()
      if (last !== null) onProgress(last.fraction, last.step)
      return joined
    },
  }
}
