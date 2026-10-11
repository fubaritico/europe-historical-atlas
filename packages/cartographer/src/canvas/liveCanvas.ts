import { polityAt } from '../geometry/fillHit'
import { nearestAmong } from '../geometry/hitTest'
import { isClosingOffered } from '../geometry/ringClosure'
import { describeDrawingTarget } from '../state/drawingTarget'
import { lonLatToScreen, remapToScreen } from '../view/projection'
import { backdropToScreen } from '../view/viewport'

import { cursorCss, cursorFor } from './cursors'
import { HANDLE_HIT_RADIUS } from './navigation'
import { paintOverlay } from './overlayPainter'
import { projectedTerritories } from './scene'
import { inDevicePixels } from './style'
import { coastHit, coastStretchTo, outlineOnScreen, resolvedTarget } from './toolGestures'
import { actionSentence, overlayScene, ringNeighbours, targetHandles } from './toolSession'

import type { AnchorCache } from './anchorCache'
import type { PaintStyle, Painter2D } from './painter'
import type { GestureContext } from './toolGestures'
import type { ToolSession } from './toolSession'
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
  /** Where the polities' colours come from — the same source `{Polities}` and the rail read. */
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
    report: (message) => {
      it.deps.onResult(message)
    },
  }
}

/**
 * What the Pen following the coast offers under the pointer: the vertex it would snap onto, and the
 * stretch a click would insert — both on screen, both `null` when there is nothing to offer.
 * @param it - the attachment
 * @returns the snap target and the preview
 */
export function coastOffer(it: LiveCanvas): { target: Point | null; preview: Point[] | null } {
  if (!coastOffered(it) || it.pointer === null) return NO_OFFER
  const gesture = gestureOf(it)
  const hit = coastHit(gesture, it.pointer)
  const vertex =
    hit === null ? undefined : it.deps.vectorLayers.coast[hit.contour]?.points[hit.vertex]
  if (hit === null || vertex === undefined) return NO_OFFER
  const viewport = it.deps.store.getState().viewport
  const toScreen = (point: Point) => backdropToScreen(viewport, point)
  const stretch = coastStretchTo(gesture, hit)
  // A one-point stretch is the vertex already placed: nothing to preview, so the band stays (QUAL-101).
  const preview = stretch === null || stretch.length < 2 ? null : stretch.map(toScreen)
  return { target: toScreen(vertex), preview }
}

/** No coast to offer. */
const NO_OFFER = { target: null, preview: null } as const

/**
 * Whether the coast is on offer at all: the Pen in hand following the coast, someone to draw for, the
 * hand not borrowed with ‹space› (QUAL-104), and the pointer not on the first anchor — there the click
 * closes the ring with a straight segment, so a coast preview would promise what it will not do
 * (QUAL-102).
 * @param it - the attachment
 * @returns `true` when a coast vertex under the pointer may be offered
 */
function coastOffered(it: LiveCanvas): boolean {
  const state = it.deps.store.getState()
  if (state.tool !== 'draw' || state.penMode !== 'coast' || it.spaceHeld) return false
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
 * @param snapping - whether the coast is on offer, when the caller has already worked it out — the
 *   refresh does, once per pointer move; the ‹space› handlers do not, and it is computed for them
 */
export function showCursor(it: LiveCanvas, snapping = coastOffer(it).target !== null): void {
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
      snapping,
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
 * Bring everything the session drives up to date: the overlay, the action sentence, the cursor.
 *
 * Called after any change to the session or the pointer. The overlay is cheap to repaint — a few
 * hundred points at most — which is the reason it is a canvas of its own.
 * @param it - the attachment
 */
export function refreshTools(it: LiveCanvas): void {
  const state = it.deps.store.getState()
  const moving = it.session.moving
  const offer = coastOffer(it)
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
    snapping: offer.target !== null,
    following: state.penMode === 'coast',
    session: it.session,
  })
  if (sentence !== it.sentence) {
    it.sentence = sentence
    it.deps.onAction(sentence)
  }
  showCursor(it, offer.target !== null)
}
