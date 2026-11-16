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

import type { YearDocument } from '../data/yearDocument'
import type { YearPolity } from '../data/yearFormat'

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
  return moveAmongSiblings(doc, polityId, (others, from) =>
    destination(from, others.length + 1, move)
  )
}

/**
 * Move a polity to a new rank among its siblings, its vassals with it — the siblings permuted among the slots they
 * already hold, so no other polity moves (review ARCH-001: one permutation for the commands and the drop).
 * @param doc - the document to edit
 * @param polityId - which polity
 * @param rankOf - its new rank, back to front, given its siblings without it and its old rank; `null` to refuse
 * @returns `false` when the polity is unknown, refused, or stays where it was — and nothing moved
 */
function moveAmongSiblings(
  doc: YearDocument,
  polityId: string,
  rankOf: (others: readonly YearPolity[], from: number) => number | null
): boolean {
  const slots = siblingSlots(doc, polityId)
  const siblings = slots.flatMap((slot) => {
    const polity = doc.polities[slot]
    return polity === undefined ? [] : [polity]
  })
  const from = siblings.findIndex((polity) => polity.id === polityId)
  const [moved] = from < 0 ? [] : siblings.splice(from, 1)
  if (moved === undefined) return false
  const to = rankOf(siblings, from)
  if (to === null || to === from) return false
  siblings.splice(to, 0, moved)
  slots.forEach((slot, rank) => {
    const polity = siblings[rank]
    if (polity !== undefined) doc.polities[slot] = polity
  })
  return true
}

/** Which side of a sibling a polity is put on: in front of it, or behind it (CARTO-457). */
export type StackingSide = 'front' | 'back'

/**
 * Whether two polities are siblings — they owe the same suzerain, or both nobody — the only ones a polity is ranged
 * among (the dev, 2026-11-16: *« c'est un déplacement entre siblings »*).
 * @param doc - the document
 * @param a - one polity's id
 * @param b - the other's
 * @returns whether both are in the list and share an effective suzerain
 */
export function areSiblings(doc: YearDocument, a: string, b: string): boolean {
  const suzerains = effectiveSuzerains(doc.polities)
  return suzerains.has(a) && suzerains.has(b) && suzerains.get(a) === suzerains.get(b)
}

/**
 * Put a polity just in front of, or just behind, one of its siblings, its vassals with it — the drop of a row dragged
 * in `{Polities}` (CARTO-457).
 * @param doc - the document to edit
 * @param polityId - the polity dragged
 * @param besideId - the sibling it is dropped on
 * @param side - in front of it, or behind it
 * @returns `false` when the two are not siblings, are one, or the move would change nothing — and nothing moved
 */
export function restackBeside(
  doc: YearDocument,
  polityId: string,
  besideId: string,
  side: StackingSide
): boolean {
  if (polityId === besideId || !areSiblings(doc, polityId, besideId)) return false
  return moveAmongSiblings(doc, polityId, (others) => {
    const at = others.findIndex((polity) => polity.id === besideId)
    if (at < 0) return null
    // The list is back to front: in front of a sibling is just after it
    return side === 'front' ? at + 1 : at
  })
}
