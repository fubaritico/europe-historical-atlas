import { gestureOf, refreshTools } from '../liveCanvas'
import { historyKey } from '../navigation'
import { redoGesture, undoGesture } from '../tools/toolGestures'

import { listenForPageHistory } from './historyShortcut'

import type { HistoryDirection } from './historyRelay'
import type { LiveCanvas } from '../liveCanvas'

/**
 * The canvas answering its history — the keys on it, the keys pressed elsewhere on the page, and the
 * document bar's buttons — through one gesture-aware path (ARCH-101). Out of `controller.ts` for the
 * readability budget, and because it is one responsibility: whatever asks, the gesture in progress is
 * taken back before the history moves.
 */

/**
 * Handle a key held with a modifier: the history's two, or none.
 *
 * **Every other modified key belongs to the browser or the assistive technology** — ‹cmd+P› prints,
 * ‹ctrl+A› selects, ‹cmd+plus› zooms the page — never a tool's (A11Y-001, found in review). ‹shift› alone
 * is not a modifier here: on many layouts `+` is typed with it.
 *
 * **‹ctrl+Z› and ‹ctrl+shift+Z› are the exception, and take nothing from the browser**: a canvas has no
 * text to undo. ‹cmd› stands for ‹ctrl› on a Mac (`s03`).
 * @param it - the attachment
 * @param event - the key event
 * @returns `true` when the key was a modified one, handled here or left to the platform
 */
export function onModifiedKey(it: LiveCanvas, event: KeyboardEvent): boolean {
  if (!event.ctrlKey && !event.metaKey && !event.altKey) return false
  const history = historyKey(event)
  if (history === null) return true
  event.preventDefault()
  runHistory(it, history, event.repeat)
  return true
}

/**
 * Undo or redo, the gesture in progress first — the one path the keys and the document bar's buttons share.
 * @param it - the attachment
 * @param direction - which way
 * @param repeat - whether a held key is repeating it
 */
function runHistory(it: LiveCanvas, direction: HistoryDirection, repeat: boolean): void {
  // The result described the gesture now being taken back or replayed (QUAL-109).
  it.deps.onResult(null)
  if (direction === 'undo') undoGesture(gestureOf(it), repeat)
  else redoGesture(gestureOf(it), repeat)
  it.requestPaint()
  refreshTools(it)
}

/**
 * ‹ctrl+Z› pressed in `{Polities}` or on its bar, and the document bar's buttons, take the canvas's own
 * path, so an outline in progress is taken back before the history moves (`historyShortcut.ts`,
 * `historyRelay.ts`, ARCH-101).
 * @param it - the attachment
 * @returns a function that stops listening to both
 */
export function hearPageHistory(it: LiveCanvas): () => void {
  const unlisten = listenForPageHistory(it.node, (event) => onModifiedKey(it, event))
  const unregister = it.deps.history.register((direction) => {
    runHistory(it, direction, false)
  })
  return () => {
    unlisten()
    unregister()
  }
}
