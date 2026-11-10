/**
 * **The years being computed ahead** (ATLAS-396, the dev, 2026-11-10: _"it should start at once … so nothing is lost"_):
 * a map prepared in the background registers its compute here — the year read, settled and cut in the worker — so that
 * the reader's click on that map **joins it where it stands** rather than starting a load of its own beside it, both
 * then waiting on the one worker.
 *
 * **Under a stamp**: a compute is taken only under the settings and relief it was started with (`MapLayers.yearStamp`) —
 * the shelf's own rule; one started under others is let go, and the year is loaded as any year.
 *
 * **Holds promises, not results**: a compute that fails leaves the register, so a later preparation tries again; its
 * failure is the one who awaits it to say — the click tells it as the year's, the buffer qualifies it.
 *
 * Holds no year and no worker of its own: what computes is handed in, so every branch runs under a test with literals.
 */

/** A compute in the register: what it will give, and the stamp it was started under. */
interface Entry<T> {
  /** What the compute gives. */
  readonly result: Promise<T>
  /** The settings and relief it was started under. */
  readonly stamp: string
}

/** The register. */
export interface ComputedYears<T> {
  /**
   * The compute of a year under a stamp — the one in flight, or a new one started now.
   * @param year - the year
   * @param stamp - the settings and relief now
   * @param compute - what computes it, run only when none is in flight under this stamp
   * @returns what the compute gives
   */
  start: (year: number, stamp: string, compute: () => Promise<T>) => Promise<T>
  /**
   * Take a year's compute out of the register — the reader asked for that map.
   * @param year - the year
   * @param stamp - the settings and relief now
   * @returns what it will give; `null` when none is in flight, or one started under another stamp (let go)
   */
  take: (year: number, stamp: string) => Promise<T> | null
  /**
   * Let go of a year's compute — its map set aside, or nothing to lay.
   * @param year - the year
   */
  forget: (year: number) => void
  /**
   * Let go of every compute but these years' — the window of maps moved.
   * @param years - the years to keep
   */
  keepOnly: (years: readonly number[]) => void
}

/**
 * Build the register.
 * @returns it, empty
 */
export function createComputedYears<T>(): ComputedYears<T> {
  const entries = new Map<number, Entry<T>>()
  return {
    start(year, stamp, compute) {
      const held = entries.get(year)
      if (held?.stamp === stamp) return held.result
      const result = compute()
      const entry = { result, stamp }
      entries.set(year, entry)
      // A failure leaves the register — only this very entry, never a newer one set since — and stays the awaiter's.
      void result.catch(() => {
        if (entries.get(year) === entry) entries.delete(year)
      })
      return result
    },
    take(year, stamp) {
      const held = entries.get(year)
      entries.delete(year)
      return held?.stamp === stamp ? held.result : null
    },
    forget(year) {
      entries.delete(year)
    },
    keepOnly(years) {
      for (const year of [...entries.keys()]) if (!years.includes(year)) entries.delete(year)
    },
  }
}
