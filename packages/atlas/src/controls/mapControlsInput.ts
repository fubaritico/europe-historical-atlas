/**
 * What the map listens to: the arrow and zoom keys, the wheel, and a press-drag-release — and the one rule that tells
 * a click from a drag.
 */

import { isEditableFocused } from '../utils/editableFocus'

import { interrupt } from './cameraFlight'
import { degToRad, distanceForZoom, viewportHeight } from './controlsState'
import { zoomImpulse } from './mapControlsDrive'

import type { ControlsState } from './controlsState'

/**
 * How far the pointer may travel during a press and still count as a click, in CSS pixels.
 *
 * A hand holding a mouse button down moves a pixel or two, so a map that called any movement a drag
 * would answer almost no clicks. Four is the usual tolerance across map libraries.
 */
const DRAG_CLICK_TOLERANCE_PX = 4

/** Keys that pan the map (arrow keys). Held keys accumulate a continuous pan. */
const PAN_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])

/** Keys that zoom in (keyboard equivalent of wheel-up). */
const ZOOM_IN_KEYS = new Set(['+', '=', 'PageUp'])
/** Keys that zoom out (keyboard equivalent of wheel-down). */
const ZOOM_OUT_KEYS = new Set(['-', '_', 'PageDown'])

/**
 * The keyboard listeners: pan keys, and the keyboard equivalent of the wheel.
 * @param state - the controls' state
 * @returns the listeners, by event name
 */
function createKeyListeners(state: ControlsState): {
  keydown: (e: Event) => void
  keyup: (e: Event) => void
} {
  return {
    keydown: (e: Event): void => {
      const ke = e as KeyboardEvent
      if (isEditableFocused()) return // don't hijack keys while a form field (e.g. lil-gui) has focus
      // Any navigation key cancels a running flight, so the reader gets the camera back.
      if (PAN_KEYS.has(ke.key) || ZOOM_IN_KEYS.has(ke.key) || ZOOM_OUT_KEYS.has(ke.key)) {
        interrupt(state)
      }
      // Pan keys are held until released; zoom keys add one impulse, like a wheel notch.
      if (PAN_KEYS.has(ke.key)) {
        state.pressed.add(ke.key)
        ke.preventDefault() // stop the page from scrolling on arrow keys
      } else if (ZOOM_IN_KEYS.has(ke.key)) {
        state.velZoom += zoomImpulse(state.opts, 1) // keyboard equivalent of wheel-up (WCAG 2.1.1)
        ke.preventDefault()
      } else if (ZOOM_OUT_KEYS.has(ke.key)) {
        state.velZoom += zoomImpulse(state.opts, -1)
        ke.preventDefault()
      }
    },
    keyup: (e: Event): void => {
      state.pressed.delete((e as KeyboardEvent).key)
    },
  }
}

/**
 * The wheel and pointer listeners: zoom, and grab-the-map dragging.
 * @param state - the controls' state
 * @returns the listeners, by event name
 */
function createPointerListeners(state: ControlsState): {
  wheel: (e: Event) => void
  pointerdown: (e: Event) => void
  pointermove: (e: Event) => void
  pointerup: () => void
} {
  return {
    wheel: (e: Event): void => {
      const we = e as WheelEvent
      if (we.ctrlKey) return // let the browser's ctrl+wheel page zoom through (WCAG 1.4.4)
      interrupt(state)
      we.preventDefault() // stop the page from scrolling on wheel
      state.velZoom += zoomImpulse(state.opts, -Math.sign(we.deltaY)) // wheel up = zoom in
    },
    pointerdown: (e: Event): void => {
      const pe = e as PointerEvent
      // Reset before the early return, so a press that cannot drag still reports itself as a click.
      state.pointerTravel = 0
      state.pointerDragged = false
      if (!state.opts.enableDrag || pe.button !== 0) return
      // A left press starts a drag: stop any flight and remember where the pointer was.
      interrupt(state)
      state.dragging = true
      state.lastX = pe.clientX
      state.lastY = pe.clientY
    },
    pointermove: (e: Event): void => {
      const pe = e as PointerEvent
      // Track the pointer even without a drag: edge scrolling reads it.
      state.pointerX = pe.clientX
      state.pointerY = pe.clientY
      if (!state.dragging) return
      // Add up the pixel path walked during the press: it tells a drag from a click on release.
      state.pointerTravel += Math.hypot(pe.clientX - state.lastX, pe.clientY - state.lastY)
      // Grab-the-map: the ground follows the cursor, so the target moves opposite to the drag. The
      // amount moved is accumulated too, so a frame can turn it into release momentum.
      const distance = distanceForZoom(state.opts, state.zoom)
      const worldPerPixel =
        (2 * distance * Math.tan(degToRad(state.camera.fov) / 2)) / viewportHeight(state)
      const dx = -(pe.clientX - state.lastX) * worldPerPixel
      const dz = -(pe.clientY - state.lastY) * worldPerPixel
      state.target.x += dx
      state.target.z += dz
      state.dragMovedX += dx
      state.dragMovedZ += dz
      // The next move is measured from here.
      state.lastX = pe.clientX
      state.lastY = pe.clientY
    },
    pointerup: (): void => {
      // Settled before the `click` the browser is about to send, which is what lets the gestures ask.
      state.pointerDragged = state.pointerTravel > DRAG_CLICK_TOLERANCE_PX
      state.dragging = false
    },
  }
}

/**
 * Attach every input listener, and hand back the one call that removes them all.
 *
 * Paired here rather than spelled out twice: six `addEventListener` calls answered by six
 * `removeEventListener` calls, kept in step by hand, is a listener leak waiting for someone to add a
 * seventh — and the map binds keys on `window`, so a leaked one outlives the canvas.
 * @param state - the controls' state
 * @param keyTarget - where keyboard input is read from
 * @returns a call that detaches everything
 */
export function bindListeners(state: ControlsState, keyTarget: EventTarget): () => void {
  const keys = createKeyListeners(state)
  const pointer = createPointerListeners(state)
  const { domElement } = state
  // Keys on the key target, wheel and press on the map; move and release on the window, so a
  // drag carries on when the pointer leaves the canvas.
  keyTarget.addEventListener('keydown', keys.keydown)
  keyTarget.addEventListener('keyup', keys.keyup)
  domElement.addEventListener('wheel', pointer.wheel, { passive: false })
  domElement.addEventListener('pointerdown', pointer.pointerdown)
  window.addEventListener('pointermove', pointer.pointermove)
  window.addEventListener('pointerup', pointer.pointerup)
  // The detach call mirrors each listener above, and forgets any key still held.
  return (): void => {
    keyTarget.removeEventListener('keydown', keys.keydown)
    keyTarget.removeEventListener('keyup', keys.keyup)
    domElement.removeEventListener('wheel', pointer.wheel)
    domElement.removeEventListener('pointerdown', pointer.pointerdown)
    window.removeEventListener('pointermove', pointer.pointermove)
    window.removeEventListener('pointerup', pointer.pointerup)
    state.pressed.clear()
  }
}
