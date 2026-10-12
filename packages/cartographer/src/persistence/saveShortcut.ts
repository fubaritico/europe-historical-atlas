/**
 * ‹ctrl+S› — ‹cmd+S› on a Mac — saves the year, wherever the focus is.
 *
 * **Bound on the window, unlike every tool key**, and the difference is deliberate. The tool keys live on
 * the canvas so that a text field keeps its own keystrokes (`canvas/controller.ts` says why). Saving is the
 * opposite case: an author typing a polity's name in a dialog and pressing ‹ctrl+S› means *save*, and the
 * browser's own answer — *"Save page as…"*, a dialog writing the editor's HTML to disk — is never what they
 * meant. So the key is taken from the browser everywhere on the page.
 */

/** A key and its modifiers, as much of a `KeyboardEvent` as the test needs. */
export interface SaveKeyEvent {
  /** The key, as typed. */
  key: string
  /** ‹ctrl› held. */
  ctrlKey: boolean
  /** ‹cmd› held. */
  metaKey: boolean
  /** ‹alt› held. */
  altKey: boolean
  /** ‹shift› held. */
  shiftKey: boolean
}

/**
 * Whether a key asks to save: ‹ctrl+S› or ‹cmd+S›, without ‹alt› or ‹shift›.
 *
 * ‹shift› is left out on purpose: ‹ctrl+shift+S› is *Save as…* in every editor, and `[Save as…]` is a
 * gesture of its own (`s04`), not this one under another key.
 * @param event - the key and its modifiers
 * @returns `true` for the save key
 */
export function isSaveKey(event: SaveKeyEvent): boolean {
  if (event.altKey || event.shiftKey) return false
  return (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's'
}

/** Where the shortcut listens — the window in the application, a stub in tests. */
export interface KeyTarget {
  /** Start listening. */
  addEventListener: (type: 'keydown', listener: (event: KeyboardEvent) => void) => void
  /** Stop listening. */
  removeEventListener: (type: 'keydown', listener: (event: KeyboardEvent) => void) => void
}

/**
 * Listen for the save key.
 *
 * A held key repeats: the browser's dialog is refused on every repetition, but only the first press saves,
 * so holding ‹ctrl+S› sends one save rather than thirty.
 * @param target - where to listen
 * @param onSave - what saving does
 * @returns a function that stops listening
 */
export function installSaveShortcut(target: KeyTarget, onSave: () => void): () => void {
  const listener = (event: KeyboardEvent): void => {
    if (!isSaveKey(event)) return
    event.preventDefault()
    if (!event.repeat) onSave()
  }
  target.addEventListener('keydown', listener)
  return () => {
    target.removeEventListener('keydown', listener)
  }
}
