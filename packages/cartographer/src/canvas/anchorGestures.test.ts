import { afterEach, describe, expect, it, vi } from 'vitest'

import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'
import { cloneYearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

import { createCartographerStore } from '../state/store'
import { screenToLonLatOnBackdrop } from '../view/projection'
import { TEST_BACKDROP_FRAME } from '../view/testFrame'

import {
  DELETE_ANCHOR_STEP,
  INSERT_ANCHOR_STEP,
  deleteSelected,
  insertOnStretch,
  targetStretches,
} from './anchorGestures'
import { drawOutlineAt, testGestureContext, testPolity, testStore } from './testGestureContext'
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
 * France as a square, aimed at, under the white arrow — and, when asked, the Empire beside it on
 * France's right-hand side.
 * @param shared - whether the Empire shares France's right-hand side
 * @returns the context, its reports and the store
 */
function openSquare(shared = false) {
  const store = testStore()
  store.getState().createPolity(testPolity('fr', 'Reaume de France'), { kind: 'c', label: 'fr' })
  store.getState().createPolity(testPolity('hre', 'Sacrum Imperium'), { kind: 'c', label: 'hre' })
  drawOutlineAt(store, 'fr', SQUARE)
  if (shared) drawOutlineAt(store, 'hre', EAST, [1, null, null, 2])
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
    it('inserts an anchor between anchors 0 and 1 on a click on the top side', () => {
      const { store, context } = openSquare()

      insertOnStretch(context, 'fr', [200, 103])

      expect(ringsOf(store, 'fr')).toEqual([[0, 4, 1, 2, 3]])
      expect(store.getState().rows.at(-1)?.label).toBe(INSERT_ANCHOR_STEP.label)
    })

    it('places the inserted anchor on the side, not under the pointer', () => {
      const { store, context } = openSquare()

      insertOnStretch(context, 'fr', [200, 103])

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
    // The dev, 2026-10-14: the white arrow selects, it never adds a point — that is the Pen's.
    it('inserts nothing when the white arrow presses and drags on a side', () => {
      const { store, context } = openSquare()

      arrowPress(context, [200, 103], false)
      arrowDrag(context, [200, 60])
      arrowRelease(context, [200, 60])

      expect(ringsOf(store, 'fr')).toEqual([[0, 1, 2, 3]])
      expect(store.getState().document.anchors).toHaveLength(4)
      expect(store.getState().rows.map((row) => row.label)).not.toContain(INSERT_ANCHOR_STEP.label)
    })

    it('inserts into both polities when the stretch is their shared border', () => {
      const { store, context } = openSquare(true)

      insertOnStretch(context, 'fr', [303, 200])

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
      insertOnStretch(context, 'fr', [200, 103])

      store.getState().undo()

      expect(ringsOf(store, 'fr')).toEqual([[0, 1, 2, 3]])
    })
  })

  describe('managed errors', () => {
    // The dev, 2026-10-14 (the night's degenerate islands of Denmark): all the points of an outline
    // selected and deleted delete the outline, and the result zone says so.
    it('deletes the target’s ring whole when every anchor of it is selected, and says so', () => {
      const { store, context, reports } = openSquare()
      context.session.selected = [0, 1, 2, 3]
      toolKey(context, 'Delete')
      expect(ringsOf(store, 'fr')).toEqual([])
      expect(reports.at(-1)).toBe('removed 1 ring (4 anchors)')
    })

    // The dev, 2026-10-14: « y'a rien qui doit m'empêcher d'enlever des points. Rien. »
    it('deletes the ring whole when a point would leave it under three anchors, and says so', () => {
      const { store, context, reports } = openSquare()
      context.session.selected = [0]
      toolKey(context, 'Delete')
      context.session.selected = [1]

      toolKey(context, 'Delete')

      expect(ringsOf(store, 'fr')).toEqual([])
      expect(reports.at(-1)).toBe('removed 1 ring (1 anchor)')
    })

    // A neighbour's outline is not the target's to delete: it keeps the points, and is named.
    it('names the neighbour that kept its points rather than fall under three anchors', () => {
      const { store, context, reports } = openSquare(true)
      // France given a point on its top and bottom sides, so it keeps four; the Empire brought to three.
      insertOnStretch(context, 'fr', [200, 103])
      insertOnStretch(context, 'fr', [200, 303])
      store.getState().deleteAnchors([4], { kind: 'd', label: 'd' })
      context.session.selected = [1, 2]

      toolKey(context, 'Delete')

      expect(ringsOf(store, 'fr')).toEqual([[0, 6, 7, 3]])
      expect(ringsOf(store, 'hre')).toEqual([[1, 5, 2]])
      expect(reports.at(-1)).toContain('Sacrum Imperium kept its points')
    })

    it('does not delete an anchor an undo took away, and does not blame the ring', () => {
      const { store, context, reports } = openSquare()
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      insertOnStretch(context, 'fr', [200, 103])
      context.session.selected = [4]
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

      insertOnStretch(context, 'fr', [400, 103])

      expect(ringsOf(store, 'hre')).toEqual([[1, 4, 5, 2]])
      expect(store.getState().document.anchors).toHaveLength(6)
    })

    it('inserts nothing inside the fill, away from every side', () => {
      const { store, context } = openSquare()

      insertOnStretch(context, 'fr', [200, 200])

      expect(store.getState().document.anchors).toHaveLength(4)
    })
  })
})

describe('deleting a whole ring beside a shared border (review ARCH-002)', () => {
  // France [0,1,2,3] and the Empire [1,4,5,2] share 1–2; France also holds an island [6,7,8].
  it('names the neighbour whose outline lost a point beside the ring deleted', () => {
    const document = sharedBorderDocument()
    document.anchors.push([10, 50], [11, 50], [10, 51])
    document.anchorSource.push(0, 0, 0)
    document.claims.find((claim) => claim.polity === 'fr-couronne')?.rings.push([6, 7, 8])
    const store = createCartographerStore({
      edition: { document, clone: cloneYearDocument },
      viewport: { viewport: { scale: 1, originX: 0, originY: 0 } },
    })
    store.getState().chooseTarget('fr-couronne')
    store.getState().selectTool('edit')
    const { context, reports } = testGestureContext(store)
    context.session.selected = [6, 7, 8, 1]
    toolKey(context, 'Delete')
    expect(reports.at(-1)).toBe('removed 1 ring (4 anchors) · points taken from Sacrum Imperium')
    expect(store.getState().document.claims.map((claim) => claim.rings)).toEqual([
      [[0, 2, 3]],
      [[4, 5, 2]],
    ])
  })
})
