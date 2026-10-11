import { coastStretch, nearestCoastVertex } from '../geometry/coastSnap'
import { polityAt } from '../geometry/fillHit'
import { nearestAmong } from '../geometry/hitTest'
import { canCloseRing, isClosingOffered } from '../geometry/ringClosure'
import { describeDrawingTarget } from '../state/drawingTarget'
import { FREE_POINT_PROVENANCE } from '../state/editionSlice'
import { backdropToLonLat, lonLatToScreen, screenToLonLatOnBackdrop } from '../view/projection'
import { screenToBackdrop } from '../view/viewport'

import { deleteSelected, insertOnStretch, penInsertHit } from './anchorGestures'
import { anchorClick, anchorsByPosition } from './borderSnap'
import { TAG } from './consoleTag'
import { abandonGesture, dropDrag, layerNoun, sessionPointOf, targetHandles } from './toolSession'

import type { SessionPoint, SnapLayer, SnapVertex, ToolSession } from './toolSession'
import type { CoastContour } from '../geometry/coastSnap'
import type { PolityRings } from '../geometry/fillHit'
import type { CartographerStoreHook } from '../state/store'
import type { BackdropFrame } from '../view/projection'
import type { Point } from '../view/viewport'
import type { Provenance } from '@europe-historical-atlas/core/editor/documentEdits'

/**
 * What the Pen and the white arrow do with a press, a drag, a release and a key.
 *
 * **Out of `controller.ts` so each gesture reads alone**, the split ARCH-012 asks for: the controller
 * keeps the listeners and decides *whether* a gesture is a tool's or the hand's; these decide what the
 * tool's gesture means. They write only to the session they are handed and act on the document only
 * through the store's recorded actions — so every change they make is one undo step or nothing.
 */

/** What a gesture needs to read and where it may write. */
export interface GestureContext {
  /** The store: the document, the view, the tool, the target, and the recorded actions. */
  store: CartographerStoreHook
  /** The backdrop's coordinate system, for turning the pointer into degrees. */
  frame: BackdropFrame
  /** The session, mutated in place by the gestures. */
  session: ToolSession
  /** The document's anchors in screen pixels, parallel to its table — the cached projection. */
  anchorsOnScreen: () => readonly Point[]
  /** Every polity's rings in screen pixels, in painting order — what a click in a fill is tested on. */
  territoriesOnScreen: () => readonly PolityRings[]
  /** How near, in screen pixels, a press must be to catch a handle or the first anchor. */
  radius: number
  /** The traced coastline, in backdrop pixels — what the Pen follows in its coast mode. */
  coast: readonly CoastContour[]
  /** What the coastline was traced from, recorded on every anchor snapped onto it. */
  coastProvenance: Provenance
  /** The river centrelines, in backdrop pixels — what the Pen follows in its river mode. */
  rivers: readonly RiverLine[]
  /** What the rivers were drawn from, recorded on every anchor snapped onto one. */
  riverProvenance: Provenance
  /**
   * Say what a gesture did — *"inserted 412 vertices from the coastline"*, the status bar's result
   * zone beside the action (`s02`).
   */
  report: (message: string) => void
}

/** A river centreline, as the Pen follows it: a line of the layer, and the name the bar reads. */
export interface RiverLine extends CoastContour {
  /** The river's name as the dataset holds it — `Maas`, not *Meuse* (`H-02`) — or `null`. */
  name: string | null
}

/** The step kind a closed outline is recorded under — what tells an undo that it is undoing a closing. */
export const DRAW_OUTLINE_KIND = 'draw-outline'

/** How `{History}` and `[↶ Undo]` name a moved anchor — `s03`'s *"Undo — move anchor"*. */
export const MOVE_ANCHOR_STEP = { kind: 'move-anchor', label: 'move anchor' } as const

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
 */
export function closeOutline(context: GestureContext): void {
  const target = resolvedTarget(context)
  if (target === null) {
    console.warn(`${TAG} the outline was not closed: no polity is selected to close it into.`)
    return
  }
  if (!canCloseRing(outlineOnScreen(context))) {
    console.warn(`${TAG} the outline was not closed: a ring needs at least three anchors.`)
    return
  }
  const step = { kind: DRAW_OUTLINE_KIND, label: `draw outline of ${target.name}` }
  if (context.store.getState().drawOutline(target.id, context.session.outline, step)) {
    context.session.outline = []
    context.session.reopened = null
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
    closeOutline(context)
    return
  }
  // The target's own stretch before the layer: there the idle Pen edits the outline it already has.
  // On its own coast this rarely bites — coast anchors are dense, so an anchor is nearly always the
  // nearer hit, and that one is reused by the layer click.
  if (penInserts(context, at)) return
  // Following a layer, the layer wins: a neighbour drawn along it left an anchor on every vertex, and
  // branching onto those would lose the coast (the dev, Spain then Portugal, 2026-10-11). Those
  // anchors are reused by the layer click, so the border stays shared. Elsewhere an existing anchor
  // wins over a free point: the border is already there.
  const layer = followedLayer(context)
  if (layer !== null && snapClick(context, layer, at)) return
  if (anchorClick(context, at)) return
  if (layer !== null) {
    console.warn(`${TAG} no ${layerNoun(layer)} within reach: a free point was placed.`)
  }
  freeClick(context, at)
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
  return insertOnStretch(context, target.id, at, false)
}

/**
 * Place a free point — reported by eye — where the click is.
 * @param context - the session and the store
 * @param at - the pointer, in screen pixels
 */
function freeClick(context: GestureContext, at: Point): void {
  const point = lonLatAt(context, at)
  if (point === null) {
    console.warn(`${TAG} no anchor placed: the click was off the map.`)
    return
  }
  context.session.outline.push({ at: point, provenance: FREE_POINT_PROVENANCE, anchor: null })
  context.session.snap = null
}

/**
 * The layer the Pen follows in its current mode, or `null` for the free Pen.
 * @param context - the store
 * @returns the layer
 */
export function followedLayer(context: GestureContext): SnapLayer | null {
  const mode = context.store.getState().penMode
  return mode === 'free' ? null : mode
}

/**
 * The lines of a layer, in backdrop pixels.
 * @param context - the coast and the rivers
 * @param layer - which layer
 * @returns its lines
 */
export function layerLines(context: GestureContext, layer: SnapLayer): readonly CoastContour[] {
  return layer === 'coast' ? context.coast : context.rivers
}

/**
 * What the line under a hit is called — `"coastline"`, a river's name verbatim, or *unnamed river*.
 *
 * **The name as the dataset holds it** (`H-02`): `Maas` for the Meuse, `Schelde` for the Scheldt.
 * `s02` writes *"Following the Maas"*, so no alias table stands in front of it.
 * @param context - the rivers
 * @param hit - the vertex
 * @returns the line's label
 */
export function lineLabel(context: GestureContext, hit: SnapVertex): string {
  if (hit.layer === 'coast') return 'coastline'
  return context.rivers[hit.contour]?.name ?? 'unnamed river'
}

/**
 * The layer vertex under the pointer, or `null` when the layer is out of reach.
 *
 * The pointer is brought into the layer's own grid — one point — rather than the 95 233 coast points
 * onto the screen; the radius follows it, divided by the scale.
 * @param context - the snap layers and the view
 * @param layer - which layer
 * @param at - the pointer, in screen pixels
 * @returns the vertex, or `null`
 */
export function snapHit(context: GestureContext, layer: SnapLayer, at: Point): SnapVertex | null {
  const viewport = context.store.getState().viewport
  if (viewport.scale <= 0) return null
  const hit = nearestCoastVertex(
    layerLines(context, layer),
    screenToBackdrop(viewport, at),
    context.radius / viewport.scale
  )
  return hit === null ? null : { ...hit, layer }
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
  if (snap?.layer !== hit.layer || snap.contour !== hit.contour || line === undefined) return null
  if (context.session.outline.length === 0) return null
  return coastStretch(line, snap.vertex, hit.vertex)
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
function snapClick(context: GestureContext, layer: SnapLayer, at: Point): boolean {
  const hit = snapHit(context, layer, at)
  const line = hit === null ? undefined : layerLines(context, layer)[hit.contour]
  if (hit === null || line === undefined) return false
  const stretch = snapStretchTo(context, hit)
  // A second click on the vertex already placed: nothing to insert. Placing it again would put two
  // anchors on one spot (a zero-length edge); placing a free point would defeat the snap (QUAL-101).
  if (stretch !== null && stretch.length < 2) {
    console.warn(
      `${TAG} nothing placed: the outline already ends on that ${layerNoun(layer)} vertex.`
    )
    return true
  }
  const provenance = layer === 'coast' ? context.coastProvenance : context.riverProvenance
  if (stretch === null) placeOnLayer(context, [line.points[hit.vertex]], provenance)
  else {
    const placed = placeOnLayer(context, stretch.slice(1), provenance)
    context.report(
      `inserted ${String(placed)} ${placed === 1 ? 'vertex' : 'vertices'} from the ${lineLabel(context, hit)}`
    )
  }
  context.session.snap = hit
  return true
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
  const existing = anchorsByPosition(context)
  let placed = 0
  for (const point of points) {
    if (point === undefined) continue
    const at = backdropToLonLat(point, context.frame)
    const anchor = existing(at)
    // An anchor a neighbour already has there is joined with its own provenance, never duplicated.
    const reused =
      anchor === null ? null : sessionPointOf(context.store.getState().document, anchor)
    if (anchor !== null && reused === null) {
      console.error(
        `${TAG} anchor ${String(anchor)} has no declared source; a new point was placed on it.`
      )
    }
    context.session.outline.push(reused ?? { at, provenance, anchor: null })
    placed += 1
  }
  return placed
}

/**
 * A press with the white arrow: select the target's handle under the pointer; off any handle, insert
 * an anchor on the target's stretch under it (`s03`); off both, aim at the polity whose fill is under it.
 * @param context - the session and the store
 * @param at - the pointer, in screen pixels
 */
export function arrowPress(context: GestureContext, at: Point): void {
  const target = resolvedTarget(context)
  const candidates =
    target === null ? [] : targetHandles(context.store.getState().document, target.id)
  const hit = nearestAmong(context.anchorsOnScreen(), candidates, at, context.radius)
  context.session.selected = hit
  context.session.grabbed = hit
  if (hit !== null) return
  if (target !== null && insertOnStretch(context, target.id, at)) return
  // Not on a handle: a press in a polity's fill makes it the target, the tool staying the arrow
  // (the dev, 2026-10-11). Over unclaimed ground it deselects, as Illustrator does — his call, the
  // same day, over keeping the target.
  const under = polityAt(context.territoriesOnScreen(), at)
  if (under !== (target?.id ?? null)) context.store.getState().chooseTarget(under)
}

/**
 * A drag with the white arrow: the grabbed anchor follows the pointer, in the session only.
 *
 * **The document is not touched until release** — a drag writes a preview, the release writes one step.
 * Off the backdrop the anchor stays where it last landed rather than following the pointer onto the
 * vellum.
 * @param context - the session and the store
 * @param at - the pointer, in screen pixels
 */
export function arrowDrag(context: GestureContext, at: Point): void {
  const index = context.session.grabbed
  if (index === null) return
  const to = lonLatAt(context, at)
  if (to !== null) context.session.moving = { index, to }
}

/**
 * Release the white arrow: a drag in progress becomes one recorded move.
 * @param context - the session and the store
 */
export function arrowRelease(context: GestureContext): void {
  const moving = context.session.moving
  context.session.moving = null
  context.session.grabbed = null
  if (moving === null) return
  if (!context.store.getState().moveAnchor(moving.index, moving.to, MOVE_ANCHOR_STEP)) {
    console.error(`${TAG} the document refused to move anchor ${String(moving.index)}.`)
  }
}

/**
 * The white arrow's keys: ‹escape› drops the selection, ‹delete› or ‹backspace› removes the anchor.
 * @param context - the session and the store
 * @param key - the key, as `KeyboardEvent.key`
 * @returns whether the key was taken
 */
function editKey(context: GestureContext, key: string): boolean {
  if (key === 'Escape') {
    context.session.selected = null
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
  if (tool !== 'draw' || context.session.outline.length === 0) return false
  if (key === 'Backspace') {
    context.session.outline.pop()
    context.session.snap = null
  } else if (key === 'Escape') {
    context.session.outline = []
    context.session.reopened = null
    context.session.snap = null
  } else if (key === 'Enter') closeOutline(context)
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
 * ‹ctrl+Z›, one step at a time: a drag in progress is dropped, an open outline loses its last anchor,
 * and only then is the last recorded gesture taken back — reopening the outline it closed, if it did.
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
