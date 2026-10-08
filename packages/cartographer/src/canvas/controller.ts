import { fitScale, fitWhole } from '../view/framing'
import { backdropToLonLat } from '../view/projection'
import { panBy, screenToBackdrop, zoomAbout } from '../view/viewport'

import { createAnchorCache } from './anchorCache'
import { paintCanvas } from './painter'
import { buildScene } from './scene'

import type { AnchorCache } from './anchorCache'
import type { PaintStyle, Painter2D } from './painter'
import type { CartographerStoreHook } from '../state/store'
import type { VectorLayers } from '../vectorLayers'
import type { BackdropFrame } from '../view/projection'
import type { PixelSize, ScaleLimits } from '../view/viewport'

/**
 * What turns an inert `<canvas>` into a working map: this module owns the node for as long as it lives.
 *
 * It sizes it, paints it, and answers the pointer and the keyboard — so it is the one seam between React
 * and everything imperative. {@link startCanvasController} takes the node and returns its `stop`; nothing
 * else in the package touches a canvas element.
 *
 * **It was called `attach.ts` / `attachCanvas` until 2026-10-08, and the dev asked for a clearer name**:
 * "attach" said that something was fastened to something and never what, or by whom. `start`/`stop` names
 * the lifetime, which is the thing a reader needs to know first about a module that holds listeners.
 *
 * **Imperative on purpose, and in a module rather than in the component.** A component that held this
 * would be a component no test could exercise: the wiring is where the real defects live — a listener
 * not removed, a repaint that misses a change, a wheel handler the browser ignores — and all of them are
 * observable under jsdom if the wiring is a function that takes a node and returns its teardown.
 *
 * The component's job is then three lines: a `ref` callback that calls this and returns what it gives
 * back. React 19 allows exactly that — a ref callback may return a cleanup function — so the canvas's
 * life is the node's life, with no dependency array to get wrong.
 *
 * **Each gesture is a named function over an {@link LiveCanvas}, not a closure inside the factory.** The
 * readability budget said so (87 lines against a ceiling of 50) and the split is the one ARCH-012 asks
 * for: what the factory keeps is the wiring, and every decision sits in a function that can be read on
 * its own.
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
}

/**
 * How far the view may be magnified past the backdrop's own resolution.
 *
 * **Thirty-two, raised from eight on 2026-10-08 because the first argument was borrowed and did not
 * apply.** It read: at scale 8 one backdrop pixel covers eight screen pixels, so the ground resolution
 * is 7.6 km / 8 ≈ 0.95 km per screen pixel at 45°N — finer than the 1.9 km cells the political raster
 * works in. True, and beside the point: **the political raster is the atlas's.** This editor stores
 * longitudes and latitudes at six decimals — about ten centimetres — and derives a border from the
 * anchors two outlines *share*, exactly, never from a rasterised cell. Nothing in the format cared
 * about 1.9 km.
 *
 * **What the ceiling is really for**, then: at scale 32 one screen pixel is about **240 m** of ground,
 * which is far below anything the project measures itself against — a city on the wrong side of a
 * frontier, the accuracy criterion of `H-15`, is an error of kilometres. Past that a reader would be
 * placing anchors at a precision no source supports, which is a different kind of wrong.
 *
 * **The blur is expected, not a reason to stop.** `s01` specifies it: *"the backdrop gives out before
 * the grid does"* — the terrain goes soft while the coastline, the rivers and the graticule stay sharp,
 * being vectors. Those are what a frontier is reported against, so the useful picture survives the
 * zoom the baked image does not.
 *
 * **And it costs nothing.** Measured: culling and decimation make a repaint *cheaper* the further in
 * the view goes — 28 % of the coastline's points at scale 8 against 48 % at scale 2.
 */
export const MAX_SCALE = 32

/** Screen pixels left around the backdrop when it is first framed, so its edge is not flush. */
export const FRAME_MARGIN = 24

/** How much one wheel notch scales the view. */
export const WHEEL_STEP = 1.1

/**
 * How far the pointer must travel, in device pixels, before a press counts as a drag.
 *
 * **Decided once, and here, because this is where the drag lives** (`s01`, explicitly: *"Do not decide
 * it a second time here"*). The DOM fires a `click` at the end of every drag with no threshold of its
 * own, so a second module deciding this would disagree about a slightly imprecise click and no test
 * could see the disagreement. Four pixels is the atlas's own tolerance, already proved there.
 */
export const DRAG_TOLERANCE = 4

/** How far one arrow key pans, in device pixels. */
export const KEY_PAN_STEP = 60

/**
 * Keys that pan, and which way.
 *
 * The same four the atlas binds, so the two applications do not disagree about what an arrow does.
 */
const PAN_KEYS: Record<string, [number, number]> = {
  ArrowUp: [0, KEY_PAN_STEP],
  ArrowDown: [0, -KEY_PAN_STEP],
  ArrowLeft: [KEY_PAN_STEP, 0],
  ArrowRight: [-KEY_PAN_STEP, 0],
}

/** Keys that zoom in — the atlas's own set, and what `design/CURSORS.md` specifies. */
const ZOOM_IN_KEYS = new Set(['+', '=', 'PageUp'])

/** Keys that zoom out. */
const ZOOM_OUT_KEYS = new Set(['-', '_', 'PageDown'])

/** One live attachment: the node, its context, the deps, and the little state a gesture needs. */
interface LiveCanvas {
  /** The element being driven. */
  node: HTMLCanvasElement
  /** Its 2D context. */
  ctx: Painter2D
  /** What to draw and how. */
  deps: CanvasControllerDeps
  /** The canvas size in device pixels, refreshed on resize. */
  size: PixelSize
  /** Where the pointer went down, in device pixels; `null` when no button is held. */
  pressAt: [number, number] | null
  /** Whether the press has travelled far enough to be a drag. */
  dragging: boolean
  /** The anchors in backdrop pixels, recomputed only when an anchor moves. */
  anchors: AnchorCache
}

/**
 * The scale range for a given canvas.
 *
 * **The lower bound is computed, not declared**: it is the scale at which the whole backdrop fits, so the
 * reader cannot zoom out until the map is a speck. Declaring a number instead would be wrong at every
 * canvas size, and this one is right at all of them.
 *
 * **It fits with the same margin the first framing uses, and that is not cosmetic.** A first version left
 * the margin out here, which made the minimum *larger* than the scale the editor opened on — so the very
 * first wheel notch, in either direction, snapped the view. Found by a test expecting a zoom out to zoom
 * out. The opening view now sits exactly on the lower bound, which is what "you cannot zoom out past the
 * whole map" should mean.
 * @param canvas - the canvas size, in device pixels
 * @param backdrop - the backdrop's own size
 * @returns the range a zoom may move within
 */
export function scaleLimitsFor(canvas: PixelSize, backdrop: PixelSize): ScaleLimits {
  const whole = fitScale(
    canvas,
    { x: 0, y: 0, width: backdrop.width, height: backdrop.height },
    FRAME_MARGIN
  )
  return { min: whole, max: MAX_SCALE }
}

/**
 * The position of a pointer or wheel event in the canvas's device pixels.
 *
 * `offsetX`/`offsetY` are CSS pixels relative to the element; the viewport works in device pixels, so
 * the ratio is applied here — **once, where the events arrive**, which is the only place it belongs.
 * @param event - the event to read
 * @returns the position in device pixels
 */
function positionOf(event: { offsetX: number; offsetY: number }): [number, number] {
  const ratio = window.devicePixelRatio
  return [event.offsetX * ratio, event.offsetY * ratio]
}

/**
 * Paint the current document through the current view.
 *
 * The selection is empty until the tools arrive at step 4d-2; it is passed explicitly rather than left
 * out so that the day it is real, this line is the only one that changes.
 *
 * **The anchors come from the cache, keyed on the edition's version.** A pan writes the viewport on every
 * pointer move, so without that the Mercator conversion would run per frame over the whole table — the
 * defect ARCH-101, found in review after `projection.ts` and `hitTest.ts` had both promised this cache
 * and nothing had built it.
 * @param it - the attachment to paint
 */
function repaint(it: LiveCanvas): void {
  const state = it.deps.store.getState()
  const scene = buildScene(state.document, {
    anchorsInBackdrop: it.anchors.anchorsInBackdrop(state.document, state.version),
    backdropImage: it.deps.backdropImage,
    vectorLayers: it.deps.vectorLayers,
    frame: it.deps.frame,
    viewport: state.viewport,
    selected: new Set<number>(),
    zoneLabel: it.deps.zoneLabel,
  })
  paintCanvas(it.ctx, it.size, scene, it.deps.style)
}

/**
 * Match the backing store to the element's box, and frame the backdrop the first time it has one.
 *
 * **"First time" is asked of the store, not of this attachment, and that distinction was a real bug.**
 * The condition used to be a `framed` boolean on the `LiveCanvas` — which is rebuilt by every call to
 * `startCanvasController`, and React re-invokes a `ref` callback whenever its *identity* changes, which an inline
 * arrow does on every render of the component. So any unrelated re-render of a parent tore the canvas
 * down, rebuilt it unframed, and snapped the view back to `fitWhole`, silently discarding the reader's
 * pan. Measured, not feared: a test that re-renders with identical props saw `originX` fall from 123 to
 * 96.49. Found by review, twice independently, and it would have surfaced the moment step 5 put tool
 * state above this canvas.
 *
 * `UNFRAMED` is `scale: 0`, so "nobody has chosen a view yet" is a question the shared state can answer
 * and an ephemeral object cannot.
 * @param it - the attachment to resize
 */
function resize(it: LiveCanvas): void {
  const ratio = window.devicePixelRatio
  const width = Math.max(0, Math.round(it.node.clientWidth * ratio))
  const height = Math.max(0, Math.round(it.node.clientHeight * ratio))
  it.size = { width, height }
  it.node.width = width
  it.node.height = height
  const state = it.deps.store.getState()
  if (state.viewport.scale <= 0 && width > 0 && height > 0) {
    state.setViewport(fitWhole(it.size, it.deps.frame.size, FRAME_MARGIN))
    return
  }
  repaint(it)
}

/**
 * Zoom about the pointer.
 *
 * **The listener cannot be passive, and that is why it is wired by hand.** The wheel *is* the zoom, so
 * the handler must `preventDefault` or the page scrolls instead — and a passive listener's
 * `preventDefault` is ignored. React attaches `wheel` passively at its root, so an `onWheel` prop would
 * have looked right and silently scrolled the page.
 * @param it - the attachment
 * @param event - the wheel event
 */
function onWheel(it: LiveCanvas, event: WheelEvent): void {
  event.preventDefault()
  const state = it.deps.store.getState()
  const factor = event.deltaY < 0 ? WHEEL_STEP : 1 / WHEEL_STEP
  state.setViewport(
    zoomAbout(
      state.viewport,
      positionOf(event),
      factor,
      scaleLimitsFor(it.size, it.deps.frame.size)
    )
  )
}

/**
 * Tell the caller what is under the pointer.
 *
 * **Off the backdrop is `null`, not a coordinate.** The vellum around the map is not a place, and a
 * latitude extrapolated past the frame's edge would be arithmetic presented as a fact — the kind of
 * plausible wrong answer `rules/error-handling.md` calls the dangerous shape.
 * @param it - the attachment
 * @param at - the pointer, in device pixels
 */
function report(it: LiveCanvas, at: [number, number]): void {
  const point = screenToBackdrop(it.deps.store.getState().viewport, at)
  const { width, height } = it.deps.frame.size
  const onMap = point[0] >= 0 && point[0] <= width && point[1] >= 0 && point[1] <= height
  it.deps.onHover(onMap ? backdropToLonLat(point, it.deps.frame) : null)
}

/**
 * Begin a press.
 *
 * The pointer is captured so a drag that leaves the canvas keeps panning rather than stopping at the
 * edge — which is what a reader dragging a continent across a window actually does.
 * @param it - the attachment
 * @param event - the pointer event
 */
function onPointerDown(it: LiveCanvas, event: PointerEvent): void {
  it.pressAt = positionOf(event)
  it.dragging = false
  it.node.setPointerCapture(event.pointerId)
}

/**
 * Pan, once the press has travelled far enough to be a drag.
 * @param it - the attachment
 * @param event - the pointer event
 */
function onPointerMove(it: LiveCanvas, event: PointerEvent): void {
  const to = positionOf(event)
  report(it, to)
  const from = it.pressAt
  if (from === null) return
  if (!it.dragging && Math.hypot(to[0] - from[0], to[1] - from[1]) <= DRAG_TOLERANCE) return
  it.dragging = true
  const state = it.deps.store.getState()
  state.setViewport(panBy(state.viewport, to[0] - from[0], to[1] - from[1]))
  it.pressAt = to
}

/**
 * End a press, whether it was a drag or a click.
 * @param it - the attachment
 * @param event - the pointer event
 */
function onPointerUp(it: LiveCanvas, event: PointerEvent): void {
  it.pressAt = null
  it.dragging = false
  if (it.node.hasPointerCapture(event.pointerId)) it.node.releasePointerCapture(event.pointerId)
}

/**
 * Pan and zoom from the keyboard.
 *
 * **WCAG 2.1.1, and it was a real gap rather than a staged one** (found in review, 2026-10-06). The
 * wheel and the drag had no keyboard equivalent and the element had no `tabIndex`, so a keyboard-only
 * reader could neither navigate the map nor even reach it. What made it a defect and not a deferral is
 * that nothing was undecided: `design/CURSORS.md` already specifies *"the wheel about the pointer, the
 * [+]/[−] buttons, or PageUp/PageDown"*, and the atlas already ships and tests the same set of keys.
 *
 * **Bound on the node, never on `window`, and that is the half that matters.** The atlas binds its keys
 * app-wide and guards them with an `isEditableFocused` check — a shape `known-issues.md` warns about for
 * exactly the reason that bites here: step 5 brings real text fields ({Details}, a polity search,
 * {Overrides}), and a window-level arrow listener would eat their keystrokes. Scoped to a focusable
 * canvas, the question never arises.
 *
 * **Zoom from the keyboard holds the canvas's centre**, there being no pointer to hold: the wheel's
 * invariant is *the point under the pointer*, and the nearest honest equivalent is the middle of the
 * view rather than a corner or the last mouse position, which the reader never chose.
 * @param it - the attachment
 * @param event - the key event
 */
function onKeyDown(it: LiveCanvas, event: KeyboardEvent): void {
  const state = it.deps.store.getState()
  const pan = PAN_KEYS[event.key]
  if (pan !== undefined) {
    event.preventDefault()
    state.setViewport(panBy(state.viewport, pan[0], pan[1]))
    return
  }
  const zoomIn = ZOOM_IN_KEYS.has(event.key)
  if (!zoomIn && !ZOOM_OUT_KEYS.has(event.key)) return
  event.preventDefault()
  const centre: [number, number] = [it.size.width / 2, it.size.height / 2]
  const factor = zoomIn ? WHEEL_STEP : 1 / WHEEL_STEP
  state.setViewport(
    zoomAbout(state.viewport, centre, factor, scaleLimitsFor(it.size, it.deps.frame.size))
  )
}

/**
 * Bind every pointer, wheel and key listener, and return the one call that removes them all.
 *
 * **One function so that adding and removing cannot drift apart** — a listener added here and forgotten
 * in the teardown is the defect that shows up as a doubled repaint under `StrictMode` and as nothing at
 * all in production until the editor has been open for an hour. Keeping both halves in one place is the
 * same reasoning `rules/modular-architecture.md` gives for a handle with three methods rather than three
 * things kept in step by hand.
 * @param it - the attachment to bind to
 * @returns the remover
 */
function listen(it: LiveCanvas): () => void {
  const wheel = (event: WheelEvent): void => {
    onWheel(it, event)
  }
  const down = (event: PointerEvent): void => {
    onPointerDown(it, event)
  }
  const move = (event: PointerEvent): void => {
    onPointerMove(it, event)
  }
  const up = (event: PointerEvent): void => {
    onPointerUp(it, event)
  }
  const key = (event: KeyboardEvent): void => {
    onKeyDown(it, event)
  }
  // Not passive: see `onWheel`. React would have attached it passively through an `onWheel` prop.
  it.node.addEventListener('wheel', wheel, { passive: false })
  it.node.addEventListener('pointerdown', down)
  it.node.addEventListener('pointermove', move)
  it.node.addEventListener('pointerup', up)
  it.node.addEventListener('pointercancel', up)
  it.node.addEventListener('keydown', key)
  return (): void => {
    it.node.removeEventListener('wheel', wheel)
    it.node.removeEventListener('pointerdown', down)
    it.node.removeEventListener('pointermove', move)
    it.node.removeEventListener('pointerup', up)
    it.node.removeEventListener('pointercancel', up)
    it.node.removeEventListener('keydown', key)
  }
}

/**
 * Attach the canvas, and return its teardown.
 * @param node - the canvas element to drive
 * @param deps - the store, the frame, the style and the zone's name
 * @returns a function that removes every listener and observer this added
 * @throws when the browser gives no 2D context — not a runtime condition but a browser that cannot run
 *   this application at all. Substituting anything would draw nothing and say nothing.
 */
export function startCanvasController(
  node: HTMLCanvasElement,
  deps: CanvasControllerDeps
): () => void {
  const ctx = node.getContext('2d')
  if (ctx === null)
    throw new Error('Cartographer: the canvas gave no 2D context — there is nothing to draw on.')

  const it: LiveCanvas = {
    node,
    ctx,
    deps,
    size: { width: 0, height: 0 },
    pressAt: null,
    dragging: false,
    anchors: createAnchorCache(deps.frame),
  }

  /**
   * Ask for a repaint, at most one per displayed frame.
   *
   * **Painting straight out of the event was the defect, and it is a structural one.** A trackpad emits
   * 60 to 120 `wheel` events a second and a drag emits a `pointermove` per device sample, so the canvas
   * was repainted far more often than the screen could show — each paint redrawing a 2 560 × 2 328 image
   * and 125 000 points of coastline and rivers, and each one delaying the next. The reader sees that as
   * a zoom that stutters, which is what it is.
   *
   * Coalescing onto `requestAnimationFrame` costs nothing and has no counterpart: the browser calls back
   * once per frame it is actually going to display, and three events arriving between two frames produce
   * one paint of the **latest** state rather than three of stale ones. The store still holds the live
   * viewport, so nothing is dropped — only the redundant drawing is.
   */
  let pending = 0
  const paint = (): void => {
    if (pending !== 0) return
    pending = requestAnimationFrame(() => {
      pending = 0
      repaint(it)
    })
  }
  const unlisten = listen(it)
  const observer = new ResizeObserver(() => {
    resize(it)
  })
  observer.observe(node)

  // `fireImmediately` paints at wiring time rather than at the first change, so an untouched editor is
  // not a blank canvas. One subscription per thing that changes what is drawn: the view, and the
  // edition's version counter — the document being mutated in place, nothing else would fire.
  const stopViewport = deps.store.subscribe((state) => state.viewport, paint, {
    fireImmediately: true,
  })
  const stopEdition = deps.store.subscribe((state) => state.version, paint)

  resize(it)

  return (): void => {
    stopViewport()
    stopEdition()
    observer.disconnect()
    unlisten()
    // A frame already requested would otherwise paint into a torn-down attachment — and under
    // `StrictMode`, which mounts twice, that is not hypothetical.
    if (pending !== 0) cancelAnimationFrame(pending)
  }
}
