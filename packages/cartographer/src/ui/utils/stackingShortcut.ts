/**
 * The four stacking commands on the keyboard — the dev, 2026-10-16: *« c'est une opération que je dois
 * répéter plein de fois »*. ‹cmd+↑› brings the selected polity forward, ‹cmd+↓› sends it backward, and with
 * ‹shift› all the way to the front or the back (‹ctrl› off a Mac). The keys he proposed, shown in the
 * menu beside each command.
 *
 * **Heard on the page**, as ‹ctrl+Z› is (`canvas/history/historyShortcut`), since the move is repeated from the list
 * as much as from the map; left to a text field and to an open dialogue, which keep their own keys (‹cmd+↑›
 * goes to the start of a field). The canvas and the list leave a modified arrow alone so it reaches here.
 */

import { STACKING_MOVES } from '@europe-historical-atlas/core/editor/stacking'
import { isChord } from '@europe-historical-atlas/core/i18n/shortcuts'

import { keepsItsOwnKeys } from '../../canvas/history/historyShortcut'
import { COMMAND_KEYS } from '../../i18n/commandKeys'

import type { StackingMove } from '@europe-historical-atlas/core/editor/stacking'

/** A key and its modifiers, as much of a `KeyboardEvent` as the test needs. */
export interface StackingKeyEvent {
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
 * The stacking command a key asks for.
 * @param event - the key and its modifiers
 * @returns the command, or `null` for any other key
 */
export function stackingMoveFor(event: StackingKeyEvent): StackingMove | null {
  // The four chords of the one table the menu's labels are written from (`i18n/commandKeys.ts`, CARTO-345).
  return STACKING_MOVES.find((move) => isChord(event, COMMAND_KEYS[move])) ?? null
}

/** Where the shortcut listens — the page's document in the application, a stub in tests. */
export interface StackingKeyTarget {
  /** Start listening. */
  addEventListener: (type: 'keydown', listener: (event: KeyboardEvent) => void) => void
  /** Stop listening. */
  removeEventListener: (type: 'keydown', listener: (event: KeyboardEvent) => void) => void
}

/**
 * Listen for the stacking keys anywhere on the page but a text field, a dialogue or the open stacking
 * menu, and never for a key already handled elsewhere.
 *
 * A held key repeats, and each repetition moves one more step — which is what holding ‹cmd+↓› to walk a
 * polity down a long list should do.
 * @param target - where to listen
 * @param onMove - what a command does
 * @returns a function that stops listening
 */
export function listenForStackingKeys(
  target: StackingKeyTarget,
  onMove: (move: StackingMove) => void
): () => void {
  const listener = (event: KeyboardEvent): void => {
    const move = stackingMoveFor(event)
    if (move === null || event.defaultPrevented || keepsItsOwnKeys(event.target)) return
    // The stacking menu, open, keeps its arrows: one key, one effect.
    if (event.target instanceof Element && event.target.closest('.polity-stack-menu')) return
    event.preventDefault()
    onMove(move)
  }
  target.addEventListener('keydown', listener)
  return () => {
    target.removeEventListener('keydown', listener)
  }
}
