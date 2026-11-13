import { retraceArcs } from '@europe-historical-atlas/core/editor/retrace'

import { nearestAmong } from '../../geometry/hitTest'

import { TAG } from './consoleTag'
import { closeOutline } from './toolGestures'
import { everyHandle, sessionPointOf, targetHandles } from './toolSession'

import type { GestureContext } from './toolGestures'
import type { SessionPoint } from './toolSession'
import type { Point } from '../../viewport/viewport'
import type { YearDocument } from '@europe-historical-atlas/core/data/yearDocument'
import type { RetraceArcs } from '@europe-historical-atlas/core/editor/retrace'

/**
 * ⟨retrace⟩ for a polity with no territory yet (the dev, 2026-11-13: *« creuser le duché dans l'espace non vassalisé du
 * Saint-Empire »* — Upper Lotharingia, refused because it had no anchor to start on): the run starts and ends on any
 * anchor of any outline, and the stretch of that outline between the two closes it — then it closes as the Pen
 * closes, carved out of its suzerain (`closeOutline`).
 */

/**
 * Whether the target has no territory yet: the retrace then takes one, along an outline already drawn.
 * @param document - the document
 * @param polityId - the target
 * @returns `true` when no ring of the target holds an anchor
 */
export function takesTerritory(document: YearDocument, polityId: string): boolean {
  return targetHandles(document, polityId).length === 0
}

/**
 * The anchors a retrace may start or end on: the target's own — or, for a target with no territory yet, any outline's.
 * @param document - the document
 * @param polityId - the target
 * @returns the anchor indices
 */
export function retraceHandles(document: YearDocument, polityId: string): number[] {
  return takesTerritory(document, polityId)
    ? everyHandle(document)
    : targetHandles(document, polityId)
}

/**
 * Whether a click on an outline's anchor ends the run — **only when the run comes back to a border after leaving it**
 * (the dev, 2026-11-13: *« dès que je clique sur une ancre, la prochaine me propose de fermer »* — every anchor ended
 * it, so no border could be followed). The point before the end on an outline that also holds the end means the run is
 * following that border, as the Pen follows it: it goes on.
 * @param document - the document
 * @param previous - the run's point before the end, `undefined` for none
 * @param end - the anchor clicked
 * @returns `true` when the click ends the run
 */
export function returnsToBorder(
  document: YearDocument,
  previous: SessionPoint | undefined,
  end: number
): boolean {
  const anchor = previous?.anchor ?? null
  if (anchor === null) return true
  return !document.claims.some((claim) =>
    claim.rings.some((ring) => ring.includes(anchor) && ring.includes(end))
  )
}

/**
 * Whether a click on an anchor the retrace may end on ends the run: always for a target with its own outline, and for
 * one taking its territory only when the run comes back to a border ({@link returnsToBorder}).
 * @param document - the document
 * @param polityId - the target
 * @param previous - the run's point before the end
 * @param end - the anchor clicked
 * @returns `true` when the click ends the run
 */
export function endsTheRun(
  document: YearDocument,
  polityId: string,
  previous: SessionPoint | undefined,
  end: number
): boolean {
  return !takesTerritory(document, polityId) || returnsToBorder(document, previous, end)
}

/**
 * Whether the pointer is on the run's first point with enough laid to close — it closes as the Pen closes.
 * @param context - the session and the projection
 * @param at - the pointer, in screen pixels
 * @returns `true` when a click here closes the territory
 */
export function onTakeStart(context: GestureContext, at: Point): boolean {
  const outline = context.session.outline
  const start = outline[0]?.anchor ?? null
  if (start === null || outline.length < 3) return false
  return nearestAmong(context.anchorsOnScreen(), [start], at, context.radius) !== null
}

/**
 * The suzerains of a polity, from the nearest — a loop of homage, which the form refuses, stops the walk.
 * @param document - the document
 * @param polityId - the polity
 * @returns their ids
 */
function suzerainsOf(document: YearDocument, polityId: string): string[] {
  const found: string[] = []
  let next = document.polities.find((polity) => polity.id === polityId)?.suzerain ?? null
  while (next !== null && !found.includes(next)) {
    found.push(next)
    const holder = next
    next = document.polities.find((polity) => polity.id === holder)?.suzerain ?? null
  }
  return found
}

/**
 * The outline that joins the run's two ends, for a target that takes its territory: its suzerains' first, from the
 * nearest — the ground a vassal is carved from — then any other.
 * @param document - the document
 * @param targetId - the target
 * @param ends - the run's two ends
 * @param ends.from - the anchor the run starts on
 * @param ends.to - the anchor it ends on
 * @returns both ways along that outline's ring, or `null` when no outline holds both ends
 */
export function borderBetween(
  document: YearDocument,
  targetId: string,
  ends: { from: number; to: number }
): RetraceArcs | null {
  const suzerains = suzerainsOf(document, targetId)
  const others = document.claims
    .map((claim) => claim.polity)
    .filter((id) => !suzerains.includes(id))
  for (const holder of [...suzerains, ...others]) {
    const arcs = retraceArcs(document, holder, ends.from, ends.to)
    if (arcs !== null) return arcs
  }
  return null
}

/**
 * Close the run with the border between its two ends, walked back from the end to the start, as the Pen closes —
 * checked before anything is laid, so a refusal leaves the run as it was.
 * @param context - the session and the store
 * @param side - the border's anchors strictly between the start and the end, from the start
 * @returns `false` when an anchor of the border has no declared source — a defect, said in the console; the caller
 *   takes the click back and says it
 */
export function closeWithBorder(context: GestureContext, side: readonly number[]): boolean {
  const { document } = context.store.getState()
  const back = [...side].reverse().map((anchor) => sessionPointOf(document, anchor))
  if (back.some((point) => point === null)) {
    console.error(
      `${TAG} an anchor of the border has no declared source; the territory was not taken.`
    )
    return false
  }
  context.session.outline.push(...back.filter((point) => point !== null))
  closeOutline(context)
  return true
}

/**
 * What the bar says while a target takes its territory: where to start, that a click on a border's point ends it, and
 * what to click while the run is drawn — the Pen's sentence otherwise.
 * @param context - the session and the words
 * @param name - the target's name
 * @param under - the anchor under the pointer, or `null`
 * @param pointer - the pointer, in screen pixels, or `null` off the canvas
 * @returns the sentence, and the one for the end still to click
 */
export function takeSentences(
  context: GestureContext,
  name: string,
  under: number | null,
  pointer: Point | null
): { sentence: string | null; toEnd?: string } {
  const { t } = context.words
  const outline = context.session.outline
  if (outline.length === 0) {
    return { sentence: t(under === null ? 'takingToStart' : 'takingStartHere', { name }) }
  }
  const toEnd = t('takingToEnd', { name })
  if (pointer !== null && onTakeStart(context, pointer))
    return { sentence: t('takingClose', { name }), toEnd }
  if (under === null) return { sentence: null, toEnd }
  const { document } = context.store.getState()
  const ends = returnsToBorder(document, outline.at(-1), under)
  return { sentence: t(ends ? 'takingEndHere' : 'takingAlongBorder', { name }), toEnd }
}
