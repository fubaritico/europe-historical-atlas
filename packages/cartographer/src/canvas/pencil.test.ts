import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  PENCIL_INTERVAL_MS,
  pencilCancel,
  pencilDrag,
  pencilEnd,
  pencilPointDue,
  pencilStart,
} from './pencil'
import { testGestureContext, testPolity, testStore } from './testGestureContext'
import { penClick, toolKey, undoGesture } from './toolGestures'

import type { GestureContext } from './toolGestures'

afterEach(() => {
  vi.restoreAllMocks()
})

/**
 * The Pencil in hand, aimed at France — or at nobody.
 * @param aimed - whether France is the target
 * @returns the gesture context
 */
function pencilContext(aimed = true): GestureContext {
  const store = testStore()
  store
    .getState()
    .createPolity(testPolity('fr', 'Reaume de France'), { kind: 'create', label: 'fr' })
  if (aimed) store.getState().aimAt('fr')
  store.getState().choosePenMode('pencil')
  return testGestureContext(store).context
}

/**
 * One drag: pressed at the first point at time 0, moved through the rest one interval apart, released
 * on the last.
 * @param context - the session
 * @param points - the pointer's path, in screen pixels
 */
function drag(context: GestureContext, points: [number, number][]): void {
  const [first, ...rest] = points
  if (first === undefined) return
  pencilStart(context, first, 0)
  rest.forEach((at, index) => {
    pencilDrag(context, at, (index + 1) * PENCIL_INTERVAL_MS)
  })
  pencilEnd(context, rest.at(-1) ?? first, rest.length * PENCIL_INTERVAL_MS)
}

describe('pencil', () => {
  describe('happy path', () => {
    it('lays one point at the press and one per interval of a drag', () => {
      const context = pencilContext()
      drag(context, [
        [100, 100],
        [110, 100],
        [120, 100],
        [130, 100],
      ])
      expect(context.session.outline).toHaveLength(4)
      expect(
        context.session.outline.every((point) => point.provenance.name === 'reported by eye')
      ).toBe(true)
    })

    it('takes a whole stroke back with ctrl+Z', () => {
      const context = pencilContext()
      drag(context, [
        [100, 100],
        [110, 100],
      ])
      drag(context, [
        [200, 100],
        [210, 100],
        [220, 100],
      ])
      undoGesture(context, false)
      expect(context.session.outline).toHaveLength(2)
      undoGesture(context, false)
      expect(context.session.outline).toHaveLength(0)
    })
  })

  describe('variants', () => {
    it('lays no point before the interval has passed', () => {
      const context = pencilContext()
      pencilStart(context, [100, 100], 0)
      pencilDrag(context, [110, 100], PENCIL_INTERVAL_MS - 1)
      expect(context.session.outline).toHaveLength(1)
      pencilDrag(context, [120, 100], PENCIL_INTERVAL_MS)
      expect(context.session.outline).toHaveLength(2)
    })

    it('ends the stroke under the pointer, between two samples', () => {
      const context = pencilContext()
      pencilStart(context, [100, 100], 0)
      pencilEnd(context, [150, 100], 50)
      expect(context.session.outline).toHaveLength(2)
      expect(context.session.drawing).toBeNull()
    })

    it('takes back one point with Backspace, then one point with ctrl+Z', () => {
      const context = pencilContext()
      drag(context, [
        [100, 100],
        [110, 100],
        [120, 100],
      ])
      toolKey(context, 'Backspace')
      expect(context.session.outline).toHaveLength(2)
      // The stroke no longer ends where it did: it is forgotten, and ctrl+Z takes one point.
      undoGesture(context, false)
      expect(context.session.outline).toHaveLength(1)
    })
  })

  describe('managed errors', () => {
    it('lays nothing with no polity aimed at, and says so', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const context = pencilContext(false)
      drag(context, [
        [100, 100],
        [110, 100],
      ])
      expect(context.session.outline).toEqual([])
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('select a polity'))
    })

    it('skips the samples off the map and says how many, once, at the end', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const context = pencilContext()
      drag(context, [
        [100, 100],
        [-50, 100],
        [-60, 100],
        [120, 100],
      ])
      expect(context.session.outline).toHaveLength(2)
      expect(warn).toHaveBeenCalledTimes(1)
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('2 Pencil points fell off the map'))
    })
  })

  describe('what the review found', () => {
    // QUAL-001: a Pen click on top of a stroke is taken back alone; the stroke still goes back whole.
    it('takes back a click after a stroke, then the whole stroke', () => {
      const context = pencilContext()
      drag(context, [
        [100, 100],
        [110, 100],
        [120, 100],
      ])
      penClick(context, [300, 300])
      undoGesture(context, false)
      expect(context.session.outline).toHaveLength(3)
      undoGesture(context, false)
      expect(context.session.outline).toHaveLength(0)
    })

    // A ctrl+Z during a drag takes the stroke so far; the drag goes on into a stroke of its own.
    it('starts a new stroke when ctrl+Z takes back the drag in progress', () => {
      const context = pencilContext()
      pencilStart(context, [100, 100], 0)
      pencilDrag(context, [110, 100], PENCIL_INTERVAL_MS)
      undoGesture(context, false)
      expect(context.session.outline).toHaveLength(0)
      pencilDrag(context, [120, 100], 2 * PENCIL_INTERVAL_MS)
      pencilDrag(context, [130, 100], 3 * PENCIL_INTERVAL_MS)
      pencilEnd(context, [130, 100], 3 * PENCIL_INTERVAL_MS)
      expect(context.session.outline).toHaveLength(2)
      undoGesture(context, false)
      expect(context.session.outline).toHaveLength(0)
    })

    it('forgets the strokes of an outline let go with Escape', () => {
      const context = pencilContext()
      drag(context, [
        [100, 100],
        [110, 100],
      ])
      toolKey(context, 'Escape')
      expect(context.session.strokes).toEqual([])
    })
  })

  describe('unmanaged errors', () => {
    // A drag that starts off the map has no stroke yet: its points must not extend the drag before it.
    it('does not extend the previous stroke from a drag begun off the map', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const context = pencilContext()
      drag(context, [
        [100, 100],
        [110, 100],
      ])
      drag(context, [
        [-50, 100],
        [200, 100],
        [210, 100],
      ])
      undoGesture(context, false)
      expect(context.session.outline).toHaveLength(2)
    })

    it('drops the stroke of a cancelled drag, and keeps the one before', () => {
      const context = pencilContext()
      drag(context, [
        [100, 100],
        [110, 100],
      ])
      pencilStart(context, [200, 100], 0)
      pencilDrag(context, [210, 100], PENCIL_INTERVAL_MS)
      pencilCancel(context)
      expect(context.session.outline).toHaveLength(2)
      expect(context.session.drawing).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('lays no point while the pointer is held still', () => {
      expect(
        pencilPointDue({ time: 0, at: [100, 100], offMap: 0, stroke: null }, 1000, [100, 100])
      ).toBe(false)
      expect(
        pencilPointDue({ time: 0, at: [100, 100], offMap: 0, stroke: null }, 1000, [101, 100])
      ).toBe(true)
    })

    it('lays no last point when released where the last one was laid', () => {
      const context = pencilContext()
      pencilStart(context, [100, 100], 0)
      pencilEnd(context, [100, 100], 500)
      expect(context.session.outline).toHaveLength(1)
    })

    it('ignores a drag or a release with no drag begun', () => {
      const context = pencilContext()
      pencilDrag(context, [100, 100], 1000)
      pencilEnd(context, [100, 100], 1000)
      pencilCancel(context)
      expect(context.session.outline).toEqual([])
    })
  })
})
