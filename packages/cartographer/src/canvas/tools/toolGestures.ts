import { polityAt } from '../../geometry/fillHit'
import { nearestAmong } from '../../geometry/hitTest'
import { normaliseRect, pointsInRect } from '../../geometry/marquee'
import { canCloseRing, isClosingOffered } from '../../geometry/ringClosure'
import { describeDrawingTarget } from '../../state/drawingTarget'
import { FREE_POINT_PROVENANCE } from '../../state/editionSlice'
import { isPenTool } from '../../state/toolSlice'
import { lonLatToScreen, screenToLonLatOnBackdrop } from '../../viewport/projection'

import { deleteSelected, editHandlesOf, insertOnStretch, penInsertHit } from './anchorGestures'
import { anchorClick, waterTaking } from './borderSnap'
import { carvedReport } from './carving'
import { TAG } from './consoleTag'
import { freeLonLatAt, repeatsLast } from './frameSnap'
import { followedLayer, layerLines, snapHit, waterOf } from './layerHits'
import { leaveLayer, reachLayer } from './layerSwitch'
import {
  abandonGesture,
  clearOutline,
  dropDrag,
  sessionPointOf,
  takeBackStroke,
} from './toolSession'
import { closingPoints, closingReport, freshStretch, layerPoints } from './waterClosing'
import { releaseWeld, weldOfferAt } from './weldGestures'

import type { AnchorGestureContext } from './anchorGestures'
import type { SessionPoint, SnapLayer, SnapVertex, ToolSession, WeldOffer } from './toolSession'
import type { WaterClosingContext } from './waterClosing'
import type { WeldContext } from './weldGestures'
import type { PolityRings } from '../../geometry/fillHit'
import type { SnapLine } from '../../geometry/lineSnap'
import type { Point } from '../../viewport/viewport'
import type { Carving } from '@europe-historical-atlas/core/editor/carve'
import type { AnchorMove, Provenance } from '@europe-historical-atlas/core/editor/documentEdits'

/**
 * What the Pen and the white arrow do with a press, a drag, a release and a key.
 *
 * **Out of `controller.ts` so each gesture reads alone**, the split ARCH-012 asks for: the controller
 * keeps the listeners and decides *whether* a gesture is a tool's or the hand's; these decide what the
 * tool's gesture means. They write only to the session they are handed and act on the document only
 * through the store's recorded actions — so every change they make is one undo step or nothing.
 */

/**
 * What a gesture needs to read and where it may write: every slice its helpers declare — the anchor
 * gestures' (with the border snap's and the frame snap's under it), the water closing's and the weld's —
 * plus what only this module reads. The helpers declare what they read and never import this type, so the
 * imports run one way, from here down.
 */
export interface GestureContext extends AnchorGestureContext, WaterClosingContext, WeldContext {
  /** Every polity's rings in screen pixels, in painting order — what a click in a fill is tested on. */
  territoriesOnScreen: () => readonly PolityRings[]
  /**
   * Whether ‹alt› is held — under ⟨retrace⟩ it takes the other side of the ring than the one the new run
   * lies closer to (`H-46`). Absent is not held.
   */
  flipSide?: boolean
}

/** The step kind a closed outline is recorded under — what tells an undo that it is undoing a closing. */
export const DRAW_OUTLINE_KIND = 'draw-outline'

/** The step kind moved anchors are recorded under — `s03`'s *"Undo — move anchor"*. */
export const MOVE_ANCHOR_KIND = 'move-anchor'

/**
 * Where the pointer is, in degrees — or `null` off the backdrop.
 *
 * **Off the map a click places nothing**, the same rule as the status bar's: the vellum around the
 * backdrop is not a place, and a latitude extrapolated past its edge would be arithmetic presented as a
 * fact.
 * @param context - the frame and the store's view
 * @param at - the pointer, in screen pixels
 * @returns `[longitude, latitude]`, or `null`
 */
export function lonLatAt(context: GestureContext, at: Point): [number, number] | null {
  return screenToLonLatOnBackdrop(at, context.frame, context.store.getState().viewport)
}

/**
 * The outline in progress, in screen pixels.
 * @param context - the session, the frame and the view
 * @returns one screen point per anchor placed
 */
export function outlineOnScreen(context: GestureContext): Point[] {
  const viewport = context.store.getState().viewport
  return context.session.outline.map((point) => lonLatToScreen(point.at, context.frame, viewport))
}

/**
 * The name of the polity the tools act on, or `null` when nobody is aimed at or the target is gone.
 * @param context - the store
 * @returns the target's name and id, or `null`
 */
export function resolvedTarget(context: GestureContext): { id: string; name: string } | null {
  const state = context.store.getState()
  return describeDrawingTarget(state.document, state.target)
}

/**
 * Close the outline in progress into the target's territory, as one step.
 *
 * The session is emptied only when the document took it: a refused outline stays on screen, so nothing
 * the author placed is lost to a refusal.
 * @param context - the session and the store
 * @param followWater - whether the closing follows the coast back to the first point when both ends lie
 *   on the same line (`closingStretch`) — the closing click does; ‹enter› closes on a straight segment
 *   (`s02`)
 */
export function closeOutline(context: GestureContext, followWater = false): void {
  const target = resolvedTarget(context)
  if (target === null) {
    console.warn(`${TAG} the outline was not closed: no polity is selected to close it into.`)
    return
  }
  if (!canCloseRing(outlineOnScreen(context))) {
    console.warn(`${TAG} the outline was not closed: a ring needs at least three anchors.`)
    return
  }
  const { t } = context.words
  const step = { kind: DRAW_OUTLINE_KIND, label: t('stepDrawOutline', { name: target.name }) }
  // Laid only into what is handed to the document: a refused outline stays on screen as it was.
  const closing = followWater ? closingPoints(context) : []
  const outline = [...context.session.outline, ...closing]
  const carved: string[] = []
  const onCarved = (carving: Carving): void => {
    carved.push(carvedReport(context.store.getState().document.polities, carving, t))
  }
  if (context.store.getState().drawOutline(target.id, outline, step, onCarved)) {
    clearOutline(context.session)
    if (closing.length > 0) context.report(closingReport(closing.length, t))
    for (const message of carved) context.report(message)
    return
  }
  console.error(
    `${TAG} the document refused the outline of "${target.id}" after the tool had checked it.`
  )
}

/**
 * A Pen click: close the ring if the first anchor is offering, otherwise place an anchor.
 *
 * **With no target it does nothing**, and that is the refusal `s02` specifies — the cursor already says
 * `not-allowed` and the status bar says which polity to select first.
 * @param context - the session and the store
 * @param at - the pointer, in screen pixels
 */
export function penClick(context: GestureContext, at: Point): void {
  if (resolvedTarget(context) === null) {
    console.warn(`${TAG} no anchor placed: select a polity to draw in first.`)
    return
  }
  if (isClosingOffered(outlineOnScreen(context), at, context.radius)) {
    closeOutline(context, true)
    return
  }
  // The target's own stretch before the layer: there the idle Pen edits the outline it already has.
  // On its own coast this rarely bites — coast anchors are dense, so an anchor is nearly always the
  // nearer hit, and that one is reused by the layer click.
  if (penInserts(context, at)) return
  placeClick(context, at)
}

/**
 * Place what a Pen click lands on — the water, an existing anchor, or a free point — without closing and
 * without inserting: what the Pen and ⟨retrace⟩ share (`retraceClick`).
 * @param context - the session and the store
 * @param at - the pointer, in screen pixels
 */
export function placeClick(context: GestureContext, at: Point): void {
  // A layer wins over an anchor: a neighbour drawn along it left an anchor on every vertex, and
  // branching onto those would lose the coast (the dev, Spain then Portugal, 2026-10-11). Those
  // anchors are reused by the layer click, so the border stays shared. Whatever the mode, a coast or a
  // river within reach takes the click, and the Pen then follows it (`s02`, the dev, 2026-10-12) —
  // except on an anchor aimed at exactly that the water would not reuse (`waterTaking`).
  const layer = waterTaking(context, at)
  if (layer !== null && snapClick(context, layer, at)) {
    if (followedLayer(context) !== layer) reachLayer(context, layer)
    return
  }
  // Elsewhere an existing anchor wins over a free point: the border is already there.
  if (anchorClick(context, at) || offLayerClick(context, at)) leaveLayer(context)
}

/**
 * Place a free point where the layer the Pen follows did not take the click, and say so.
 * @param context - the session and the store
 * @param at - the pointer, in screen pixels
 * @returns `true` when a point was placed
 */
function offLayerClick(context: GestureContext, at: Point): boolean {
  const layer = followedLayer(context)
  if (layer !== null) {
    console.warn(`${TAG} no ${context.layers[layer].noun} within reach: a free point was placed.`)
  }
  return freeClick(context, at)
}

/**
 * Insert a point where the idle Pen clicks one of the target's stretches (`penInsertHit` decides),
 * as Illustrator's Pen adds a point on the selected path (the dev, 2026-10-11).
 * @param context - the session and the store
 * @param at - the pointer, in screen pixels
 * @returns `true` when the click inserted a point, or was refused and said
 */
export function penInserts(context: GestureContext, at: Point): boolean {
  const target = resolvedTarget(context)
  if (target === null || penInsertHit(context, at) === null) return false
  return insertOnStretch(context, target.id, at)
}

/**
 * Place a free point — reported by eye — where the click is.
 * @param context - the session and the store
 * @param at - the pointer, in screen pixels
 * @returns `true` when a point was placed, `false` off the map
 */
function freeClick(context: GestureContext, at: Point): boolean {
  const point = freeLonLatAt(context, at)
  if (point === null) {
    console.warn(`${TAG} no anchor placed: the click was off the map.`)
    return false
  }
  // A second click in the corner it already ends on: placing it again would be a zero-length edge.
  if (repeatsLast(context.session.outline, point)) return true
  context.session.outline.push({ at: point, provenance: FREE_POINT_PROVENANCE, anchor: null })
  context.session.snap = null
  return true
}

/**
 * The stretch a snapped click would insert: from the last snapped vertex to `hit`, when both lie on the
 * same line of the same layer and the outline still ends there — `null` otherwise, when the click only
 * places `hit`.
 * @param context - the session and the snap layers
 * @param hit - the vertex under the pointer
 * @returns the layer points to insert after the last one placed, in backdrop pixels, or `null`
 */
export function snapStretchTo(context: GestureContext, hit: SnapVertex): Point[] | null {
  const snap = context.session.snap
  const line = layerLines(context, hit.layer)[hit.contour]
  if (snap === null || line === undefined || !continuesLine(context, hit)) return null
  return freshStretch(context, line, snap.vertex, hit.vertex)
}

/**
 * Whether a snapped click lands on the line the outline ends on — where a stretch is run.
 * @param context - the session
 * @param hit - the vertex under the pointer
 * @returns `true` when it does and the outline is under way
 */
function continuesLine(context: GestureContext, hit: SnapVertex): boolean {
  const snap = context.session.snap
  if (snap?.layer !== hit.layer || snap.contour !== hit.contour) return false
  return context.session.outline.length > 0
}

/**
 * A click with the Pen following a layer (`s02`): on the first, an anchor exactly on the line; on the
 * next one along the same line, the whole stretch between them, in one gesture. A closed coast contour
 * is followed the short way round; a river, which never closes, has one way.
 *
 * Off the layer it places nothing — the caller then joins an anchor or places a free point, and says
 * so: `s02`'s *"place points freely"*.
 * @param context - the session, the snap layers and the store
 * @param layer - which layer
 * @param at - the pointer, in screen pixels
 * @returns `true` when the click was taken by the layer
 */
export function snapClick(context: GestureContext, layer: SnapLayer, at: Point): boolean {
  const hit = snapHit(context, layer, at)
  const line = hit === null ? undefined : layerLines(context, layer)[hit.contour]
  if (hit === null || line === undefined) return false
  const stretch = snapStretchTo(context, hit)
  // A second click on the vertex already placed: nothing to insert. Placing it again would put two
  // anchors on one spot (a zero-length edge); placing a free point would defeat the snap (QUAL-101).
  if (stretch !== null && stretch.length < 2) {
    console.warn(
      `${TAG} nothing placed: the outline already ends on that ${context.layers[layer].noun} vertex.`
    )
    return true
  }
  const provenance = context.layers[layer].provenance
  if (stretch === null) placeVertex(context, hit, line)
  else {
    const placed = placeOnLayer(context, stretch.slice(1), provenance)
    context.report(
      context.words.t('insertedFromWater', { count: placed, ...waterOf(context, hit) })
    )
  }
  context.session.snap = hit
  return true
}

/**
 * Place the one layer vertex a snapped click landed on, with no stretch before it — the outline's first
 * point, a click on another line, or a line that runs back over the outline both ways (said). The first
 * point is remembered as where the outline began, for the closing click (`closingStretch`).
 * @param context - the session, the snap layers and the store
 * @param hit - the vertex under the pointer
 * @param line - its line
 */
function placeVertex(context: GestureContext, hit: SnapVertex, line: SnapLine): void {
  const noun = context.layers[hit.layer].noun
  if (continuesLine(context, hit)) {
    console.warn(
      `${TAG} the ${noun} runs back over the outline both ways: only the vertex was placed.`
    )
  }
  const first = context.session.outline.length === 0
  placeOnLayer(context, [line.points[hit.vertex]], context.layers[hit.layer].provenance)
  const point = context.session.outline[0]
  if (first && point !== undefined) context.session.start = { vertex: hit, point }
}

/**
 * Append layer points to the outline, each under the layer's provenance.
 * @param context - the session and the frame
 * @param points - the layer points, in backdrop pixels
 * @param provenance - what the layer was drawn from
 * @returns how many were placed
 */
function placeOnLayer(
  context: GestureContext,
  points: readonly (Point | undefined)[],
  provenance: Provenance
): number {
  const placed = layerPoints(context, points, provenance)
  context.session.outline.push(...placed)
  return placed.length
}

/**
 * A press with the white arrow (`s03`):
 *
 * - **on one of the target's handles**, it takes it — the selection becomes that anchor, unless the
 *   anchor is already selected, so a drag moves the whole selection; with ‹shift› it adds the anchor to
 *   the selection or drops it;
 * - **anywhere else, it decides nothing yet** (the dev, 2026-10-12): released in place it is a click,
 *   dragged it is a marquee — see {@link arrowRelease}. So a marquee may start on the sea without first
 *   deselecting the polity.
 * @param context - the session and the store
 * @param at - the pointer, in screen pixels
 * @param shift - whether ‹shift› is held
 */
export function arrowPress(context: GestureContext, at: Point, shift: boolean): void {
  const candidates = editHandlesOf(context)
  const hit = nearestAmong(context.anchorsOnScreen(), candidates, at, context.radius)
  const session = context.session
  // A press starts clean: nothing a previous press left undecided may steer this one (ARCH-001).
  dropDrag(session)
  if (hit !== null) {
    const held = session.selected.includes(hit)
    if (shift) {
      session.selected = held
        ? session.selected.filter((index) => index !== hit)
        : [...session.selected, hit]
      session.grabbed = held ? null : hit
      return
    }
    if (!held) session.selected = [hit]
    session.grabbed = hit
    return
  }
  session.pending = { at: [at[0], at[1]], shift }
}

/**
 * A drag with the white arrow: the grabbed anchor follows the pointer, in the session only — or, from a
 * press off any handle, the marquee follows it.
 *
 * **The document is not touched until release** — a drag writes a preview, the release writes one step.
 * Off the backdrop the anchor stays where it last landed rather than following the pointer onto the
 * vellum.
 * @param context - the session and the store
 * @param at - the pointer, in screen pixels
 */
export function arrowDrag(context: GestureContext, at: Point): void {
  const session = context.session
  if (session.pending !== null) {
    session.marquee = { from: session.pending.at, to: [at[0], at[1]] }
    return
  }
  const index = session.grabbed
  if (index === null) return
  // An anchor dragged alone snaps onto a neighbour's anchor or border, to weld there (H-37); a selection
  // moves as one shape and does not.
  const alone = session.selected.length <= 1 || !session.selected.includes(index)
  session.weld = alone ? weldOfferAt(context, index, at) : null
  // Alone, it lands on the map's edge or corner when near them (CARTO-257); a selection is moved as a shape,
  // clamped nowhere — clamping its lead would drag the whole shape onto the edge.
  const to = session.weld?.at ?? (alone ? freeLonLatAt(context, at) : lonLatAt(context, at))
  if (to !== null) session.moving = { index, to }
}

/**
 * Release a dragged anchor onto the weld it was offered. Welded onto an anchor, the dragged one is held by
 * nothing any more: the selection follows it onto the anchor that stays, or a ‹delete› next would act on a
 * point that has gone (QUAL-003). Refused, the selection is left as it was.
 * @param context - the session and the store
 * @param index - the anchor dragged
 * @param weld - what it was offered
 */
function finishWeld(context: GestureContext, index: number, weld: WeldOffer): void {
  if (!releaseWeld(context, index, weld) || weld.kind !== 'anchor') return
  const session = context.session
  session.selected = session.selected.map((at) => (at === index ? weld.into : at))
}

/**
 * Release the white arrow: a drag in progress becomes one recorded move; a marquee selects what it
 * covers; a press that never moved is a click (see {@link arrowClick}).
 * @param context - the session and the store
 * @param at - where the button came up, in screen pixels
 */
export function arrowRelease(context: GestureContext, at: Point): void {
  const session = context.session
  const { pending, marquee, moving, weld } = session
  session.pending = null
  session.marquee = null
  session.moving = null
  session.grabbed = null
  session.weld = null
  if (marquee !== null) marqueeSelect(context, marquee, pending?.shift ?? false)
  else if (pending !== null) arrowClick(context, at, pending.shift)
  if (moving === null) return
  if (weld !== null) {
    finishWeld(context, moving.index, weld)
    return
  }
  const moves = selectionMoves(context, moving)
  if (moves === 'off-map') {
    console.warn(`${TAG} nothing moved: part of the selection would have left the map.`)
    return
  }
  if (moves === 'missing') {
    console.error(`${TAG} nothing moved: a selected anchor is no longer in the view's table.`)
    return
  }
  if (!context.store.getState().moveAnchors(moves, moveStep(context, moves.length))) {
    console.error(`${TAG} the document refused to move ${String(moves.length)} anchor(s).`)
  }
}

/**
 * How `{History}` and `[↶ Undo]` name a move — `s03`'s *"Undo — move anchor"*, plural for several.
 * @param context - the canvas's words
 * @param count - how many anchors moved
 * @returns the step
 */
function moveStep(context: GestureContext, count: number): { kind: string; label: string } {
  return { kind: MOVE_ANCHOR_KIND, label: context.words.t('stepMoveAnchors', { count }) }
}

/**
 * Where every anchor of the selection lands when the one grabbed goes to `lead.to` — `s03`'s *"all
 * twelve move together, keeping their relative positions"*. Each moves by the grabbed anchor's offset
 * **on screen**, so the shape the author sees is the shape that lands. The grabbed anchor alone when it
 * is not part of the selection.
 * @param context - the session, the view and the frame
 * @param lead - the grabbed anchor and where it goes, in degrees
 * @param lead.index - the grabbed anchor's index
 * @param lead.to - where the grabbed anchor goes, longitude and latitude in degrees
 * @returns each anchor and where it goes; `'off-map'` when one would leave the map, `'missing'` when an
 *   anchor of the selection is not in the table — in both cases nothing moves
 */
export function selectionMoves(
  context: GestureContext,
  lead: { index: number; to: [number, number] }
): AnchorMove[] | 'off-map' | 'missing' {
  const anchors = context.anchorsOnScreen()
  const from = anchors[lead.index]
  if (from === undefined) return 'missing'
  const to = lonLatToScreen(lead.to, context.frame, context.store.getState().viewport)
  const selected = context.session.selected
  const indices = selected.includes(lead.index) ? selected : [lead.index]
  const moves: AnchorMove[] = []
  for (const index of indices) {
    if (index === lead.index) {
      moves.push({ index, to: lead.to })
      continue
    }
    const point = anchors[index]
    if (point === undefined) return 'missing'
    const landed = lonLatAt(context, [point[0] + to[0] - from[0], point[1] + to[1] - from[1]])
    if (landed === null) return 'off-map'
    moves.push({ index, to: landed })
  }
  return moves
}

/**
 * A click of the white arrow off any handle and stretch: a click in a polity's fill makes it the
 * target, the tool staying the arrow (the dev, 2026-10-11); over unclaimed ground it deselects, as
 * Illustrator does — and the anchors selected are dropped.
 *
 * **With ‹shift› it does nothing**: ‹shift› adds to a selection, and a click that changed the target
 * would empty it instead (review QUAL-010).
 * @param context - the session and the store
 * @param at - where the click was, in screen pixels
 * @param shift - whether ‹shift› was held
 */
function arrowClick(context: GestureContext, at: Point, shift: boolean): void {
  if (shift) return
  context.session.selected = []
  const target = resolvedTarget(context)
  const under = polityAt(context.territoriesOnScreen(), at)
  if (under !== (target?.id ?? null)) context.store.getState().chooseTarget(under)
}

/**
 * Select the target's handles a marquee covers — `s03`'s *"anchors merely crossed by the rectangle's
 * edge count as inside it"*. With ‹shift› they are added to the selection, otherwise they replace it.
 * With nobody aimed at there is no handle to catch, and it says so.
 * @param context - the session and the store
 * @param marquee - the rectangle's two corners, in screen pixels
 * @param marquee.from - the corner where the drag began
 * @param marquee.to - the corner under the pointer
 * @param shift - whether ‹shift› was held at the press
 */
function marqueeSelect(
  context: GestureContext,
  marquee: { from: Point; to: Point },
  shift: boolean
): void {
  const target = resolvedTarget(context)
  if (target === null) {
    console.warn(
      `${TAG} the marquee selected nothing: select a polity first, its points are what it catches.`
    )
    return
  }
  const handles = new Set(editHandlesOf(context))
  const caught = pointsInRect(
    context.anchorsOnScreen(),
    normaliseRect(marquee.from, marquee.to)
  ).filter((index) => handles.has(index))
  const kept = shift ? context.session.selected : []
  context.session.selected = [...kept, ...caught.filter((index) => !kept.includes(index))]
}

/**
 * The white arrow's keys: ‹escape› drops the selection, ‹delete› or ‹backspace› removes the anchor.
 * @param context - the session and the store
 * @param key - the key, as `KeyboardEvent.key`
 * @returns whether the key was taken
 */
function editKey(context: GestureContext, key: string): boolean {
  if (key === 'Escape') {
    // A marquee or a move in progress goes first; the selection on the next press of ‹escape›.
    const session = context.session
    const drawing = session.marquee !== null || session.moving !== null
    dropDrag(session)
    if (!drawing) session.selected = []
    return true
  }
  return key === 'Delete' || key === 'Backspace' ? deleteSelected(context) : false
}

/**
 * The Pen's keys: ‹backspace› takes back the last anchor, ‹escape› abandons the outline, ‹enter› closes it.
 *
 * Under ⟨edit⟩, ‹escape› drops the selection, and ‹delete› or ‹backspace› removes the selected anchor —
 * the same thing, as in Illustrator (`s03`).
 * @param context - the session and the store
 * @param key - the key, as `KeyboardEvent.key`
 * @returns whether the key was the tools', so the caller can stop it
 */
export function toolKey(context: GestureContext, key: string): boolean {
  const tool = context.store.getState().tool
  if (tool === 'edit') return editKey(context, key)
  if (!isPenTool(tool) || context.session.outline.length === 0) return false
  if (key === 'Backspace') {
    context.session.outline.pop()
    context.session.snap = null
  } else if (key === 'Escape') clearOutline(context.session)
  // A retrace ends on an anchor of the outline it corrects, never by closing its own run.
  else if (key === 'Enter' && tool === 'draw') closeOutline(context)
  else return false
  return true
}

/**
 * The rings a polity holds, as lists of anchor indices.
 * @param context - the store
 * @param polityId - whose rings
 * @returns its rings, in the order they were closed
 */
function ringsOf(context: GestureContext, polityId: string): number[][] {
  const claim = context.store.getState().document.claims.find((held) => held.polity === polityId)
  // No claim is a polity with no territory — the normal starting state (`s02`), not a failed lookup.
  return claim?.rings ?? []
}

/**
 * A ring's points, read off the document as it stands, each with the provenance it was recorded under.
 *
 * An anchor whose source the document does not declare is reported and left out — `documentFaults`
 * names the same fault once per version; here it would silently put a point back with a made-up
 * provenance, which is the substitution `rules/error-handling.md` refuses.
 * @param context - the store
 * @param ring - the anchor indices
 * @returns each anchor and its provenance, copied
 */
function pointsOf(context: GestureContext, ring: readonly number[]): SessionPoint[] {
  const { document } = context.store.getState()
  return ring.flatMap((index) => {
    const point = sessionPointOf(document, index)
    if (point === null) {
      console.error(`${TAG} anchor ${String(index)} has no declared source; it was not put back.`)
      return []
    }
    return [point]
  })
}

/**
 * Undo the last step; if it was the closing of the outline the Pen is drawing, put its points back in
 * hand — the dev's call, 2026-10-11: *"que ça enlève juste la fermeture de la zone"*, as Illustrator does.
 *
 * **The document's history is untouched by this**: a ring still enters the document closed, in one step,
 * so a saved file never holds an open outline. Only the session is given the points back.
 *
 * It reopens only when the step undone took a ring away from the polity the Pen is drawing for. Undoing
 * a closing under another tool, or for another polity, takes the ring back without handing anything —
 * and says so (`rules/error-handling.md`, no refusal is silent).
 * @param context - the session and the store
 */
function undoAndReopen(context: GestureContext): void {
  const state = context.store.getState()
  if (state.rows.find((row) => row.current)?.kind !== DRAW_OUTLINE_KIND) {
    state.undo()
    return
  }
  // Read before the undo, which takes the ring away — and only for a closing, so undoing anything else
  // never reads, nor reports on, a ring it does not touch (QUAL-112).
  const target = state.tool === 'draw' ? resolvedTarget(context) : null
  const before = target === null ? [] : ringsOf(context, target.id)
  const last = before.at(-1)
  const points = last === undefined ? [] : pointsOf(context, last)
  state.undo()
  const after = target === null ? before.length : ringsOf(context, target.id).length
  if (after === before.length - 1 && points.length > 0) {
    // An anchor the ring reused — a neighbour's — is still in the document after the undo, at the
    // same index (the table only grows): it stays reused, so closing again shares it again. One the
    // ring itself created is gone with the undo, and comes back as a new point.
    const kept = context.store.getState().document.anchors.length
    context.session.outline = points.map((point) =>
      point.anchor !== null && point.anchor < kept ? point : { ...point, anchor: null }
    )
    context.session.reopened = points.map((point) => ({ ...point, at: [point.at[0], point.at[1]] }))
    return
  }
  console.warn(
    `${TAG} the closing was undone; no outline was put back, the Pen is not drawing for it.`
  )
}

/**
 * ‹ctrl+Z›, one step at a time: a drag in progress is dropped, an open outline loses its last Pencil
 * stroke or its last anchor, and only then is the last recorded gesture taken back — reopening the
 * outline it closed, if it did.
 *
 * **The gesture in progress first** (`H-10` applied to the session, and ARCH-001 / QUAL-001): an
 * anchor still under the button is not in the line, so rewinding the document under it would have the
 * release write onto the rewound document.
 *
 * At the origin there is nothing to take back, which is ordinary — and said, once per press: a held key
 * repeats, and the history is walked on repeat (as in Illustrator) but the warning is not.
 * @param context - the session and the store
 * @param repeat - whether this is the key's auto-repeat rather than a press
 */
export function undoGesture(context: GestureContext, repeat: boolean): void {
  if (dropDrag(context.session)) return
  // A Pencil drag goes back whole, as in Illustrator; otherwise one point at a time.
  if (takeBackStroke(context.session)) return
  if (context.session.outline.length > 0) {
    context.session.outline.pop()
    context.session.snap = null
    return
  }
  if (!context.store.getState().canUndo) {
    if (!repeat) console.warn(`${TAG} nothing to undo.`)
    return
  }
  undoAndReopen(context)
}

/**
 * Whether the outline in hand is exactly what an undo reopened — the case where a redo closes it again.
 * @param session - the session
 * @returns `true` when the author has not changed the reopened outline
 */
function stillReopened(session: ToolSession): boolean {
  const reopened = session.reopened
  if (reopened?.length !== session.outline.length) return false
  return reopened.every((point, index) => {
    const held = session.outline[index]
    return held === undefined ? false : held.at[0] === point.at[0] && held.at[1] === point.at[1]
  })
}

/**
 * ‹ctrl+shift+Z›: apply an undone gesture again.
 *
 * After an undo reopened an outline and the author left it as it was, the redo closes it again and
 * empties the hand — otherwise the ring would come back with its points still in hand over it. Any
 * other gesture in progress is dropped first, and the redo waits for the next press. Nothing to redo is
 * ordinary — and said, once per press.
 * @param context - the session and the store
 * @param repeat - whether this is the key's auto-repeat rather than a press
 */
export function redoGesture(context: GestureContext, repeat: boolean): void {
  const reclose = context.session.outline.length > 0 && stillReopened(context.session)
  if (abandonGesture(context.session) && !reclose) {
    console.warn(`${TAG} the gesture in progress was dropped; redo again to apply the undone step.`)
    return
  }
  const state = context.store.getState()
  if (!state.canRedo) {
    if (!repeat) console.warn(`${TAG} nothing to redo.`)
    return
  }
  state.redo()
}
