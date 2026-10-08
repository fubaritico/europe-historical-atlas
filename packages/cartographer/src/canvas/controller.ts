import { describeDrawingTarget } from '../state/drawingTarget'
import { backdropBoxOfBounds, clampToCover, coverScale, openingView } from '../view/framing'
import { backdropToLonLat } from '../view/projection'
import { panBy, screenToBackdrop, zoomAbout } from '../view/viewport'

import { createAnchorCache } from './anchorCache'
import { cursorCss, cursorFor } from './cursors'
import { paintCanvas } from './painter'
import { buildScene } from './scene'
import { inDevicePixels } from './style'

import type { AnchorCache } from './anchorCache'
import type { PaintStyle, Painter2D } from './painter'
import type { CartographerStoreHook } from '../state/store'
import type { EditorTool } from '../state/toolSlice'
import type { VectorLayers } from '../vectorLayers'
import type { BackdropFrame } from '../view/projection'
import type { PixelSize, ScaleLimits, Viewport } from '../view/viewport'

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

/** How much one press of a zoom key scales the view. A key is one discrete step, so it stays a factor. */
export const KEY_ZOOM_STEP = 1.1

/**
 * How many device pixels of wheel travel double the scale — the wheel's zoom, in one number.
 *
 * **The wheel is not a key, and treating it as one is what made the zoom unusable.** Until 2026-10-09 a
 * wheel event multiplied the scale by a fixed 1.1 and `deltaY`'s magnitude was thrown away. A mouse
 * notch produces one event; a trackpad swipe produces sixty to a hundred and twenty a second. So the
 * same gesture was 1.1 on a mouse and 1.1³⁰ ≈ 17× on a trackpad, which is the "trop sensible" the dev
 * reported and is not a value that could have been tuned — the two devices needed different arithmetic,
 * not a different constant.
 *
 * Scaling **exponentially in the distance travelled** makes it one device again: `exp(−Δ · k)` composes,
 * so sixty small events and one large one of the same total travel land on exactly the same scale.
 *
 * Calibrated so a 100-pixel delta — one notch of a conventional mouse wheel — still gives the 1.1 it
 * always gave, which is the one thing about the old behaviour that was right.
 */
export const ZOOM_PER_PIXEL = Math.log(1.1) / 100

/**
 * Device pixels of travel per unit of `deltaMode`, since a wheel does not report in one unit.
 *
 * `deltaMode` is 0 for pixels, 1 for lines and 2 for pages, and a mouse reporting lines is ordinary
 * rather than exotic — Firefox on Windows does it. Reading a line as a pixel would make that mouse
 * sixteen times gentler than the same mouse in another browser, which reads as "the zoom is broken
 * here" and is in fact a unit never converted.
 */
const DELTA_UNIT: Record<number, number> = { 0: 1, 1: 16, 2: 400 }

/**
 * What one wheel event should multiply the scale by.
 *
 * Exported so a test can read it with a literal event rather than through the DOM, and so the two
 * normalisations — the unit, and the exponential — are visible in one place.
 * @param deltaY - the event's own travel, in its own unit
 * @param deltaMode - 0 pixels, 1 lines, 2 pages
 * @returns the factor to apply to the scale
 */
export function wheelZoomFactor(deltaY: number, deltaMode: number): number {
  const pixels = deltaY * (DELTA_UNIT[deltaMode] ?? 1)
  return Math.exp(-pixels * ZOOM_PER_PIXEL)
}

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

/**
 * The two tools, on the keys Illustrator uses — `s00`, settled 2026-09-22 from the dev's own reading.
 *
 * Lower-cased before the lookup, so ‹shift+P› still reaches the Pen: a capital is the same key.
 * ⟨navigate⟩ is deliberately absent — it is reached by *holding* ‹space›, which is a borrow rather than
 * a choice, and by its button in the rail at step 5.
 */
const TOOL_KEYS: Record<string, EditorTool> = { p: 'draw', a: 'edit' }

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
  return {
    min: coverScale(canvas, { x: 0, y: 0, width: backdrop.width, height: backdrop.height }),
    max: MAX_SCALE,
  }
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
  paintCanvas(it.ctx, it.size, scene, inDevicePixels(it.deps.style, it.ratio))
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
 * **This is the one paint that is NOT coalesced onto a frame, and the flicker is why.** Assigning
 * `node.width` **clears the canvas immediately** — that is what the HTML spec says a size assignment
 * does — while the subscription's paint waits for the next `requestAnimationFrame`. So every resize
 * event showed one blank frame, which during a window drag is a continuous flicker. Coalescing is right
 * for the wheel, where 120 events arrive per second and nothing is destroyed between them; it is wrong
 * here, where the clear has already happened. Reported by the dev on 2026-10-09, and visible on screen
 * rather than deduced.
 * @param it - the attachment to resize
 */
function resize(it: LiveCanvas): void {
  const ratio = window.devicePixelRatio
  const width = Math.max(0, Math.round(it.node.clientWidth * ratio))
  const height = Math.max(0, Math.round(it.node.clientHeight * ratio))
  // Read at every resize and never cached at mount: a window dragged to a second screen changes it.
  it.ratio = ratio
  it.size = { width, height }
  it.node.width = width
  it.node.height = height
  const state = it.deps.store.getState()
  if (width <= 0 || height <= 0) {
    repaint(it)
    return
  }
  if (state.viewport.scale <= 0) {
    // The opening view frames the EDITORIAL ZONE, not the backdrop: a third of the backdrop lies east
    // of 60°E, where the author may not draw. Read off the document, which is the only thing that
    // declares the zone.
    state.setViewport(
      openingView(
        it.size,
        it.deps.frame.size,
        backdropBoxOfBounds(state.document.editorialZone, it.deps.frame),
        FRAME_MARGIN
      )
    )
    repaint(it)
    return
  }
  // A view already chosen still has to be re-held: growing the window can leave a scale below the new
  // cover, which is exactly the void the floor exists to forbid. This is what makes it responsive.
  settle(it, {
    ...state.viewport,
    scale: Math.max(state.viewport.scale, scaleLimitsFor(it.size, it.deps.frame.size).min),
  })
  repaint(it)
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
 */
function showCursor(it: LiveCanvas): void {
  const state = it.deps.store.getState()
  const css = cursorCss(
    cursorFor({
      tool: state.tool,
      hasTarget: describeDrawingTarget(state.document, state.target) !== null,
      dragging: it.dragging,
      spaceHeld: it.spaceHeld,
    })
  )
  if (css === it.cursor) return
  it.cursor = css
  it.node.style.cursor = css
}

/**
 * Adopt a view, held so the backdrop never uncovers the canvas.
 *
 * **Every `setViewport` in this module goes through here, and that is the point.** A hold applied at
 * three of the four call sites is a hold that fails on the fourth, and the repository has already paid
 * for a threshold decided in two places. The arithmetic is `clampToCover`'s; this only makes sure
 * nothing reaches the store without it.
 * @param it - the attachment
 * @param viewport - the view the gesture produced
 */
function settle(it: LiveCanvas, viewport: Viewport): void {
  it.deps.store.getState().setViewport(clampToCover(viewport, it.size, it.deps.frame.size))
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
  const factor = wheelZoomFactor(event.deltaY, event.deltaMode)
  settle(
    it,
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
  showCursor(it)
  const state = it.deps.store.getState()
  settle(it, panBy(state.viewport, to[0] - from[0], to[1] - from[1]))
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
  showCursor(it)
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
  // ‹space› borrows the hand for as long as it is held. `preventDefault` because a focusable element
  // scrolls the page on space, which here would scroll the editor out from under the map.
  if (event.key === ' ') {
    event.preventDefault()
    it.spaceHeld = true
    showCursor(it)
    return
  }
  const tool = TOOL_KEYS[event.key.toLowerCase()]
  if (tool !== undefined) {
    event.preventDefault()
    state.selectTool(tool)
    return
  }
  const pan = PAN_KEYS[event.key]
  if (pan !== undefined) {
    event.preventDefault()
    settle(it, panBy(state.viewport, pan[0], pan[1]))
    return
  }
  const zoomIn = ZOOM_IN_KEYS.has(event.key)
  if (!zoomIn && !ZOOM_OUT_KEYS.has(event.key)) return
  event.preventDefault()
  const centre: [number, number] = [it.size.width / 2, it.size.height / 2]
  const factor = zoomIn ? KEY_ZOOM_STEP : 1 / KEY_ZOOM_STEP
  settle(it, zoomAbout(state.viewport, centre, factor, scaleLimitsFor(it.size, it.deps.frame.size)))
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
  // The release half of ‹space›. Without it the hand stays in place after the key is let go, which is
  // the shape of bug a missing `keyup` always has: the state is entered correctly and never left.
  const releaseSpace = (): void => {
    if (!it.spaceHeld) return
    it.spaceHeld = false
    showCursor(it)
  }
  const keyUp = (event: KeyboardEvent): void => {
    if (event.key !== ' ') return
    releaseSpace()
  }
  // Not passive: see `onWheel`. React would have attached it passively through an `onWheel` prop.
  it.node.addEventListener('wheel', wheel, { passive: false })
  it.node.addEventListener('pointerdown', down)
  it.node.addEventListener('pointermove', move)
  it.node.addEventListener('pointerup', up)
  it.node.addEventListener('pointercancel', up)
  it.node.addEventListener('keydown', key)
  it.node.addEventListener('keyup', keyUp)
  // Letting go outside the canvas would otherwise leave the hand up for ever.
  it.node.addEventListener('blur', releaseSpace)
  return (): void => {
    it.node.removeEventListener('wheel', wheel)
    it.node.removeEventListener('pointerdown', down)
    it.node.removeEventListener('pointermove', move)
    it.node.removeEventListener('pointerup', up)
    it.node.removeEventListener('pointercancel', up)
    it.node.removeEventListener('keydown', key)
    it.node.removeEventListener('keyup', keyUp)
    it.node.removeEventListener('blur', releaseSpace)
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
/**
 * Subscribe to everything the canvas has to answer to, and hand back one way to stop.
 *
 * **Outside the factory because of the readability budget, and the split is the one ARCH-012 asks
 * for**: what the factory keeps is wiring, and each decision lives somewhere it can be read alone.
 * Five subscriptions with five stops was also five chances to forget one in the teardown.
 *
 * **Two things change what is drawn** — the view, and the edition's version counter, the document being
 * mutated in place so nothing else would fire. `fireImmediately` paints at wiring time rather than at
 * the first change, so an untouched editor is not a blank canvas.
 *
 * **Three change the cursor**: which tool is in hand, who is aimed at, and — through the version —
 * whether that polity still exists. The last is not redundant: an undo takes the target's polity away
 * without touching the target, so the refusal has to come back on its own.
 * @param it - the attachment
 * @param paint - the coalesced repaint
 * @returns the one teardown
 */
function watchStore(it: LiveCanvas, paint: () => void): () => void {
  const refreshCursor = (): void => {
    showCursor(it)
  }
  const stops = [
    it.deps.store.subscribe((state) => state.viewport, paint, { fireImmediately: true }),
    it.deps.store.subscribe((state) => state.version, paint),
    it.deps.store.subscribe((state) => state.tool, refreshCursor),
    it.deps.store.subscribe((state) => state.target, refreshCursor),
    it.deps.store.subscribe((state) => state.version, refreshCursor),
  ]
  return (): void => {
    for (const stop of stops) stop()
  }
}

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
    spaceHeld: false,
    cursor: '',
    ratio: 1,
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

  const unsubscribe = watchStore(it, paint)

  resize(it)
  showCursor(it)

  return (): void => {
    unsubscribe()
    observer.disconnect()
    unlisten()
    // A frame already requested would otherwise paint into a torn-down attachment — and under
    // `StrictMode`, which mounts twice, that is not hypothetical.
    if (pending !== 0) cancelAnimationFrame(pending)
  }
}
