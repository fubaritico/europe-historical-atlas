import { nearestStretch } from '../geometry/stretchHit'
import { describeDrawingTarget } from '../state/drawingTarget'
import { screenToLonLatOnBackdrop } from '../view/projection'

import { anchorHit } from './borderSnap'
import { TAG } from './consoleTag'
import { targetHandles } from './toolSession'

import type { GestureContext } from './toolGestures'
import type { StretchHit } from '../geometry/stretchHit'
import type { YearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

/**
 * The white arrow's two edits of the anchors themselves (`s03`): a click on a stretch inserts one, and
 * ‹delete› or ‹backspace› removes the one selected.
 *
 * **Both go through the store's recorded actions**, so each is one undo step, and both act on every
 * ring that holds the anchor — a border two polities share stays one border.
 */

/** How `{History}` names an inserted anchor. */
export const INSERT_ANCHOR_STEP = { kind: 'insert-anchor', label: 'insert anchor' } as const

/** How `{History}` names a removed anchor. */
export const DELETE_ANCHOR_STEP = { kind: 'delete-anchor', label: 'delete anchor' } as const

/**
 * Every stretch of a polity's rings, as pairs of anchor indices — the closing one included.
 * @param document - the document to read
 * @param polityId - whose rings
 * @returns each stretch once per ring that runs over it
 */
export function targetStretches(document: YearDocument, polityId: string): [number, number][] {
  const stretches: [number, number][] = []
  for (const claim of document.claims) {
    if (claim.polity !== polityId) continue
    for (const ring of claim.rings) {
      ring.forEach((index, at) => {
        const next = ring[(at + 1) % ring.length]
        if (next !== undefined && ring.length > 1) stretches.push([index, next])
      })
    }
  }
  return stretches
}

/**
 * The target's stretch under the pointer, or `null` — nobody aimed at, or no stretch within reach.
 * @param context - the store, the session and the projected anchors
 * @param polityId - the target's id
 * @param at - the pointer, in screen pixels
 * @returns the stretch and the point on it, or `null`
 */
export function stretchUnder(
  context: GestureContext,
  polityId: string,
  at: readonly [number, number]
): StretchHit | null {
  const document = context.store.getState().document
  return nearestStretch(
    context.anchorsOnScreen(),
    targetStretches(document, polityId),
    [at[0], at[1]],
    context.radius
  )
}

/**
 * The target's stretch the Pen would insert a point on — the one rule both its click (`penInserts`)
 * and its cursor and sentence (`overStretch`) read, so they cannot disagree (ARCH-001). No outline in
 * progress, and no anchor under the pointer: that one is branched onto.
 * @param context - the session and the store
 * @param at - the pointer, in screen pixels
 * @returns the stretch, or `null` when the Pen does not insert here
 */
export function penInsertHit(
  context: GestureContext,
  at: readonly [number, number]
): StretchHit | null {
  if (context.session.outline.length > 0 || anchorHit(context, at) !== null) return null
  const { document, target } = context.store.getState()
  const aimed = describeDrawingTarget(document, target)
  return aimed === null ? null : stretchUnder(context, aimed.id, at)
}

/**
 * Insert an anchor where the white arrow pressed on one of the target's stretches, and hand it to the
 * drag: keeping the pointer down moves it (`s03`). The insertion and the move are two steps, so an undo
 * after the drag takes back the move first, then the point.
 * @param context - the session and the store
 * @param polityId - the target's id
 * @param at - the pointer, in screen pixels
 * @param hold - whether the new anchor is selected and held for a drag — the arrow's press; the Pen's
 *   click only inserts, as Illustrator's Pen does
 * @returns `true` when the press was on a stretch — inserted, or refused and said
 */
export function insertOnStretch(
  context: GestureContext,
  polityId: string,
  at: readonly [number, number],
  hold = true
): boolean {
  const hit = stretchUnder(context, polityId, at)
  if (hit === null) return false
  const point = screenToLonLatOnBackdrop(hit.at, context.frame, context.store.getState().viewport)
  if (point === null) {
    console.warn(`${TAG} no anchor inserted: that stretch runs off the map.`)
    return true
  }
  const index = context.store.getState().insertAnchor(hit.a, hit.b, point, INSERT_ANCHOR_STEP)
  if (index === null) {
    console.error(
      `${TAG} the document refused a point between anchors ${String(hit.a)} and ${String(hit.b)}.`
    )
    return true
  }
  if (!hold) return true
  context.session.selected = index
  context.session.grabbed = index
  return true
}

/**
 * The names of the polities that held a removed anchor, verbatim — their ids when the registry lacks them.
 * @param document - the document to read
 * @param ids - the polities' ids
 * @returns their names, in the order given
 */
function namesOf(document: YearDocument, ids: readonly string[]): string[] {
  // An id the registry lacks is a fault `documentFaults` already reports once per version; here the
  // message only has to say who held the point, and the id says it.
  return ids.map((id) => document.polities.find((polity) => polity.id === id)?.name ?? id)
}

/**
 * Whether the selected anchor is still one of the target's — an undo may have taken it away, or the
 * target changed under the selection.
 * @param context - the store
 * @param index - the selected anchor
 * @returns `true` when the target's rings hold it
 */
function stillTargets(context: GestureContext, index: number): boolean {
  const { document, target } = context.store.getState()
  const aimed = describeDrawingTarget(document, target)
  return aimed !== null && targetHandles(document, aimed.id).includes(index)
}

/**
 * ‹delete› or ‹backspace› under ⟨edit⟩: remove the selected anchor from every ring holding it.
 *
 * **A shared anchor is removed without asking** — `s03` wants a confirmation naming both polities, and
 * there is no dialogue for it yet. The result zone names them instead, and one undo puts it back.
 * Refused, and said, when a ring would fall under three anchors.
 * @param context - the session and the store
 * @returns `true` when the key was taken — there was a selection to act on
 */
export function deleteSelected(context: GestureContext): boolean {
  const index = context.session.selected
  if (index === null) return false
  if (!stillTargets(context, index)) {
    // Told apart from a ring too short: after an undo the message would otherwise blame the ring.
    context.session.selected = null
    console.warn(
      `${TAG} anchor not removed: the selected anchor is no longer on the target's outline.`
    )
    return true
  }
  const removal = context.store.getState().deleteAnchor(index, DELETE_ANCHOR_STEP)
  if (removal === null) {
    console.warn(`${TAG} anchor not removed: a ring needs at least three anchors.`)
    context.report('not removed — a ring needs at least three anchors')
    return true
  }
  context.session.selected = null
  const held = removal.polities.length
  context.report(
    held > 1
      ? `removed an anchor held by ${String(held)} paths — ${namesOf(context.store.getState().document, removal.polities).join(', ')}`
      : 'removed an anchor'
  )
  return true
}
