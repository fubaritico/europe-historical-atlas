import { readClipboard } from '@europe-historical-atlas/core/editor/clipboard'

import type { ClipboardContent } from '@europe-historical-atlas/core/editor/clipboard'

/**
 * The clipboard kept in the tab (CARTO-345): *Open…* reloads the page on the next map, so what ‹cmd+C› copied is
 * written to the tab's own storage, as the view is (`carriedView.ts`), and read again on the next page. Unlike the
 * view it is **not** taken once: it stays until the next copy, so one copy pastes into as many maps as wanted.
 */

/** Where in the tab's storage the clipboard waits. */
export const CLIPBOARD_KEY = 'cartographer:clipboard'

/** The tab's storage, reduced to what the clipboard reads and writes — `sessionStorage` in the page, a map in a test. */
export type ClipboardStorage = Pick<Storage, 'getItem' | 'setItem'>

/**
 * Keep a copy for the pages that follow.
 *
 * **A storage that refuses is said, never swallowed** (`rules/error-handling.md`): a storage full or blocked throws,
 * and then nothing is copied — the clipboard keeps what it held, the console says why, and the answer lets the caller
 * say it in the status bar.
 * @param storage - the tab's storage
 * @param content - what was copied
 * @returns `true` when it is kept; `false` when the storage refused it
 */
export function keepClipboard(storage: ClipboardStorage, content: ClipboardContent): boolean {
  try {
    storage.setItem(CLIPBOARD_KEY, JSON.stringify(content))
    return true
  } catch (error: unknown) {
    console.error('[Cartographer] the copy could not be kept in the tab’s storage:', error)
    return false
  }
}

/**
 * What the clipboard holds.
 *
 * **One that cannot be read holds nothing, said in the console** — a copy is a comfort, not the map: the author
 * copies again. It is not removed, so the console says it at each reading until the next copy replaces it.
 * @param storage - the tab's storage
 * @returns the content, or `null` when nothing was copied or what was kept cannot be read
 */
export function keptClipboard(storage: ClipboardStorage): ClipboardContent | null {
  const text = storage.getItem(CLIPBOARD_KEY)
  if (text === null) return null
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    value = undefined
  }
  const content = readClipboard(value)
  if (content === null) {
    console.warn(
      '[Cartographer] the clipboard kept in the tab could not be read — nothing to paste'
    )
  }
  return content
}
