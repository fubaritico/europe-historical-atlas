/**
 * A message for the status bar's result zone, sent by something that lives outside React — today the stacking
 * keys' answers (`ui/utils/arrange.ts`), wired at the composition root.
 *
 * **Why a relay rather than a prop.** What says it is built at the composition root, before any component
 * exists, but the result zone is a node only `Editor` holds. So it *says* things into this relay, and `Editor`
 * *attaches* the writer once it has the node.
 *
 * **It keeps the last message until a writer attaches**, so nothing said before the page mounted vanishes
 * because nobody was listening yet.
 *
 * **The year on disk no longer speaks here** (the dev, 2026-10-24: the status bar is the tool's): its notices
 * go to a toast or the alarm dialogue (`notice.ts`).
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
