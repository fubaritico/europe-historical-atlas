import { availableMoves } from '@europe-historical-atlas/core/editor/stacking'

import { STACKING_LABELS } from './stackingLabels'

import type { CartographerStore } from '../state/store'
import type { YearPolity } from '@europe-historical-atlas/core/data/yearFormat'
import type { StackingMove } from '@europe-historical-atlas/core/editor/stacking'

/** Record a move as one step; `false` when the document refuses it — the store's `restackPolity`. */
export type Restack = CartographerStore['restackPolity']

/**
 * Move a polity in the stacking order as one step named as `s16` names it — *"bring to front — Duchy of
 * Normandy"* — and say what was done. The menu and the keys both go through here.
 * @param restack - the store's action
 * @param polity - the polity moved
 * @param move - the command
 * @param onResult - where to say what was done
 * @returns `true` when the document moved it
 */
export function arrangePolity(
  restack: Restack,
  polity: Pick<YearPolity, 'id' | 'name'>,
  move: StackingMove,
  onResult: (message: string) => void
): boolean {
  const label = `${STACKING_LABELS[move].toLowerCase()} — ${polity.name}`
  if (restack(polity.id, move, { kind: 'restack', label })) {
    onResult(`${STACKING_LABELS[move]} — ${polity.name}`)
    return true
  }
  // Both callers offer only the moves that change something: a refusal here is a defect.
  console.error(`[Cartographer] the document refused to ${label}.`)
  return false
}

/**
 * Move the selected polity — the stacking keys' command. Nothing selected, or a polity already at the
 * end it is pushed toward: said in the result zone and the console, and nothing recorded.
 * @param state - the store's state, read when the key is pressed
 * @param move - the command
 * @param onResult - where to say what was done, or why nothing was
 * @returns nothing
 */
export function arrangeSelected(
  state: Pick<CartographerStore, 'document' | 'target' | 'restackPolity'>,
  move: StackingMove,
  onResult: (message: string) => void
): void {
  const polity = state.document.polities.find((held) => held.id === state.target)
  if (polity === undefined) {
    console.warn(`[Cartographer] ${STACKING_LABELS[move]}: no polity is selected.`)
    onResult(`Select a polity to ${STACKING_LABELS[move].toLowerCase()}`)
    return
  }
  if (!availableMoves(state.document, polity.id)[move]) {
    console.warn(`[Cartographer] ${STACKING_LABELS[move]} — ${polity.name}: already in place.`)
    onResult(`${STACKING_LABELS[move]} — ${polity.name}: already in place`)
    return
  }
  arrangePolity(state.restackPolity, polity, move, onResult)
}
