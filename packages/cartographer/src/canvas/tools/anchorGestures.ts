import { nearestStretch } from '../../geometry/stretchHit'
import { describeDrawingTarget } from '../../state/drawingTarget'
import { screenToLonLatOnBackdrop } from '../../viewport/projection'

import { anchorHit } from './borderSnap'
import { TAG } from './consoleTag'
import { targetHandles } from './toolSession'

import type { BorderSnapContext } from './borderSnap'
import type { FrameSnapContext } from './frameSnap'
import type { StretchHit } from '../../geometry/stretchHit'
import type { AnchorRemoval } from '@europe-historical-atlas/core/editor/anchorEdits'
import type { YearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

/**
 * The two edits of the anchors themselves (`s03`): the idle Pen's click on a stretch inserts one, and
 * ‹delete› or ‹backspace› removes the ones the white arrow selected.
 *
 * **Both go through the store's recorded actions**, so each is one undo step, and both act on every
 * ring that holds the anchor — a border two polities share stays one border.
 */

/**
 * What the anchor edits read of a gesture: the border snap's slice and the frame snap's, plus the anchors
 * the white arrow may pick up. The gestures' context extends this one; nothing here imports it.
 */
export interface AnchorGestureContext extends BorderSnapContext, FrameSnapContext {
  /**
   * The anchors the white arrow may pick up — the target's own and its extent outline's (`extentHandles`),
   * read from the canvas's cache. **Optional by contract**: a context without it offers the target's own
   * anchors only (`targetHandles`), which is what a gesture test with no vassal needs.
   */
  editHandles?: () => readonly number[]
}

/** The step kind an inserted anchor is recorded under. */
export const INSERT_ANCHOR_KIND = 'insert-anchor'

/** The step kind removed anchors are recorded under. */
export const DELETE_ANCHOR_KIND = 'delete-anchor'

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
  context: AnchorGestureContext,
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
  context: AnchorGestureContext,
  at: readonly [number, number]
): StretchHit | null {
  if (context.session.outline.length > 0 || anchorHit(context, at) !== null) return null
  const { document, target } = context.store.getState()
  const aimed = describeDrawingTarget(document, target)
  return aimed === null ? null : stretchUnder(context, aimed.id, at)
}

/**
 * Insert an anchor where the idle Pen clicked one of the target's stretches, as Illustrator's Pen adds a
 * point on a path. **The Pen's alone** (the dev, 2026-10-14): the white arrow selects, it does not add —
 * a point is inserted with ‹P›, then dragged with ‹A›.
 * @param context - the session and the store
 * @param polityId - the target's id
 * @param at - the pointer, in screen pixels
 * @returns `true` when the click was on a stretch — inserted, or refused and said
 */
export function insertOnStretch(
  context: AnchorGestureContext,
  polityId: string,
  at: readonly [number, number]
): boolean {
  const hit = stretchUnder(context, polityId, at)
  if (hit === null) return false
  const point = screenToLonLatOnBackdrop(hit.at, context.frame, context.store.getState().viewport)
  if (point === null) {
    console.warn(`${TAG} no anchor inserted: that stretch runs off the map.`)
    return true
  }
  const index = context.store.getState().insertAnchor(hit.a, hit.b, point, {
    kind: INSERT_ANCHOR_KIND,
    label: context.words.t('stepInsertAnchor'),
  })
  if (index === null) {
    console.error(
      `${TAG} the document refused a point between anchors ${String(hit.a)} and ${String(hit.b)}.`
    )
  }
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
 * The anchors the white arrow may pick up: the context's {@link AnchorGestureContext.editHandles} when it carries
 * them, else the target's own anchors.
 * @param context - the store, and the canvas's handles when wired
 * @returns anchor indices
 */
export function editHandlesOf(context: AnchorGestureContext): readonly number[] {
  if (context.editHandles !== undefined) return context.editHandles()
  const { document, target } = context.store.getState()
  const aimed = describeDrawingTarget(document, target)
  return aimed === null ? [] : targetHandles(document, aimed.id)
}

/**
 * Whether the selected anchor is still one of the target's — an undo may have taken it away, or the
 * target changed under the selection.
 * @param context - the store
 * @param index - the selected anchor
 * @returns `true` when the target's rings hold it
 */
function stillTargets(context: AnchorGestureContext, index: number): boolean {
  return editHandlesOf(context).includes(index)
}

/**
 * ‹delete› or ‹backspace› under ⟨edit⟩: remove the selected anchors from every ring holding them — one,
 * or a marquee's dozen (`s03`, *"all twelve are removed in one undo step"*).
 *
 * **A shared anchor is removed without asking** — `s03` wants a confirmation naming both polities, and
 * there is no dialogue for it yet. The result zone names them instead, and one undo puts it back.
 * Never refused (the dev, 2026-10-14): a ring of the target that would fall under three anchors goes
 * whole, a neighbour's keeps its points and is named.
 * @param context - the session and the store
 * @returns `true` when the key was taken — there was a selection to act on
 */
export function deleteSelected(context: AnchorGestureContext): boolean {
  const selected = context.session.selected
  if (selected.length === 0) return false
  const kept = selected.filter((index) => stillTargets(context, index))
  if (kept.length < selected.length) {
    // Told apart from a ring too short: after an undo the message would otherwise blame the ring.
    console.warn(
      `${TAG} ${String(selected.length - kept.length)} selected anchor(s) no longer on the target's outline were left out.`
    )
  }
  if (kept.length === 0) {
    context.session.selected = []
    return true
  }
  const owner = resolvedOwner(context)
  const removal = context.store
    .getState()
    .deleteAnchors(kept, deleteStep(context, kept.length), owner)
  context.session.selected = []
  if (removal === null) {
    // The anchors were checked against the target's outline just above: no ring holding them is a defect.
    console.error(
      `${TAG} the document holds none of the ${String(kept.length)} selected anchor(s).`
    )
    return true
  }
  const said =
    removal.rings === 0
      ? removalReport(context, kept.length, removal.polities)
      : ringRemovalReport(context, removal, kept.length, owner)
  context.report(said + sparedReport(context, removal.spared))
  return true
}

/**
 * What the result zone adds when another polity's outline kept the points it would have lost — it would
 * have fallen under three anchors, and a gesture on the target's points never deletes a neighbour's.
 * @param context - the store, for the names
 * @param spared - the polities whose outline kept its points
 * @returns the clause to append, empty when none did
 */
function sparedReport(context: AnchorGestureContext, spared: readonly string[]): string {
  if (spared.length === 0) return ''
  const names = namesOf(context.store.getState().document, spared).join(', ')
  return context.words.t('keptPoints', { count: spared.length, names })
}

/**
 * How `{History}` and `[↶ Undo]` name a deletion — `s03`'s *"Undo — delete anchor"*, plural for several.
 * @param context - the canvas's words
 * @param count - how many anchors
 * @returns the step
 */
function deleteStep(context: AnchorGestureContext, count: number): { kind: string; label: string } {
  return { kind: DELETE_ANCHOR_KIND, label: context.words.t('stepDeleteAnchors', { count }) }
}

/**
 * The polity whose rings a deletion may take whole — the target, as the selection is its points.
 * @param context - the store
 * @returns its id, or none when nobody is aimed at
 */
function resolvedOwner(context: AnchorGestureContext): string | undefined {
  const { document, target } = context.store.getState()
  return describeDrawingTarget(document, target)?.id
}

/**
 * What deleting whole rings says — *"removed 1 ring (47 anchors)"* — and, when the selection also took
 * points from another polity's outline, whose (review ARCH-002): a neighbour's outline never changes unsaid.
 * @param context - the store, for the names
 * @param removal - what the deletion touched
 * @param anchors - how many anchors the selection held
 * @param owner - the polity whose rings went whole
 * @returns the sentence
 */
function ringRemovalReport(
  context: AnchorGestureContext,
  removal: AnchorRemoval,
  anchors: number,
  owner: string | undefined
): string {
  const { t } = context.words
  const rings = t('removedRings', { rings: removal.rings, anchors })
  const others = removal.polities.filter((polity) => polity !== owner)
  if (others.length === 0) return rings
  const names = namesOf(context.store.getState().document, others).join(', ')
  return rings + t('pointsTakenFrom', { names })
}

/**
 * What the result zone says after a deletion — the polities named when a shared border was touched.
 * @param context - the store
 * @param count - how many anchors went
 * @param polities - the polities that held them
 * @returns the sentence
 */
function removalReport(
  context: AnchorGestureContext,
  count: number,
  polities: readonly string[]
): string {
  // Held by one path, the names are not said: the paths' count chooses, in the catalogue.
  const names = namesOf(context.store.getState().document, polities).join(', ')
  return context.words.t('removedAnchors', { count, paths: polities.length, names })
}
