import { afterEach, describe, expect, it, vi } from 'vitest'

import { AUTOMATIC_PALETTE } from '@europe-historical-atlas/core/data/regionPalette'
import { cloneYearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

import { openEmptyYear } from '../state/openEmptyYear'
import { createPolityColourSource } from '../state/polityColourSource'
import { createCartographerStore } from '../state/store'
import { TEST_BACKDROP_FRAME, TEST_LAND_MASK } from '../view/testFrame'
import { UNFRAMED } from '../view/viewport'
import { screenToBackdrop } from '../view/viewport'

import { startCanvasController } from './controller'
import { cursorCss } from './cursors'
import { createHistoryRelay } from './historyRelay'
import { coloursOf } from './liveCanvas'
import {
  DRAG_TOLERANCE,
  KEY_PAN_STEP,
  MAX_SCALE,
  scaleLimitsFor,
  wheelZoomFactor,
} from './navigation'
import { CHROME_PAINT_STYLE } from './style'
import { drawOutlineAt } from './testGestureContext'

import type { HistoryRelay } from './historyRelay'
import type { SnapLine } from '../geometry/lineSnap'
import type { CartographerStoreHook } from '../state/store'
import type { PenMode } from '../state/toolSlice'
import type { NamedPolyline } from '../vectorLayers'

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

/**
 * Everything one attached canvas needs, plus the handle to tear it down.
 * @param maxSnapReachKm - the far-view threshold (`H-34`); lifted by default, so suites about other
 *   gestures draw at the opening view as they always have
 * @returns the canvas, the store, the three status spies and the teardown
 */
function attach(maxSnapReachKm = Infinity): {
  node: HTMLCanvasElement
  store: CartographerStoreHook
  hovered: ReturnType<typeof vi.fn>
  acted: ReturnType<typeof vi.fn>
  resulted: ReturnType<typeof vi.fn>
  history: HistoryRelay
  dispose: () => void
} {
  const history = createHistoryRelay()
  const hovered = vi.fn()
  const acted = vi.fn()
  const resulted = vi.fn()
  const store = createCartographerStore({
    edition: { document: openEmptyYear(1100), clone: cloneYearDocument },
    viewport: { viewport: UNFRAMED },
  })
  const node = canvasWithBox()
  const dispose = startCanvasController(node, {
    store,
    frame: TEST_BACKDROP_FRAME,
    backdropImage: backdropStandIn(),
    vectorLayers: {
      coast: [],
      rivers: [],
      coastProvenance: { name: 'test coast', licence: 'test' },
      riverProvenance: { name: 'test rivers', licence: 'test' },
    },
    onHover: hovered,
    onFeature: () => undefined,
    onAction: acted,
    onResult: resulted,
    maxSnapReachKm,
    style: CHROME_PAINT_STYLE,
    zoneLabel: 'zone',
    overlay: document.createElement('canvas'),
    colours: createPolityColourSource(AUTOMATIC_PALETTE),
    history,
    landMask: TEST_LAND_MASK,
  })
  return { node, store, hovered, acted, resulted, history, dispose }
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

      const event = pointerEvent('wheel', { offsetX: at[0], offsetY: at[1], deltaY: -100 })
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
      node.dispatchEvent(pointerEvent('wheel', { offsetX: 10, offsetY: 10, deltaY: -100 }))
      const zoomedIn = store.getState().viewport.scale

      node.dispatchEvent(pointerEvent('wheel', { offsetX: 10, offsetY: 10, deltaY: 100 }))

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

      node.dispatchEvent(pointerEvent('wheel', { offsetX: 10, offsetY: 10, deltaY: 100 }))

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
          vectorLayers: {
            coast: [],
            rivers: [],
            coastProvenance: { name: 'test coast', licence: 'test' },
            riverProvenance: { name: 'test rivers', licence: 'test' },
          },
          onHover: () => undefined,
          onFeature: () => undefined,
          onAction: () => undefined,
          onResult: () => undefined,
          history: createHistoryRelay(),
          landMask: TEST_LAND_MASK,
          maxSnapReachKm: Infinity,
          style: CHROME_PAINT_STYLE,
          zoneLabel: 'zone',
          overlay: document.createElement('canvas'),
          colours: createPolityColourSource(AUTOMATIC_PALETTE),
        })
      ).toThrow(/no 2D context/)
    })
  })

  describe('edge cases', () => {
    it('stops listening once torn down, so a detached canvas moves nothing', () => {
      const { node, store, dispose } = attach()
      dispose()
      const settled = store.getState().viewport

      node.dispatchEvent(pointerEvent('wheel', { offsetX: 10, offsetY: 10, deltaY: -100 }))
      node.dispatchEvent(pointerEvent('pointerdown', { offsetX: 0, offsetY: 0 }))
      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 200, offsetY: 0 }))

      expect(store.getState().viewport).toEqual(settled)
    })

    it('survives being attached and torn down twice, which StrictMode does in development', () => {
      const first = attach()
      first.dispose()
      const second = attach()
      const settled = second.store.getState().viewport

      second.node.dispatchEvent(pointerEvent('wheel', { offsetX: 10, offsetY: 10, deltaY: -100 }))

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

describe('repaint coalescing', () => {
  // The dev, 2026-10-12: the anchors a marquee caught showed as selected only after another click.
  it('repaints the static canvas when a marquee is released, so its anchors show at once', () => {
    const frames = frameControl()
    const { node, store, dispose } = attach()
    aimAtFrance(store)
    for (const at of [...CANVAS_TRIANGLE, [301, 201] as const]) click(node, at)
    node.dispatchEvent(keyEvent('a'))
    node.dispatchEvent(pointerEvent('pointerdown', { offsetX: 250, offsetY: 150 }))
    node.dispatchEvent(pointerEvent('pointermove', { offsetX: 550, offsetY: 250 }))
    while (frames.asked() > 0) frames.run()
    node.dispatchEvent(pointerEvent('pointerup', { offsetX: 550, offsetY: 250 }))
    expect(frames.asked()).toBe(1)
    vi.unstubAllGlobals()
    dispose()
  })

  describe('happy path', () => {
    it('asks for one frame however many wheel events arrive between two', () => {
      const frames = frameControl()
      const { node, dispose } = attach()
      frames.run() // the paint `fireImmediately` asked for at wiring time

      for (let i = 0; i < 5; i++) {
        node.dispatchEvent(pointerEvent('wheel', { offsetX: 100, offsetY: 100, deltaY: -100 }))
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

      node.dispatchEvent(pointerEvent('wheel', { offsetX: 100, offsetY: 100, deltaY: -100 }))
      frames.run()
      node.dispatchEvent(pointerEvent('wheel', { offsetX: 100, offsetY: 100, deltaY: -100 }))

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
      node.dispatchEvent(pointerEvent('wheel', { offsetX: 100, offsetY: 100, deltaY: -100 }))

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

describe('wheelZoomFactor', () => {
  describe('happy path', () => {
    it('keeps a mouse notch at the 1.1 it always was', () => {
      // The one thing about the old behaviour that was right, so it is the calibration point.
      expect(wheelZoomFactor(-100, 0)).toBeCloseTo(1.1, 6)
      expect(wheelZoomFactor(100, 0)).toBeCloseTo(1 / 1.1, 6)
    })
  })

  describe('variants', () => {
    /*
     * THE guard, and it is what makes a trackpad the same device as a mouse.
     *
     * The version this replaces multiplied by a fixed factor per EVENT and discarded `deltaY`. A mouse
     * notch is one event; a trackpad swipe is sixty to a hundred and twenty a second — so the same
     * gesture was 1.1 on one and 1.1³⁰ ≈ 17× on the other. No constant fixes that; only arithmetic
     * that composes does.
     */
    it('is exponential, so many small events equal one large one', () => {
      const inOneGo = wheelZoomFactor(-100, 0)
      let stepped = 1
      for (let i = 0; i < 50; i += 1) stepped *= wheelZoomFactor(-2, 0)

      expect(stepped).toBeCloseTo(inOneGo, 9)
    })

    it('reads lines and pages as the travel they are, not as pixels', () => {
      // `deltaMode` 1 is lines, and a mouse reporting them is ordinary rather than exotic. Read as a
      // pixel, that mouse would be sixteen times gentler than the same mouse elsewhere.
      expect(wheelZoomFactor(-3, 1)).toBeCloseTo(wheelZoomFactor(-48, 0), 9)
      expect(wheelZoomFactor(-1, 2)).toBeCloseTo(wheelZoomFactor(-400, 0), 9)
    })

    it('is symmetrical: a swipe and its opposite return where they started', () => {
      expect(wheelZoomFactor(-37, 0) * wheelZoomFactor(37, 0)).toBeCloseTo(1, 12)
    })
  })

  describe('managed errors', () => {
    it('does nothing for no travel, rather than drifting', () => {
      expect(wheelZoomFactor(0, 0)).toBe(1)
    })

    it('treats an unknown delta mode as pixels rather than refusing', () => {
      // A mode we have never seen is likelier to be pixel-like than to be nothing, and the only other
      // answer — zooming by zero — would be a dead wheel with no message.
      expect(wheelZoomFactor(-100, 7)).toBeCloseTo(wheelZoomFactor(-100, 0), 9)
    })
  })

  describe('unmanaged errors', () => {
    it('stays finite for the enormous deltas a flung trackpad can report', () => {
      expect(Number.isFinite(wheelZoomFactor(-100_000, 0))).toBe(true)
      expect(wheelZoomFactor(100_000, 0)).toBeGreaterThan(0)
    })
  })

  describe('edge cases', () => {
    it('never returns a negative factor, which would mirror the map', () => {
      for (const delta of [-5000, -1, 0, 1, 5000])
        expect(wheelZoomFactor(delta, 0)).toBeGreaterThan(0)
    })
  })
})

/** France's identity, with nothing but an id and a name. */
const FRANCE_IDENTITY = {
  id: 'fr',
  name: 'Reaume de France',
  rank: null,
  status: null,
  suzerain: null,
  existsFrom: null,
  existsTo: null,
  colour: null,
  wikidata: null,
}

/**
 * Create a polity and aim the Pen at it, as `[+ New polity]`'s OK does.
 * @param store - the store
 */
function aimAtFrance(store: CartographerStoreHook): void {
  store.getState().createPolity(FRANCE_IDENTITY, { kind: 'create-polity', label: 'create' })
  store.getState().aimAt('fr')
}

/**
 * A click at a canvas position: a press and a release in place.
 * @param node - the canvas
 * @param at - where, in CSS pixels
 */
function click(node: HTMLCanvasElement, at: readonly [number, number]): void {
  node.dispatchEvent(pointerEvent('pointerdown', { offsetX: at[0], offsetY: at[1] }))
  node.dispatchEvent(pointerEvent('pointerup', { offsetX: at[0], offsetY: at[1] }))
}

/** Three points of a triangle in the middle of the canvas, where the backdrop always is. */
const CANVAS_TRIANGLE = [
  [300, 200],
  [500, 200],
  [500, 400],
] as const

/**
 * A view at a scale, its centre over a point of the backdrop near 46°N — where the reach is measured.
 * At scale 1 the snap reaches about 60 km there, at scale 8 about 7.5 km.
 * @param store - the store to position
 * @param scale - screen pixels per backdrop pixel
 */
function viewAtScale(store: CartographerStoreHook, scale: number): void {
  store.getState().setViewport({
    scale,
    originX: BOX.width / 2 - 640 * scale,
    originY: BOX.height / 2 - 560 * scale,
  })
}

describe('the tools from too far out (H-34)', () => {
  /** The threshold the application uses. */
  const TEN_KM = 10

  describe('happy path', () => {
    it('places nothing with the Pen from afar, and says why in the result zone and the console', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { node, store, resulted, dispose } = attach(TEN_KM)
      aimAtFrance(store)
      viewAtScale(store, 1)
      click(node, [400, 300])
      node.dispatchEvent(keyEvent('Escape'))

      expect(store.getState().document.anchors).toEqual([])
      expect(resulted).toHaveBeenLastCalledWith(
        expect.stringMatching(
          /^too far to draw — zoom in \(the snap would reach \d+\.\d km; the tools act within 10 km\)$/
        )
      )
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('too far to draw'))
      warn.mockRestore()
      dispose()
    })

    it('draws as before once close enough', () => {
      const { node, store, dispose } = attach(TEN_KM)
      aimAtFrance(store)
      viewAtScale(store, 8)
      for (const at of CANVAS_TRIANGLE) click(node, at)
      click(node, [301, 201])

      expect(store.getState().document.claims).toEqual([{ polity: 'fr', rings: [[0, 1, 2]] }])
      dispose()
    })
  })

  describe('variants', () => {
    it('asks to zoom in in the status bar from afar, and names the action again once close', () => {
      const { node, store, acted, dispose } = attach(TEN_KM)
      aimAtFrance(store)
      viewAtScale(store, 1)
      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 400, offsetY: 300 }))
      expect(acted).toHaveBeenLastCalledWith('Zoom in to draw in Reaume de France')

      viewAtScale(store, 8)
      expect(acted).toHaveBeenLastCalledWith('Drawing in Reaume de France')
      dispose()
    })

    it('refuses with the cursor from afar and gives the cross back once close, without a pointer move', () => {
      const { node, store, dispose } = attach(TEN_KM)
      aimAtFrance(store)
      viewAtScale(store, 1)
      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 400, offsetY: 300 }))
      expect(node.style.cursor).toBe('not-allowed')

      viewAtScale(store, 8)
      expect(node.style.cursor).toBe(cursorCss('cross'))
      dispose()
    })
  })

  describe('the result of a refusal', () => {
    it('is cleared when a zoom wakes the tools, so it no longer contradicts the bar', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { node, store, resulted, dispose } = attach(TEN_KM)
      aimAtFrance(store)
      viewAtScale(store, 1)
      click(node, [400, 300])
      expect(resulted).toHaveBeenLastCalledWith(expect.stringContaining('too far to draw'))

      viewAtScale(store, 8)
      expect(resulted).toHaveBeenLastCalledWith(null)
      warn.mockRestore()
      dispose()
    })

    it('is cleared when a zoom puts the tools to sleep, whatever it said', () => {
      const { node, store, resulted, dispose } = attach(TEN_KM)
      aimAtFrance(store)
      viewAtScale(store, 8)
      for (const at of CANVAS_TRIANGLE) click(node, at)
      click(node, [301, 201])
      resulted.mockClear()
      viewAtScale(store, 1)

      expect(resulted).toHaveBeenLastCalledWith(null)
      dispose()
    })

    it('is left alone by a zoom that does not cross the threshold', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { node, store, resulted, dispose } = attach(TEN_KM)
      aimAtFrance(store)
      viewAtScale(store, 1)
      click(node, [400, 300])
      viewAtScale(store, 1.5)

      expect(resulted).toHaveBeenLastCalledWith(expect.stringContaining('too far to draw'))
      warn.mockRestore()
      dispose()
    })
  })

  describe('managed errors', () => {
    it('lets the white arrow choose a polity by its fill from afar, and nothing else', () => {
      const { node, store, dispose } = attach(TEN_KM)
      aimAtFrance(store)
      viewAtScale(store, 8)
      for (const at of CANVAS_TRIANGLE) click(node, at)
      click(node, [301, 201])
      store.getState().chooseTarget(null)
      node.dispatchEvent(keyEvent('a'))
      viewAtScale(store, 1)
      // The triangle, seen from afar, shrinks about the centre of the canvas: its inside is still there.
      const inside: [number, number] = [400 + (430 - 400) / 8, 300 + (267 - 300) / 8]
      click(node, inside)

      expect(store.getState().target).toBe('fr')
      dispose()
    })

    it('moves no anchor when the white arrow is dragged from afar, and says so', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { node, store, resulted, dispose } = attach(TEN_KM)
      aimAtFrance(store)
      viewAtScale(store, 8)
      for (const at of CANVAS_TRIANGLE) click(node, at)
      click(node, [301, 201])
      node.dispatchEvent(keyEvent('a'))
      viewAtScale(store, 1)
      const before = store.getState().document.anchors.map(([lon, lat]) => [lon, lat])
      // A press on where the second anchor now sits, from afar, then a drag.
      const corner: [number, number] = [400 + (500 - 400) / 8, 300 + (200 - 300) / 8]
      node.dispatchEvent(pointerEvent('pointerdown', { offsetX: corner[0], offsetY: corner[1] }))
      node.dispatchEvent(
        pointerEvent('pointermove', { offsetX: corner[0] + 40, offsetY: corner[1] + 40 })
      )
      node.dispatchEvent(
        pointerEvent('pointerup', { offsetX: corner[0] + 40, offsetY: corner[1] + 40 })
      )

      expect(store.getState().document.anchors).toEqual(before)
      expect(resulted).toHaveBeenLastCalledWith(expect.stringContaining('too far to edit'))
      warn.mockRestore()
      dispose()
    })
  })

  describe('the keys from afar (QUAL-001)', () => {
    it('refuses Delete on a selection from afar, keeping the anchors, and says so', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { node, store, resulted, dispose } = attach(TEN_KM)
      aimAtFrance(store)
      viewAtScale(store, 8)
      for (const at of CANVAS_TRIANGLE) click(node, at)
      click(node, [301, 201])
      node.dispatchEvent(keyEvent('a'))
      click(node, [500, 200])
      viewAtScale(store, 1)
      node.dispatchEvent(keyEvent('Delete'))

      expect(store.getState().document.claims[0]?.rings[0]).toHaveLength(3)
      expect(resulted).toHaveBeenLastCalledWith(expect.stringContaining('too far to edit'))
      warn.mockRestore()
      dispose()
    })

    it('refuses Enter on an outline in hand from afar, and lets Escape throw it away', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { node, store, resulted, dispose } = attach(TEN_KM)
      aimAtFrance(store)
      viewAtScale(store, 8)
      for (const at of CANVAS_TRIANGLE) click(node, at)
      viewAtScale(store, 1)
      node.dispatchEvent(keyEvent('Enter'))
      expect(store.getState().document.claims).toEqual([])
      expect(resulted).toHaveBeenLastCalledWith(expect.stringContaining('too far to draw'))

      node.dispatchEvent(keyEvent('Escape'))
      viewAtScale(store, 8)
      node.dispatchEvent(keyEvent('Enter'))
      expect(store.getState().document.claims).toEqual([])
      warn.mockRestore()
      dispose()
    })
  })

  describe('unmanaged errors', () => {
    it('lays no Pencil point when dragged from afar', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { node, store, dispose } = attach(TEN_KM)
      aimAtFrance(store)
      store.getState().choosePenMode('pencil')
      viewAtScale(store, 1)
      stroke(
        node,
        [
          [300, 200],
          [350, 200],
          [400, 200],
          [400, 300],
        ],
        0
      )
      node.dispatchEvent(keyEvent('Enter'))

      expect(store.getState().document.anchors).toEqual([])
      warn.mockRestore()
      dispose()
    })
  })

  describe('edge cases', () => {
    it('says the view is not framed yet rather than printing an infinite reach', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { node, store, resulted, dispose } = attach(TEN_KM)
      aimAtFrance(store)
      store.getState().setViewport(UNFRAMED)
      click(node, [400, 300])

      expect(resulted).toHaveBeenLastCalledWith(
        'too far to draw — zoom in (the view is not framed yet; the tools act within 10 km)'
      )
      warn.mockRestore()
      dispose()
    })

    it('never refuses the hand from afar', () => {
      const { node, store, dispose } = attach(TEN_KM)
      aimAtFrance(store)
      store.getState().selectTool('navigate')
      viewAtScale(store, 1)
      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 400, offsetY: 300 }))

      expect(node.style.cursor).toBe(cursorCss('hand-open'))
      dispose()
    })
  })
})

describe('the tools on the canvas', () => {
  describe('happy path', () => {
    // s02 — place anchors, click the first, and the ring closes into the target's territory.
    it('draws a ring with the Pen and closes it on the first anchor', () => {
      const { node, store, dispose } = attach()
      aimAtFrance(store)
      for (const at of CANVAS_TRIANGLE) click(node, at)
      expect(store.getState().document.claims).toEqual([])
      click(node, [301, 201])
      expect(store.getState().document.claims).toEqual([{ polity: 'fr', rings: [[0, 1, 2]] }])
      dispose()
    })

    // s02 — "the status bar reads Drawing in Kingdom of France".
    it('names the action and its subject in the status bar', () => {
      const { node, store, acted, dispose } = attach()
      aimAtFrance(store)
      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 300, offsetY: 200 }))
      expect(acted).toHaveBeenLastCalledWith('Drawing in Reaume de France')
      dispose()
    })

    // s03 — "press on a handle and drag it … When I release / Then the move is committed".
    it('moves an anchor with the white arrow, and does not pan while doing it', () => {
      const { node, store, dispose } = attach()
      aimAtFrance(store)
      for (const at of [...CANVAS_TRIANGLE, [301, 201] as const]) click(node, at)
      node.dispatchEvent(keyEvent('a'))
      const view = store.getState().viewport
      const before = store.getState().document.anchors[1]
      node.dispatchEvent(pointerEvent('pointerdown', { offsetX: 500, offsetY: 200 }))
      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 540, offsetY: 240 }))
      node.dispatchEvent(pointerEvent('pointerup', { offsetX: 540, offsetY: 240 }))
      expect(store.getState().viewport).toEqual(view)
      expect(store.getState().document.anchors[1]).not.toEqual(before)
      expect(store.getState().undoLabel).toBe('move anchor')
      dispose()
    })
  })

  describe('variants', () => {
    // s02 — "a drag does not curve anything": and it does not pan either, or a long click loses its anchor.
    it('neither places nor pans on a drag with the Pen', () => {
      const { node, store, dispose } = attach()
      aimAtFrance(store)
      roomToPan(store)
      node.dispatchEvent(keyEvent('p'))
      const view = store.getState().viewport
      node.dispatchEvent(pointerEvent('pointerdown', { offsetX: 300, offsetY: 200 }))
      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 360, offsetY: 260 }))
      node.dispatchEvent(pointerEvent('pointerup', { offsetX: 360, offsetY: 260 }))
      expect(store.getState().viewport).toEqual(view)
      node.dispatchEvent(keyEvent('Enter'))
      expect(store.getState().document.claims).toEqual([])
      dispose()
    })

    it('still pans with ‹space› held under the Pen', () => {
      const { node, store, dispose } = attach()
      aimAtFrance(store)
      roomToPan(store)
      const view = store.getState().viewport
      node.dispatchEvent(keyEvent(' '))
      node.dispatchEvent(pointerEvent('pointerdown', { offsetX: 300, offsetY: 200 }))
      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 340, offsetY: 230 }))
      node.dispatchEvent(pointerEvent('pointerup', { offsetX: 340, offsetY: 230 }))
      expect(store.getState().viewport).not.toEqual(view)
      dispose()
    })
  })

  describe('managed errors', () => {
    // s02 — "no subject, so the bar says what to do about it".
    it('asks for a polity, and places nothing, with the Pen and no target', () => {
      const { node, store, acted, dispose } = attach()
      node.dispatchEvent(keyEvent('p'))
      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 300, offsetY: 200 }))
      expect(acted).toHaveBeenLastCalledWith('Select a polity to draw in')
      for (const at of CANVAS_TRIANGLE) click(node, at)
      node.dispatchEvent(keyEvent('Enter'))
      expect(store.getState().document.claims).toEqual([])
      dispose()
    })
  })

  describe('unmanaged errors', () => {
    // An outline begun for one polity must never be closed into another.
    it('abandons the outline in progress when the tool changes', () => {
      const { node, store, dispose } = attach()
      aimAtFrance(store)
      for (const at of CANVAS_TRIANGLE) click(node, at)
      node.dispatchEvent(keyEvent('a'))
      node.dispatchEvent(keyEvent('p'))
      node.dispatchEvent(keyEvent('Enter'))
      expect(store.getState().document.claims).toEqual([])
      dispose()
    })
  })

  describe('edge cases', () => {
    it('sizes the overlay with the drawing surface', () => {
      const overlay = document.createElement('canvas')
      const store = createCartographerStore({
        edition: { document: openEmptyYear(1100), clone: cloneYearDocument },
        viewport: { viewport: UNFRAMED },
      })
      const dispose = startCanvasController(canvasWithBox(), {
        store,
        frame: TEST_BACKDROP_FRAME,
        backdropImage: backdropStandIn(),
        vectorLayers: {
          coast: [],
          rivers: [],
          coastProvenance: { name: 'test coast', licence: 'test' },
          riverProvenance: { name: 'test rivers', licence: 'test' },
        },
        onHover: () => undefined,
        onFeature: () => undefined,
        onAction: () => undefined,
        onResult: () => undefined,
        history: createHistoryRelay(),
        landMask: TEST_LAND_MASK,
        maxSnapReachKm: Infinity,
        style: CHROME_PAINT_STYLE,
        zoneLabel: 'zone',
        overlay,
        colours: createPolityColourSource(AUTOMATIC_PALETTE),
      })
      expect([overlay.width, overlay.height]).toEqual([
        BOX.width * window.devicePixelRatio,
        BOX.height * window.devicePixelRatio,
      ])
      dispose()
    })

    it('stops reporting the action when the pointer leaves the canvas', () => {
      const { node, store, acted, dispose } = attach()
      store.getState().selectTool('draw')
      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 300, offsetY: 200 }))
      node.dispatchEvent(pointerEvent('pointerleave', {}))
      expect(acted).toHaveBeenLastCalledWith(null)
      dispose()
    })
  })
})

describe('the tools — what the review found', () => {
  describe('happy path', () => {
    // ARCH-101: assigning the overlay's size clears it, so a resize must leave it repainted. This holds
    // through two paths — `resize` repaints it itself, and the view `settle` publishes repaints it too —
    // and the test asserts the behaviour, not which path. Removing either alone does not fail it.
    it('keeps the outline in progress on screen across a resize', () => {
      let fire: () => void = () => undefined
      const original = globalThis.ResizeObserver
      globalThis.ResizeObserver = class {
        constructor(callback: ResizeObserverCallback) {
          fire = () => {
            callback([], this)
          }
        }
        observe = (): void => undefined
        unobserve = (): void => undefined
        disconnect = (): void => undefined
      }
      // What the overlay was last asked to draw: everything since its last clear.
      const ops: string[] = []
      const overlay = document.createElement('canvas')
      overlay.getContext = vi.fn(
        () =>
          new Proxy(
            {},
            {
              get: (_, op) => () => {
                ops.push(String(op))
              },
              set: () => true,
            }
          )
      ) as unknown as typeof overlay.getContext
      const store = createCartographerStore({
        edition: { document: openEmptyYear(1100), clone: cloneYearDocument },
        viewport: { viewport: UNFRAMED },
      })
      const node = canvasWithBox()
      const dispose = startCanvasController(node, {
        store,
        frame: TEST_BACKDROP_FRAME,
        backdropImage: backdropStandIn(),
        vectorLayers: {
          coast: [],
          rivers: [],
          coastProvenance: { name: 'test coast', licence: 'test' },
          riverProvenance: { name: 'test rivers', licence: 'test' },
        },
        onHover: () => undefined,
        onFeature: () => undefined,
        onAction: () => undefined,
        onResult: () => undefined,
        history: createHistoryRelay(),
        landMask: TEST_LAND_MASK,
        maxSnapReachKm: Infinity,
        style: CHROME_PAINT_STYLE,
        zoneLabel: 'zone',
        overlay,
        colours: createPolityColourSource(AUTOMATIC_PALETTE),
      })
      aimAtFrance(store)
      for (const at of CANVAS_TRIANGLE.slice(0, 2)) click(node, at)
      ops.length = 0
      fire()
      const lastPaint = ops.slice(ops.lastIndexOf('clearRect'))
      expect(ops).toContain('clearRect')
      expect(lastPaint.filter((op) => op === 'arc')).toHaveLength(2)
      dispose()
      globalThis.ResizeObserver = original
    })
  })

  describe('variants', () => {
    // QUAL-003: the sentence is reported when it changes, not on every pointer sample.
    it('reports an unchanged action sentence once', () => {
      const { node, store, acted, dispose } = attach()
      aimAtFrance(store)
      acted.mockClear()
      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 300, offsetY: 200 }))
      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 310, offsetY: 210 }))
      expect(acted).not.toHaveBeenCalled()
      dispose()
    })
  })

  describe('managed errors', () => {
    // A11Y-001: ‹cmd+P› prints and ‹ctrl+A› selects — they are the platform's, never a tool's.
    it('lets a key held with a modifier through, untouched', () => {
      const { node, store, dispose } = attach()
      for (const init of [
        { key: 'p', metaKey: true },
        { key: 'a', ctrlKey: true },
        { key: 'p', altKey: true },
      ]) {
        const event = new KeyboardEvent('keydown', { ...init, bubbles: true, cancelable: true })
        node.dispatchEvent(event)
        expect(event.defaultPrevented).toBe(false)
      }
      expect(store.getState().tool).toBe('navigate')
      dispose()
    })
  })

  describe('unmanaged errors', () => {
    // QUAL-005: a cancelled press did not happen — it places nothing and commits nothing.
    it('places no anchor when a Pen press is cancelled', () => {
      const { node, store, dispose } = attach()
      aimAtFrance(store)
      node.dispatchEvent(pointerEvent('pointerdown', { offsetX: 300, offsetY: 200 }))
      node.dispatchEvent(pointerEvent('pointercancel', { offsetX: 300, offsetY: 200 }))
      for (const at of CANVAS_TRIANGLE.slice(1)) click(node, at)
      node.dispatchEvent(keyEvent('Enter'))
      expect(store.getState().document.claims).toEqual([])
      dispose()
    })

    it('drops a drag the system cancels, recording nothing', () => {
      const { node, store, dispose } = attach()
      aimAtFrance(store)
      for (const at of [...CANVAS_TRIANGLE, [301, 201] as const]) click(node, at)
      node.dispatchEvent(keyEvent('a'))
      const before = store.getState().document.anchors[1]
      node.dispatchEvent(pointerEvent('pointerdown', { offsetX: 500, offsetY: 200 }))
      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 540, offsetY: 240 }))
      node.dispatchEvent(pointerEvent('pointercancel', { offsetX: 540, offsetY: 240 }))
      expect(store.getState().document.anchors[1]).toEqual(before)
      expect(store.getState().undoLabel).not.toBe('move anchor')
      dispose()
    })
  })

  describe('edge cases', () => {
    // QUAL-003: the colours are derived once per version — a pan must not re-derive adjacency.
    it('derives the colours once per edition version', () => {
      const store = createCartographerStore({
        edition: { document: openEmptyYear(1100), clone: cloneYearDocument },
        viewport: { viewport: UNFRAMED },
      })
      const it = { deps: { store, colours: createPolityColourSource(AUTOMATIC_PALETTE) } }
      const first = coloursOf(it)
      expect(coloursOf(it)).toBe(first)
      aimAtFrance(store)
      expect(coloursOf(it)).not.toBe(first)
    })

    // The painters skip a claim naming an unknown polity; this is where that is said — once per version.
    it('reports a faulty document once per version, not once per frame', () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const store = createCartographerStore({
        edition: { document: openEmptyYear(1100), clone: cloneYearDocument },
        viewport: { viewport: UNFRAMED },
      })
      store.getState().document.claims.push({ polity: 'ghost', rings: [] })
      const it = { deps: { store, colours: createPolityColourSource(AUTOMATIC_PALETTE) } }
      coloursOf(it)
      coloursOf(it)
      expect(error).toHaveBeenCalledTimes(1)
      expect(error).toHaveBeenCalledWith(expect.stringContaining('"ghost"'))
      error.mockRestore()
    })
  })
})

/**
 * A history key, as the browser fires it.
 * @param init - the key and its modifiers
 * @returns the event
 */
function chord(init: KeyboardEventInit): KeyboardEvent {
  return new KeyboardEvent('keydown', { ...init, bubbles: true, cancelable: true })
}

describe('undo and redo from the keyboard', () => {
  describe('happy path', () => {
    it('undoes a closed ring on ‹ctrl+Z› and redoes it on ‹ctrl+shift+Z›', () => {
      const { node, store, dispose } = attach()
      aimAtFrance(store)
      for (const at of [...CANVAS_TRIANGLE, [301, 201] as const]) click(node, at)
      const undo = chord({ key: 'z', ctrlKey: true })
      node.dispatchEvent(undo)
      expect(undo.defaultPrevented).toBe(true)
      expect(store.getState().document.claims).toEqual([])
      node.dispatchEvent(chord({ key: 'Z', ctrlKey: true, shiftKey: true }))
      expect(store.getState().document.claims).toHaveLength(1)
      dispose()
    })
  })

  describe('variants', () => {
    // ARCH-101: from {Polities}, ctrl+Z takes the same path as on the canvas — an outline in progress is
    // taken back first, never the history under it.
    it('takes back the outline in progress on ‹ctrl+Z› pressed in the panel, not the history', () => {
      const { node, store, dispose } = attach()
      aimAtFrance(store)
      const [first, second] = CANVAS_TRIANGLE
      click(node, first)
      click(node, second)
      const list = document.body.appendChild(document.createElement('ul'))
      const undo = chord({ key: 'z', ctrlKey: true })
      list.dispatchEvent(undo)
      expect(undo.defaultPrevented).toBe(true)
      expect(store.getState().document.polities).toHaveLength(1)
      expect(store.getState().canUndo).toBe(true)
      dispose()
    })

    it('stops hearing the page once detached', () => {
      const { store, dispose } = attach()
      aimAtFrance(store)
      dispose()
      const undo = chord({ key: 'z', ctrlKey: true })
      document.body.dispatchEvent(undo)
      expect(undo.defaultPrevented).toBe(false)
      expect(store.getState().document.polities).toHaveLength(1)
    })

    it('answers ‹cmd› as ‹ctrl›', () => {
      const { node, store, dispose } = attach()
      aimAtFrance(store)
      for (const at of [...CANVAS_TRIANGLE, [301, 201] as const]) click(node, at)
      node.dispatchEvent(chord({ key: 'z', metaKey: true }))
      expect(store.getState().document.claims).toEqual([])
      dispose()
    })

    // The document bar's buttons run through the relay, so they take the keys' path — ARCH-101 again.
    it('takes back the outline in progress when the Undo button runs, not the history', () => {
      const { node, store, history, dispose } = attach()
      aimAtFrance(store)
      const [first, second] = CANVAS_TRIANGLE
      click(node, first)
      click(node, second)
      expect(history.run('undo')).toBe(true)
      expect(store.getState().document.polities).toHaveLength(1)
      expect(store.getState().canUndo).toBe(true)
      dispose()
    })

    it('undoes and redoes a closed outline when the buttons run', () => {
      const { node, store, history, dispose } = attach()
      aimAtFrance(store)
      for (const at of [...CANVAS_TRIANGLE, [301, 201] as const]) click(node, at)
      history.run('undo')
      expect(store.getState().document.claims).toEqual([])
      history.run('redo')
      expect(store.getState().document.claims).toHaveLength(1)
      dispose()
    })

    it('leaves the relay once detached, so the buttons stop reaching a torn-down canvas', () => {
      const { store, history, dispose } = attach()
      aimAtFrance(store)
      dispose()
      expect(history.run('undo')).toBe(false)
    })
  })

  describe('managed errors', () => {
    // The other modified keys stay the platform's — the history's two are the only exception.
    // A11Y review: ‹ctrl+space› is the input method's, not the hand's.
    it('lets ‹ctrl+space› through without borrowing the hand', () => {
      const { node, dispose } = attach()
      const space = chord({ key: ' ', ctrlKey: true })
      node.dispatchEvent(space)
      expect(space.defaultPrevented).toBe(false)
      expect(node.style.cursor).not.toContain('hand-closed')
      dispose()
    })

    it('still lets ‹ctrl+A› through untouched', () => {
      const { node, store, dispose } = attach()
      const select = chord({ key: 'a', ctrlKey: true })
      node.dispatchEvent(select)
      expect(select.defaultPrevented).toBe(false)
      expect(store.getState().tool).toBe('navigate')
      dispose()
    })
  })

  describe('unmanaged errors', () => {
    it('takes the outline in progress before the gesture before it', () => {
      const { node, store, dispose } = attach()
      aimAtFrance(store)
      for (const at of [...CANVAS_TRIANGLE, [301, 201] as const]) click(node, at)
      click(node, [600, 300])
      node.dispatchEvent(chord({ key: 'z', ctrlKey: true }))
      expect(store.getState().document.claims).toHaveLength(1)
      dispose()
    })
  })

  describe('edge cases', () => {
    // s03 — the undo takes the polity's creation back too, and the Pen loses its subject on its own.
    it('walks back past the outline to the polity’s creation', () => {
      const { node, store, dispose } = attach()
      aimAtFrance(store)
      for (const at of [...CANVAS_TRIANGLE, [301, 201] as const]) click(node, at)
      // The first press reopens the outline into the hand; Escape lets it go; the next undoes the creation.
      node.dispatchEvent(chord({ key: 'z', ctrlKey: true }))
      node.dispatchEvent(keyEvent('Escape'))
      node.dispatchEvent(chord({ key: 'z', ctrlKey: true }))
      expect(store.getState().document.polities).toEqual([])
      expect(node.style.cursor).toBe('not-allowed')
      dispose()
    })
  })
})

/**
 * An overlay canvas that records every lineWidth it is given, with a marker at each clear — the last
 * paint is what shows, and the snap preview is the one stroke three times the path's width.
 * @returns the overlay, and the widths of its last paint
 */
function widthRecordingOverlay() {
  const widths: (number | 'clear')[] = []
  const overlay = document.createElement('canvas')
  overlay.getContext = vi.fn(
    () =>
      new Proxy(
        {},
        {
          get: (_, op) => () => {
            if (op === 'clearRect') widths.push('clear')
          },
          set: (_, key, value: unknown) => {
            if (key === 'lineWidth' && typeof value === 'number') widths.push(value)
            return true
          },
        }
      )
  ) as unknown as typeof overlay.getContext
  return { overlay, lastPaint: () => widths.slice(widths.lastIndexOf('clear')) }
}

/**
 * A square island at backdrop (500, 300)–(600, 400), a vertex every 10 — screen (260, 18)–(360, 118)
 * under `attachWithShore`'s view — numbered clockwise from its top-left corner.
 */
const SQUARE_ISLAND: SnapLine = {
  points: [
    ...Array.from({ length: 10 }, (_, i): [number, number] => [500 + i * 10, 300]),
    ...Array.from({ length: 10 }, (_, i): [number, number] => [600, 300 + i * 10]),
    ...Array.from({ length: 10 }, (_, i): [number, number] => [600 - i * 10, 400]),
    ...Array.from({ length: 10 }, (_, i): [number, number] => [500, 400 - i * 10]),
  ],
  closed: true,
  bounds: { left: 500, top: 300, right: 600, bottom: 400 },
}

/**
 * A canvas whose coast is one long horizontal shore across the backdrop, at backdrop y = 500.
 * @param overlay - the overlay canvas
 * @param rivers - the river centrelines, none by default
 * @param mode - the Pen's mode, following the coast by default
 * @param islands - more coast contours beside the shore, none by default
 * @returns the attachment
 */
function attachWithShore(
  overlay: HTMLCanvasElement = document.createElement('canvas'),
  rivers: readonly NamedPolyline[] = [],
  mode: PenMode = 'coast',
  islands: readonly SnapLine[] = []
) {
  const acted = vi.fn()
  const resulted = vi.fn()
  const store = createCartographerStore({
    edition: { document: openEmptyYear(1100), clone: cloneYearDocument },
    viewport: { viewport: UNFRAMED },
  })
  const shore = {
    points: Array.from({ length: 121 }, (_, index): [number, number] => [index * 10, 500]),
    closed: false,
    bounds: { left: 0, top: 500, right: 1200, bottom: 500 },
  }
  const node = canvasWithBox()
  const dispose = startCanvasController(node, {
    store,
    frame: TEST_BACKDROP_FRAME,
    backdropImage: backdropStandIn(),
    vectorLayers: {
      coast: [shore, ...islands],
      rivers,
      coastProvenance: { name: 'test shore', licence: 'CC0' },
      riverProvenance: { name: 'test rivers', licence: 'test' },
    },
    onHover: () => undefined,
    onFeature: () => undefined,
    onAction: acted,
    onResult: resulted,
    history: createHistoryRelay(),
    landMask: TEST_LAND_MASK,
    maxSnapReachKm: Infinity,
    style: CHROME_PAINT_STYLE,
    zoneLabel: 'zone',
    overlay,
    colours: createPolityColourSource(AUTOMATIC_PALETTE),
  })
  aimAtFrance(store)
  store.getState().choosePenMode(mode)
  // A view where a backdrop pixel is a screen pixel, so the shore sits at screen y = 500 - 282.
  store.getState().setViewport({ scale: 1, originX: -240, originY: -282 })
  return { node, store, acted, resulted, dispose }
}

/** The Maas, at backdrop y = 700 — screen y = 418, 200 px below `attachWithShore`'s shore. */
const MAAS: NamedPolyline = {
  points: Array.from({ length: 121 }, (_, index): [number, number] => [index * 10, 700]),
  closed: false,
  bounds: { left: 0, top: 700, right: 1200, bottom: 700 },
  name: 'Maas',
  rank: 3,
}

describe('the Pen following the coast, on the canvas', () => {
  describe('happy path', () => {
    it('inserts the stretch between two clicks on the shore, and reports it', () => {
      const { node, store, resulted, dispose } = attachWithShore()
      click(node, [60, 218])
      click(node, [160, 218])
      expect(resulted).toHaveBeenLastCalledWith('inserted 10 vertices from the coastline')
      node.dispatchEvent(keyEvent('Escape'))
      expect(store.getState().document.claims).toEqual([])
      dispose()
    })
  })

  describe('variants', () => {
    // s02 — the bar names what the Pen is doing while the coast is within reach.
    it('says it is following the coastline while the shore is within reach', () => {
      const { node, acted, dispose } = attachWithShore()
      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 60, offsetY: 220 }))
      expect(acted).toHaveBeenLastCalledWith('Following the coastline for Reaume de France')
      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 60, offsetY: 400 }))
      expect(acted).toHaveBeenLastCalledWith(
        'Drawing in Reaume de France — no coastline within reach, placing points freely'
      )
      dispose()
    })
  })

  describe('managed errors', () => {
    it('clears the result on the next press', () => {
      const { node, resulted, dispose } = attachWithShore()
      click(node, [60, 218])
      click(node, [160, 218])
      node.dispatchEvent(pointerEvent('pointerdown', { offsetX: 300, offsetY: 400 }))
      expect(resulted).toHaveBeenLastCalledWith(null)
      dispose()
    })
  })

  describe('unmanaged errors', () => {
    // L4: N/A beyond the gestures' own tests — the canvas only routes the click to them.
    it('places a free point off the shore', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { node, resulted, dispose } = attachWithShore()
      click(node, [60, 400])
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('no coastline within reach'))
      expect(resulted).not.toHaveBeenCalledWith(expect.stringContaining('inserted'))
      warn.mockRestore()
      dispose()
    })
  })

  describe('edge cases', () => {
    it('takes the shore’s vertices back with one undo once the ring is closed', () => {
      const { node, store, dispose } = attachWithShore()
      click(node, [60, 218])
      click(node, [160, 218])
      store.getState().choosePenMode('free')
      click(node, [110, 300])
      click(node, [61, 219])
      expect(store.getState().document.claims).toHaveLength(1)
      node.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }))
      expect(store.getState().document.claims).toEqual([])
      dispose()
    })
  })

  describe('following a river', () => {
    // s02 — "Following the Maas for Kingdom of France"; and since 2026-10-12 the shore is offered too,
    // whatever the mode ("The Pen finds the coast and the rivers by itself").
    it('names the river within reach, the coastline on the shore, and says when neither is', () => {
      const { node, acted, dispose } = attachWithShore(undefined, [MAAS], 'river')
      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 60, offsetY: 420 }))
      expect(acted).toHaveBeenLastCalledWith('Following the Maas for Reaume de France')
      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 60, offsetY: 220 }))
      expect(acted).toHaveBeenLastCalledWith('Following the coastline for Reaume de France')
      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 60, offsetY: 320 }))
      expect(acted).toHaveBeenLastCalledWith(
        'Drawing in Reaume de France — no river within reach, placing points freely'
      )
      dispose()
    })

    it('inserts the stretch between two clicks on the river, and names it in the report', () => {
      const { node, resulted, dispose } = attachWithShore(undefined, [MAAS], 'river')
      click(node, [60, 418])
      click(node, [160, 418])
      expect(resulted).toHaveBeenLastCalledWith('inserted 10 vertices from the Maas')
      dispose()
    })

    it('shows the snap cursor over the river, and the plain cross away from any water', () => {
      const { node, dispose } = attachWithShore(undefined, [MAAS], 'river')
      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 60, offsetY: 320 }))
      const onLand = node.style.cursor
      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 60, offsetY: 420 }))
      expect(node.style.cursor).not.toBe(onLand)
      dispose()
    })

    // A mode chosen in the Pen's group, the pointer still on the canvas: the offer follows at once.
    it('updates the sentence when the mode changes with the pointer parked', () => {
      const { node, store, acted, dispose } = attachWithShore(undefined, [MAAS], 'coast')
      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 60, offsetY: 320 }))
      expect(acted).toHaveBeenLastCalledWith(
        'Drawing in Reaume de France — no coastline within reach, placing points freely'
      )
      store.getState().choosePenMode('river')
      expect(acted).toHaveBeenLastCalledWith(
        'Drawing in Reaume de France — no river within reach, placing points freely'
      )
      dispose()
    })
  })

  describe('a neighbour along the same shore', () => {
    // The dev's case, Spain then Portugal (2026-10-11): over the neighbour's coast anchor the Pen keeps
    // following the coast, rather than offering to branch.
    it('says it follows the coastline over a neighbour’s coast anchor, not that it branches', () => {
      const { node, store, acted, dispose } = attachWithShore()
      click(node, [60, 218])
      click(node, [160, 218])
      store.getState().choosePenMode('free')
      click(node, [110, 300])
      click(node, [61, 219])
      store
        .getState()
        .createPolity(
          { ...FRANCE_IDENTITY, id: 'pt', name: 'Portucale' },
          { kind: 'create-polity', label: 'create' }
        )
      store.getState().aimAt('pt')
      store.getState().choosePenMode('coast')
      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 160, offsetY: 219 }))
      expect(acted).toHaveBeenLastCalledWith('Following the coastline for Portucale')
      dispose()
    })
  })

  describe('what the review found', () => {
    // QUAL-107: the snap cursor reaches the canvas, and goes off the shore.
    it('shows the snap cursor over the shore, and the plain cross away from it', () => {
      const { node, dispose } = attachWithShore()
      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 60, offsetY: 220 }))
      expect(node.style.cursor).toContain('crosshair')
      const onShore = node.style.cursor
      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 60, offsetY: 400 }))
      expect(node.style.cursor).not.toBe(onShore)
      dispose()
    })

    // QUAL-109: Backspace takes back what the result described, so the result goes too.
    it('clears the result when Backspace takes the inserted anchors back', () => {
      const { node, resulted, dispose } = attachWithShore()
      click(node, [60, 218])
      click(node, [160, 218])
      node.dispatchEvent(keyEvent('Backspace'))
      expect(resulted).toHaveBeenLastCalledWith(null)
      dispose()
    })

    // QUAL-102: on the first anchor the click closes with a straight segment, so the overlay must not
    // preview a stretch of coast there. The sentence alone cannot tell: closing wins it either way.
    it('previews no coast on the outline’s first anchor, where the click closes', () => {
      const { overlay, lastPaint } = widthRecordingOverlay()
      const { node, acted, dispose } = attachWithShore(overlay)
      click(node, [60, 218])
      click(node, [160, 218])
      // Further along the shore the preview is drawn — so the check below is one that can fail.
      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 260, offsetY: 219 }))
      expect(lastPaint()).toContain(CHROME_PAINT_STYLE.pathWidth * 3)
      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 61, offsetY: 219 }))
      expect(acted).toHaveBeenLastCalledWith('Closing the outline of Reaume de France')
      expect(lastPaint()).not.toContain(CHROME_PAINT_STYLE.pathWidth * 3)
      dispose()
    })

    // The dev, Danish islands, 2026-10-14: round an island, the closing click lays the coast back to the
    // first anchor — and the overlay shows that stretch before the click, as for any snapped click.
    it('previews the coast back to the first anchor where the closing click follows it', () => {
      const { overlay, lastPaint } = widthRecordingOverlay()
      const { node, acted, dispose } = attachWithShore(overlay, [], 'coast', [SQUARE_ISLAND])
      click(node, [260, 18])
      click(node, [360, 68])
      click(node, [260, 118])
      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 261, offsetY: 19 }))
      expect(acted).toHaveBeenLastCalledWith('Closing the outline of Reaume de France')
      expect(lastPaint()).toContain(CHROME_PAINT_STYLE.pathWidth * 3)
      dispose()
    })

    // QUAL-104: with the hand borrowed, the Pen offers no coast vertex — a click would pan, not snap.
    it('offers no coast vertex while ‹space› lends the hand', () => {
      const ops: string[] = []
      const overlay = document.createElement('canvas')
      overlay.getContext = vi.fn(
        () =>
          new Proxy(
            {},
            {
              get: (_, op) => () => {
                ops.push(String(op))
              },
              set: () => true,
            }
          )
      ) as unknown as typeof overlay.getContext
      const { node, dispose } = attachWithShore(overlay)
      const lastPaint = () => ops.slice(ops.lastIndexOf('clearRect'))
      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 60, offsetY: 219 }))
      expect(lastPaint()).toContain('arc')
      node.dispatchEvent(keyEvent(' '))
      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 62, offsetY: 219 }))
      expect(lastPaint()).not.toContain('arc')
      dispose()
    })
  })
})

describe('choosing a polity by its fill, on the canvas', () => {
  describe('happy path', () => {
    it('aims at the polity pressed in with the arrow, and the cursor stops refusing over it', () => {
      const { node, store, dispose } = attach()
      aimAtFrance(store)
      for (const at of [...CANVAS_TRIANGLE, [301, 201] as const]) click(node, at)
      store.setState({ target: null })
      node.dispatchEvent(keyEvent('a'))
      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 450, offsetY: 260 }))
      expect(node.style.cursor).not.toBe('not-allowed')
      click(node, [450, 260])
      expect(store.getState().target).toBe('fr')
      expect(store.getState().tool).toBe('edit')
      dispose()
    })
  })

  describe('variants', () => {
    it('still refuses the arrow over unclaimed ground with nobody aimed at', () => {
      const { node, store, dispose } = attach()
      node.dispatchEvent(keyEvent('a'))
      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 450, offsetY: 260 }))
      expect(node.style.cursor).toBe('not-allowed')
      expect(store.getState().target).toBeNull()
      dispose()
    })
  })

  describe('managed errors', () => {
    // L3: N/A — a press over nothing keeps what was aimed at; covered by the gestures' own tests.
    it('places no anchor with the Pen in a fill: the Pen draws, it does not choose', () => {
      const { node, store, dispose } = attach()
      aimAtFrance(store)
      for (const at of [...CANVAS_TRIANGLE, [301, 201] as const]) click(node, at)
      click(node, [450, 260])
      node.dispatchEvent(keyEvent('Escape'))
      expect(store.getState().document.claims).toHaveLength(1)
      dispose()
    })
  })

  describe('unmanaged errors', () => {
    // L4: N/A — pure geometry over projected rings; a degenerate ring is covered in fillHit's tests.
    it('chooses nothing when the document holds no territory', () => {
      const { node, store, dispose } = attach()
      node.dispatchEvent(keyEvent('a'))
      click(node, [450, 260])
      expect(store.getState().target).toBeNull()
      dispose()
    })
  })

  describe('edge cases', () => {
    it('keeps the target when the press is in its own fill', () => {
      const { node, store, dispose } = attach()
      aimAtFrance(store)
      for (const at of [...CANVAS_TRIANGLE, [301, 201] as const]) click(node, at)
      node.dispatchEvent(keyEvent('a'))
      click(node, [500, 200])
      click(node, [450, 260])
      expect(store.getState().target).toBe('fr')
      dispose()
    })
  })
})

describe('the Pen meeting a shared border, on the canvas', () => {
  it('names the shared anchor under the Pen in the status bar, and joins it on click', () => {
    const { node, store, acted, dispose } = attach()
    aimAtFrance(store)
    for (const at of [...CANVAS_TRIANGLE, [301, 201] as const]) click(node, at)
    store.getState().createPolity(
      {
        id: 'hre',
        name: 'Sacrum Imperium',
        rank: null,
        status: null,
        suzerain: null,
        existsFrom: null,
        existsTo: null,
        colour: null,
        wikidata: null,
      },
      { kind: 'create-polity', label: 'create' }
    )
    store.getState().aimAt('hre')
    node.dispatchEvent(pointerEvent('pointermove', { offsetX: 501, offsetY: 201 }))
    expect(acted).toHaveBeenLastCalledWith('Branching from a shared anchor — held by 1 path')
    // The branching mark is gone (the dev, 2026-10-11): the plain cross, and the click still joins.
    expect(node.style.cursor).toBe(cursorCss('cross'))
    click(node, [501, 201])
    click(node, [501, 399])
    click(node, [650, 300])
    click(node, [500, 200])
    expect(store.getState().document.anchors).toHaveLength(4)
    dispose()
  })

  // QUAL-003: the run between two shared anchors is drawn on the overlay before the click.
  it('previews the shared border on the overlay before the click', () => {
    const widths: (number | 'clear')[] = []
    const overlay = document.createElement('canvas')
    overlay.getContext = vi.fn(
      () =>
        new Proxy(
          {},
          {
            get: (_, op) => () => {
              if (op === 'clearRect') widths.push('clear')
            },
            set: (_, key, value: unknown) => {
              if (key === 'lineWidth' && typeof value === 'number') widths.push(value)
              return true
            },
          }
        )
    ) as unknown as typeof overlay.getContext
    const store = createCartographerStore({
      edition: { document: openEmptyYear(1100), clone: cloneYearDocument },
      viewport: { viewport: UNFRAMED },
    })
    const node = canvasWithBox()
    const dispose = startCanvasController(node, {
      store,
      frame: TEST_BACKDROP_FRAME,
      backdropImage: backdropStandIn(),
      vectorLayers: {
        coast: [],
        rivers: [],
        coastProvenance: { name: 'test coast', licence: 'test' },
        riverProvenance: { name: 'test rivers', licence: 'test' },
      },
      onHover: () => undefined,
      onFeature: () => undefined,
      onAction: () => undefined,
      onResult: () => undefined,
      history: createHistoryRelay(),
      landMask: TEST_LAND_MASK,
      maxSnapReachKm: Infinity,
      style: CHROME_PAINT_STYLE,
      zoneLabel: 'zone',
      overlay,
      colours: createPolityColourSource(AUTOMATIC_PALETTE),
    })
    aimAtFrance(store)
    for (const at of [...CANVAS_TRIANGLE, [301, 201] as const]) click(node, at)
    store.getState().createPolity(
      {
        id: 'hre',
        name: 'Sacrum Imperium',
        rank: null,
        status: null,
        suzerain: null,
        existsFrom: null,
        existsTo: null,
        colour: null,
        wikidata: null,
      },
      { kind: 'create-polity', label: 'create' }
    )
    store.getState().aimAt('hre')
    const lastPaint = () => widths.slice(widths.lastIndexOf('clear'))
    click(node, [501, 201])
    node.dispatchEvent(pointerEvent('pointermove', { offsetX: 501, offsetY: 399 }))
    expect(lastPaint()).toContain(CHROME_PAINT_STYLE.pathWidth * 3)
    dispose()
  })
})

/**
 * France's triangle drawn and closed, the white arrow in hand.
 * @returns the attached canvas
 */
function attachWithTriangle() {
  const attached = attach()
  aimAtFrance(attached.store)
  for (const at of [...CANVAS_TRIANGLE, [301, 201] as const]) click(attached.node, at)
  attached.node.dispatchEvent(keyEvent('a'))
  return attached
}

describe('inserting with the Pen and deleting with the white arrow, on the canvas', () => {
  describe('happy path', () => {
    // s03 — the Pen inserts on a stretch, the white arrow selects the new anchor and Delete removes it.
    it('inserts an anchor with a Pen click on the top side, and Delete takes it out again', () => {
      const { node, store, resulted, dispose } = attachWithTriangle()
      node.dispatchEvent(keyEvent('p'))
      click(node, [400, 202])
      expect(store.getState().document.claims[0]?.rings).toEqual([[0, 3, 1, 2]])
      node.dispatchEvent(keyEvent('a'))
      click(node, [400, 200])
      node.dispatchEvent(keyEvent('Delete'))
      expect(store.getState().document.claims[0]?.rings).toEqual([[0, 1, 2]])
      expect(resulted).toHaveBeenLastCalledWith('removed an anchor')
      dispose()
    })
  })

  describe('the Pen', () => {
    it('shows the plus and names the insertion over a side, with no outline in progress', () => {
      const { node, store, acted, dispose } = attachWithTriangle()
      node.dispatchEvent(keyEvent('p'))
      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 400, offsetY: 202 }))
      expect(acted).toHaveBeenLastCalledWith('Inserting a point into Reaume de France')
      expect(node.style.cursor).toBe(cursorCss('cross-add'))
      click(node, [400, 202])
      expect(store.getState().document.claims[0]?.rings).toEqual([[0, 3, 1, 2]])
      dispose()
    })
  })

  describe('variants', () => {
    // The dev, 2026-10-14: the white arrow selects, it never adds — no plus, no insertion, over a side.
    it('shows the plain arrow over a side, and its click inserts nothing', () => {
      const { node, store, acted, dispose } = attachWithTriangle()
      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 400, offsetY: 202 }))
      expect(node.style.cursor).toBe(cursorCss('arrow'))
      expect(acted).not.toHaveBeenLastCalledWith('Inserting a point into Reaume de France')
      click(node, [400, 202])
      expect(store.getState().document.claims[0]?.rings).toEqual([[0, 1, 2]])
      dispose()
    })
  })

  describe('managed errors', () => {
    // The dev, 2026-10-14: nothing refuses a deletion — a point of a triangle takes the triangle.
    it('deletes the triangle whole when one of its points goes, and says so', () => {
      const { node, store, resulted, dispose } = attachWithTriangle()
      click(node, [500, 200])
      node.dispatchEvent(keyEvent('Backspace'))
      expect(store.getState().document.claims).toEqual([])
      expect(resulted).toHaveBeenLastCalledWith('removed 1 ring (1 anchor)')
      dispose()
    })
  })

  describe('unmanaged errors', () => {
    // L4: N/A beyond the gestures' own tests — the canvas only routes the press and the key to them.
    it('lets Delete through to the page when nothing is selected', () => {
      const { node, dispose } = attachWithTriangle()
      const key = keyEvent('Delete')
      node.dispatchEvent(key)
      expect(key.defaultPrevented).toBe(false)
      dispose()
    })
  })

  describe('edge cases', () => {
    it('takes the insertion back with one ctrl+Z', () => {
      const { node, store, dispose } = attachWithTriangle()
      node.dispatchEvent(keyEvent('p'))
      click(node, [400, 202])
      node.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }))
      expect(store.getState().document.claims[0]?.rings).toEqual([[0, 1, 2]])
      dispose()
    })
  })
})

/**
 * A pointer event carrying its own time stamp — the Pencil reads `event.timeStamp`, which the
 * constructor does not let a test set.
 * @param type - the event type
 * @param at - where, in CSS pixels
 * @param time - the time stamp, in milliseconds
 * @returns the event
 */
function timed(type: string, at: readonly [number, number], time: number): Event {
  const event = pointerEvent(type, { offsetX: at[0], offsetY: at[1] })
  Object.defineProperty(event, 'timeStamp', { value: time })
  return event
}

/**
 * One Pencil drag: pressed on the first point at `start`, moved through the others 250 ms apart,
 * released on the last.
 * @param node - the canvas
 * @param points - the pointer's path
 * @param start - the press's time stamp
 */
function stroke(
  node: HTMLCanvasElement,
  points: readonly (readonly [number, number])[],
  start: number
) {
  const [first, ...rest] = points
  if (first === undefined) return
  node.dispatchEvent(timed('pointerdown', first, start))
  rest.forEach((at, index) => {
    node.dispatchEvent(timed('pointermove', at, start + (index + 1) * 250))
  })
  node.dispatchEvent(timed('pointerup', rest.at(-1) ?? first, start + rest.length * 250))
}

describe('the Pencil on the canvas', () => {
  describe('happy path', () => {
    // The dev, 2026-10-11: a drag lays a point every 200 ms, and the outline closes as the Pen's does.
    it('lays a point per interval of a drag, and closes on enter', () => {
      const { node, store, dispose } = attach()
      aimAtFrance(store)
      store.getState().choosePenMode('pencil')
      const view = store.getState().viewport
      stroke(
        node,
        [
          [300, 200],
          [350, 200],
          [400, 200],
          [400, 300],
        ],
        0
      )
      node.dispatchEvent(keyEvent('Enter'))
      expect(store.getState().document.claims[0]?.rings[0]).toHaveLength(3)
      expect(store.getState().viewport).toEqual(view)
      dispose()
    })
  })

  describe('variants', () => {
    // The dev, 2026-10-11: pressing ‹P› again must change the Pen.
    it('goes round the Pen’s modes with P, the Pen in hand', () => {
      const { node, store, dispose } = attach()
      aimAtFrance(store)
      const modes = ['coast', 'river', 'pencil', 'free'].map(() => {
        node.dispatchEvent(keyEvent('p'))
        return store.getState().penMode
      })
      expect(modes).toEqual(['coast', 'river', 'pencil', 'free'])
      dispose()
    })

    // A11Y-010: focus is on the canvas, so the new mode is said in the result zone, a live region.
    it('says the new mode in the result zone when P changes it', () => {
      const { node, store, resulted, dispose } = attach()
      aimAtFrance(store)
      node.dispatchEvent(keyEvent('p'))
      expect(resulted).toHaveBeenLastCalledWith('Pen — follow the coast')
      dispose()
    })

    // A11Y-001: a tool taken with a key is said, the focus being on the canvas and not the rail.
    it('says the tool a key takes, and says nothing when it is already in hand', () => {
      const { node, store, resulted, dispose } = attach()
      aimAtFrance(store)
      node.dispatchEvent(keyEvent('a'))
      expect(resulted).toHaveBeenLastCalledWith('Direct Selection')
      resulted.mockClear()
      node.dispatchEvent(keyEvent('a'))
      expect(resulted).not.toHaveBeenCalled()
      dispose()
    })

    // A Pen taken from another tool is named by its mode, not as a bare Pen (review QUAL-004).
    it('says the Pen’s mode when P takes it from another tool', () => {
      const { node, store, resulted, dispose } = attach()
      aimAtFrance(store)
      store.getState().choosePenMode('river')
      node.dispatchEvent(keyEvent('a'))
      node.dispatchEvent(keyEvent('p'))
      expect(resulted).toHaveBeenLastCalledWith('Pen — follow a river')
      dispose()
    })

    it('takes the Pen with P from another tool, its mode unchanged', () => {
      const { node, store, dispose } = attach()
      aimAtFrance(store)
      store.getState().choosePenMode('river')
      node.dispatchEvent(keyEvent('a'))
      node.dispatchEvent(keyEvent('p'))
      expect(store.getState().tool).toBe('draw')
      expect(store.getState().penMode).toBe('river')
      dispose()
    })
  })

  describe('managed errors', () => {
    it('takes the last stroke back whole with ctrl+Z', () => {
      const { node, store, dispose } = attach()
      aimAtFrance(store)
      store.getState().choosePenMode('pencil')
      stroke(
        node,
        [
          [300, 200],
          [350, 200],
          [400, 200],
          [400, 300],
        ],
        0
      )
      stroke(
        node,
        [
          [450, 300],
          [480, 300],
          [500, 300],
          [500, 350],
        ],
        5000
      )
      node.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }))
      node.dispatchEvent(keyEvent('Enter'))
      expect(store.getState().document.claims[0]?.rings[0]).toHaveLength(3)
      dispose()
    })
  })

  describe('what the review found', () => {
    // ARCH-003. What the canvas shows: no point at the release. That the drag is also *ended* (its
    // off-map count said) is not observable here — the backdrop covers the canvas — and no test holds it.
    it('lays no point at the release after P turned the mode mid-drag', () => {
      const { node, store, dispose } = attach()
      aimAtFrance(store)
      store.getState().choosePenMode('pencil')
      node.dispatchEvent(timed('pointerdown', [300, 200], 0))
      node.dispatchEvent(timed('pointermove', [350, 200], 250))
      node.dispatchEvent(timed('pointermove', [400, 200], 500))
      node.dispatchEvent(timed('pointermove', [400, 300], 750))
      node.dispatchEvent(keyEvent('p'))
      node.dispatchEvent(timed('pointerup', [600, 400], 1000))
      store.getState().choosePenMode('pencil')
      node.dispatchEvent(keyEvent('Enter'))
      expect(store.getState().document.claims[0]?.rings[0]).toHaveLength(3)
      dispose()
    })
  })

  describe('unmanaged errors', () => {
    it('drops the stroke of a cancelled drag', () => {
      const { node, store, dispose } = attach()
      aimAtFrance(store)
      store.getState().choosePenMode('pencil')
      stroke(
        node,
        [
          [300, 200],
          [350, 200],
          [400, 200],
          [400, 300],
        ],
        0
      )
      node.dispatchEvent(timed('pointerdown', [450, 300], 5000))
      node.dispatchEvent(timed('pointermove', [500, 300], 5250))
      node.dispatchEvent(timed('pointercancel', [500, 300], 5300))
      node.dispatchEvent(keyEvent('Enter'))
      expect(store.getState().document.claims[0]?.rings[0]).toHaveLength(3)
      dispose()
    })
  })

  describe('edge cases', () => {
    // A press and release in place is a click: the Pencil places one point, as the Pen does.
    it('places one point on a click without a drag', () => {
      const { node, store, dispose } = attach()
      aimAtFrance(store)
      store.getState().choosePenMode('pencil')
      for (const at of CANVAS_TRIANGLE) click(node, at)
      click(node, [301, 201])
      expect(store.getState().document.claims[0]?.rings[0]).toHaveLength(3)
      dispose()
    })
  })
})

describe('the white arrow’s marquee, on the canvas', () => {
  // Review ARCH-001 / QUAL-001 (2026-10-12): a press released with ‹space› held must not steer the next.
  it('moves an anchor after a marquee was released with space held', () => {
    const { node, store, dispose } = attach()
    aimAtFrance(store)
    for (const at of [...CANVAS_TRIANGLE, [301, 201] as const]) click(node, at)
    node.dispatchEvent(keyEvent('a'))
    node.dispatchEvent(pointerEvent('pointerdown', { offsetX: 700, offsetY: 500 }))
    node.dispatchEvent(pointerEvent('pointermove', { offsetX: 760, offsetY: 560 }))
    node.dispatchEvent(keyEvent(' '))
    node.dispatchEvent(pointerEvent('pointerup', { offsetX: 760, offsetY: 560 }))
    node.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }))
    const before = store.getState().document.anchors[1]
    node.dispatchEvent(pointerEvent('pointerdown', { offsetX: 500, offsetY: 200 }))
    node.dispatchEvent(pointerEvent('pointermove', { offsetX: 540, offsetY: 240 }))
    node.dispatchEvent(pointerEvent('pointerup', { offsetX: 540, offsetY: 240 }))
    expect(store.getState().document.anchors[1]).not.toEqual(before)
    dispose()
  })

  // s03 — "delete several at once", through the canvas: a marquee, then ‹delete›, one step.
  it('deletes what a marquee caught with one key, as one step', () => {
    const { node, store, dispose } = attach()
    aimAtFrance(store)
    const square = [
      [300, 200],
      [400, 200],
      [500, 200],
      [500, 400],
      [300, 400],
    ] as const
    for (const at of [...square, [301, 201] as const]) click(node, at)
    node.dispatchEvent(keyEvent('a'))
    node.dispatchEvent(pointerEvent('pointerdown', { offsetX: 350, offsetY: 150 }))
    node.dispatchEvent(pointerEvent('pointermove', { offsetX: 450, offsetY: 250 }))
    node.dispatchEvent(pointerEvent('pointerup', { offsetX: 450, offsetY: 250 }))
    node.dispatchEvent(keyEvent('Delete'))
    expect(store.getState().document.claims[0]?.rings[0]).toHaveLength(4)
    expect(store.getState().undoLabel).toBe('delete anchor')
    dispose()
  })
})

describe('the Pen finding the coast, on the canvas (s02)', () => {
  describe('happy path', () => {
    // s02 — the plain Pen previews the coast it will snap to, and says so, before the click decides.
    it('says it is following the coastline under the plain Pen near the shore, and drawing elsewhere', () => {
      const { node, acted, dispose } = attachWithShore(undefined, [], 'free')
      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 60, offsetY: 220 }))
      expect(acted).toHaveBeenLastCalledWith('Following the coastline for Reaume de France')
      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 60, offsetY: 400 }))
      expect(acted).toHaveBeenLastCalledWith('Drawing in Reaume de France')
      dispose()
    })

    it('names the river under the plain Pen, and turns it to following the river on a click', () => {
      const { node, store, acted, resulted, dispose } = attachWithShore(undefined, [MAAS], 'free')
      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 60, offsetY: 420 }))
      expect(acted).toHaveBeenLastCalledWith('Following the Maas for Reaume de France')
      click(node, [60, 420])
      expect(store.getState().penMode).toBe('river')
      expect(resulted).toHaveBeenLastCalledWith('Pen — follow a river')
      dispose()
    })

    it('turns the plain Pen to following the coast on a click near the shore, and says so', () => {
      const { node, store, resulted, dispose } = attachWithShore(undefined, [], 'free')
      click(node, [60, 220])
      expect(store.getState().penMode).toBe('coast')
      expect(resulted).toHaveBeenLastCalledWith('Pen — follow the coast')
      dispose()
    })
  })

  describe('variants', () => {
    // s02 — the Pencil's stroke stops on the shore; the rest of the drag places nothing, and the first
    // click off the shore gives the Pencil back.
    it('hands a Pencil stroke over to the coast, then gives the Pencil back off the shore', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { node, store, resulted, dispose } = attachWithShore(undefined, [], 'pencil')
      stroke(
        node,
        [
          [60, 400],
          [60, 300],
          [60, 219],
          [60, 100],
        ],
        0
      )
      expect(store.getState().penMode).toBe('coast')
      expect(resulted).toHaveBeenCalledWith('Pen — follow the coast')
      click(node, [160, 400])
      expect(store.getState().penMode).toBe('pencil')
      expect(resulted).toHaveBeenLastCalledWith('Pencil — freehand')
      warn.mockRestore()
      dispose()
    })
  })

  // L3–L5: the gestures' own suite (`coastSwitch.test.ts`) holds them; the canvas only routes the
  // press, the drag and the release to them.
})

/**
 * A click with ‹alt› held, as a browser sends it: the key on both the press and the release.
 * @param node - the canvas
 * @param at - where, in CSS pixels
 */
function altClick(node: HTMLCanvasElement, at: readonly [number, number]): void {
  for (const type of ['pointerdown', 'pointerup']) {
    const event = pointerEvent(type, { offsetX: at[0], offsetY: at[1] })
    Object.assign(event, { altKey: true })
    node.dispatchEvent(event)
  }
}

/** France as the canvas triangle, drawn with the Pen and closed, then ⟨retrace⟩ taken with ‹R›. */
function triangleThenRetrace() {
  const opened = attach()
  aimAtFrance(opened.store)
  viewAtScale(opened.store, 8)
  for (const at of CANVAS_TRIANGLE) click(opened.node, at)
  click(opened.node, [301, 201])
  opened.node.dispatchEvent(keyEvent('r'))
  return opened
}

/** France's first ring. */
const ring = (store: CartographerStoreHook) => store.getState().document.claims[0]?.rings[0] ?? []

describe('⟨retrace⟩ on the canvas (H-46)', () => {
  describe('happy path', () => {
    it('takes ⟨retrace⟩ with R, and says so', () => {
      const { store, resulted, dispose } = triangleThenRetrace()
      expect(store.getState().tool).toBe('retrace')
      expect(resulted).toHaveBeenLastCalledWith('Retrace')
      dispose()
    })

    it('replaces a stretch clicked from one anchor to another, the point between laid', () => {
      const { node, store, dispose } = triangleThenRetrace()
      click(node, [500, 200])
      click(node, [400, 150])
      click(node, [300, 200])
      expect(ring(store)).toHaveLength(4)
      expect(store.getState().rows.find((row) => row.current)?.kind).toBe('retrace')
      dispose()
    })
  })

  describe('variants', () => {
    it('goes round the modes with R again, and stays ⟨retrace⟩', () => {
      const { node, store, resulted, dispose } = triangleThenRetrace()
      node.dispatchEvent(keyEvent('r'))
      expect(store.getState().tool).toBe('retrace')
      expect(store.getState().penMode).toBe('coast')
      expect(resulted).toHaveBeenLastCalledWith('Retrace · Pen — follow the coast')
      dispose()
    })

    it('replaces the other side when the end is clicked with ‹alt› held', () => {
      const { node, store, dispose } = triangleThenRetrace()
      click(node, [500, 200])
      click(node, [400, 150])
      altClick(node, [300, 200])
      expect(ring(store)).toHaveLength(3)
      expect(ring(store)).not.toContain(2)
      dispose()
    })
  })

  describe('managed errors', () => {
    it('does not close its own run with Enter', () => {
      const { node, store, dispose } = triangleThenRetrace()
      click(node, [500, 200])
      click(node, [400, 150])
      const enter = keyEvent('Enter')
      node.dispatchEvent(enter)
      expect(enter.defaultPrevented).toBe(false)
      expect(store.getState().document.claims[0]?.rings).toHaveLength(1)
      dispose()
    })
  })

  // L4: N/A — the gestures are synchronous; the document's own refusals are retrace.test.ts's.

  describe('edge cases', () => {
    it('lets go of ‹alt› with the key, the next end taking the nearer side', () => {
      const { node, store, dispose } = triangleThenRetrace()
      node.dispatchEvent(keyEvent('Alt'))
      node.dispatchEvent(new KeyboardEvent('keyup', { key: 'Alt', bubbles: true }))
      click(node, [500, 200])
      click(node, [400, 150])
      click(node, [300, 200])
      expect(ring(store)).toHaveLength(4)
      dispose()
    })
  })
})

/** A button outside the canvas, holding the focus — a rail button, a row of {Polities}. */
function focusedButton(): HTMLButtonElement {
  const button = document.createElement('button')
  document.body.append(button)
  button.focus()
  return button
}

/** The canvas with the pointer over it and the white arrow in hand. */
function overTheMap() {
  const opened = attach()
  viewAtScale(opened.store, 8)
  opened.store.getState().selectTool('edit')
  opened.node.dispatchEvent(pointerEvent('pointermove', { offsetX: 300, offsetY: 200 }))
  return opened
}

describe('‹space› from anywhere on the page (the dev, 2026-10-14)', () => {
  describe('happy path', () => {
    it('borrows the hand when ‹space› is pressed on a focused button, the pointer over the map', () => {
      const { node, store, dispose } = overTheMap()
      const button = focusedButton()
      const space = keyEvent(' ')
      button.dispatchEvent(space)
      expect(space.defaultPrevented).toBe(true)
      const before = store.getState().viewport.originX
      node.dispatchEvent(pointerEvent('pointerdown', { offsetX: 300, offsetY: 200 }))
      node.dispatchEvent(pointerEvent('pointermove', { offsetX: 400, offsetY: 200 }))
      node.dispatchEvent(pointerEvent('pointerup', { offsetX: 400, offsetY: 200 }))
      expect(store.getState().viewport.originX).not.toBe(before)
      button.remove()
      dispose()
    })
  })

  describe('variants', () => {
    it('gives the hand back on the release, which the button never sees', () => {
      const { node, dispose } = overTheMap()
      const button = focusedButton()
      const clicked = vi.fn()
      button.addEventListener('keyup', clicked)
      button.dispatchEvent(keyEvent(' '))
      expect(node.style.cursor).toContain('grab')
      const up = new KeyboardEvent('keyup', { key: ' ', bubbles: true, cancelable: true })
      button.dispatchEvent(up)
      expect(up.defaultPrevented).toBe(true)
      expect(clicked).not.toHaveBeenCalled()
      expect(node.style.cursor).not.toContain('grab')
      button.remove()
      dispose()
    })
  })

  describe('managed errors', () => {
    it('leaves ‹space› to a text field', () => {
      const { node, dispose } = overTheMap()
      const field = document.createElement('input')
      document.body.append(field)
      field.focus()
      const space = keyEvent(' ')
      field.dispatchEvent(space)
      expect(space.defaultPrevented).toBe(false)
      expect(node.style.cursor).not.toContain('grab')
      field.remove()
      dispose()
    })

    it('leaves ‹space› to the page when the pointer is off the map', () => {
      const { node, dispose } = overTheMap()
      node.dispatchEvent(pointerEvent('pointerleave', {}))
      const button = focusedButton()
      const space = keyEvent(' ')
      button.dispatchEvent(space)
      expect(space.defaultPrevented).toBe(false)
      button.remove()
      dispose()
    })
  })

  // L4: N/A — synchronous key handling, nothing optional.

  describe('edge cases', () => {
    it('lets go of the hand when the window loses the focus with ‹space› down', () => {
      const { node, dispose } = overTheMap()
      const button = focusedButton()
      button.dispatchEvent(keyEvent(' '))
      window.dispatchEvent(new Event('blur'))
      expect(node.style.cursor).not.toContain('grab')
      button.remove()
      dispose()
    })

    it('stops listening on the page once the canvas is torn down', () => {
      const { dispose } = overTheMap()
      dispose()
      const button = focusedButton()
      const space = keyEvent(' ')
      button.dispatchEvent(space)
      expect(space.defaultPrevented).toBe(false)
      button.remove()
    })
  })
})

/** France as the canvas triangle, ⟨retrace⟩ in hand, turned to the Pencil with ‹R› three times. */
function retracingWithPencil() {
  const opened = attach()
  aimAtFrance(opened.store)
  viewAtScale(opened.store, 8)
  for (const at of CANVAS_TRIANGLE) click(opened.node, at)
  click(opened.node, [301, 201])
  for (let press = 0; press < 4; press += 1) opened.node.dispatchEvent(keyEvent('r'))
  return opened
}

describe('⟨retrace⟩ with the Pencil (ARCH-001)', () => {
  it('turns ⟨retrace⟩ to the Pencil with R, and stays ⟨retrace⟩', () => {
    const { store, dispose } = retracingWithPencil()
    expect(store.getState().tool).toBe('retrace')
    expect(store.getState().penMode).toBe('pencil')
    dispose()
  })

  // The defect: a drag pressed on nothing began a run no click could ever end.
  it('refuses a drag that does not start on an anchor of the target, and says where to start', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const { node, store, resulted, dispose } = retracingWithPencil()
    stroke(
      node,
      [
        [400, 300],
        [420, 320],
        [440, 340],
      ],
      0
    )
    expect(store.getState().document.claims[0]?.rings[0]).toHaveLength(3)
    expect(resulted).toHaveBeenCalledWith(
      'click an anchor of Reaume de France to start the retrace'
    )
    // Nothing was left in hand: a retrace started properly afterwards still ends.
    click(node, [500, 200])
    click(node, [400, 150])
    click(node, [300, 200])
    expect(store.getState().document.claims[0]?.rings[0]).toHaveLength(4)
    dispose()
  })

  it('starts the run on the anchor a drag is pressed on, and a click on another ends it', () => {
    const { node, store, dispose } = retracingWithPencil()
    stroke(
      node,
      [
        [500, 200],
        [450, 150],
        [400, 150],
        [350, 150],
      ],
      0
    )
    click(node, [300, 200])
    expect(store.getState().document.claims[0]?.rings[0]?.length).toBeGreaterThan(3)
    expect(store.getState().rows.find((row) => row.current)?.kind).toBe('retrace')
    dispose()
  })
})

describe('‹space› on a control reached with Tab (A11Y-001)', () => {
  it('leaves ‹space› to a button the focus reached by the keyboard', () => {
    const { node, dispose } = overTheMap()
    const button = document.createElement('button')
    document.body.append(button)
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    button.focus()
    const space = keyEvent(' ')
    button.dispatchEvent(space)
    expect(space.defaultPrevented).toBe(false)
    expect(node.style.cursor).not.toContain('grab')
    button.remove()
    dispose()
  })

  it('takes ‹space› again once the pointer has pressed somewhere', () => {
    const { node, dispose } = overTheMap()
    const button = document.createElement('button')
    document.body.append(button)
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    button.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    button.focus()
    const space = keyEvent(' ')
    button.dispatchEvent(space)
    expect(space.defaultPrevented).toBe(true)
    expect(node.style.cursor).toContain('grab')
    button.remove()
    dispose()
  })
})

/** A polity identity for these tests. */
function identity(id: string, suzerain: string | null = null) {
  return { ...FRANCE_IDENTITY, id, name: id, suzerain }
}

/** The Empire owning nothing itself, Saxony its vassal, Poland beside Saxony sharing its east side. */
function empireOfSaxony() {
  const opened = attach()
  const { store } = opened
  viewAtScale(store, 1)
  const step = { kind: 'create-polity', label: 'create' }
  store.getState().createPolity(identity('hre'), step)
  store.getState().createPolity(identity('saxony', 'hre'), step)
  store.getState().createPolity(identity('poland'), step)
  drawOutlineAt(store, 'saxony', [
    [300, 200],
    [400, 200],
    [400, 300],
    [300, 300],
  ])
  drawOutlineAt(
    store,
    'poland',
    [
      [400, 200],
      [500, 200],
      [500, 300],
      [400, 300],
    ],
    [1, null, null, 2]
  )
  store.getState().chooseTarget('hre')
  store.getState().selectTool('edit')
  return opened
}

/** Press on a point and drag it, as the white arrow does. */
function drag(node: HTMLCanvasElement, from: [number, number], to: [number, number]): void {
  node.dispatchEvent(
    pointerEvent('pointerdown', { offsetX: from[0], offsetY: from[1], buttons: 1 })
  )
  node.dispatchEvent(pointerEvent('pointermove', { offsetX: to[0], offsetY: to[1], buttons: 1 }))
  node.dispatchEvent(pointerEvent('pointerup', { offsetX: to[0], offsetY: to[1] }))
}

// The dev, 2026-10-15: aimed at a suzerain, the white arrow takes the anchors of its extent outline — here a
// vassal's limit against a foreign polity — and not the limits between the suzerain and its vassals.
describe('the extent’s handles, wired', () => {
  it('moves a vassal’s anchor on the extent outline from the suzerain', () => {
    const { node, store, dispose } = empireOfSaxony()
    const before = store.getState().document.anchors[1]

    drag(node, [400, 200], [400, 160])

    expect(store.getState().document.anchors[1]).not.toEqual(before)
    dispose()
  })

  it('takes no anchor a foreign polity holds alone, off the suzerain’s outline', () => {
    const { node, store, dispose } = empireOfSaxony()
    const before = store.getState().document.anchors.map((anchor) => [...anchor])

    drag(node, [500, 200], [500, 160])
    drag(node, [500, 300], [500, 340])

    expect(store.getState().document.anchors.slice(4)).toEqual(before.slice(4))
    dispose()
  })
})
