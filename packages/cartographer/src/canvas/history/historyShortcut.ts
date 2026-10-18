import { historyKey } from '../navigation'

/**
 * ‹ctrl+Z› and ‹ctrl+shift+Z› — ‹cmd› on a Mac — heard outside the canvas: in `{Polities}`, on its action
 * bar, anywhere the focus sits that is not a text field.
 *
 * **Why outside as well as on the canvas.** Until the action bar's walk of 2026-10-12 the history keys were
 * the canvas's alone: a polity deleted from the panel said *"ctrl+Z brings it back"*, the focus was in the
 * panel, and ‹ctrl+Z› did nothing. The controller therefore listens on the page's document too — and runs **the
 * same** gesture-aware undo as on the canvas, which first takes back an outline in progress or a drag
 * before touching the history (ARCH-101: a second path straight to `store.undo()` rewound the document
 * under an open outline). This module only decides whether a key pressed elsewhere is the canvas's to
 * answer. Three places keep their own answer:
 * - **the canvas itself**, which has already answered through its own listener;
 * - **a text field**: ‹ctrl+Z› there undoes the typing, as everywhere;
 * - **an open dialogue**: undoing the document under a form being filled would change what it edits.
 */

/**
 * Whether a key's target keeps its own keys — its ‹ctrl+Z›, its ‹space›: a text field, or anything inside an
 * open dialogue. The page-level ‹ctrl+Z› and ‹space› (`toolKeys.listenForPageSpace`) both leave these alone.
 * @param target - where the key was pressed
 * @returns `true` when the canvas must not answer the key
 */
export function keepsItsOwnKeys(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  if (target.closest('dialog[open]') !== null) return true
  if (target instanceof HTMLElement && target.isContentEditable) return true
  return target.matches('input, textarea, select')
}

/**
 * Whether a key that reached the page's document is a history key the canvas should answer.
 * @param event - the key, as the document received it
 * @param canvas - the canvas, whose own keys it has already answered
 * @returns `true` for ‹ctrl+Z› / ‹ctrl+shift+Z› pressed outside the canvas, a field or a dialogue
 */
export function isPageHistoryKey(event: KeyboardEvent, canvas: Element): boolean {
  if (event.defaultPrevented || event.target === canvas || keepsItsOwnKeys(event.target))
    return false
  return historyKey(event) !== null
}

/**
 * Hear the history keys pressed anywhere on the canvas's page, outside the canvas, and hand them to the
 * canvas's own undo. On the canvas's document, which every key bubbles to and which always exists.
 * @param canvas - the canvas
 * @param answer - the canvas's handler for a modified key
 * @returns a function that stops listening
 */
export function listenForPageHistory(
  canvas: Element,
  answer: (event: KeyboardEvent) => void
): () => void {
  const page = canvas.ownerDocument
  const listener = (event: KeyboardEvent): void => {
    if (isPageHistoryKey(event, canvas)) answer(event)
  }
  page.addEventListener('keydown', listener)
  return () => {
    page.removeEventListener('keydown', listener)
  }
}
