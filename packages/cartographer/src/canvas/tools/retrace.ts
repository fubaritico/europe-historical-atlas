import {
  checkRetraceRun,
  isRetraceRefusal,
  retraceArcs,
} from '@europe-historical-atlas/core/editor/retrace'

import { nearestAmong } from '../../geometry/hitTest'
import { smallerSide } from '../../geometry/retraceSide'
import { MIN_RING_ANCHORS } from '../../geometry/ringClosure'
import { backdropToLonLat } from '../../viewport/projection'

import { TAG } from './consoleTag'
import { layerLines, snapHit } from './layerHits'
import { outlineOnScreen, placeClick, resolvedTarget, snapClick } from './toolGestures'
import { clearOutline, sessionPointOf, targetHandles } from './toolSession'

import type { CanvasMessageKey } from '../i18n'
import type { GestureContext } from './toolGestures'
import type { SnapLayer, SnapVertex } from './toolSession'
import type { Point } from '../../viewport/viewport'
import type { OutlinePoint } from '@europe-historical-atlas/core/editor/documentEdits'
import type {
  RetraceArcs,
  RetraceDone,
  RetraceRefusal,
} from '@europe-historical-atlas/core/editor/retrace'
import type { YearDocument } from '@europe-historical-atlas/core/editor/yearDocument'
import type { Translate } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * ⟨retrace⟩ — the correction tool (`H-46`, the dev, 2026-10-14): a first click on one of the target's
 * anchors, the new run drawn exactly as the Pen draws (the coast, a river, a neighbour's border, free
 * points, the Pencil), and a click on another of its anchors, on the same outline, replaces the stretch
 * between them — in one undo step, every ring over that stretch following.
 *
 * **Its own tool, not a mode of the Pen** (the dev: *"ce n'est plus un outil de traçage, mais un outil de
 * retraçage, de correction"*): the Pen's first click on its own anchor starts a new outline, and loading
 * that click with a second meaning would make the Pen ambiguous.
 */

/** The step kind a retrace is recorded under. */
export const RETRACE_KIND = 'retrace'

/** The layers a start anchor may sit on — the coast first, as the Pen's ties go to the shore. */
const START_LAYERS: readonly SnapLayer[] = ['coast', 'river']

/** A polity the tools act on: its id and its name. */
interface Polity {
  /** Its id. */
  id: string
  /** Its name, verbatim, for what the bar says. */
  name: string
}

/**
 * The target's anchor under the pointer that a retrace may start or end on — not one the run already holds.
 * @param context - the document, the session and the projection
 * @param polityId - the target
 * @param at - the pointer, in screen pixels
 * @returns the anchor, or `null`
 */
export function retraceAnchorUnder(
  context: GestureContext,
  polityId: string,
  at: Point
): number | null {
  const held = new Set(context.session.outline.map((point) => point.anchor))
  const handles = targetHandles(context.store.getState().document, polityId).filter(
    (index) => !held.has(index)
  )
  return nearestAmong(context.anchorsOnScreen(), handles, at, context.radius)
}

/**
 * The layer vertex an anchor sits exactly on — so the first click after the start follows the coast or the
 * river from it, as the Pen follows from a vertex it snapped onto. Exact equality, as `anchorsByPosition`
 * reads it: an anchor taken from the coast *is* the coast vertex.
 * @param context - the layers, the frame and the view
 * @param anchor - the start anchor
 * @returns the vertex, or `null` for an anchor placed by eye
 */
function vertexUnder(context: GestureContext, anchor: number): SnapVertex | null {
  const at = context.store.getState().document.anchors[anchor]
  const onScreen = context.anchorsOnScreen()[anchor]
  if (at === undefined || onScreen === undefined) return null
  for (const layer of START_LAYERS) {
    const hit = snapHit(context, layer, onScreen)
    const vertex =
      hit === null ? undefined : layerLines(context, layer)[hit.contour]?.points[hit.vertex]
    if (hit === null || vertex === undefined) continue
    const lonLat = backdropToLonLat(vertex, context.frame)
    if (lonLat[0] === at[0] && lonLat[1] === at[1]) return hit
  }
  return null
}

/**
 * Start a retrace where the press is: it must land on one of the target's anchors, which becomes the run's
 * first point. **The one owner of that rule** (ARCH-001): the first click and a Pencil drag on an empty run
 * both start here, so a run can never begin on anything but an anchor of the outline it corrects — a run
 * begun on a free point could never end.
 * @param context - the session and the store
 * @param polity - the target
 * @param at - the pointer, in screen pixels
 * @returns `true` when the run started, `false` when the press was refused — and said
 */
function startRetrace(context: GestureContext, polity: Polity, at: Point): boolean {
  const anchor = retraceAnchorUnder(context, polity.id, at)
  if (anchor === null) {
    console.warn(`${TAG} nothing retraced: the press is on no anchor of ${polity.name}.`)
    context.report(context.words.t('retraceStartPrompt', { name: polity.name }))
    return false
  }
  const point = sessionPointOf(context.store.getState().document, anchor)
  if (point === null) {
    console.error(
      `${TAG} anchor ${String(anchor)} has no declared source; the retrace did not start.`
    )
    return false
  }
  context.session.outline = [point]
  context.session.snap = vertexUnder(context, anchor)
  return true
}

/**
 * Start a retrace with the Pencil: a drag pressed on an empty run must be pressed on one of the target's
 * anchors, as the first click must (`startRetrace`). Under any other tool, or with a run already in hand,
 * there is nothing to start.
 * @param context - the session and the store
 * @param at - where the press began, in screen pixels
 * @returns `'drawing'` when the Pencil may lay its stroke as usual, `'started'` when the press began the run
 *   on an anchor (its first point is laid), `'refused'` when it began on nothing — and said
 */
export function retracePencilStart(
  context: GestureContext,
  at: Point
): 'drawing' | 'started' | 'refused' {
  if (context.store.getState().tool !== 'retrace' || context.session.outline.length > 0) {
    return 'drawing'
  }
  const polity = resolvedTarget(context)
  // Nobody aimed at: the Pencil's own refusal says so.
  if (polity === null) return 'drawing'
  return startRetrace(context, polity, at) ? 'started' : 'refused'
}

/**
 * A stretch on screen, its two ends included.
 * @param context - the projection
 * @param from - the start anchor
 * @param between - the anchors strictly between, from `from`
 * @param to - the end anchor
 * @returns the stretch as a polyline
 */
function stretchOnScreen(
  context: GestureContext,
  from: number,
  between: readonly number[],
  to: number
): Point[] {
  const anchors = context.anchorsOnScreen()
  return [from, ...between, to]
    .map((index) => anchors[index])
    .filter((point) => point !== undefined)
}

/**
 * The stretch a run replaces: the smaller change (`smallerSide`), or the other with ‹alt› held.
 * @param context - the projection, and whether ‹alt› is held
 * @param arcs - both ways round, from `from` to `to`
 * @param ends - the start and end anchors
 * @param ends.from - the anchor the run starts on
 * @param ends.to - the anchor the run ends on
 * @param run - the new run on screen, from the start anchor to the end anchor
 * @returns the anchors that go, from the start
 */
export function replacedSide(
  context: GestureContext,
  arcs: RetraceArcs,
  ends: { from: number; to: number },
  run: readonly Point[]
): number[] {
  const side = smallerSide(
    run,
    stretchOnScreen(context, ends.from, arcs.forward, ends.to),
    stretchOnScreen(context, ends.from, arcs.backward, ends.to)
  )
  const forward = side === 'forward' ? context.flipSide !== true : context.flipSide === true
  return forward ? arcs.forward : arcs.backward
}

/**
 * Why a retrace was refused, in the words of the gesture — the reason alone, each caller leading it with
 * its own words (*"not retraced: "* after a click, *"cannot end here: "* before one, QUAL-002).
 * @param refusal - what the document answered
 * @param document - for the polities' names
 * @param targetName - the target's name
 * @param t - the canvas's messages
 * @returns the reason
 */
export function refusalReason(
  refusal: RetraceRefusal,
  document: YearDocument,
  targetName: string,
  t: Translate<CanvasMessageKey>
): string {
  switch (refusal.kind) {
    case 'no-ring':
      return t('refusedNoRing', { name: targetName })
    case 'dressed-run':
      return t('refusedDressedRun')
    case 'loop':
      return t('refusedLoop', { holder: nameOf(document, refusal.polity, t) })
    case 'too-short':
      return t('refusedTooShort', {
        holder: nameOf(document, refusal.polity, t),
        min: MIN_RING_ANCHORS,
      })
    case 'not-an-arc':
    case 'bad-anchor':
      return t('refusedDisagree')
  }
}

/**
 * Say, after the click, why a retrace was refused.
 * @param refusal - what the document answered
 * @param document - for the polities' names
 * @param targetName - the target's name
 * @param t - the canvas's messages
 * @returns the sentence, for the result zone
 */
export function refusalMessage(
  refusal: RetraceRefusal,
  document: YearDocument,
  targetName: string,
  t: Translate<CanvasMessageKey>
): string {
  return t('notRetraced', { reason: refusalReason(refusal, document, targetName, t) })
}

/**
 * A ring holder's name: a polity's, verbatim, or "a deliberate gap".
 * @param document - the document
 * @param polity - the polity's id, or `null` for a gap
 * @param t - the canvas's messages, for the gap's words
 * @returns the name
 */
function nameOf(
  document: YearDocument,
  polity: string | null,
  t: Translate<CanvasMessageKey>
): string {
  if (polity === null) return t('deliberateGap')
  // An id the registry lacks is reported by `documentFaults`; here the id itself is the honest name.
  return document.polities.find((each) => each.id === polity)?.name ?? polity
}

/**
 * Say what a retrace did — *"Almoravids: 54 anchors replaced by 31 · Kingdom of Navarre follows"*.
 * @param done - what the document answered
 * @param document - for the neighbours' names
 * @param targetName - the target's name
 * @param t - the canvas's messages
 * @returns the sentence
 */
export function doneMessage(
  done: RetraceDone,
  document: YearDocument,
  targetName: string,
  t: Translate<CanvasMessageKey>
): string {
  return t('retraced', {
    name: targetName,
    removed: done.removed,
    added: done.added,
    consequences: consequences(done, document, t),
  })
}

/**
 * What a retrace does to the others, for the bar and the result zone: the neighbours that follow, and the
 * rings that touch the stretch and keep their points — never left unsaid (`rules/error-handling.md`).
 * @param effect - the neighbours that follow and the holders left untouched
 * @param effect.neighbours - the polities whose rings take the new run too
 * @param effect.untouched - the holders of rings that only touch the stretch
 * @param document - for the names
 * @param t - the canvas's messages
 * @returns the clauses, each led by ` · `, or an empty string
 */
function consequences(
  effect: { neighbours: readonly string[]; untouched: readonly (string | null)[] },
  document: YearDocument,
  t: Translate<CanvasMessageKey>
): string {
  const named = (holders: readonly (string | null)[]) =>
    holders.map((holder) => nameOf(document, holder, t)).join(', ')
  const { neighbours, untouched } = effect
  const follow =
    neighbours.length === 0
      ? ''
      : t('follows', { count: neighbours.length, names: named(neighbours) })
  const keep =
    untouched.length === 0
      ? ''
      : t('keepsPoints', { count: untouched.length, names: named(untouched) })
  return `${follow}${keep}`
}

/**
 * Take back a click that could not end the retrace: the run goes back to what it was before it, so the
 * author can go on from there — and says why, in the result zone and the console.
 * @param context - the session and the report
 * @param before - how many points the run held before the click
 * @param message - why
 */
function refuseEnd(context: GestureContext, before: number, message: string): void {
  context.session.outline.splice(before)
  context.session.snap = null
  console.warn(`${TAG} ${message}.`)
  context.report(message)
}

/**
 * The two ends of the stretch, when the click just landed on another of the target's anchors — `null`
 * while the run is still being drawn: the click landed on a free point, the water, or a neighbour's anchor.
 * @param context - the session and the store
 * @param polity - the target
 * @returns the start and end anchors, or `null`
 */
function endsOfRun(context: GestureContext, polity: Polity): { from: number; to: number } | null {
  const outline = context.session.outline
  const from = outline[0]?.anchor ?? null
  const to = outline.at(-1)?.anchor ?? null
  if (outline.length < 2 || from === null || to === null) return null
  const { document } = context.store.getState()
  return targetHandles(document, polity.id).includes(to) ? { from, to } : null
}

/**
 * After a click: when it landed on another of the target's anchors, replace the stretch.
 * @param context - the session and the store
 * @param polity - the target
 * @param before - how many points the run held before the click
 */
function endRetrace(context: GestureContext, polity: Polity, before: number): void {
  const ends = endsOfRun(context, polity)
  if (ends === null) return
  const { document } = context.store.getState()
  const arcs = retraceArcs(document, polity.id, ends.from, ends.to)
  if (arcs === null) {
    refuseEnd(
      context,
      before,
      refusalMessage({ kind: 'no-ring' }, document, polity.name, context.words.t)
    )
    return
  }
  const replaced = replacedSide(context, arcs, ends, outlineOnScreen(context))
  const points: OutlinePoint[] = context.session.outline.slice(1, -1)
  const step = { kind: RETRACE_KIND, label: context.words.t('stepRetrace', { name: polity.name }) }
  const answer = context.store
    .getState()
    .retraceStretch(polity.id, ends.from, ends.to, replaced, points, step)
  if (!isRetraceRefusal(answer)) {
    clearOutline(context.session)
    context.report(
      doneMessage(answer, context.store.getState().document, polity.name, context.words.t)
    )
    return
  }
  if (answer.kind === 'not-an-arc' || answer.kind === 'bad-anchor') {
    console.error(`${TAG} the document refused a retrace the tool had checked (${answer.kind}).`)
  }
  refuseEnd(context, before, refusalMessage(answer, document, polity.name, context.words.t))
}

/**
 * A click with ⟨retrace⟩: the first one starts on one of the target's anchors; the next ones place points
 * as the Pen does (`placeClick`); the one that lands on another of the target's anchors replaces the
 * stretch.
 *
 * **No closing and no insertion**, the Pen's two other answers to a click: a retrace ends on an anchor of
 * the outline it corrects, never on its own first point, and it never edits the document before its last
 * click.
 * @param context - the session and the store
 * @param at - the pointer, in screen pixels
 */
export function retraceClick(context: GestureContext, at: Point): void {
  const polity = resolvedTarget(context)
  if (polity === null) {
    console.warn(`${TAG} nothing retraced: select a polity to retrace first.`)
    return
  }
  if (context.session.outline.length === 0) {
    startRetrace(context, polity, at)
    return
  }
  const end = retraceAnchorUnder(context, polity.id, at)
  const before = context.session.outline.length
  // Following the water, the end is reached along it (`H-46`: the stretch is replaced by *the water that
  // joins them*); otherwise the click places as the Pen does.
  if (end === null || !followWaterTo(context, end)) placeClick(context, at)
  // The preview promised this anchor (`retraceView` reads the same lookup): keep what the click laid and
  // join it, rather than let the water nearby take the end.
  if (end !== null && context.session.outline.at(-1)?.anchor !== end) joinEnd(context, end)
  endRetrace(context, polity, before)
}

/**
 * Follow the water the run is on up to the end anchor — to the vertex of that line nearest it — when the
 * run's last point was snapped onto the coast or a river. The walk of 2026-10-14 at Formentor: ending on
 * an anchor placed by eye joined it in a straight line, and the cape stayed outside.
 * @param context - the session, the layers and the projection
 * @param end - the target's anchor the click ends on
 * @returns `true` when the water took the click
 */
export function followWaterTo(context: GestureContext, end: number): boolean {
  const snap = context.session.snap
  const at = context.anchorsOnScreen()[end]
  if (snap === null || at === undefined) return false
  return snapClick(context, snap.layer, at)
}

/**
 * Join the end anchor after what the click laid.
 * @param context - the session and the store
 * @param end - the target's anchor under the pointer
 */
function joinEnd(context: GestureContext, end: number): void {
  const point = sessionPointOf(context.store.getState().document, end)
  if (point === null) {
    console.error(`${TAG} anchor ${String(end)} has no declared source; the retrace did not end.`)
    return
  }
  context.session.outline.push(point)
  context.session.snap = null
}

/** What ⟨retrace⟩ shows before the click: the stretch it would replace, and what the bar says. */
export interface RetraceView {
  /** The stretch a click here would replace, on screen, its ends included — `null` when none would be. */
  replaced: Point[] | null
  /**
   * The status bar's action sentence — `null` while the run is drawn and no anchor of the target is under
   * the pointer: then the bar says what the click would lay, as for the Pen (`actionSentence`).
   */
  sentence: string | null
}

/**
 * What ⟨retrace⟩ shows for the pointer where it is — the one rule its preview and its sentence read, so
 * what the bar promises is what the click does.
 * @param context - the session, the store, and whether ‹alt› is held
 * @param polity - the target
 * @param pointer - the pointer, in screen pixels, or `null` off the canvas
 * @returns the stretch it would replace and the sentence
 */
export function retraceView(
  context: GestureContext,
  polity: Polity,
  pointer: Point | null
): RetraceView {
  const outline = context.session.outline
  const under = pointer === null ? null : retraceAnchorUnder(context, polity.id, pointer)
  if (outline.length === 0) {
    return {
      replaced: null,
      sentence: context.words.t(under === null ? 'retracingToStart' : 'retracingStartHere', {
        name: polity.name,
      }),
    }
  }
  const from = outline[0]?.anchor ?? null
  if (from === null || under === null || pointer === null) return { replaced: null, sentence: null }
  return endView(context, polity, { from, to: under }, pointer)
}

/**
 * What ending on the anchor under the pointer would do: the stretch it would replace, or why it would not.
 * @param context - the session, the store, and whether ‹alt› is held
 * @param polity - the target
 * @param ends - the start anchor and the one under the pointer
 * @param ends.from - the anchor the retrace started on
 * @param ends.to - the anchor under the pointer, where it would end
 * @param pointer - the pointer, in screen pixels
 * @returns the preview and the sentence
 */
function endView(
  context: GestureContext,
  polity: Polity,
  ends: { from: number; to: number },
  pointer: Point
): RetraceView {
  const { document } = context.store.getState()
  const arcs = retraceArcs(document, polity.id, ends.from, ends.to)
  if (arcs === null) {
    return {
      replaced: null,
      sentence: context.words.t('retracingOtherOutline', { name: polity.name }),
    }
  }
  const replaced = replacedSide(context, arcs, ends, [...outlineOnScreen(context), pointer])
  const run: OutlinePoint[] = context.session.outline.slice(1)
  const check = checkRetraceRun(document, polity.id, ends.from, ends.to, replaced, run)
  if (isRetraceRefusal(check)) {
    return {
      replaced: null,
      sentence: context.words.t('retracingCannotEnd', {
        name: polity.name,
        reason: refusalReason(check, document, polity.name, context.words.t),
      }),
    }
  }
  return {
    replaced: stretchOnScreen(context, ends.from, replaced, ends.to),
    sentence: context.words.t('retracingReplaces', {
      name: polity.name,
      count: replaced.length,
      consequences: consequences(check, document, context.words.t),
    }),
  }
}
