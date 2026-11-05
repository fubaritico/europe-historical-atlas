import type { ClipboardContent } from '@europe-historical-atlas/core/editor/clipboard'

/**
 * What the clipboard holds, where the page can read it and hear it change (CARTO-345): ‹cmd+V› reads it, and the
 * *Édition* menu lights « Coller les entités » from it.
 *
 * **One writer for both homes**: the tab's storage keeps the copy across the maps (`persistence/clipboardStorage.ts`,
 * injected as `keep`), this holds it for the page — and {@link HeldClipboard.hold} writes the storage first, then the
 * page, so the two cannot disagree. Filled at opening from what the storage held.
 */
export interface HeldClipboard {
  /** What the clipboard holds now, or `null`. */
  get: () => ClipboardContent | null
  /**
   * Keep a copy in the tab, then hold it for the page and tell every listener.
   * @param content - what was copied
   * @returns `false` when the tab's storage refused it — and then the clipboard holds what it held
   */
  hold: (content: ClipboardContent) => boolean
  /**
   * Hear the clipboard change.
   * @param listener - called after each change
   * @returns a function that stops the listening
   */
  subscribe: (listener: () => void) => () => void
}

/**
 * A holder of the clipboard.
 * @param initial - what the tab's storage held as the page opened, or `null`
 * @param keep - write a copy to the tab's storage; `false` when the storage refused it
 * @returns the holder
 */
export function createHeldClipboard(
  initial: ClipboardContent | null,
  keep: (content: ClipboardContent) => boolean
): HeldClipboard {
  let content = initial
  const listeners = new Set<() => void>()
  return {
    get: () => content,
    hold: (next) => {
      if (!keep(next)) return false
      content = next
      for (const listener of listeners) listener()
      return true
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
