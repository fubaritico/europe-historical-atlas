import { PEN_MODE_LABELS, TOOL_LABELS, nextPenMode } from '../state/toolSlice'
import { backdropBoxOfBounds, clampToCover, openingView } from '../view/framing'
import { screenToLonLatOnBackdrop } from '../view/projection'
import { panBy, zoomAbout } from '../view/viewport'

import { createAnchorCache } from './anchorCache'
import {
  coloursOf,
  gestureOf,
  handInHand,
  refreshTools,
  showCursor,
  tooFarToEdit,
} from './liveCanvas'
import {
  DRAG_TOLERANCE,
  FRAME_MARGIN,
  KEY_ZOOM_STEP,
  PAN_KEYS,
  TOOL_KEYS,
  ZOOM_IN_KEYS,
  ZOOM_OUT_KEYS,
  historyKey,
  scaleLimitsFor,
  wheelZoomFactor,
} from './navigation'
import { paintCanvas } from './painter'
import { pencilCancel, pencilDrag, pencilEnd, pencilStart } from './pencil'
import { buildScene } from './scene'
import { inDevicePixels } from './style'
import {
  arrowDrag,
  arrowPress,
  redoGesture,
  resolvedTarget,
  toolKey,
  undoGesture,
} from './toolGestures'
import { keyRefusedFromAfar, releaseTool } from './toolRelease'
import { dropDrag, idleSession, targetHandles } from './toolSession'

import type { CanvasControllerDeps, LiveCanvas } from './liveCanvas'
import type { Viewport } from '../view/viewport'

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

export type { CanvasControllerDeps, LiveCanvas } from './liveCanvas'

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
 * **Handles are the drawing target's only**, and only under a tool that acts on them: under the hand
 * there is nothing to aim at, and showing every anchor of the year would bury the target's in its
 * neighbours' (`H-03`'s smear, avoided by construction for the anchors that matter).
 *
 * **The anchors come from the cache, keyed on the edition's version.** A pan writes the viewport on every
 * pointer move, so without that the Mercator conversion would run per frame over the whole table — the
 * defect ARCH-101, found in review after `projection.ts` and `hitTest.ts` had both promised this cache
 * and nothing had built it.
 * @param it - the attachment to paint
 */
function repaint(it: LiveCanvas): void {
  const state = it.deps.store.getState()
  const target = state.tool === 'navigate' ? null : resolvedTarget(gestureOf(it))
  const scene = buildScene(state.document, {
    anchorsInBackdrop: it.anchors.anchorsInBackdrop(state.document, state.version),
    backdropImage: it.deps.backdropImage,
    vectorLayers: it.deps.vectorLayers,
    frame: it.deps.frame,
    viewport: state.viewport,
    selected: new Set(it.session.selected),
    handles: targetHandles(state.document, target?.id ?? null),
    colours: coloursOf(it),
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
 * **Both canvases are cleared here and both are repainted here** (ARCH-101, found in review): the
 * overlay's size assignment clears it as surely as the static one's, and a resize that repainted only
 * the static canvas left the outline in progress invisible until the pointer moved.
 * @param it - the attachment to resize
 */
function resize(it: LiveCanvas): void {
  sizeSurfaces(it)
  frameView(it)
  repaint(it)
  refreshTools(it)
}

/**
 * Match both backing stores to the element's box — which clears them both.
 * @param it - the attachment
 */
function sizeSurfaces(it: LiveCanvas): void {
  const ratio = window.devicePixelRatio
  const width = Math.max(0, Math.round(it.node.clientWidth * ratio))
  const height = Math.max(0, Math.round(it.node.clientHeight * ratio))
  // Read at every resize and never cached at mount: a window dragged to a second screen changes it.
  it.ratio = ratio
  it.size = { width, height }
  it.node.width = width
  it.node.height = height
  it.overlay.node.width = width
  it.overlay.node.height = height
}

/**
 * Frame the view the first time the canvas has a size, and re-hold it every time after.
 * @param it - the attachment, already sized
 */
function frameView(it: LiveCanvas): void {
  const state = it.deps.store.getState()
  if (it.size.width <= 0 || it.size.height <= 0) return
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
    return
  }
  // A view already chosen still has to be re-held: growing the window can leave a scale below the new
  // cover, which is exactly the void the floor exists to forbid. This is what makes it responsive.
  settle(it, {
    ...state.viewport,
    scale: Math.max(state.viewport.scale, scaleLimitsFor(it.size, it.deps.frame.size).min),
  })
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
  it.deps.onHover(screenToLonLatOnBackdrop(at, it.deps.frame, it.deps.store.getState().viewport))
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
  // A result describes the last gesture; the next press starts another, so it goes.
  it.deps.onResult(null)
  it.pressAt = positionOf(event)
  it.dragging = false
  it.node.setPointerCapture(event.pointerId)
  if (handInHand(it) || it.deps.store.getState().tool !== 'edit') return
  if (tooFarToEdit(it)) {
    // From afar the arrow only chooses a polity (H-34): no handle is caught, nothing is inserted, and the
    // press is a click to be decided on release, never the start of a marquee.
    dropDrag(it.session)
    it.session.pending = { at: it.pressAt, shift: event.shiftKey }
    refreshTools(it)
    return
  }
  arrowPress(gestureOf(it), it.pressAt, event.shiftKey)
  it.requestPaint()
  refreshTools(it)
}

/**
 * Follow the pointer: the overlay and the status bar always, and a drag once the press has travelled
 * far enough — a pan with the hand, an anchor with the white arrow, a stroke with the Pencil. **A drag
 * under the Pen does nothing**: `s02` says a drag never curves anything, and a Pen that panned on a
 * slightly long click would lose the anchor the author meant to place.
 * @param it - the attachment
 * @param event - the pointer event
 */
function onPointerMove(it: LiveCanvas, event: PointerEvent): void {
  const to = positionOf(event)
  report(it, to)
  it.pointer = to
  const from = it.pressAt
  if (
    from !== null &&
    (it.dragging || Math.hypot(to[0] - from[0], to[1] - from[1]) > DRAG_TOLERANCE)
  ) {
    const starting = !it.dragging
    it.dragging = true
    if (handInHand(it)) {
      settle(it, panBy(it.deps.store.getState().viewport, to[0] - from[0], to[1] - from[1]))
      it.pressAt = to
    } else if (it.deps.store.getState().tool === 'edit') {
      if (!tooFarToEdit(it)) arrowDrag(gestureOf(it), to)
    } else if (pencilInHand(it) && !tooFarToEdit(it)) {
      if (starting) pencilStart(gestureOf(it), from, event.timeStamp)
      pencilDrag(gestureOf(it), to, event.timeStamp)
    }
  }
  refreshTools(it)
}

/**
 * The pointer left the canvas: no rubber band to nowhere, and no action sentence about a place the
 * author is not looking at.
 * @param it - the attachment
 */
function onPointerLeave(it: LiveCanvas): void {
  it.pointer = null
  it.deps.onHover(null)
  refreshTools(it)
}

/**
 * End a press, whether it was a drag or a click.
 * @param it - the attachment
 * @param event - the pointer event
 */
function onPointerUp(it: LiveCanvas, event: PointerEvent): void {
  const pressed = it.pressAt !== null
  const dragged = it.dragging
  it.pressAt = null
  it.dragging = false
  if (it.node.hasPointerCapture(event.pointerId)) it.node.releasePointerCapture(event.pointerId)
  // The arrow's press ends with the button, the hand borrowed or not: a marquee left open would steer
  // the next press (review ARCH-001, 2026-10-12).
  if (handInHand(it)) dropDrag(it.session)
  if (pressed && !handInHand(it)) releaseTool(it, positionOf(event), dragged)
  // A Pencil drag ends with the button, whatever happened meanwhile: the hand borrowed with ‹space›, or
  // ‹P› turning the Pen to another mode. Then no last point is laid — the pointer was not drawing.
  const drawing = it.session.drawing
  if (drawing !== null) {
    const at = pencilInHand(it) ? positionOf(event) : drawing.at
    pencilEnd(gestureOf(it), at, event.timeStamp)
  }
  refreshTools(it)
}

/**
 * A press the system took back — a touch interrupted, the capture lost.
 *
 * **It undoes, it does not complete** (QUAL-005, found in review): routed through `pointerup` it
 * committed a half-dragged anchor as a step and, under the Pen, placed an anchor the author never
 * clicked. A cancelled gesture is one that did not happen, so the preview is dropped and nothing is
 * recorded.
 * @param it - the attachment
 * @param event - the pointer event
 */
function onPointerCancel(it: LiveCanvas, event: PointerEvent): void {
  it.pressAt = null
  it.dragging = false
  it.session.moving = null
  it.session.grabbed = null
  it.session.pending = null
  it.session.marquee = null
  pencilCancel(gestureOf(it))
  if (it.node.hasPointerCapture(event.pointerId)) it.node.releasePointerCapture(event.pointerId)
  refreshTools(it)
}

/**
 * ‹P› and ‹A›: take the tool — and ‹P› with the Pen already in hand goes round its group, free → coast →
 * river → Pencil (the dev, 2026-10-11: pressing ‹P› again must change the Pen).
 * @param it - the attachment
 * @param event - the key event
 * @returns `true` when the key was a tool's, and was taken
 */
function onToolKey(it: LiveCanvas, event: KeyboardEvent): boolean {
  const tool = TOOL_KEYS[event.key.toLowerCase()]
  if (tool === undefined) return false
  event.preventDefault()
  const state = it.deps.store.getState()
  if (tool === 'draw' && state.tool === 'draw') {
    const mode = nextPenMode(state.penMode)
    state.choosePenMode(mode)
    // Said in the result zone, a polite live region: focus is on the canvas, not on the rail's button
    // whose name changed, so the mode would otherwise change in silence (A11Y-010).
    it.deps.onResult(PEN_MODE_LABELS[mode])
  } else if (tool !== state.tool) {
    state.selectTool(tool)
    // Said for the same reason as the Pen's mode: the focus is on the canvas, not on the rail.
    it.deps.onResult(tool === 'draw' ? PEN_MODE_LABELS[state.penMode] : TOOL_LABELS[tool])
  }
  return true
}

/**
 * Whether a drag lays Pencil points: the Pen in hand in its freehand mode, the hand not borrowed.
 * @param it - the attachment
 * @returns `true` when a drag draws
 */
function pencilInHand(it: LiveCanvas): boolean {
  const state = it.deps.store.getState()
  return state.tool === 'draw' && state.penMode === 'pencil' && !handInHand(it)
}

/**
 * Handle a key held with a modifier: the history's two, or none.
 *
 * **Every other modified key belongs to the browser or the assistive technology** — ‹cmd+P› prints,
 * ‹ctrl+A› selects, ‹cmd+plus› zooms the page — never a tool's (A11Y-001, found in review). ‹shift› alone
 * is not a modifier here: on many layouts `+` is typed with it.
 *
 * **‹ctrl+Z› and ‹ctrl+shift+Z› are the exception, and take nothing from the browser**: a canvas has no
 * text to undo. ‹cmd› stands for ‹ctrl› on a Mac (`s03`).
 * @param it - the attachment
 * @param event - the key event
 * @returns `true` when the key was a modified one, handled here or left to the platform
 */
function onModifiedKey(it: LiveCanvas, event: KeyboardEvent): boolean {
  if (!event.ctrlKey && !event.metaKey && !event.altKey) return false
  const history = historyKey(event)
  if (history === null) return true
  event.preventDefault()
  // The result described the gesture now being taken back or replayed (QUAL-109).
  it.deps.onResult(null)
  if (history === 'undo') undoGesture(gestureOf(it), event.repeat)
  else redoGesture(gestureOf(it), event.repeat)
  it.requestPaint()
  refreshTools(it)
  return true
}

/**
 * The keys settled before any tool sees them: those held with a modifier (the history's, or the
 * platform's), then — from too far out — the ones that would change the document, refused and said so
 * (H-34, QUAL-001).
 * @param it - the attachment
 * @param event - the key event
 * @returns `true` when the key needs nothing more
 */
function keyTakenFirst(it: LiveCanvas, event: KeyboardEvent): boolean {
  if (onModifiedKey(it, event)) return true
  if (!keyRefusedFromAfar(it, event.key)) return false
  event.preventDefault()
  return true
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
  // First, so a modified ‹space› (‹ctrl+space›, which input methods use) stays the platform's too.
  if (keyTakenFirst(it, event)) return
  if (event.key === ' ') {
    event.preventDefault()
    it.spaceHeld = true
    showCursor(it)
    return
  }
  // An object, not a `let`: TypeScript does not see the closure assign it, and would read it as `false`.
  const said = { reported: false }
  const gesture = gestureOf(it)
  const context = {
    ...gesture,
    report: (message: string) => {
      said.reported = true
      gesture.report(message)
    },
  }
  if (toolKey(context, event.key)) {
    event.preventDefault()
    // A gesture key changes what the result described; the pan and zoom keys do not (QUAL-109). Unless
    // the key's own gesture said what it did — a deleted anchor — which is then the result.
    if (!said.reported) it.deps.onResult(null)
    it.requestPaint()
    refreshTools(it)
    return
  }
  if (onToolKey(it, event)) return
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
  const removers: (() => void)[] = []
  // Each listener is added and its removal recorded in the same call, so the two lists cannot differ.
  const on = <K extends keyof HTMLElementEventMap>(
    type: K,
    handler: (event: HTMLElementEventMap[K]) => void,
    options?: AddEventListenerOptions
  ): void => {
    it.node.addEventListener(type, handler, options)
    removers.push(() => {
      it.node.removeEventListener(type, handler, options)
    })
  }
  // The release half of ‹space›. Without it the hand stays in place after the key is let go, which is
  // the shape of bug a missing `keyup` always has: the state is entered correctly and never left.
  const releaseSpace = (): void => {
    if (!it.spaceHeld) return
    it.spaceHeld = false
    showCursor(it)
  }
  // Not passive: see `onWheel`. React would have attached it passively through an `onWheel` prop.
  on(
    'wheel',
    (event) => {
      onWheel(it, event)
    },
    { passive: false }
  )
  on('pointerdown', (event) => {
    onPointerDown(it, event)
  })
  on('pointermove', (event) => {
    onPointerMove(it, event)
  })
  on('pointerup', (event) => {
    onPointerUp(it, event)
  })
  on('pointercancel', (event) => {
    onPointerCancel(it, event)
  })
  on('pointerleave', () => {
    onPointerLeave(it)
  })
  on('keydown', (event) => {
    onKeyDown(it, event)
  })
  on('keyup', (event) => {
    if (event.key === ' ') releaseSpace()
  })
  // Letting go outside the canvas would otherwise leave the hand up for ever.
  on('blur', releaseSpace)
  return (): void => {
    for (const remove of removers) remove()
  }
}

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
  const refresh = (): void => {
    refreshTools(it)
  }
  // A new tool or a new subject starts the session over: an outline begun for one polity must not be
  // closed into another, and a selection is the selection of *someone's* points.
  const restart = (): void => {
    it.session = idleSession()
    paint()
    refreshTools(it)
  }
  // An undo can take the selected anchor's ring away; a selection the target no longer holds is dropped.
  const prune = (): void => {
    const { document, target } = it.deps.store.getState()
    const handles = new Set(targetHandles(document, target))
    it.session.selected = it.session.selected.filter((index) => handles.has(index))
    refreshTools(it)
  }
  const stops = [
    it.deps.store.subscribe((state) => state.viewport, paint, { fireImmediately: true }),
    it.deps.store.subscribe((state) => state.viewport, refresh),
    it.deps.store.subscribe((state) => state.version, paint),
    it.deps.store.subscribe((state) => state.version, prune),
    it.deps.store.subscribe((state) => state.tool, restart),
    it.deps.store.subscribe((state) => state.target, restart),
    // Another mode of the Pen offers another layer: refresh what is offered, and keep the outline in
    // hand — switching from the coast to a river mid-border is what the two modes are for.
    it.deps.store.subscribe((state) => state.penMode, refresh),
  ]
  return (): void => {
    for (const stop of stops) stop()
  }
}

/**
 * Attach the canvas, and return its teardown.
 * @param node - the canvas element to drive
 * @param deps - the store, the frame, the style, the overlay and the zone's name
 * @returns a function that removes every listener and observer this added
 * @throws when the browser gives no 2D context — not a runtime condition but a browser that cannot run
 *   this application at all. Substituting anything would draw nothing and say nothing.
 */
export function startCanvasController(
  node: HTMLCanvasElement,
  deps: CanvasControllerDeps
): () => void {
  const ctx = node.getContext('2d')
  const overlayCtx = deps.overlay.getContext('2d')
  if (ctx === null || overlayCtx === null)
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
    overlay: { node: deps.overlay, ctx: overlayCtx },
    session: idleSession(),
    pointer: null,
    sentence: null,
    wasTooFar: null,
    requestPaint: () => undefined,
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
  it.requestPaint = paint
  const unlisten = listen(it)
  const observer = new ResizeObserver(() => {
    resize(it)
  })
  observer.observe(node)

  const unsubscribe = watchStore(it, paint)

  resize(it)
  refreshTools(it)

  return (): void => {
    unsubscribe()
    observer.disconnect()
    unlisten()
    // A frame already requested would otherwise paint into a torn-down attachment — and under
    // `StrictMode`, which mounts twice, that is not hypothetical.
    if (pending !== 0) cancelAnimationFrame(pending)
  }
}
