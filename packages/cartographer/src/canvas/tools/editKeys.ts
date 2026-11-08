import { deleteSelected } from './anchorGestures'
import { openChosenCity } from './cityHit'
import { eraseSelectedEdge } from './edgeGestures'
import { dropDrag } from './toolSession'

import type { AnchorGestureContext } from './anchorGestures'

/**
 * The white arrow's keys (`s03`): ‹escape› drops a drag in progress, then the selection; ‹delete› or ‹backspace›
 * erases the edge selected (CARTO-397) or removes the anchors selected — the same thing, as in Illustrator; ‹enter›
 * opens the box of the city chosen (CARTO-384).
 * @param context - the session and the store
 * @param key - the key, as `KeyboardEvent.key`
 * @returns whether the key was taken
 */
export function editKey(context: AnchorGestureContext, key: string): boolean {
  if (key === 'Escape') {
    // A marquee or a move in progress goes first; the selection on the next press of ‹escape›.
    const session = context.session
    const drawing = session.marquee !== null || session.moving !== null
    dropDrag(session)
    if (!drawing) {
      session.selected = []
      session.edge = null
    }
    return true
  }
  if (key === 'Enter') return openChosenCity(context)
  if (key !== 'Delete' && key !== 'Backspace') return false
  // An edge selected goes first: a selection is points or an edge, never both.
  return eraseSelectedEdge(context) || deleteSelected(context)
}
