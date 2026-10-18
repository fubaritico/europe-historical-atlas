import { describe, expect, it, vi } from 'vitest'

import { backdropToLonLat, screenToLonLatOnBackdrop } from '../view/projection'
import { TEST_BACKDROP_FRAME } from '../view/testFrame'

import { frameEdgeUnder, freeLonLatAt } from './frameSnap'
import { pencilDrag, pencilEnd, pencilStart } from './pencil'
import { drawOutlineAt, testGestureContext, testPolity, testStore } from './testGestureContext'
import { arrowDrag, arrowPress, arrowRelease, penClick } from './toolGestures'

import type { CartographerStoreHook } from '../state/store'

const { north, west, east, south } = TEST_BACKDROP_FRAME.bounds
const { width, height } = TEST_BACKDROP_FRAME.size

/**
 * A store at scale 1 — screen pixels are backdrop pixels — with Norway created and aimed at.
 * @returns the store and its gesture context, an 8-pixel reach
 */
function norway() {
  const store = testStore()
  store.getState().createPolity(testPolity('no', 'Kingdom of Norway'), { kind: 'c', label: 'no' })
  store.getState().aimAt('no')
  return { store, ...testGestureContext(store) }
}

/** The anchors of a polity's first ring, in degrees. */
function ringOf(store: CartographerStoreHook, polityId: string): [number, number][] {
  const { document } = store.getState()
  const ring = document.claims.find((claim) => claim.polity === polityId)?.rings[0] ?? []
  return ring.map((index) => document.anchors[index] ?? [Number.NaN, Number.NaN])
}

describe('frameSnap', () => {
  describe('happy path', () => {
    // CARTO-257: within reach of the top edge, the point lies exactly on the map's top.
    it('lands a free point near the top edge exactly on it', () => {
      const { context } = norway()
      const point = freeLonLatAt(context, [640, 5])
      expect(point?.[1]).toBeCloseTo(north, 9)
      expect(point?.[0]).toBeCloseTo(backdropToLonLat([640, 0], TEST_BACKDROP_FRAME)[0], 9)
    })

    it('lands a free point near the top-left corner exactly in it', () => {
      const { context } = norway()
      const point = freeLonLatAt(context, [4, 3])
      expect(point?.[0]).toBeCloseTo(west, 9)
      expect(point?.[1]).toBeCloseTo(north, 9)
    })
  })

  describe('variants', () => {
    it('reaches the bottom-right corner', () => {
      const { context } = norway()
      const point = freeLonLatAt(context, [width - 2, height - 6])
      expect(point?.[0]).toBeCloseTo(east, 9)
      expect(point?.[1]).toBeCloseTo(south, 9)
    })

    it('tells the bar the edge or the corner under the pointer', () => {
      const { context } = norway()
      expect(frameEdgeUnder(context, [640, 5])).toBe('edge')
      expect(frameEdgeUnder(context, [4, 3])).toBe('corner')
      expect(frameEdgeUnder(context, [640, 500])).toBeNull()
    })

    // The reach is in screen pixels: zoomed in four times, 8 screen pixels are 2 of the backdrop.
    it('measures the reach on screen, so zooming in narrows it on the map', () => {
      const { store, context } = norway()
      store.getState().setViewport({ scale: 4, originX: 0, originY: 0 })
      expect(frameEdgeUnder(context, [640, 7])).toBe('edge')
      expect(freeLonLatAt(context, [640, 9])?.[1]).not.toBeCloseTo(north, 6)
    })
  })

  describe('managed errors', () => {
    it('leaves a point away from every edge where the pointer is', () => {
      const { store, context } = norway()
      expect(freeLonLatAt(context, [640, 500])).toEqual(
        screenToLonLatOnBackdrop([640, 500], TEST_BACKDROP_FRAME, store.getState().viewport)
      )
    })

    it('places nothing far off the map, near an edge or not', () => {
      const { context } = norway()
      expect(freeLonLatAt(context, [-100, 500])).toBeNull()
      expect(freeLonLatAt(context, [-100, 3])).toBeNull()
      expect(frameEdgeUnder(context, [-100, 3])).toBeNull()
    })
  })

  describe('unmanaged errors', () => {
    it('snaps nothing before the view is framed, at scale zero', () => {
      const { store, context } = norway()
      store.getState().setViewport({ scale: 0, originX: 0, originY: 0 })
      expect(frameEdgeUnder(context, [4, 3])).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('says nothing off the canvas', () => {
      const { context } = norway()
      expect(frameEdgeUnder(context, null)).toBeNull()
    })
  })
})

describe('frameSnap in the gestures (CARTO-257)', () => {
  describe('happy path', () => {
    it('places the Pen’s free point in the corner when clicked within reach of it', () => {
      const { store, context } = norway()
      store.getState().selectTool('draw')
      penClick(context, [4, 3])
      const placed = context.session.outline.at(-1)?.at
      expect(placed?.[0]).toBeCloseTo(west, 9)
      expect(placed?.[1]).toBeCloseTo(north, 9)
    })
  })

  describe('variants', () => {
    it('drops an anchor dragged alone with the white arrow into the corner', () => {
      const { store, context } = norway()
      drawOutlineAt(store, 'no', [
        [100, 100],
        [300, 100],
        [300, 300],
        [100, 300],
      ])
      store.getState().selectTool('edit')
      arrowPress(context, [100, 100], false)
      arrowDrag(context, [3, 4])
      arrowRelease(context, [3, 4])
      const first = ringOf(store, 'no')[0]
      expect(first?.[0]).toBeCloseTo(west, 9)
      expect(first?.[1]).toBeCloseTo(north, 9)
    })
  })

  describe('managed errors', () => {
    // QUAL-002: two clicks within reach of one corner land on one spot — the second places nothing.
    it('places nothing on a second click in the corner the outline already ends on', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { store, context } = norway()
      store.getState().selectTool('draw')
      penClick(context, [4, 3])
      penClick(context, [5, 2])
      expect(context.session.outline).toHaveLength(1)
      expect(warn).toHaveBeenCalledWith(
        '[Cartographer] nothing placed: the outline already ends on that point.'
      )
    })
  })

  describe('unmanaged errors', () => {
    // The coast comes first: a coast vertex within reach of the pointer and of the edge is followed.
    it('follows a coast vertex within reach rather than clamping to the edge', () => {
      const store = testStore()
      store.getState().createPolity(testPolity('gl', 'Greenland'), { kind: 'c', label: 'gl' })
      store.getState().aimAt('gl')
      const coast = [
        {
          points: [
            [5, 300],
            [6, 320],
            [5, 340],
          ] as [number, number][],
          closed: false,
          bounds: { left: 5, top: 300, right: 6, bottom: 340 },
        },
      ]
      const { context } = testGestureContext(store, coast)
      store.getState().selectTool('draw')
      penClick(context, [4, 300])
      const placed = context.session.outline.at(-1)?.at
      expect(placed?.[0]).toBeCloseTo(backdropToLonLat([5, 300], TEST_BACKDROP_FRAME)[0], 9)
      expect(placed?.[0]).not.toBeCloseTo(west, 6)
    })

    // A neighbour's anchor within reach is reused, not a clamped free point beside it.
    it('reuses a neighbour’s anchor within reach rather than clamping to the edge', () => {
      const { store, context } = norway()
      store.getState().createPolity(testPolity('se', 'Sweden'), { kind: 'c', label: 'se' })
      drawOutlineAt(store, 'se', [
        [3, 500],
        [100, 500],
        [100, 600],
        [3, 600],
      ])
      store.getState().aimAt('no')
      store.getState().selectTool('draw')
      penClick(context, [4, 501])
      expect(context.session.outline.at(-1)?.anchor).not.toBeNull()
    })
  })

  describe('edge cases', () => {
    // QUAL-001/002: the Pencil's free samples are clamped too, and two landing on one corner lay one point.
    it('lays the Pencil’s samples in the corner once, however long it lingers there', () => {
      const { store, context } = norway()
      store.getState().selectTool('draw')
      store.getState().choosePenMode('pencil')
      pencilStart(context, [6, 6], 0)
      pencilDrag(context, [4, 3], 1000)
      pencilDrag(context, [3, 4], 2000)
      pencilEnd(context, [5, 2], 3000)
      const corners = context.session.outline.filter(
        (point) => Math.abs(point.at[0] - west) < 1e-9 && Math.abs(point.at[1] - north) < 1e-9
      )
      expect(corners).toHaveLength(1)
      expect(context.session.outline.length).toBe(1)
    })

    // A selection moves as one shape: clamping each point alone would bend it.
    it('moves a selection of several near the corner without clamping any of its points', () => {
      const { store, context } = norway()
      drawOutlineAt(store, 'no', [
        [100, 100],
        [300, 100],
        [300, 300],
        [100, 300],
      ])
      store.getState().selectTool('edit')
      context.session.selected = [0, 3]
      arrowPress(context, [100, 100], false)
      arrowDrag(context, [3, 4])
      arrowRelease(context, [3, 4])
      const first = ringOf(store, 'no')[0]
      expect(first?.[0]).not.toBeCloseTo(west, 6)
    })
  })
})
