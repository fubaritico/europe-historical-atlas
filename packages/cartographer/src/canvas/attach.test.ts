import { afterEach, describe, expect, it, vi } from 'vitest'

import { cloneYearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

import { openEmptyYear } from '../state/openEmptyYear'
import { createCartographerStore } from '../state/store'
import { TEST_BACKDROP_FRAME } from '../view/testFrame'
import { UNFRAMED } from '../view/viewport'
import { screenToBackdrop } from '../view/viewport'

import {
  DRAG_TOLERANCE,
  FRAME_MARGIN,
  KEY_PAN_STEP,
  MAX_SCALE,
  attachCanvas,
  scaleLimitsFor,
} from './attach'
import { CHROME_PAINT_STYLE } from './style'

import type { CartographerStoreHook } from '../state/store'

/** The canvas box every test pretends to have, jsdom reporting every element as zero-sized. */
const BOX = { width: 800, height: 600 }

/**
 * A stand-in for the baked terrain.
 *
 * A real `HTMLCanvasElement` rather than an object shaped like one: `CanvasImageSource` is a union of
 * concrete DOM types, so a structural literal would need a cast — and a cast here would silence exactly
 * the check that catches the painter being handed something it cannot draw. jsdom builds the element
 * happily; nothing in these tests asks it to paint.
 * @returns an image source the wiring accepts
 */
function backdropStandIn(): HTMLCanvasElement {
  return document.createElement('canvas')
}

/**
 * A canvas element that reports a size and accepts pointer capture.
 *
 * jsdom computes no layout, so `clientWidth`/`clientHeight` are zero and the first framing would never
 * happen; and it implements no pointer capture, so a press would throw. Both are environment gaps rather
 * than anything about the code, and stubbing them is what lets the gestures be driven at all.
 * @returns the element
 */
function canvasWithBox(): HTMLCanvasElement {
  const node = document.createElement('canvas')
  Object.defineProperty(node, 'clientWidth', { value: BOX.width })
  Object.defineProperty(node, 'clientHeight', { value: BOX.height })
  node.setPointerCapture = vi.fn()
  node.hasPointerCapture = vi.fn(() => true)
  node.releasePointerCapture = vi.fn()
  document.body.append(node)
  return node
}

/**
 * An event carrying the fields the handlers read.
 *
 * jsdom leaves `offsetX`/`offsetY` at zero because it lays nothing out, so they are assigned here. A
 * plain `Event` is enough: the handlers were added with `addEventListener`, so nothing inspects the
 * constructor.
 * @param type - the event type
 * @param fields - the positions and deltas the handler reads
 * @returns the event, cancelable so `preventDefault` is observable
 */
function pointerEvent(type: string, fields: Record<string, number>): Event {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.assign(event, { pointerId: 1, ...fields })
  return event
}

/**
 * A key event the handler reads.
 *
 * Cancelable, so `preventDefault` is observable — which is the half that matters: a key the canvas takes
 * must not also scroll the page.
 * @param key - the `event.key` value
 * @returns the event
 */
function keyEvent(key: string): KeyboardEvent {
  return new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
}

/** Everything one attached canvas needs, plus the handle to tear it down. */
function attach(): {
  node: HTMLCanvasElement
  store: CartographerStoreHook
  dispose: () => void
} {
  const store = createCartographerStore({
    edition: { document: openEmptyYear(1100), clone: cloneYearDocument },
    viewport: { viewport: UNFRAMED },
  })
  const node = canvasWithBox()
  const dispose = attachCanvas(node, {
    store,
    frame: TEST_BACKDROP_FRAME,
    backdropImage: backdropStandIn(),
    style: CHROME_PAINT_STYLE,
    zoneLabel: 'zone',
  })
  return { node, store, dispose }
}

afterEach(() => {
  document.body.replaceChildren()
})

describe('attachCanvas', () => {
  describe('happy path', () => {
    it('sizes the backing store to the element’s box', () => {
      const { node, dispose } = attach()

      expect(node.width).toBe(BOX.width * window.devicePixelRatio)
      expect(node.height).toBe(BOX.height * window.devicePixelRatio)
      dispose()
    })

    it('frames the whole backdrop, replacing the view nobody had chosen', () => {
      const { store, dispose } = attach()

      const view = store.getState().viewport

      expect(view).not.toEqual(UNFRAMED)
      expect(view.scale).toBeGreaterThan(0)
      dispose()
    })

    it('zooms about the pointer on a wheel notch, and refuses the page its scroll', () => {
      const { node, store, dispose } = attach()
      const before = store.getState().viewport
      const at = [300, 220] as const
      const held = screenToBackdrop(before, at)

      const event = pointerEvent('wheel', { offsetX: at[0], offsetY: at[1], deltaY: -1 })
      node.dispatchEvent(event)
      const after = store.getState().viewport

      expect(after.scale).toBeGreaterThan(before.scale)
      expect(event.defaultPrevented).toBe(true)
      expect(screenToBackdrop(after, at)[0]).toBeCloseTo(held[0], 6)
      expect(screenToBackdrop(after, at)[1]).toBeCloseTo(held[1], 6)
      dispose()
    })

    it('pans with a drag', () => {
      const { node, store, dispose } = attach()
      const before = store.getState().viewport

      node.dispatchEvent(pointerEvent('pointerdown', { offsetX: 100, offsetY: 100 }))
      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 160, offsetY: 130 }))
      const after = store.getState().viewport

      expect(after.originX).toBeCloseTo(before.originX + 60, 6)
      expect(after.originY).toBeCloseTo(before.originY + 30, 6)
      expect(after.scale).toBe(before.scale)
      dispose()
    })
  })

  describe('variants', () => {
    it('zooms out on the other direction of the wheel', () => {
      const { node, store, dispose } = attach()
      // Zoom in first: the editor opens exactly on its lower bound, so there is nothing to zoom out of
      // until it has zoomed in. That is the point of the bound.
      node.dispatchEvent(pointerEvent('wheel', { offsetX: 10, offsetY: 10, deltaY: -1 }))
      const zoomedIn = store.getState().viewport.scale

      node.dispatchEvent(pointerEvent('wheel', { offsetX: 10, offsetY: 10, deltaY: 1 }))

      expect(store.getState().viewport.scale).toBeLessThan(zoomedIn)
      dispose()
    })

    it('opens exactly on its lower bound, so zooming out of the first view does nothing', () => {
      const { node, store, dispose } = attach()
      const opening = store.getState().viewport.scale
      const limits = scaleLimitsFor(
        { width: BOX.width, height: BOX.height },
        TEST_BACKDROP_FRAME.size
      )

      node.dispatchEvent(pointerEvent('wheel', { offsetX: 10, offsetY: 10, deltaY: 1 }))

      // A first version computed the bound without the framing margin, which put the opening view
      // *below* the minimum — so the first notch in either direction snapped the map.
      expect(opening).toBeCloseTo(limits.min, 9)
      expect(store.getState().viewport.scale).toBeCloseTo(opening, 9)
      dispose()
    })

    it('keeps panning across several moves, each from where the last left off', () => {
      const { node, store, dispose } = attach()
      const before = store.getState().viewport.originX

      node.dispatchEvent(pointerEvent('pointerdown', { offsetX: 0, offsetY: 0 }))
      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 50, offsetY: 0 }))
      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 100, offsetY: 0 }))

      expect(store.getState().viewport.originX).toBeCloseTo(before + 100, 6)
      dispose()
    })

    it('stops panning once the pointer is released', () => {
      const { node, store, dispose } = attach()

      node.dispatchEvent(pointerEvent('pointerdown', { offsetX: 0, offsetY: 0 }))
      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 50, offsetY: 0 }))
      node.dispatchEvent(pointerEvent('pointerup', { offsetX: 50, offsetY: 0 }))
      const settled = store.getState().viewport.originX
      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 400, offsetY: 0 }))

      expect(store.getState().viewport.originX).toBe(settled)
      dispose()
    })

    it('treats a cancelled pointer like a release', () => {
      const { node, store, dispose } = attach()

      node.dispatchEvent(pointerEvent('pointerdown', { offsetX: 0, offsetY: 0 }))
      node.dispatchEvent(pointerEvent('pointercancel', { offsetX: 0, offsetY: 0 }))
      const settled = store.getState().viewport.originX
      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 400, offsetY: 0 }))

      expect(store.getState().viewport.originX).toBe(settled)
      dispose()
    })

    it('bounds the zoom: out stops where the whole backdrop fits, in stops at the ceiling', () => {
      const limits = scaleLimitsFor(
        { width: BOX.width, height: BOX.height },
        TEST_BACKDROP_FRAME.size
      )

      // Height is the constraining axis here, and the margin is taken off both sides — the same margin
      // the first framing uses, or the opening view would fall outside its own limits.
      expect(limits.max).toBe(MAX_SCALE)
      expect(limits.min).toBeCloseTo(
        (BOX.height - FRAME_MARGIN * 2) / TEST_BACKDROP_FRAME.size.height,
        9
      )
    })
  })

  describe('managed errors', () => {
    it('ignores a move with no button held', () => {
      const { node, store, dispose } = attach()
      const before = store.getState().viewport

      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 400, offsetY: 400 }))

      expect(store.getState().viewport).toEqual(before)
      dispose()
    })

    it('does not pan for a press that barely moved — the click threshold, decided here', () => {
      const { node, store, dispose } = attach()
      const before = store.getState().viewport

      node.dispatchEvent(pointerEvent('pointerdown', { offsetX: 100, offsetY: 100 }))
      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 102, offsetY: 100 }))

      expect(DRAG_TOLERANCE).toBe(4)
      expect(store.getState().viewport).toEqual(before)
      dispose()
    })

    it('does pan once the press passes the threshold', () => {
      const { node, store, dispose } = attach()
      const before = store.getState().viewport.originX

      node.dispatchEvent(pointerEvent('pointerdown', { offsetX: 100, offsetY: 100 }))
      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 106, offsetY: 100 }))

      expect(store.getState().viewport.originX).toBeCloseTo(before + 6, 6)
      dispose()
    })
  })

  describe('managed errors — the keyboard', () => {
    it('pans on the arrow keys, which is WCAG 2.1.1 and not a nicety', () => {
      const { node, store, dispose } = attach()
      const before = store.getState().viewport

      node.dispatchEvent(keyEvent('ArrowRight'))

      expect(store.getState().viewport.originX).toBeCloseTo(before.originX - KEY_PAN_STEP, 6)
      dispose()
    })

    it('pans in all four directions', () => {
      const { node, store, dispose } = attach()
      const before = store.getState().viewport

      node.dispatchEvent(keyEvent('ArrowLeft'))
      node.dispatchEvent(keyEvent('ArrowUp'))

      expect(store.getState().viewport.originX).toBeCloseTo(before.originX + KEY_PAN_STEP, 6)
      expect(store.getState().viewport.originY).toBeCloseTo(before.originY + KEY_PAN_STEP, 6)
      dispose()
    })

    it('zooms on each key the design names, holding the canvas’s centre', () => {
      for (const key of ['+', '=', 'PageUp']) {
        const { node, store, dispose } = attach()
        const before = store.getState().viewport
        const centre = [node.width / 2, node.height / 2] as const
        const held = screenToBackdrop(before, centre)

        node.dispatchEvent(keyEvent(key))
        const after = store.getState().viewport

        expect(after.scale, `${key} must zoom in`).toBeGreaterThan(before.scale)
        expect(screenToBackdrop(after, centre)[0]).toBeCloseTo(held[0], 6)
        dispose()
      }
    })

    it('zooms out on the other three keys', () => {
      for (const key of ['-', '_', 'PageDown']) {
        const { node, store, dispose } = attach()
        node.dispatchEvent(keyEvent('PageUp'))
        const zoomedIn = store.getState().viewport.scale

        node.dispatchEvent(keyEvent(key))

        expect(store.getState().viewport.scale, `${key} must zoom out`).toBeLessThan(zoomedIn)
        dispose()
      }
    })

    it('refuses the browser its own meaning for the keys it takes', () => {
      const { node, dispose } = attach()
      const arrow = keyEvent('ArrowDown')
      const page = keyEvent('PageDown')

      node.dispatchEvent(arrow)
      node.dispatchEvent(page)

      expect(arrow.defaultPrevented).toBe(true)
      expect(page.defaultPrevented).toBe(true)
      dispose()
    })

    it('leaves every other key alone, so nothing else is hijacked', () => {
      const { node, store, dispose } = attach()
      const before = store.getState().viewport

      const typed = keyEvent('a')
      node.dispatchEvent(typed)

      expect(store.getState().viewport).toEqual(before)
      expect(typed.defaultPrevented).toBe(false)
      dispose()
    })

    it('stops answering keys once torn down', () => {
      const { node, store, dispose } = attach()
      dispose()
      const settled = store.getState().viewport

      node.dispatchEvent(keyEvent('ArrowRight'))

      expect(store.getState().viewport).toEqual(settled)
    })
  })

  describe('unmanaged errors', () => {
    it('refuses to attach to a canvas that gives no 2D context', () => {
      const node = canvasWithBox()
      // Stubbed on the instance, and not restored: the element is built per test and discarded by the
      // `afterEach` below, so saving the original would only take a method reference the typed lint
      // refuses — and would restore something nothing reads again.
      node.getContext = vi.fn(() => null)
      const store = createCartographerStore({
        edition: { document: openEmptyYear(1100), clone: cloneYearDocument },
        viewport: { viewport: UNFRAMED },
      })

      expect(() =>
        attachCanvas(node, {
          store,
          frame: TEST_BACKDROP_FRAME,
          backdropImage: backdropStandIn(),
          style: CHROME_PAINT_STYLE,
          zoneLabel: 'zone',
        })
      ).toThrow(/no 2D context/)
    })
  })

  describe('edge cases', () => {
    it('stops listening once torn down, so a detached canvas moves nothing', () => {
      const { node, store, dispose } = attach()
      dispose()
      const settled = store.getState().viewport

      node.dispatchEvent(pointerEvent('wheel', { offsetX: 10, offsetY: 10, deltaY: -1 }))
      node.dispatchEvent(pointerEvent('pointerdown', { offsetX: 0, offsetY: 0 }))
      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 200, offsetY: 0 }))

      expect(store.getState().viewport).toEqual(settled)
    })

    it('survives being attached and torn down twice, which StrictMode does in development', () => {
      const first = attach()
      first.dispose()
      const second = attach()
      const settled = second.store.getState().viewport

      second.node.dispatchEvent(pointerEvent('wheel', { offsetX: 10, offsetY: 10, deltaY: -1 }))

      expect(second.store.getState().viewport.scale).toBeGreaterThan(settled.scale)
      second.dispose()
    })

    it('frames once, so a later resize does not snap the reader’s view back', () => {
      const { store, dispose } = attach()
      const framed = store.getState().viewport
      store.getState().setViewport({ ...framed, originX: framed.originX + 500 })

      // The observer never fires under jsdom; what is asserted is that nothing else re-frames.
      expect(store.getState().viewport.originX).toBeCloseTo(framed.originX + 500, 9)
      dispose()
    })
  })
})
