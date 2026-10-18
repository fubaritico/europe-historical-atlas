/**
 * The stacking commands — Illustrator's *Object › Arrange*, as `s16` asks for them: Bring to Front,
 * Bring Forward, Send Backward, Send to Back.
 *
 * **Among siblings only**, the dev's group model of 2026-10-11: a polity moves among the polities that
 * owe the same suzerain — or among the top-level groups when it owes nobody — and its vassals move with
 * it, because `paintOrder` paints a group as a block. A vassal can therefore never go under its
 * suzerain: they are never siblings.
 *
 * **The order lives in the polities list**, which the file keeps through a save (`s16`, step 0). A move
 * permutes the siblings among the slots they already occupy in that list, so no other polity moves.
 */

import { effectiveSuzerains } from '../data/paintOrder'

import type { YearDocument } from './yearDocument'

/** Illustrator's four Arrange commands, front first. */
export const STACKING_MOVES = ['front', 'forward', 'backward', 'back'] as const

/** One of {@link STACKING_MOVES}. */
export type StackingMove = (typeof STACKING_MOVES)[number]

/**
 * The positions, in the polities list, of a polity's siblings — itself included — back to front.
 *
 * Siblings share an effective suzerain — `effectiveSuzerains`, the definition `paintOrder` groups by.
 * @param doc - the document
 * @param polityId - whose siblings
 * @returns their indices in `doc.polities`, in list order; empty when the polity is not in the list
 */
function siblingSlots(doc: YearDocument, polityId: string): number[] {
  const suzerains = effectiveSuzerains(doc.polities)
  if (!suzerains.has(polityId)) return []
  const own = suzerains.get(polityId)
  return doc.polities.flatMap((held, index) => (suzerains.get(held.id) === own ? [index] : []))
}

/**
 * Where a sibling at `from` lands after a move, among `count` siblings.
 * @param from - its rank among them, 0 being the back
 * @param count - how many siblings there are
 * @param move - the command
 * @returns its new rank
 */
function destination(from: number, count: number, move: StackingMove): number {
  if (move === 'front') return count - 1
  if (move === 'back') return 0
  if (move === 'forward') return Math.min(from + 1, count - 1)
  return Math.max(from - 1, 0)
}

/**
 * Which moves would change anything for a polity — what the menu enables (`s16`: a command that would
 * change nothing is disabled).
 * @param doc - the document
 * @param polityId - whose place
 * @returns per move, whether it would move the polity among its siblings
 */
export function availableMoves(doc: YearDocument, polityId: string): Record<StackingMove, boolean> {
  const slots = siblingSlots(doc, polityId)
  const from = slots.findIndex((slot) => doc.polities[slot]?.id === polityId)
  const moves = (move: StackingMove): boolean =>
    from >= 0 && destination(from, slots.length, move) !== from
  return {
    front: moves('front'),
    forward: moves('forward'),
    backward: moves('backward'),
    back: moves('back'),
  }
}

/**
 * Move a polity among its siblings, its vassals with it.
 * @param doc - the document to edit
 * @param polityId - which polity
 * @param move - the command
 * @returns `false` when the polity is unknown or the move would change nothing — and nothing moved
 */
export function restack(doc: YearDocument, polityId: string, move: StackingMove): boolean {
  const slots = siblingSlots(doc, polityId)
  const siblings = slots.flatMap((slot) => {
    const polity = doc.polities[slot]
    return polity === undefined ? [] : [polity]
  })
  const from = siblings.findIndex((polity) => polity.id === polityId)
  if (from < 0) return false
  const to = destination(from, siblings.length, move)
  if (to === from) return false
  siblings.splice(to, 0, ...siblings.splice(from, 1))
  slots.forEach((slot, rank) => {
    const polity = siblings[rank]
    if (polity !== undefined) doc.polities[slot] = polity
  })
  return true
}
