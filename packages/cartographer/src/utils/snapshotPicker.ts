/**
 * Whether the *Open snapshot* dialogue is open (CARTO-238, rung 2b) — set by the top bar's button, read by the
 * dialogue mounted beside the editor. A tiny external store rather than component state: the button and the
 * dialogue sit in two different branches of the tree, and the composition root wires them, as it wires the
 * draft's dialogue.
 */

/** The picker. */
export interface SnapshotPicker {
  /** Whether the dialogue is open. */
  isOpen: () => boolean
  /** Open it. */
  open: () => void
  /** Close it. */
  close: () => void
  /**
   * Listen to it opening and closing.
   * @param listener - called on each change
   * @returns a function that stops listening
   */
  subscribe: (listener: () => void) => () => void
}

/**
 * Build a picker, closed.
 * @returns the picker
 */
export function createSnapshotPicker(): SnapshotPicker {
  let open = false
  const listeners = new Set<() => void>()
  const set = (next: boolean): void => {
    if (open === next) return
    open = next
    for (const listener of listeners) listener()
  }
  return {
    isOpen: () => open,
    open: () => {
      set(true)
    },
    close: () => {
      set(false)
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
