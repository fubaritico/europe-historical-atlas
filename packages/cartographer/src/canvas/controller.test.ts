import { afterEach, describe, expect, it, vi } from 'vitest'

import { cloneYearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

import { openEmptyYear } from '../state/openEmptyYear'
import { createCartographerStore } from '../state/store'
import { TEST_BACKDROP_FRAME } from '../view/testFrame'
import { UNFRAMED } from '../view/viewport'
import { screenToBackdrop } from '../view/viewport'

import {
  DRAG_TOLERANCE,
  KEY_PAN_STEP,
  MAX_SCALE,
  scaleLimitsFor,
  startCanvasController,
} from './controller'
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
  hovered: ReturnType<typeof vi.fn>
  dispose: () => void
} {
  const hovered = vi.fn()
  const store = createCartographerStore({
    edition: { document: openEmptyYear(1100), clone: cloneYearDocument },
    viewport: { viewport: UNFRAMED },
  })
  const node = canvasWithBox()
  const dispose = startCanvasController(node, {
    store,
    frame: TEST_BACKDROP_FRAME,
    backdropImage: backdropStandIn(),
    vectorLayers: { coast: [], rivers: [] },
    onHover: hovered,
    style: CHROME_PAINT_STYLE,
    zoneLabel: 'zone',
  })
  return { node, store, hovered, dispose }
}

afterEach(() => {
  document.body.replaceChildren()
})

/**
 * Put the view in the MIDDLE of what the hold allows, so a pan is a pan and not a clamp.
 *
 * **Needed since the hold landed, 2026-10-08.** The opening view is pinned against the backdrop's
 * western edge — the editorial zone begins at −45°, which is exactly where the backdrop begins — so a
 * pan eastward from it moves nothing, and every pan test read as a failure of panning.
 *
 * **The middle, and the first version of this helper got that wrong**: at scale 1 the backdrop is
 * 1280×1164 against an 800×600 canvas, so the origin may run from −480 to 0 and from −564 to 0. Placing
 * it at (−480, −564) looked like "plenty of slack" and was in fact the far corner, where a pan outward
 * is held — which is how a correct ArrowRight read as a dead key.
 * @param store - the store to position
 */
function roomToPan(store: ReturnType<typeof createCartographerStore>): void {
  store.getState().setViewport({ scale: 1, originX: -240, originY: -282 })
}

describe('startCanvasController', () => {
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
      roomToPan(store)
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
      roomToPan(store)
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

    it('bounds the zoom: out stops at cover, in stops at the ceiling', () => {
      const limits = scaleLimitsFor(
        { width: BOX.width, height: BOX.height },
        TEST_BACKDROP_FRAME.size
      )

      // The floor is COVER, not fit: a reader may not pull back until the backdrop floats in a void,
      // because there is no ground out there to draw on (the dev, 2026-10-08). Width is the constraining
      // axis for covering, where height was the constraining one for fitting — the two are opposites, so
      // they are decided by opposite edges. No margin: a margin is the gap you leave around a fitted
      // box, and covering is the state where no gap exists.
      expect(limits.max).toBe(MAX_SCALE)
      // Deep enough to place an anchor where no source could contradict it: at scale 32 one screen
      // pixel is about 240 m of ground, against a backdrop whose own pixels are 7.6 km at 45°N. The
      // ceiling used to be 8, on an argument about the atlas's 1.9 km raster cells — which this editor
      // does not use: it stores degrees at six decimals and derives borders from shared anchors.
      expect(MAX_SCALE).toBeGreaterThanOrEqual(32)
      expect(limits.min).toBeCloseTo(BOX.width / TEST_BACKDROP_FRAME.size.width, 9)
      // And the floor is above what fitting would have given, which is the whole change in one line:
      // the view that used to be reachable — the backdrop entire, with gutters — no longer is.
      expect(limits.min).toBeGreaterThan(BOX.height / TEST_BACKDROP_FRAME.size.height)
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
      roomToPan(store)
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
      roomToPan(store)
      const before = store.getState().viewport

      node.dispatchEvent(keyEvent('ArrowRight'))

      expect(store.getState().viewport.originX).toBeCloseTo(before.originX - KEY_PAN_STEP, 6)
      dispose()
    })

    it('pans in all four directions', () => {
      const { node, store, dispose } = attach()
      roomToPan(store)
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

      // 'q', not 'a': 'a' became ⟨edit⟩ on 2026-10-09, and 'p' the Pen. The test's point stands and
      // its example had to move — which is the useful half of it failing.
      const typed = keyEvent('q')
      node.dispatchEvent(typed)

      expect(store.getState().viewport).toEqual(before)
      expect(store.getState().tool).toBe('navigate')
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
        startCanvasController(node, {
          store,
          frame: TEST_BACKDROP_FRAME,
          backdropImage: backdropStandIn(),
          vectorLayers: { coast: [], rivers: [] },
          onHover: () => undefined,
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

describe('repaint coalescing', () => {
  /**
   * Take over `requestAnimationFrame` so frames can be counted and run on demand.
   * @returns the captured callbacks and how many times a frame was asked for
   */
  function frameControl(): { run: () => void; asked: () => number; cancelled: () => number } {
    const queued: (() => void)[] = []
    let cancels = 0
    vi.stubGlobal('requestAnimationFrame', (fn: () => void) => {
      queued.push(fn)
      return queued.length
    })
    vi.stubGlobal('cancelAnimationFrame', () => {
      cancels += 1
    })
    return {
      run: () => {
        const next = queued.shift()
        next?.()
      },
      asked: () => queued.length,
      cancelled: () => cancels,
    }
  }

  describe('happy path', () => {
    it('asks for one frame however many wheel events arrive between two', () => {
      const frames = frameControl()
      const { node, dispose } = attach()
      frames.run() // the paint `fireImmediately` asked for at wiring time

      for (let i = 0; i < 5; i++) {
        node.dispatchEvent(pointerEvent('wheel', { offsetX: 100, offsetY: 100, deltaY: -1 }))
      }

      // The defect this test exists for: painting straight out of the handler redrew a 2 560 × 2 328
      // image and 125 000 points once per event, and a trackpad emits 60 to 120 a second. One frame,
      // five events — and the store still holds the newest viewport, so nothing is lost but the
      // redundant drawing.
      expect(frames.asked()).toBe(1)
      vi.unstubAllGlobals()
      dispose()
    })

    it('paints again on the next frame, rather than coalescing for ever', () => {
      const frames = frameControl()
      const { node, dispose } = attach()
      frames.run()

      node.dispatchEvent(pointerEvent('wheel', { offsetX: 100, offsetY: 100, deltaY: -1 }))
      frames.run()
      node.dispatchEvent(pointerEvent('wheel', { offsetX: 100, offsetY: 100, deltaY: -1 }))

      // A latch that never reopens is the other way to get this wrong, and it looks identical until
      // the map stops following the wheel entirely.
      expect(frames.asked()).toBe(1)
      vi.unstubAllGlobals()
      dispose()
    })
  })

  describe('edge cases', () => {
    it('cancels a frame it has already asked for when torn down', () => {
      const frames = frameControl()
      const { node, dispose } = attach()
      frames.run()
      node.dispatchEvent(pointerEvent('wheel', { offsetX: 100, offsetY: 100, deltaY: -1 }))

      dispose()

      // Otherwise the callback paints into a torn-down attachment — and `StrictMode` mounts twice, so
      // that is not hypothetical.
      expect(frames.cancelled()).toBe(1)
      vi.unstubAllGlobals()
    })
  })
})

describe('reporting what is under the pointer', () => {
  describe('happy path', () => {
    it('reports a position in degrees on every move, button or no button', () => {
      const { node, hovered, dispose } = attach()

      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 400, offsetY: 300 }))

      // No press first: `s01`'s "identify what is under the pointer" is a hover, not a drag. The first
      // version of this wiring returned early when no button was down, so the bar never moved.
      const reported = hovered.mock.calls.at(-1)?.[0] as [number, number] | null

      expect(reported).not.toBeNull()
      // Somewhere inside the DEM's own box, since the pointer is over the middle of the framed map.
      expect(reported?.[0]).toBeGreaterThan(TEST_BACKDROP_FRAME.bounds.west)
      expect(reported?.[0]).toBeLessThan(TEST_BACKDROP_FRAME.bounds.east)
      expect(reported?.[1]).toBeGreaterThan(TEST_BACKDROP_FRAME.bounds.south)
      expect(reported?.[1]).toBeLessThan(TEST_BACKDROP_FRAME.bounds.north)
      dispose()
    })
  })

  describe('variants', () => {
    it('keeps reporting while a drag is panning', () => {
      const { node, hovered, dispose } = attach()
      node.dispatchEvent(pointerEvent('pointerdown', { offsetX: 100, offsetY: 100 }))
      hovered.mockClear()

      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 160, offsetY: 130 }))

      // Dragging the map is still moving over it, and the bar going blank mid-pan would read as a
      // fault rather than as a mode.
      expect(hovered).toHaveBeenCalledTimes(1)
      dispose()
    })

    it('moves with the view, so the same pixel is a different place after a pan', () => {
      const { node, store, hovered, dispose } = attach()
      roomToPan(store)
      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 400, offsetY: 300 }))
      const before = hovered.mock.calls.at(-1)?.[0] as [number, number]

      node.dispatchEvent(pointerEvent('pointerdown', { offsetX: 400, offsetY: 300 }))
      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 500, offsetY: 300 }))
      node.dispatchEvent(pointerEvent('pointerup', { offsetX: 500, offsetY: 300 }))
      hovered.mockClear()
      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 400, offsetY: 300 }))
      const after = hovered.mock.calls.at(-1)?.[0] as [number, number]

      // Reading the viewport at report time rather than capturing it at wiring time: a stale
      // conversion would be a coordinate that looks right and names the wrong place.
      expect(after[0]).not.toBeCloseTo(before[0], 6)
      dispose()
    })
  })

  describe('edge cases', () => {
    it('reports nothing for a pointer that has left the map', () => {
      const { node, hovered, dispose } = attach()

      // **There is no vellum inside the canvas any more**, and that is the hold working: the backdrop
      // covers the canvas at every reachable scale, so every point a reader can hover is a place. This
      // branch is still reached, and by the case that matters — a drag keeps the pointer captured after
      // it leaves the element, and the offsets then fall outside the box.
      node.dispatchEvent(pointerEvent('pointermove', { offsetX: -40, offsetY: -40 }))

      // A latitude extrapolated past the frame's edge is arithmetic presented as a fact — the
      // plausible wrong answer `rules/error-handling.md` names as the dangerous shape.
      expect(hovered.mock.calls.at(-1)?.[0]).toBeNull()
      dispose()
    })
  })
})

describe('the tool keys and the cursor', () => {
  describe('happy path', () => {
    it('puts the Pen in hand on ‹P› and the arrow on ‹A›', () => {
      const { node, store, dispose } = attach()

      node.dispatchEvent(keyEvent('p'))
      expect(store.getState().tool).toBe('draw')

      node.dispatchEvent(keyEvent('a'))
      expect(store.getState().tool).toBe('edit')
      dispose()
    })

    it('opens showing the open hand, ⟨navigate⟩ being the opening tool', () => {
      const { node, dispose } = attach()

      expect(node.style.cursor).toContain('grab')
      dispose()
    })
  })

  describe('variants', () => {
    it('answers a capital, a shifted key being the same key', () => {
      const { node, store, dispose } = attach()

      node.dispatchEvent(keyEvent('P'))

      expect(store.getState().tool).toBe('draw')
      dispose()
    })

    it('borrows the hand while ‹space› is held, and gives it back', () => {
      const { node, store, dispose } = attach()
      store.getState().selectTool('edit')
      const withArrow = node.style.cursor

      node.dispatchEvent(keyEvent(' '))
      expect(node.style.cursor).toContain('grab')

      node.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }))
      expect(node.style.cursor).toBe(withArrow)
      dispose()
    })

    it('shows the closed hand while the view is being dragged', () => {
      const { node, dispose } = attach()

      node.dispatchEvent(pointerEvent('pointerdown', { offsetX: 100, offsetY: 100 }))
      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 200, offsetY: 160 }))
      expect(node.style.cursor).toContain('grabbing')

      node.dispatchEvent(pointerEvent('pointerup', { offsetX: 200, offsetY: 160 }))
      expect(node.style.cursor).not.toContain('grabbing')
      dispose()
    })
  })

  describe('managed errors', () => {
    // THE guard of this rung. A tool can always be picked up; the cursor is what refuses, and it
    // refuses for BOTH tools — selecting points with nobody selected is selecting whose points?
    it('refuses under either tool while no polity is selected', () => {
      const { node, store, dispose } = attach()

      store.getState().selectTool('draw')
      expect(node.style.cursor).toBe('not-allowed')

      store.getState().selectTool('edit')
      expect(node.style.cursor).toBe('not-allowed')
      dispose()
    })

    it('stops refusing the moment a polity is aimed at, and refuses again after an undo', () => {
      const { node, store, dispose } = attach()
      store.getState().createPolity(
        {
          id: 'aquitaine',
          name: 'Duché d’Aquitaine',
          rank: 'duchy',
          status: null,
          suzerain: null,
          existsFrom: null,
          existsTo: null,
          colour: null,
          wikidata: null,
        },
        { kind: 'create-polity', label: 'create polity' }
      )

      store.getState().aimAt('aquitaine')
      expect(node.style.cursor).toContain('crosshair')

      // The target is session state and the polity is document state, so `ctrl+z` takes the subject
      // away under a tool that was legitimate a second earlier. Nothing watches for it: the cursor is
      // derived from whether the target resolves.
      store.getState().undo()
      expect(node.style.cursor).toBe('not-allowed')
      dispose()
    })
  })

  describe('unmanaged errors', () => {
    it('does not leave the hand up when the canvas loses focus mid-space', () => {
      const { node, dispose } = attach()
      node.dispatchEvent(keyEvent(' '))
      expect(node.style.cursor).toContain('grab')

      node.dispatchEvent(new FocusEvent('blur'))

      // Released on blur: a ‹space› let go over another window never reaches this node's keyup, and
      // the hand would stay up for ever — the shape a missing release always has.
      expect(node.style.cursor).toContain('grab')
      expect(node.style.cursor).not.toContain('grabbing')
      dispose()
    })
  })

  describe('edge cases', () => {
    it('writes the cursor on the canvas and never on the body', () => {
      const { node, store, dispose } = attach()

      store.getState().selectTool('draw')

      // The whole zone behaviour rests on this one line: `cursor` is an element's property, so the
      // browser restores the platform's pointer over the chrome by itself.
      expect(node.style.cursor).not.toBe('')
      expect(document.body.style.cursor).toBe('')
      dispose()
    })
  })
})
