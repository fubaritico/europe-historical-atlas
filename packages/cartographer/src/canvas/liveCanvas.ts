import {
  deriveBorders,
  maskDerivationDeps,
} from '@europe-historical-atlas/core/editor/derivedBorders'
import { extentOutline } from '@europe-historical-atlas/core/editor/extent'

import { polityAt } from '../geometry/fillHit'
import { nearestAmong } from '../geometry/hitTest'
import { isClosingOffered } from '../geometry/ringClosure'
import { describeDrawingTarget } from '../state/drawingTarget'
import { isPenTool } from '../state/toolSlice'
import { lonLatToScreen, remapToScreen } from '../viewport/projection'
import { closeEnoughToEdit, snapReachKm } from '../viewport/toolReach'
import { backdropToScreen } from '../viewport/viewport'

import { featureUnder } from './featureUnder'
import { HANDLE_HIT_RADIUS } from './navigation'
import { cursorCss, cursorFor } from './paint/cursors'
import { paintOverlay } from './paint/overlayPainter'
import { projectedTerritories } from './paint/scene'
import { inDevicePixels } from './paint/style'
import { penInsertHit } from './tools/anchorGestures'
import { anchorHit, anchorSentence, borderRunTo, waterTaking } from './tools/borderSnap'
import { frameEdgeUnder } from './tools/frameSnap'
import { followedLayer, layerLines, lineLabel, snapHit } from './tools/layerHits'
import { retraceAnchorUnder, retraceView } from './tools/retrace'
import { snapLayersOf } from './tools/snapLayers'
import {
  outlineOnScreen,
  resolvedTarget,
  selectionMoves,
  snapStretchTo,
} from './tools/toolGestures'
import {
  actionSentence,
  extentHandles,
  isolatedAnchors,
  overlayScene,
  penSnapAnchors,
  ringNeighbours,
  targetHandles,
} from './tools/toolSession'
import { closingStretch } from './tools/waterClosing'
import { weldTargetOnScreen } from './tools/weldGestures'

import type { AnchorCache } from './anchorCache'
import type { CanvasControllerDeps } from './controllerDeps'
import type { Painter2D } from './paint/painter'
import type { RetraceView } from './tools/retrace'
import type { GestureContext } from './tools/toolGestures'
import type { SnapLayer, ToolSession } from './tools/toolSession'
import type { TribeFeatherCache } from './tribeFeatherCache'
import type { PixelSize, Point } from '../viewport/viewport'
import type { DerivedBorder } from '@europe-historical-atlas/core/editor/derivedBorders'

/**
 * One live canvas, and everything that reads it without listening to anything.
 *
 * **Out of `controller.ts` on 2026-10-11**, when the tools pushed it past the 400-line budget. The split
 * follows what each half does: the controller owns the **listeners** — it binds them, decides whether a
 * press is the hand's or a tool's, and tears them down; this module **derives** — the cursor, the
 * overlay, the action sentence, the colours — from the state the listeners leave behind. Nothing here
 * adds or removes a listener.
 */

/** One live attachment: the node, its context, the deps, and the little state a gesture needs. */
export interface LiveCanvas {
  /** The element being driven. */
  node: HTMLCanvasElement
  /** Its 2D context. */
  ctx: Painter2D
  /** What to draw and how. */
  deps: CanvasControllerDeps
  /** Whether ‹space› is held, which borrows the hand under any tool. Not store state: it is a key. */
  spaceHeld: boolean
  /** The last value written to `style.cursor`, so an unchanged one costs no DOM write. */
  cursor: string
  /** Device pixels per screen pixel, as of the last resize — what the style is scaled by. */
  ratio: number
  /** The canvas size in device pixels, refreshed on resize. */
  size: PixelSize
  /** Where the pointer went down, in device pixels; `null` when no button is held. */
  pressAt: [number, number] | null
  /** Whether the press has travelled far enough to be a drag. */
  dragging: boolean
  /** The anchors in backdrop pixels, recomputed only when an anchor moves. */
  anchors: AnchorCache
  /** The tribes' fading colour as images, recomputed only when the document changes (ATLAS-258). */
  tribeFeathers: TribeFeatherCache
  /** The overlay canvas and its context. */
  overlay: { node: HTMLCanvasElement; ctx: Painter2D }
  /** What the tools hold between two clicks — never the document's. */
  session: ToolSession
  /** The pointer in device pixels, or `null` when it is off the canvas. */
  pointer: Point | null
  /** The last action sentence reported, so an unchanged one is not reported again. */
  sentence: string | null
  /**
   * Whether the tools were too far out at the last refresh — `null` before the first. When it flips, the
   * result zone is cleared: a refusal's reason must not outlive the refusal (`s17`).
   */
  wasTooFar: boolean | null
  /** The document's borders, derived once per version — `null` until the first paint asks. */
  borders: { version: number; list: DerivedBorder[] } | null
  /** The aimed polity's extent outline, once per version and target — `null` until the first paint asks. */
  extent: { version: number; target: string; outline: number[][] } | null
  /** What the status bar last said is under the pointer — written again only when it changes. */
  feature: string | null
  /** Whether ‹alt› is held — ⟨retrace⟩'s other side. A key, like ‹space›, never store state. */
  altHeld: boolean
  /** Ask for a repaint of the static canvas, at most one per frame. */
  requestPaint: () => void
}

/**
 * Each polity's colour, from the shared source — cached there on the edition's version, so a pan,
 * which repaints on every pointer move, never re-derives them.
 * @param it - the attachment
 * @param it.deps - the store holding the document and the shared colour source
 * @returns the colour of each polity, by id
 */
export function coloursOf(it: {
  deps: Pick<CanvasControllerDeps, 'store' | 'colours'>
}): ReadonlyMap<string, string> {
  const { document, version } = it.deps.store.getState()
  return it.deps.colours.coloursOf(document, version)
}

/**
 * The anchors in screen pixels, through the cached backdrop projection.
 * @param it - the attachment
 * @returns the anchor table on screen, parallel to the document's
 */
export function anchorsOnScreen(it: LiveCanvas): Point[] {
  const { document, version, viewport } = it.deps.store.getState()
  return remapToScreen(it.anchors.anchorsInBackdrop(document, version), viewport)
}

/**
 * A result zone for one gesture, where what it says is joined rather than replaced.
 *
 * One click can say two things — what it laid, then the Pen's change of mode — and the second must not
 * erase the first: *"followed 32 anchors of a shared border"* was replaced by *"Pen"* in the dev's Chrome
 * (2026-10-13). A gesture context lives one gesture, so the next one starts afresh.
 * @param onResult - the result zone
 * @returns what a gesture reports through
 */
export function joinedReports(
  onResult: (message: string | null) => void
): (message: string) => void {
  const said: string[] = []
  return (message) => {
    said.push(message)
    onResult(said.join(' · '))
  }
}

/**
 * What a tool gesture reads and writes, for this attachment.
 * @param it - the attachment
 * @returns the gesture context
 */
export function gestureOf(it: LiveCanvas): GestureContext {
  return {
    store: it.deps.store,
    frame: it.deps.frame,
    session: it.session,
    anchorsOnScreen: () => anchorsOnScreen(it),
    territoriesOnScreen: () =>
      projectedTerritories(it.deps.store.getState().document, anchorsOnScreen(it)),
    radius: HANDLE_HIT_RADIUS * it.ratio,
    editHandles: () => editHandlesIn(it),
    layers: snapLayersOf(it.deps.vectorLayers),
    report: joinedReports(it.deps.onResult),
    flipSide: it.altHeld,
  }
}

/** What the Pen offers under the pointer: where a click would land, what it would insert, and why. */
export interface SnapOffer {
  /** Where the click would land, on screen — an existing anchor or a layer vertex. */
  target: Point | null
  /** The run a click would insert from the last snapped point, on screen. */
  preview: Point[] | null
  /** What is offered: an existing anchor (a shared border), a layer — the coast or a river — or nothing. */
  kind: 'anchor' | 'layer' | null
  /** The anchor under the pointer, when `kind` is `'anchor'`. */
  anchor: number | null
  /** What the layer line is called — `"coastline"`, `"Maas"` — when `kind` is `'layer'`. */
  lineLabel: string | null
}

/** Nothing on offer. */
const NO_OFFER: SnapOffer = {
  target: null,
  preview: null,
  kind: null,
  anchor: null,
  lineLabel: null,
}

/**
 * What the Pen offers under the pointer. **The layer the click would snap to first** (`nearestLayer`:
 * the coast or the river within reach, the nearer of the two, whatever the mode) — a neighbour's anchors
 * on it are reused by the click, not branched onto — then an existing anchor, whose border is already
 * there.
 * @param it - the attachment
 * @param inserting - whether the idle Pen is over the target's own stretch, where a click inserts an
 *   anchor and nothing is offered; worked out from the pointer when not given
 * @returns the offer, `NO_OFFER` when there is nothing
 */
export function snapOffer(it: LiveCanvas, inserting: boolean = overStretch(it)): SnapOffer {
  const closing = closingOffer(it)
  if (closing !== null) return closing
  if (!penOffered(it) || it.pointer === null) return NO_OFFER
  // Over the target's own stretch the idle Pen inserts, so it offers no snap there (`penInserts`).
  if (inserting) return NO_OFFER
  const gesture = gestureOf(it)
  const retrace = retraceOffer(it, gesture, it.pointer)
  if (retrace !== null) return retrace
  // The layer first — the same order as the click (`penClick`): the nearer water within reach, whatever
  // the mode, previewed so the click that switches is foreseen.
  const layer = waterTaking(gesture, it.pointer)
  const offer = layer === null ? NO_OFFER : lineOffer(it, gesture, layer, it.pointer)
  if (offer.kind !== null) return offer
  const hit = anchorHit(gesture, it.pointer)
  return hit === null ? NO_OFFER : anchorOffer(it, gesture, hit)
}

/**
 * What the closing click offers when it follows the water back to the first point (`closingStretch`):
 * the stretch it will lay, previewed — nothing to snap onto, the first anchor is the target. `null` when
 * the ring would close on a straight segment, which the rubber band already shows.
 * @param it - the attachment
 * @returns the offer, or `null`
 */
function closingOffer(it: LiveCanvas): SnapOffer | null {
  if (it.spaceHeld || !closingOffered(it)) return null
  const stretch = closingStretch(gestureOf(it))
  if (stretch === null) return null
  const viewport = it.deps.store.getState().viewport
  const preview = stretch.map((point) => backdropToScreen(viewport, point))
  return { ...NO_OFFER, preview }
}

/**
 * What ⟨retrace⟩ offers of its own: the start anchor before the first click, and — the run following
 * the water — the stretch of water up to the end anchor under the pointer (`followWaterTo`), what the
 * click will lay. `null` for anything the Pen's own offer answers.
 * @param it - the attachment
 * @param gesture - its gesture context
 * @param pointer - the pointer, in screen pixels
 * @returns the offer, or `null`
 */
function retraceOffer(it: LiveCanvas, gesture: GestureContext, pointer: Point): SnapOffer | null {
  if (it.deps.store.getState().tool !== 'retrace') return null
  // A retrace starts on one of the target's anchors, and nothing else: that is all it offers.
  if (it.session.outline.length === 0) return startOffer(it, gesture, pointer)
  const target = resolvedTarget(gesture)
  const end = target === null ? null : retraceAnchorUnder(gesture, target.id, pointer)
  const snap = it.session.snap
  const at = end === null ? undefined : anchorsOnScreen(it)[end]
  if (snap === null || at === undefined) return null
  const offer = lineOffer(it, gesture, snap.layer, at)
  return offer.kind === null ? null : offer
}

/**
 * ⟨retrace⟩'s first offer: the target's anchor under the pointer, the one a click would start on.
 * @param it - the attachment
 * @param gesture - its gesture context
 * @param pointer - the pointer, in screen pixels
 * @returns the offer, `NO_OFFER` when no anchor of the target is within reach
 */
function startOffer(it: LiveCanvas, gesture: GestureContext, pointer: Point): SnapOffer {
  const target = resolvedTarget(gesture)
  const hit = target === null ? null : retraceAnchorUnder(gesture, target.id, pointer)
  if (hit === null) return NO_OFFER
  const at = anchorsOnScreen(it)[hit] ?? null
  return { target: at, preview: null, kind: 'anchor', anchor: hit, lineLabel: null }
}

/**
 * The offer of an existing anchor, and of the shared border back to the last one joined.
 * @param it - the attachment
 * @param gesture - its gesture context
 * @param hit - the anchor under the pointer
 * @returns the offer
 */
function anchorOffer(it: LiveCanvas, gesture: GestureContext, hit: number): SnapOffer {
  const anchors = anchorsOnScreen(it)
  const run = borderRunTo(gesture, hit)
  const preview =
    run === null || run.length < 2
      ? null
      : run.map((index) => anchors[index]).filter((point) => point !== undefined)
  return { target: anchors[hit] ?? null, preview, kind: 'anchor', anchor: hit, lineLabel: null }
}

/**
 * The offer of a layer vertex, and of the stretch a click would insert.
 * @param it - the attachment
 * @param gesture - its gesture context
 * @param layer - the layer the click would snap to (`nearestLayer`)
 * @param pointer - the pointer, in screen pixels
 * @returns the offer
 */
function lineOffer(
  it: LiveCanvas,
  gesture: GestureContext,
  layer: SnapLayer,
  pointer: Point
): SnapOffer {
  const hit = snapHit(gesture, layer, pointer)
  const vertex =
    hit === null ? undefined : layerLines(gesture, layer)[hit.contour]?.points[hit.vertex]
  if (hit === null || vertex === undefined) return NO_OFFER
  const viewport = it.deps.store.getState().viewport
  const toScreen = (point: Point) => backdropToScreen(viewport, point)
  const stretch = snapStretchTo(gesture, hit)
  // A one-point stretch is the vertex already placed: nothing to preview, so the band stays (QUAL-101).
  const preview = stretch === null || stretch.length < 2 ? null : stretch.map(toScreen)
  const label = lineLabel(gesture, hit)
  return { target: toScreen(vertex), preview, kind: 'layer', anchor: null, lineLabel: label }
}

/**
 * The noun of the layer the Pen follows — what the out-of-reach sentence names — or `null`.
 * @param gesture - the gesture context
 * @returns `"coastline"`, `"river"`, or `null` for the free Pen and the Pencil
 */
function followedNoun(gesture: GestureContext): string | null {
  const layer = followedLayer(gesture)
  return layer === null ? null : gesture.layers[layer].noun
}

/**
 * Whether the Pen offers anything at all: the Pen in hand, someone to draw for, the hand not borrowed
 * with ‹space› (QUAL-104), and the pointer not on the first anchor — there the click closes the ring,
 * so a snap preview would promise what it will not do (QUAL-102); what it does lay is `closingOffer`'s.
 * @param it - the attachment
 * @returns `true` when a snap under the pointer may be offered
 */
function penOffered(it: LiveCanvas): boolean {
  const state = it.deps.store.getState()
  if (!isPenTool(state.tool) || it.spaceHeld) return false
  return resolvedTarget(gestureOf(it)) !== null && !closingOffered(it)
}

/**
 * Whether a press pans the view rather than acting with a tool — the hand, chosen or borrowed.
 * @param it - the attachment
 * @returns `true` under ⟨navigate⟩ or with ‹space› held
 */
export function handInHand(it: LiveCanvas): boolean {
  return it.spaceHeld || it.deps.store.getState().tool === 'navigate'
}

/**
 * Show the cursor the current state calls for.
 *
 * **Written on the node, never on `body`** — that single fact is what makes the pointer a tool cursor
 * over the canvas and the platform's everywhere else, with no enter/leave handling at all.
 *
 * **Only when it changes.** The decision is cheap, the DOM write is not: it is called from the wheel
 * and from the pointer, which arrive faster than frames, and assigning the same string would have the
 * browser re-resolve the image each time.
 *
 * ‹space› is not in the store, deliberately: it is a key being held, not a tool that was chosen, and
 * `s99` keeps the session's keys out of anything an undo can reach.
 * @param it - the attachment
 * @param offer - what the Pen offers under the pointer, when the caller has already worked it out — the
 *   refresh does, once per pointer move; the ‹space› handlers do not, and it is computed for them
 * @param inserting - whether the Pen is over the target's own stretch, so the cursor shows the plus;
 *   worked out from the pointer when not given
 * @param tooFar - whether the view is zoomed too far out for the tools to act; worked out when not given
 */
export function showCursor(
  it: LiveCanvas,
  offer: SnapOffer = snapOffer(it),
  inserting: boolean = overStretch(it),
  tooFar: boolean = tooFarToEdit(it)
): void {
  const state = it.deps.store.getState()
  const hasTarget = describeDrawingTarget(state.document, state.target) !== null
  const css = cursorCss(
    cursorFor({
      tool: state.tool,
      hasTarget,
      tooFar,
      panning: it.dragging && handInHand(it),
      spaceHeld: it.spaceHeld,
      closing: closingOffered(it),
      overHandle: overHandle(it),
      overStretch: inserting,
      snapping: offer.kind === 'layer',
      // Only read when it can change the cursor — nobody aimed at, or too far for anything but choosing
      // a polity — so not tested on every move (QUAL-001).
      overFill: (!hasTarget || tooFar) && overFill(it),
    })
  )
  if (css === it.cursor) return
  it.cursor = css
  it.node.style.cursor = css
}

/**
 * How far the snap reaches on the ground at the centre of this view — the number the tools wait on.
 * @param it - the attachment
 * @returns kilometres; `Infinity` before the view is framed
 */
export function snapReachOf(it: LiveCanvas): number {
  return snapReachKm(
    it.deps.store.getState().viewport,
    it.size,
    it.deps.frame,
    HANDLE_HIT_RADIUS * it.ratio
  )
}

/**
 * Whether the tool in hand is a drawing tool held too far out to act (`H-34`): the Pen and the Pencil
 * place nothing, and the white arrow only chooses a polity by its fill. The hand is never too far.
 * @param it - the attachment
 * @returns `true` when the Pen, the Pencil or the white arrow must wait for a closer view
 */
export function tooFarToEdit(it: LiveCanvas): boolean {
  const tool = it.deps.store.getState().tool
  if (tool === 'navigate') return false
  return !closeEnoughToEdit(snapReachOf(it), it.deps.maxSnapReachKm)
}

/**
 * The document's borders, derived from its shared anchors once per version of the document — a derivation
 * walks every run (~0.3 s on the 137 polities of 1100, measured 2026-10-14), so it never runs per pointer move.
 *
 * **The far side is asked of the land mask, the coast of the anchors' provenance**: a segment between two
 * anchors the Pen took from the coastline is coast, whatever the mask finds across a narrow estuary.
 * @param it - the attachment
 * @returns the borders, each a run of anchors with its relation and hand
 */
export function bordersOf(it: LiveCanvas): DerivedBorder[] {
  const { document, version } = it.deps.store.getState()
  if (it.borders?.version === version) return it.borders.list
  const list = deriveBorders(document, maskDerivationDeps(document, it.deps.landMask))
  it.borders = { version, list }
  return list
}

/**
 * The aimed polity's extent outline (`core/editor/extent`) — its own domain and its vassals' as one
 * contour. Asked once per version and target: a pan repaints per pointer move, and the outline tests both
 * sides of every segment of every member.
 * @param it - the attachment
 * @param target - the aimed polity's id, or `null`
 * @returns runs of anchor indices, empty when nobody is aimed
 */
export function extentOutlineOf(it: LiveCanvas, target: string | null): number[][] {
  if (target === null) return []
  const { document, version } = it.deps.store.getState()
  if (it.extent?.version === version && it.extent.target === target) return it.extent.outline
  const outline = extentOutline(document, target)
  it.extent = { version, target, outline }
  return outline
}

/**
 * The aimed polity's handles under the white arrow: its own anchors and its extent outline's
 * (`extentHandles`), the outline read from the cache.
 * @param it - the attachment
 * @returns anchor indices, ascending
 */
export function editHandlesIn(it: LiveCanvas): number[] {
  const { document, target } = it.deps.store.getState()
  const aimed = describeDrawingTarget(document, target)
  if (aimed === null) return []
  return extentHandles(document, aimed.id, extentOutlineOf(it, aimed.id))
}

/**
 * What is under a point of the canvas: a border, else a polity's fill (`featureUnder`).
 * @param it - the attachment
 * @param at - the point, in device pixels
 * @returns the sentence for the bar, or `null`
 */
export function featureAt(it: LiveCanvas, at: Point): string | null {
  const { document } = it.deps.store.getState()
  const anchors = anchorsOnScreen(it)
  return featureUnder({
    document,
    borders: bordersOf(it),
    anchors,
    territories: projectedTerritories(document, anchors),
    at,
    radius: HANDLE_HIT_RADIUS * it.ratio,
  })
}

/**
 * Say what is under the pointer, when it changed — not at the pointer's rate.
 * @param it - the attachment
 * @param feature - the sentence, or `null`
 */
export function reportFeature(it: LiveCanvas, feature: string | null): void {
  if (feature === it.feature) return
  it.feature = feature
  it.deps.onFeature(feature)
}

/**
 * Publish the white arrow's selection to the store when it changed, so the chrome can act on it — called
 * from `refreshTools`, which every gesture ends with.
 * @param it - the attachment
 */
function publishSelection(it: LiveCanvas): void {
  const published = it.deps.store.getState().selectedAnchors
  const live = it.session.selected
  const same =
    published.length === live.length && published.every((index, at) => index === live[at])
  if (!same) it.deps.store.getState().setSelectedAnchors(live)
}

/**
 * How far apart, in CSS pixels, two anchors of one ring must be for a dot to mark them: half again the
 * snap radius (8). Closer than that the line already shows the vertex and no click can miss one.
 */
const SNAP_DOT_MIN_GAP = 12

/**
 * The neighbours' anchors to show as snap dots: with the Pen in hand, a target, and the view close enough to
 * draw — never otherwise, so the overview stays a picture of the map (`s17`).
 * @param it - the attachment
 * @param target - the resolved target's id, or `null`
 * @returns anchor indices, or none
 */
export function snapAnchorsOf(it: LiveCanvas, target: string | null): number[] {
  const state = it.deps.store.getState()
  const shown = penSnapAnchors(state.document, state.tool, target, tooFarToEdit(it))
  if (shown.length === 0) return shown
  return isolatedAnchors(state.document, shown, anchorsOnScreen(it), SNAP_DOT_MIN_GAP * it.ratio)
}

/**
 * Whether the white arrow is over a polity's fill — where its click chooses that polity.
 * @param it - the attachment
 * @returns `true` over a fill, under ⟨edit⟩
 */
function overFill(it: LiveCanvas): boolean {
  if (it.deps.store.getState().tool !== 'edit' || it.pointer === null) return false
  return polityAt(gestureOf(it).territoriesOnScreen(), it.pointer) !== null
}

/**
 * Whether a Pen click here would close the outline.
 * @param it - the attachment
 * @returns `true` when the pointer is on the outline's first anchor
 */
export function closingOffered(it: LiveCanvas): boolean {
  if (it.pointer === null || it.deps.store.getState().tool !== 'draw') return false
  return isClosingOffered(outlineOnScreen(gestureOf(it)), it.pointer, HANDLE_HIT_RADIUS * it.ratio)
}

/**
 * Whether the white arrow is over one of the target's handles, or holding one.
 * @param it - the attachment
 * @returns `true` when a press here would catch an anchor
 */
export function overHandle(it: LiveCanvas): boolean {
  const state = it.deps.store.getState()
  if (state.tool !== 'edit' || it.pointer === null) return false
  if (it.session.grabbed !== null) return true
  const target = resolvedTarget(gestureOf(it))
  if (target === null) return false
  const handles = targetHandles(state.document, target.id)
  return (
    nearestAmong(anchorsOnScreen(it), handles, it.pointer, HANDLE_HIT_RADIUS * it.ratio) !== null
  )
}

/**
 * Whether a click here would insert an anchor on one of the target's stretches: the Pen with no outline
 * in progress and no anchor to branch onto — the Pen's alone, the white arrow selects (the dev,
 * 2026-10-14); nothing held.
 * @param it - the attachment
 * @returns `true` when the click would insert
 */
export function overStretch(it: LiveCanvas): boolean {
  if (it.pointer === null || it.session.grabbed !== null || it.spaceHeld) return false
  // The Pen's plus reads the very rule its click does.
  if (it.deps.store.getState().tool !== 'draw') return false
  return penInsertHit(gestureOf(it), it.pointer) !== null
}

/**
 * The anchors being dragged and where each would land, on screen — the selection's moves
 * (`selectionMoves`), or none. A move that would take part of the selection off the map shows nothing:
 * its release is refused, and says so.
 * @param it - the attachment
 * @returns the moves, in screen pixels
 */
function movesOnScreen(it: LiveCanvas): { index: number; at: Point }[] {
  const moving = it.session.moving
  if (moving === null) return []
  const viewport = it.deps.store.getState().viewport
  const moves = selectionMoves(gestureOf(it), moving)
  // A refused move previews nothing, deliberately: the release says why (`arrowRelease`), once, and
  // saying it here would log on every pointer move — which the no-silent-refusal rule forbids.
  if (typeof moves === 'string') return []
  return moves.map((move) => ({
    index: move.index,
    at: lonLatToScreen(move.to, it.deps.frame, viewport),
  }))
}

/** ⟨retrace⟩ showing nothing: another tool, nobody aimed at, or too far out to act. */
const NO_RETRACE = { replaced: null, sentence: null } as const

/**
 * What ⟨retrace⟩ shows now — nothing under any other tool, with nobody aimed at, or from too far out:
 * none of those would let a click retrace.
 * @param it - the attachment
 * @param tooFar - whether the view is too far out for the tools
 * @returns the preview and the sentence, both `null` when nothing is shown
 */
function retraceOf(it: LiveCanvas, tooFar: boolean): RetraceView | typeof NO_RETRACE {
  if (it.deps.store.getState().tool !== 'retrace' || tooFar) return NO_RETRACE
  const gesture = gestureOf(it)
  const target = resolvedTarget(gesture)
  return target === null ? NO_RETRACE : retraceView(gesture, target, it.pointer)
}

/**
 * Bring everything the session drives up to date: the overlay, the action sentence, the cursor.
 *
 * Called after any change to the session or the pointer. The overlay is cheap to repaint — a few
 * hundred points at most — which is the reason it is a canvas of its own.
 * @param it - the attachment
 */
export function refreshTools(it: LiveCanvas): void {
  publishSelection(it)
  const state = it.deps.store.getState()
  const moving = it.session.moving
  const inserting = overStretch(it)
  const offer = snapOffer(it, inserting)
  const tooFar = tooFarToEdit(it)
  // A zoom that wakes the tools, or puts them to sleep, ends what the last result described — "too far
  // to draw" beside "Drawing in …" read as a contradiction when it stayed (s17, found walking it). Any
  // result goes, not only a refusal: crossing the threshold changes what the screen is for (QUAL-003).
  if (it.wasTooFar !== null && it.wasTooFar !== tooFar) it.deps.onResult(null)
  it.wasTooFar = tooFar
  const retrace = retraceOf(it, tooFar)
  const toScreen = (lonLat: readonly [number, number]) =>
    lonLatToScreen(lonLat, it.deps.frame, state.viewport)
  const scene = overlayScene({
    session: it.session,
    tool: state.tool,
    pointer: it.pointer,
    toScreen,
    anchors: moving === null ? [] : anchorsOnScreen(it),
    moves: movesOnScreen(it),
    neighboursOf: (index) => ringNeighbours(state.document, index),
    closeRadius: HANDLE_HIT_RADIUS * it.ratio,
    // A weld on offer under the white arrow is emphasised as the Pen's snap is: where it will land.
    snapTarget: offer.target ?? weldTargetOnScreen(it.session.weld, toScreen),
    snapPreview: offer.preview,
    replaced: retrace.replaced,
  })
  paintOverlay(it.overlay.ctx, it.size, scene, inDevicePixels(it.deps.style, it.ratio))
  const sentence = actionSentence({
    tool: state.tool,
    targetName: resolvedTarget(gestureOf(it))?.name ?? null,
    onCanvas: it.pointer !== null,
    closing: scene.closing,
    snapping: offer.lineLabel,
    joining: offer.anchor === null ? null : anchorSentence(gestureOf(it), offer.anchor),
    edge: frameEdgeUnder(gestureOf(it), it.pointer),
    following: followedNoun(gestureOf(it)),
    inserting,
    tooFar,
    session: it.session,
    retracing: retrace.sentence,
  })
  if (sentence !== it.sentence) {
    it.sentence = sentence
    it.deps.onAction(sentence)
  }
  showCursor(it, offer, inserting, tooFar)
}
