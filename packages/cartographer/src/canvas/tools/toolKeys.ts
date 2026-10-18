import {
  PEN_MODE_LABELS,
  TOOL_LABELS,
  isPenTool,
  modeLabel,
  nextPenMode,
} from '../../state/toolSlice'
import { keepsItsOwnKeys } from '../history/historyShortcut'
import { handInHand, refreshTools, showCursor } from '../liveCanvas'
import { TOOL_KEYS } from '../navigation'

import type { LiveCanvas } from '../liveCanvas'

/*
 * The keys that change what the author holds rather than what the map shows: ‹P›, ‹A› and ‹R› take a
 * tool, ‹space› borrows the hand, ‹alt› turns ⟨retrace⟩ to the other side. Out of `controller.ts` on
 * 2026-10-14, when ⟨retrace⟩ pushed it past its line budget — the controller keeps the listeners.
 */

/**
 * The keys held rather than pressed: ‹space› borrows the hand for as long as it is held, ‹alt› shows
 * ⟨retrace⟩'s other side without waiting for the pointer to move.
 *
 * **‹alt› before the modified keys**, which would take it — it arrives with `altKey` set. **‹space›
 * after them**, so a modified ‹space› (‹ctrl+space›, which input methods use) stays the platform's.
 * `preventDefault` on ‹space› because a focusable element scrolls the page on it, which here would
 * scroll the editor out from under the map.
 * @param it - the attachment
 * @param event - the key event
 * @param takenFirst - the modified keys' handler, asked between the two
 * @returns `true` when the key was taken here, or by `takenFirst`
 */
export function pressHeldKey(
  it: LiveCanvas,
  event: KeyboardEvent,
  takenFirst: (it: LiveCanvas, event: KeyboardEvent) => boolean
): boolean {
  if (event.key === 'Alt') {
    it.altHeld = true
    refreshTools(it)
    return true
  }
  if (takenFirst(it, event)) return true
  if (event.key !== ' ') return false
  event.preventDefault()
  it.spaceHeld = true
  showCursor(it)
  return true
}

/**
 * The release half of a held key — ‹space› or ‹alt› — and of both when the canvas loses the focus.
 * @param it - the attachment
 * @param key - the key let go, as `KeyboardEvent.key`
 */
export function releaseHeldKey(it: LiveCanvas, key: string): void {
  if (key === ' ') releaseSpace(it)
  if (key !== 'Alt' || !it.altHeld) return
  it.altHeld = false
  refreshTools(it)
}

/**
 * ‹P›, ‹A› and ‹R›: take the tool — and ‹P› with the Pen already in hand goes round its group, free → coast →
 * river → Pencil (the dev, 2026-10-11: pressing ‹P› again must change the Pen). ‹R› again does the same
 * under ⟨retrace⟩, which stays ⟨retrace⟩: its new run is placed in that mode, the Pencil included.
 * @param it - the attachment
 * @param event - the key event
 * @returns `true` when the key was a tool's, and was taken
 */
export function onToolKey(it: LiveCanvas, event: KeyboardEvent): boolean {
  const tool = TOOL_KEYS[event.key.toLowerCase()]
  if (tool === undefined) return false
  event.preventDefault()
  const state = it.deps.store.getState()
  if (isPenTool(tool) && tool === state.tool) {
    const mode = nextPenMode(state.penMode)
    if (tool === 'draw') state.choosePenMode(mode)
    else state.turnPenMode(mode)
    // Said in the result zone, a polite live region: focus is on the canvas, not on the rail's button
    // whose name changed, so the mode would otherwise change in silence (A11Y-010).
    it.deps.onResult(modeLabel(tool, mode))
  } else if (tool !== state.tool) {
    state.selectTool(tool)
    // Said for the same reason as the Pen's mode: the focus is on the canvas, not on the rail.
    it.deps.onResult(tool === 'draw' ? PEN_MODE_LABELS[state.penMode] : TOOL_LABELS[tool])
  }
  return true
}

/**
 * Whether a drag lays Pencil points: the Pen in hand in its freehand mode, the hand not borrowed.
 * @param it - the attachment
 * @returns `true` when a drag draws
 */
export function pencilInHand(it: LiveCanvas): boolean {
  const state = it.deps.store.getState()
  return isPenTool(state.tool) && state.penMode === 'pencil' && !handInHand(it)
}

/**
 * The release half of ‹space›. Without it the hand stays in place after the key is let go, which is the
 * shape of bug a missing `keyup` always has: the state is entered correctly and never left.
 * @param it - the attachment
 */
export function releaseSpace(it: LiveCanvas): void {
  if (!it.spaceHeld) return
  it.spaceHeld = false
  showCursor(it)
}

/**
 * ‹space› borrows the hand wherever the focus sits, as in Illustrator — as long as the pointer is over the
 * map (the dev, 2026-10-14: *"quel que soit l'outil qu'on a en cours, si on fait espace, on a la main"*).
 *
 * **Why the page and not only the canvas.** The canvas hears its own keys, and only while it has the focus;
 * after a click on a rail button or a row of `{Polities}`, ‹space› went to them — the button fired, the list
 * reacted — and the hand never came. **Heard in the capture phase**, so the focused control never sees it:
 * a bubbling listener would run after the button or the list had already acted.
 *
 * **What keeps ‹space›**: the pointer off the map (then ‹space› is the page's), a text field and an open
 * dialogue (`keepsItsOwnKeys`, the same places that keep their own ‹ctrl+Z›), the canvas itself, which has
 * its own listener — **and a control reached with ‹Tab›** (A11Y-001): from the keyboard, ‹space› activates
 * the button or chooses the row, as it must (WCAG 2.1.1). Only a focus left by a click — a rail button
 * pressed with the mouse, a row clicked — gives ‹space› to the hand, which is the dev's case.
 * @param it - the attachment
 * @returns a function that stops listening
 */
export function listenForPageSpace(it: LiveCanvas): () => void {
  const page = it.node.ownerDocument
  const window = page.defaultView
  // How the focus last moved: a press of the pointer, or ‹Tab›. Read in the capture phase, before any
  // control moves it.
  const origin = { pointer: true }
  const pressed = (): void => {
    origin.pointer = true
  }
  const tabbed = (event: KeyboardEvent): void => {
    if (event.key === 'Tab') origin.pointer = false
  }
  const down = (event: KeyboardEvent): void => {
    if (event.key !== ' ' || event.target === it.node || !origin.pointer) return
    if (it.pointer === null || keepsItsOwnKeys(event.target)) return
    event.preventDefault()
    event.stopPropagation()
    if (it.spaceHeld) return
    it.spaceHeld = true
    showCursor(it)
  }
  const up = (event: KeyboardEvent): void => {
    if (event.key !== ' ' || event.target === it.node || !it.spaceHeld) return
    // A button activates on the release of ‹space›: it must not, the press was the hand's.
    event.preventDefault()
    event.stopPropagation()
    releaseHeldKey(it, ' ')
  }
  // Switching to another application with ‹space› down never sends its release.
  const away = (): void => {
    releaseHeldKey(it, ' ')
  }
  page.addEventListener('pointerdown', pressed, true)
  page.addEventListener('keydown', tabbed, true)
  page.addEventListener('keydown', down, true)
  page.addEventListener('keyup', up, true)
  window?.addEventListener('blur', away)
  return () => {
    page.removeEventListener('pointerdown', pressed, true)
    page.removeEventListener('keydown', tabbed, true)
    page.removeEventListener('keydown', down, true)
    page.removeEventListener('keyup', up, true)
    window?.removeEventListener('blur', away)
  }
}
