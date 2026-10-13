/**
 * The way to the canvas's own undo and redo, for a control that lives outside it — the document bar's two
 * buttons (2026-10-13).
 *
 * **Why not `store.undo()` straight from the button.** The canvas's undo is gesture-aware: it first takes
 * back an outline in progress or a drag, and only then the history. A second path straight to the store
 * rewound the document under an open outline — found in review as ARCH-101, for the page's ‹ctrl+Z›. A
 * button is the same case: an outline can be open when the author reaches for it. So the button asks the
 * canvas, through this relay, exactly as a key pressed in `{Polities}` does.
 *
 * **Why a relay rather than a prop.** The controller starts once the backdrop is baked, deep inside the map
 * area; the buttons sit in the document bar, beside it. Neither owns the other, so the controller
 * *registers* its answer here and the buttons *run* it.
 */

/** Which way through the history. */
export type HistoryDirection = 'undo' | 'redo'

/** The relay: the canvas registers, the buttons run. */
export interface HistoryRelay {
  /**
   * Install the canvas's answer. The last one registered is the one that runs.
   * @param answer - what undoes or redoes, gesture first
   * @returns a function that uninstalls it, if it is still the one installed
   */
  register: (answer: (direction: HistoryDirection) => void) => () => void
  /**
   * Undo or redo through the canvas.
   * @param direction - which way
   * @returns `false` when no canvas is there to answer
   */
  run: (direction: HistoryDirection) => boolean
}

/**
 * Build a relay with no canvas registered.
 *
 * **With no canvas, nothing runs and the console says so.** No canvas means the backdrop is still baking or
 * failed — there is no gesture to take back, but there is no map either, and undoing a document nobody can
 * see would be a change the author cannot check. The buttons are disabled by the history in that state
 * anyway, so reaching this is a wiring fault worth a warning, not a silent no-op.
 * @param warn - where the refusal is said; the console in the application
 * @returns the relay
 */
export function createHistoryRelay(
  warn: (message: string) => void = (message) => {
    console.warn(message)
  }
): HistoryRelay {
  let answer: ((direction: HistoryDirection) => void) | null = null
  return {
    register: (next) => {
      answer = next
      return () => {
        if (answer === next) answer = null
      }
    },
    run: (direction) => {
      if (answer === null) {
        warn(
          `[Cartographer] ${direction} refused: no canvas to answer — the backdrop is not ready.`
        )
        return false
      }
      answer(direction)
      return true
    },
  }
}
