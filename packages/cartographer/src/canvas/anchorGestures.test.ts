import { afterEach, describe, expect, it, vi } from 'vitest'

import { FREE_POINT_PROVENANCE } from '../state/editionSlice'
import { screenToLonLatOnBackdrop } from '../view/projection'
import { TEST_BACKDROP_FRAME } from '../view/testFrame'

import {
  DELETE_ANCHOR_STEP,
  INSERT_ANCHOR_STEP,
  deleteSelected,
  insertOnStretch,
  targetStretches,
} from './anchorGestures'
import { testGestureContext, testPolity, testStore } from './testGestureContext'
import { arrowDrag, arrowPress, arrowRelease, toolKey } from './toolGestures'

import type { CartographerStoreHook } from '../state/store'

afterEach(() => {
  vi.restoreAllMocks()
})

/** A square, screen positions at scale 1, anchors in ring order. */
const SQUARE: [number, number][] = [
  [100, 100],
  [300, 100],
  [300, 300],
  [100, 300],
]

/** The Empire's square, sharing France's right-hand side: anchors 1 and 2. */
const EAST: [number, number][] = [
  [300, 100],
  [500, 100],
  [500, 300],
  [300, 300],
]

/**
 * Draw an outline for a polity, from screen points, reusing the anchors given by index.
 * @param store - the store
 * @param polityId - whose outline
 * @param points - the screen points
 * @param reuse - for each point, the anchor it reuses, or `null`
 */
function outline(
  store: CartographerStoreHook,
  polityId: string,
  points: readonly [number, number][],
  reuse: readonly (number | null)[] = []
): void {
  const placed = points.map((at, index) => {
    const lonLat = screenToLonLatOnBackdrop(at, TEST_BACKDROP_FRAME, store.getState().viewport)
    if (lonLat === null) throw new Error('off the backdrop')
    return { at: lonLat, provenance: FREE_POINT_PROVENANCE, anchor: reuse[index] ?? null }
  })
  if (!store.getState().drawOutline(polityId, placed, { kind: 'draw-outline', label: polityId })) {
    throw new Error(`the outline of ${polityId} was refused`)
  }
}

/**
 * France as a square, aimed at, under the white arrow — and, when asked, the Empire beside it on
 * France's right-hand side.
 * @param shared - whether the Empire shares France's right-hand side
 * @returns the context, its reports and the store
 */
function openSquare(shared = false) {
  const store = testStore()
  store.getState().createPolity(testPolity('fr', 'Reaume de France'), { kind: 'c', label: 'fr' })
  store.getState().createPolity(testPolity('hre', 'Sacrum Imperium'), { kind: 'c', label: 'hre' })
  outline(store, 'fr', SQUARE)
  if (shared) outline(store, 'hre', EAST, [1, null, null, 2])
  store.getState().aimAt('fr')
  store.getState().selectTool('edit')
  return { store, ...testGestureContext(store) }
}

/** France's rings, as anchor indices. */
function ringsOf(store: CartographerStoreHook, polityId: string): number[][] {
  return store.getState().document.claims.find((claim) => claim.polity === polityId)?.rings ?? []
}

describe('anchorGestures', () => {
  describe('happy path', () => {
    it('inserts an anchor between anchors 0 and 1 when the arrow presses on the top side', () => {
      const { store, context } = openSquare()

      arrowPress(context, [200, 103], false)

      expect(ringsOf(store, 'fr')).toEqual([[0, 4, 1, 2, 3]])
      expect(store.getState().rows.at(-1)?.label).toBe(INSERT_ANCHOR_STEP.label)
    })

    it('places the inserted anchor on the side, not under the pointer', () => {
      const { store, context } = openSquare()

      arrowPress(context, [200, 103], false)

      const expected = screenToLonLatOnBackdrop(
        [200, 100],
        TEST_BACKDROP_FRAME,
        store.getState().viewport
      )
      expect(store.getState().document.anchors[4]).toEqual(expected)
    })

    it('removes the selected anchor from the ring on Delete, as one step', () => {
      const { store, context } = openSquare()
      context.session.selected = [0]

      expect(toolKey(context, 'Delete')).toBe(true)

      expect(ringsOf(store, 'fr')).toEqual([[1, 2, 3]])
      expect(store.getState().rows.at(-1)?.label).toBe(DELETE_ANCHOR_STEP.label)
      expect(context.session.selected).toEqual([])
    })
  })

  describe('variants', () => {
    it('hands the inserted anchor to the drag: keeping the pointer down moves it', () => {
      const { store, context } = openSquare()

      arrowPress(context, [200, 103], false)
      arrowDrag(context, [200, 60])
      arrowRelease(context, [0, 0])

      const expected = screenToLonLatOnBackdrop(
        [200, 60],
        TEST_BACKDROP_FRAME,
        store.getState().viewport
      )
      expect(store.getState().document.anchors[4]).toEqual(expected)
      expect(
        store
          .getState()
          .rows.slice(-2)
          .map((row) => row.label)
      ).toEqual([INSERT_ANCHOR_STEP.label, 'move anchor'])
    })

    it('inserts into both polities when the stretch is their shared border', () => {
      const { store, context } = openSquare(true)

      arrowPress(context, [303, 200], false)

      const added = store.getState().document.anchors.length - 1
      expect(ringsOf(store, 'fr')).toEqual([[0, 1, added, 2, 3]])
      expect(ringsOf(store, 'hre')).toEqual([[1, 4, 5, 2, added]])
    })

    it('removes a shared anchor from both rings, and names both polities', () => {
      const { store, context, reports } = openSquare(true)
      context.session.selected = [1]

      toolKey(context, 'Backspace')

      expect(ringsOf(store, 'fr')).toEqual([[0, 2, 3]])
      expect(ringsOf(store, 'hre')).toEqual([[4, 5, 2]])
      expect(reports).toEqual([
        'removed an anchor held by 2 paths — Reaume de France, Sacrum Imperium',
      ])
    })

    it('lists the closing stretch of a ring among its stretches', () => {
      const { store } = openSquare()

      expect(targetStretches(store.getState().document, 'fr')).toContainEqual([3, 0])
    })

    it('takes back the insertion with one undo', () => {
      const { store, context } = openSquare()
      arrowPress(context, [200, 103], false)
      arrowRelease(context, [0, 0])

      store.getState().undo()

      expect(ringsOf(store, 'fr')).toEqual([[0, 1, 2, 3]])
    })
  })

  describe('managed errors', () => {
    it('refuses to bring a ring under three anchors, and says so', () => {
      const { store, context, reports } = openSquare()
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      context.session.selected = [0]
      toolKey(context, 'Delete')
      context.session.selected = [1]

      toolKey(context, 'Delete')

      expect(ringsOf(store, 'fr')).toEqual([[1, 2, 3]])
      expect(reports.at(-1)).toBe('not removed — a ring needs at least three anchors')
      expect(warn).toHaveBeenCalledOnce()
    })

    it('does not delete an anchor an undo took away, and does not blame the ring', () => {
      const { store, context, reports } = openSquare()
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      arrowPress(context, [200, 103], false)
      arrowRelease(context, [0, 0])
      store.getState().undo()

      toolKey(context, 'Delete')

      expect(ringsOf(store, 'fr')).toEqual([[0, 1, 2, 3]])
      expect(warn.mock.calls[0]?.[0]).toContain('no longer on the target')
      expect(reports).toEqual([])
      expect(context.session.selected).toEqual([])
    })

    it('leaves Delete to the platform when nothing is selected', () => {
      const { context } = openSquare()

      expect(deleteSelected(context)).toBe(false)
    })
  })

  describe('unmanaged errors', () => {
    it('says it loudly when the document refuses a stretch the tool found', () => {
      const { store, context } = openSquare()
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      store.setState({ insertAnchor: () => null })

      expect(insertOnStretch(context, 'fr', [200, 103])).toBe(true)

      expect(error).toHaveBeenCalledOnce()
      expect(context.session.selected).toEqual([])
    })
  })

  describe('edge cases', () => {
    it('catches the handle rather than inserting, on a corner', () => {
      const { store, context } = openSquare()

      arrowPress(context, [102, 101], false)

      expect(context.session.selected).toEqual([0])
      expect(ringsOf(store, 'fr')).toEqual([[0, 1, 2, 3]])
    })

    it('inserts nothing on another polity’s stretch — only the target is edited', () => {
      const { store, context } = openSquare(true)

      arrowPress(context, [400, 103], false)

      expect(ringsOf(store, 'hre')).toEqual([[1, 4, 5, 2]])
      expect(store.getState().document.anchors).toHaveLength(6)
    })

    it('inserts nothing inside the fill, away from every side', () => {
      const { store, context } = openSquare()

      arrowPress(context, [200, 200], false)

      expect(store.getState().document.anchors).toHaveLength(4)
    })
  })
})
