/**
 * A fetch that gives up when the server does not start answering a read in time (REPO-275).
 *
 * **The delay covers the wait for the answer, not the download** — the dev's call, 2026-10-23. A server that
 * never answers leaves a loading screen up forever with nothing said; but the relief file weighs 6.4 MB, and a
 * cap on the whole download would fail the atlas for a reader on a slow connection. So the clock stops the
 * moment the response arrives, and the body is left to finish.
 *
 * **Reads only** — the dev's call, same day. A write (`PUT`, `POST`, `DELETE`) is never cut: the server may
 * still be writing, and abandoning it would make the screen say a save failed that may have landed. A write
 * that stays unanswered is said by whoever waits for its confirmation (the Cartographer's year session and
 * draft keeper), not cut here.
 *
 * **When the delay runs out, the read rejects with an error that names the address and the delay** — the same
 * path as a network failure: the atlas posts its asset notice (unclassified, as for a network failure), the
 * Cartographer its usual message.
 */

/** How long a request may wait for the server to start answering — the dev's call, 2026-10-23. */
export const ANSWER_TIMEOUT_MS = 10_000

/** The shape of `fetch`, so a stub can stand in for it. */
export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

/** The methods that only read — the ones the delay applies to. */
const READ_METHODS = new Set(['GET', 'HEAD'])

/**
 * The address a request names, for the error message.
 * @param input - what was passed to fetch
 * @returns the address as text
 */
function addressOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  return input.url
}

/**
 * The method a request will use: the options' first, then a `Request`'s own, `GET` otherwise — as fetch does.
 * @param input - what was passed to fetch
 * @param init - the options passed with it
 * @returns the method, in capitals
 */
function methodOf(input: RequestInfo | URL, init: RequestInit | undefined): string {
  const declared = init?.method ?? (input instanceof Request ? input.method : 'GET')
  return declared.toUpperCase()
}

/**
 * Every signal that may stop the request: the options', a `Request`'s own, and the delay's.
 * @param input - what was passed to fetch
 * @param init - the options passed with it
 * @param delay - the signal of the delay
 * @returns one signal that aborts with the first of them
 */
function combinedSignal(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  delay: AbortSignal
): AbortSignal {
  const callers = [init?.signal, input instanceof Request ? input.signal : undefined].filter(
    (signal): signal is AbortSignal => signal != null
  )
  return callers.length === 0 ? delay : AbortSignal.any([...callers, delay])
}

/**
 * Wrap a fetch so that a read the server does not start answering within `ms` rejects. A write goes through
 * untouched.
 *
 * A signal the caller passes still works: the read stops at whichever comes first, the caller's abort or the
 * delay.
 * @param fetchFile - the fetch to wrap — the window's in the applications, a stub in tests
 * @param ms - how long to wait for the response
 * @returns a fetch with the delay
 */
export function createFetchWithin(fetchFile: FetchLike, ms: number): FetchLike {
  return async (input, init) => {
    if (!READ_METHODS.has(methodOf(input, init))) return fetchFile(input, init)
    const controller = new AbortController()
    const timer = setTimeout(() => {
      controller.abort(
        new Error(`no answer from ${addressOf(input)} within ${String(ms / 1000)} s`)
      )
    }, ms)
    try {
      return await fetchFile(input, {
        ...init,
        signal: combinedSignal(input, init, controller.signal),
      })
    } finally {
      clearTimeout(timer)
    }
  }
}

/** The window's fetch with the delay of {@link ANSWER_TIMEOUT_MS} — what every application request goes through. */
export const fetchWithin: FetchLike = createFetchWithin(
  (input, init) => fetch(input, init),
  ANSWER_TIMEOUT_MS
)
