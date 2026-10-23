/**
 * A demonstration switch, in development only: `?slow=save` holds every write to the dev server back by
 * {@link SLOW_WRITE_MS}, so the author sees a save go unconfirmed past the delay, then confirmed (REPO-275).
 * Asked by the dev on 2026-10-23 to see the case, and kept on 2026-10-24 (*« très utile de garder ces flags »*),
 * like `?break=`, until the flags have a home of their own (CARTO-268).
 */

import type { FetchLike } from '@europe-historical-atlas/core/utils/fetchWithin'

/** How long a write is held back: past the 10 s delay, so the warning shows before the confirmation. */
export const SLOW_WRITE_MS = 15_000

/** The methods that write. */
const WRITE_METHODS = new Set(['PUT', 'POST', 'DELETE'])

/**
 * Whether the page asks for slow writes.
 * @param search - the page's query string
 * @param dev - whether this is a development build
 * @returns `true` for `?slow=save` in development
 */
export function wantsSlowWrites(search: string, dev: boolean): boolean {
  return dev && new URLSearchParams(search).get('slow') === 'save'
}

/**
 * Hold every write back by `delayMs` before sending it; reads go through at once.
 * @param fetchFile - the fetch to wrap
 * @param delayMs - how long to hold a write
 * @param wait - waits `ms`, so tests can run it by hand
 * @returns the fetch with slow writes
 */
export function slowWrites(
  fetchFile: FetchLike,
  delayMs: number,
  wait: (ms: number) => Promise<void>
): FetchLike {
  return async (input, init) => {
    if (WRITE_METHODS.has((init?.method ?? 'GET').toUpperCase())) {
      console.warn(`[Cartographer] ?slow=save: this write is held back ${String(delayMs / 1000)} s`)
      await wait(delayMs)
    }
    return fetchFile(input, init)
  }
}

/**
 * The fetch for the writes of the year and of the drafts: slowed when the page asks for it, as is otherwise.
 * @param fetchFile - the fetch every request goes through
 * @param slow - whether the page asks for slow writes ({@link wantsSlowWrites})
 * @param wait - waits `ms`
 * @returns the fetch to give the archive and the drafts
 */
export function writesFetch(
  fetchFile: FetchLike,
  slow: boolean,
  wait: (ms: number) => Promise<void>
): FetchLike {
  return slow ? slowWrites(fetchFile, SLOW_WRITE_MS, wait) : fetchFile
}
