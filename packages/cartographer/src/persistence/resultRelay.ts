/**
 * A message for the status bar's result zone, sent by something that lives outside React.
 *
 * **Why a relay rather than a prop.** The year session is built at the composition root, before any
 * component exists — it opens the year at start-up, which belongs in the entry module and not in an effect
 * a remount would re-run. But the result zone is a node only `Editor` holds. So the session *says* things
 * into this relay, and `Editor` *attaches* the writer once it has the node.
 *
 * **It keeps the last message until a writer attaches**: the start-up read can finish before the page has
 * mounted, and its answer — *"opened 1100 · 3 polities · 412 vertices"*, or why saving is blocked — must not
 * vanish because nobody was listening yet.
 */

/** The relay: one side says, the other side writes. */
export interface ResultRelay {
  /**
   * Send a message to the result zone, or keep it until a writer attaches.
   * @param message - the sentence to show
   */
  say: (message: string) => void
  /**
   * Attach the writer — the function that puts text in the result zone — and hand it the message kept.
   * @param writer - what shows a message
   * @returns a function that detaches it
   */
  attach: (writer: (message: string) => void) => () => void
}

/**
 * Build a relay with no writer and nothing kept.
 * @returns the relay
 */
export function createResultRelay(): ResultRelay {
  let writer: ((message: string) => void) | null = null
  let kept: string | null = null
  return {
    say: (message) => {
      if (writer === null) kept = message
      else writer(message)
    },
    attach: (next) => {
      writer = next
      if (kept !== null) {
        next(kept)
        kept = null
      }
      return () => {
        if (writer === next) writer = null
      }
    },
  }
}
