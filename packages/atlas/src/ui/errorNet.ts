/**
 * The last net: what the reader is told when something fails that nobody anticipated.
 *
 * Every asset failure already has a policy — which layer is essential, what is lost, how it reads
 * (`assetMessages`). That covers the failures we thought of. **This covers the ones we did not.**
 * Without it an uncaught error leaves a frozen canvas and not one word, which is exactly the silent
 * failure `rules/error-handling.md` exists to forbid.
 *
 * It is a seam, not a service: the board is injected, so this module can be exercised with a stub and
 * so a future reporter (Sentry, when a contribution tool goes online) plugs in beside it rather than
 * inside it.
 */

import type { Notice } from './notice'

/** What the net needs from its world. */
export interface ErrorNetDeps {
  /** Where to post — normally the notice board's `show`. */
  show: (notice: Notice) => void
  /** What to listen on. Injected so a test never touches the real window. */
  target?: EventTarget
  /**
   * The headline, in the reader's language. Required: no label is written in the code (ATLAS-159).
   *
   * Deliberately vague about the cause, because by definition we do not know it: claiming more than we
   * know is how the border notice ended up blaming invalid JSON for a file that was simply absent. It takes
   * no value, so building it cannot fail — the one message that must always show.
   */
  title: string
}

/** A mounted net. */
export interface ErrorNet {
  /** Stop listening. */
  dispose: () => void
}

/**
 * Turn whatever was thrown into one line a human can act on.
 * @param reason - the `error` of an `ErrorEvent`, or the `reason` of a rejection
 * @returns a short description, or `undefined` when there is nothing worth showing
 */
function describe(reason: unknown): string | undefined {
  if (reason instanceof Error) return reason.stack?.split('\n')[0] ?? reason.message
  if (typeof reason === 'string' && reason.length > 0) return reason
  return undefined
}

/**
 * Catch what nothing else caught, and say so.
 *
 * Severity is always `blocking`: an unanticipated error means the map is in a state nobody designed,
 * and offering a dismiss button would promise there is something intact behind the panel.
 * @param deps - the board to post on, and what to listen to
 * @returns the mounted net, to be disposed on teardown
 */
export function createErrorNet(deps: ErrorNetDeps): ErrorNet {
  const target = deps.target ?? window
  const { title } = deps

  const onError = (event: Event): void => {
    const detail = describe((event as ErrorEvent).error) ?? (event as ErrorEvent).message
    deps.show({ severity: 'blocking', title, ...(detail ? { detail } : {}) })
  }

  const onRejection = (event: Event): void => {
    const detail = describe((event as PromiseRejectionEvent).reason)
    deps.show({ severity: 'blocking', title, ...(detail ? { detail } : {}) })
  }

  target.addEventListener('error', onError)
  target.addEventListener('unhandledrejection', onRejection)

  return {
    dispose: (): void => {
      target.removeEventListener('error', onError)
      target.removeEventListener('unhandledrejection', onRejection)
    },
  }
}
