import { polityAt } from '../geometry/fillHit'
import { nearestAmong } from '../geometry/hitTest'
import { isClosingOffered } from '../geometry/ringClosure'
import { describeDrawingTarget } from '../state/drawingTarget'
import { lonLatToScreen, remapToScreen } from '../view/projection'
import { backdropToScreen } from '../view/viewport'

import { penInsertHit, stretchUnder } from './anchorGestures'
import { anchorHit, anchorSentence, borderRunTo } from './borderSnap'
import { cursorCss, cursorFor } from './cursors'
import { HANDLE_HIT_RADIUS } from './navigation'
import { paintOverlay } from './overlayPainter'
import { projectedTerritories } from './scene'
import { inDevicePixels } from './style'
import {
  followedLayer,
  layerLines,
  lineLabel,
  outlineOnScreen,
  resolvedTarget,
  snapHit,
  snapStretchTo,
} from './toolGestures'
import { actionSentence, overlayScene, ringNeighbours, targetHandles } from './toolSession'

import type { AnchorCache } from './anchorCache'
import type { PaintStyle, Painter2D } from './painter'
import type { GestureContext } from './toolGestures'
import type { SnapLayer, ToolSession } from './toolSession'
import type { PolityColourSource } from '../state/polityColourSource'
import type { CartographerStoreHook } from '../state/store'
import type { VectorLayers } from '../vectorLayers'
import type { BackdropFrame } from '../view/projection'
import type { PixelSize, Point } from '../view/viewport'

/**
 * One live canvas, and everything that reads it without listening to anything.
 *
 * **Out of `controller.ts` on 2026-10-11**, when the tools pushed it past the 400-line budget. The split
 * follows what each half does: the controller owns the **listeners** — it binds them, decides whether a
 * press is the hand's or a tool's, and tears them down; this module **derives** — the cursor, the
 * overlay, the action sentence, the colours — from the state the listeners leave behind. Nothing here
 * adds or removes a listener.
 */

/** Everything the wiring needs from its caller. */
export interface CanvasControllerDeps {
  /** The store: the document to draw, and the viewport to draw it through. */
  store: CartographerStoreHook
  /**
   * The backdrop's coordinate system.
   *
   * It arrives with the picture below, from the DEM's own metadata, so the box projected against and the
   * box painted are the same object rather than two that agree today.
   */
  frame: BackdropFrame
  /** The baked terrain to blit under everything else. */
  backdropImage: CanvasImageSource
  /**
   * The coastline and the rivers, in backdrop pixels.
   *
   * Held here rather than in the store because they never change: they are loaded once and the view is
   * applied at paint time. Putting them in a slice would invite a selector on an object of 125 000
   * points, which is the shape `zustand-react-pattern` warns about.
   */
  vectorLayers: VectorLayers
  /**
   * Where the pointer is, in degrees — `null` when it is off the backdrop.
   *
   * Reported raw rather than formatted: turning a position into `2°21′E` is a presentation choice, and
   * the wiring has no business holding one. `null` for the vellum around the map, which is not a place.
   */
  onHover: (lonLat: [number, number] | null) => void
  /** The colours and sizes, from the design. */
  style: PaintStyle
  /** What to call the editorial zone on screen. */
  zoneLabel: string
  /**
   * The second canvas, stacked over this one, for what moves with the pointer — the outline in progress,
   * the rubber band, an anchor being dragged. Decided for step 4: the static canvas is redrawn when the
   * document or the view changes, this one on every pointer move.
   */
  overlay: HTMLCanvasElement
  /**
   * The status bar's action sentence — *"Drawing in Reaume de France"* — or `null` when no action has a
   * subject. Reported only when it changes; raw like `onHover`, the bar decides how to show it.
   */
  onAction: (sentence: string | null) => void
  /** Where the polities' colours come from — the same source `{Polities}` and the layer read. */
  colours: PolityColourSource
  /**
   * The status bar's result zone — what a gesture did, *"inserted 412 vertices from the coastline"* —
   * or `null` to clear it. Beside the action, never in its place (`s02`, the dev's call of 2026-10-08).
   */
  onResult: (message: string | null) => void
}

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
  /** The overlay canvas and its context. */
  overlay: { node: HTMLCanvasElement; ctx: Painter2D }
  /** What the tools hold between two clicks — never the document's. */
  session: ToolSession
  /** The pointer in device pixels, or `null` when it is off the canvas. */
  pointer: Point | null
  /** The last action sentence reported, so an unchanged one is not reported again. */
  sentence: string | null
  /** Ask for a repaint of the static canvas, at most one per frame. */
  requestPaint: () => void
}

/**
 * Each polity's colour, from the shared source — cached there on the edition's version, so a pan,
 * which repaints on every pointer move, never re-derives them.
 * @param it - the attachment
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
    coast: it.deps.vectorLayers.coast,
    coastProvenance: it.deps.vectorLayers.coastProvenance,
    rivers: it.deps.vectorLayers.rivers,
    riverProvenance: it.deps.vectorLayers.riverProvenance,
    report: (message) => {
      it.deps.onResult(message)
    },
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
 * What the Pen offers under the pointer. **Following a layer, the layer first** — a neighbour's
 * anchors on it are reused by the click, not branched onto — then an existing anchor, whose border is
 * already there.
 * @param it - the attachment
 * @returns the offer, `NO_OFFER` when there is nothing
 */
export function snapOffer(it: LiveCanvas, inserting: boolean = overStretch(it)): SnapOffer {
  if (!penOffered(it) || it.pointer === null) return NO_OFFER
  // Over the target's own stretch the idle Pen inserts, so it offers no snap there (`penInserts`).
  if (inserting) return NO_OFFER
  const gesture = gestureOf(it)
  // Following a layer, the layer first — the same order as the click (`penClick`).
  const layer = followedLayer(gesture)
  if (layer !== null) {
    const offer = lineOffer(it, gesture, layer, it.pointer)
    if (offer.kind !== null) return offer
  }
  const hit = anchorHit(gesture, it.pointer)
  return hit === null ? NO_OFFER : anchorOffer(it, gesture, hit)
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
 * @param layer - the layer the Pen follows
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
 * Whether the Pen offers anything at all: the Pen in hand, someone to draw for, the hand not borrowed
 * with ‹space› (QUAL-104), and the pointer not on the first anchor — there the click closes the ring
 * with a straight segment, so a snap preview would promise what it will not do (QUAL-102).
 * @param it - the attachment
 * @returns `true` when a snap under the pointer may be offered
 */
function penOffered(it: LiveCanvas): boolean {
  const state = it.deps.store.getState()
  if (state.tool !== 'draw' || it.spaceHeld) return false
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
 */
export function showCursor(
  it: LiveCanvas,
  offer: SnapOffer = snapOffer(it),
  inserting: boolean = overStretch(it)
): void {
  const state = it.deps.store.getState()
  const hasTarget = describeDrawingTarget(state.document, state.target) !== null
  const css = cursorCss(
    cursorFor({
      tool: state.tool,
      hasTarget,
      panning: it.dragging && handInHand(it),
      spaceHeld: it.spaceHeld,
      closing: closingOffered(it),
      overHandle: overHandle(it),
      overStretch: inserting,
      snapping: offer.kind === 'layer',
      branching: offer.kind === 'anchor',
      // Only read with nobody aimed at, so only tested then — not on every move (QUAL-001).
      overFill: !hasTarget && overFill(it),
    })
  )
  if (css === it.cursor) return
  it.cursor = css
  it.node.style.cursor = css
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
 * Whether a click here would insert an anchor on one of the target's stretches: the white arrow off
 * any handle, or the Pen with no outline in progress and no anchor to branch onto; nothing held.
 * @param it - the attachment
 * @returns `true` when the click would insert
 */
export function overStretch(it: LiveCanvas): boolean {
  if (it.pointer === null || it.session.grabbed !== null || it.spaceHeld) return false
  const state = it.deps.store.getState()
  const gesture = gestureOf(it)
  // The Pen's plus reads the very rule its click does.
  if (state.tool === 'draw') return penInsertHit(gesture, it.pointer) !== null
  if (state.tool !== 'edit' || overHandle(it)) return false
  const target = describeDrawingTarget(state.document, state.target)
  return target !== null && stretchUnder(gesture, target.id, it.pointer) !== null
}

/**
 * Bring everything the session drives up to date: the overlay, the action sentence, the cursor.
 *
 * Called after any change to the session or the pointer. The overlay is cheap to repaint — a few
 * hundred points at most — which is the reason it is a canvas of its own.
 * @param it - the attachment
 */
export function refreshTools(it: LiveCanvas): void {
  const state = it.deps.store.getState()
  const moving = it.session.moving
  const inserting = overStretch(it)
  const offer = snapOffer(it, inserting)
  const scene = overlayScene({
    session: it.session,
    tool: state.tool,
    pointer: it.pointer,
    toScreen: (lonLat) => lonLatToScreen(lonLat, it.deps.frame, state.viewport),
    anchors: moving === null ? [] : anchorsOnScreen(it),
    movingFrom: moving === null ? [] : ringNeighbours(state.document, moving.index),
    closeRadius: HANDLE_HIT_RADIUS * it.ratio,
    snapTarget: offer.target,
    snapPreview: offer.preview,
  })
  paintOverlay(it.overlay.ctx, it.size, scene, inDevicePixels(it.deps.style, it.ratio))
  const sentence = actionSentence({
    tool: state.tool,
    targetName: resolvedTarget(gestureOf(it))?.name ?? null,
    onCanvas: it.pointer !== null,
    closing: scene.closing,
    snapping: offer.lineLabel,
    joining: offer.anchor === null ? null : anchorSentence(gestureOf(it), offer.anchor),
    following: followedLayer(gestureOf(it)),
    inserting,
    session: it.session,
  })
  if (sentence !== it.sentence) {
    it.sentence = sentence
    it.deps.onAction(sentence)
  }
  showCursor(it, offer, inserting)
}
