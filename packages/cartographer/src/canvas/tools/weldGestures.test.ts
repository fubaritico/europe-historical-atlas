import { afterEach, describe, expect, it, vi } from 'vitest'

import { MIN_RING_ANCHORS } from '@europe-historical-atlas/core/editor/yearDocument'

import { screenToLonLatOnBackdrop } from '../../viewport/projection'
import { TEST_BACKDROP_FRAME } from '../../viewport/testFrame'
import { drawOutlineAt, testGestureContext, testPolity, testStore } from '../testGestureContext'

import { arrowDrag, arrowPress, arrowRelease } from './toolGestures'
import { WELD_ANCHOR_STEP, releaseWeld, weldOfferAt } from './weldGestures'

import type { CartographerStoreHook } from '../../state/store'

afterEach(() => {
  vi.restoreAllMocks()
})

/**
 * France as a square aimed at under the white arrow (anchors 0–3, screen (100,100)–(300,300)), the
 * Empire beside it sharing its right-hand side (anchors 1, 2, then 4, 5), and to the west a march that
 * only nearly meets France — its right-hand side at x = 96 (anchors 6–9).
 * @returns the store, the context and its reports
 */
function threeOutlines() {
  const store = testStore()
  for (const [id, name] of [
    ['fr', 'Reaume de France'],
    ['hre', 'Sacrum Imperium'],
    ['march', 'Marca'],
  ] as const) {
    store.getState().createPolity(testPolity(id, name), { kind: 'c', label: id })
  }
  drawOutlineAt(store, 'fr', [
    [100, 100],
    [300, 100],
    [300, 300],
    [100, 300],
  ])
  drawOutlineAt(
    store,
    'hre',
    [
      [300, 100],
      [500, 100],
      [500, 300],
      [300, 300],
    ],
    [1, null, null, 2]
  )
  drawOutlineAt(store, 'march', [
    [20, 100],
    [96, 100],
    [96, 300],
    [20, 300],
  ])
  store.getState().aimAt('fr')
  store.getState().selectTool('edit')
  return { store, ...testGestureContext(store) }
}

/** The rings of a polity, as anchor indices. */
function ringsOf(store: CartographerStoreHook, polityId: string): number[][] {
  return store.getState().document.claims.find((claim) => claim.polity === polityId)?.rings ?? []
}

/** Press on a point, drag it to another, release there. */
function dragAnchor(
  context: ReturnType<typeof threeOutlines>['context'],
  from: [number, number],
  to: [number, number]
) {
  arrowPress(context, from, false)
  arrowDrag(context, to)
  arrowRelease(context, to)
}

describe('weldGestures', () => {
  describe('happy path', () => {
    // H-37, the dev 2026-10-14: an anchor dropped on a neighbour's becomes it — one point, shared.
    it('welds an anchor dragged onto a neighbour’s anchor, as one step, and says onto whose', () => {
      const { store, context, reports } = threeOutlines()
      dragAnchor(context, [100, 100], [97, 101])
      expect(ringsOf(store, 'fr')).toEqual([[7, 1, 2, 3]])
      expect(ringsOf(store, 'march')).toEqual([[6, 7, 8, 9]])
      expect(store.getState().rows.at(-1)?.label).toBe(WELD_ANCHOR_STEP.label)
      expect(reports.at(-1)).toBe('welded onto Marca’s anchor')
    })
  })

  describe('variants', () => {
    // Onto a stretch: the neighbour gains the point, where the drag put it on its border.
    it('threads an anchor dragged onto a neighbour’s stretch into the neighbour’s ring', () => {
      const { store, context, reports } = threeOutlines()
      dragAnchor(context, [100, 300], [94, 200])
      expect(ringsOf(store, 'march')).toEqual([[6, 7, 3, 8, 9]])
      expect(store.getState().document.anchors[3]).toEqual(
        screenToLonLatOnBackdrop([96, 200], TEST_BACKDROP_FRAME, store.getState().viewport)
      )
      expect(reports.at(-1)).toBe('welded onto Marca’s border')
    })

    it('shows the anchor on the point it would weld onto while dragging', () => {
      const { store, context } = threeOutlines()
      arrowPress(context, [100, 100], false)
      arrowDrag(context, [97, 101])
      expect(context.session.weld).toMatchObject({ kind: 'anchor', into: 7 })
      expect(context.session.moving?.to).toEqual(store.getState().document.anchors[7])
    })

    // QUAL-003: the dragged anchor is held by nothing after the weld — the selection moves onto the survivor.
    it('selects the anchor welded onto, not the one that went', () => {
      const { context } = threeOutlines()
      dragAnchor(context, [100, 100], [97, 101])
      expect(context.session.selected).toEqual([7])
    })

    // QUAL-002: the border is already there at an anchor — never thread a point beside it.
    it('offers a neighbour’s anchor before its stretch when both are in reach', () => {
      const { context } = threeOutlines()
      expect(weldOfferAt(context, 0, [97, 103])).toMatchObject({ kind: 'anchor', into: 7 })
    })

    it('one undo puts the outline back as it was', () => {
      const { store, context } = threeOutlines()
      dragAnchor(context, [100, 100], [97, 101])
      store.getState().undo()
      expect(ringsOf(store, 'fr')).toEqual([[0, 1, 2, 3]])
    })
  })

  describe('managed errors', () => {
    // Out of reach of any neighbour, the drag is an ordinary move.
    it('only moves an anchor released away from any neighbour', () => {
      const { store, context } = threeOutlines()
      dragAnchor(context, [100, 100], [150, 60])
      expect(ringsOf(store, 'fr')).toEqual([[0, 1, 2, 3]])
      expect(store.getState().rows.at(-1)?.label).toBe('move anchor')
    })

    it('says why when the document refuses the weld, and leaves it as it was', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { store, context, reports } = threeOutlines()
      store.setState({ weldAnchor: () => ({ refused: 'pinch' }) })
      dragAnchor(context, [100, 100], [97, 101])
      expect(ringsOf(store, 'fr')).toEqual([[0, 1, 2, 3]])
      expect(reports.at(-1)).toBe('not welded — the outline would pass twice through that point')
      expect(warn).toHaveBeenCalledOnce()
    })

    it('says the floor of anchors an outline keeps, from the one constant', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { store, context, reports } = threeOutlines()
      store.setState({ weldAnchor: () => ({ refused: 'collapse' }) })
      dragAnchor(context, [100, 100], [97, 101])
      expect(reports.at(-1)).toBe(
        `not welded — an outline would keep fewer than ${String(MIN_RING_ANCHORS)} anchors`
      )
    })

    it('keeps the selection on the dragged anchor when the weld is refused', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { store, context } = threeOutlines()
      store.setState({ weldAnchor: () => ({ refused: 'pinch' }) })
      dragAnchor(context, [100, 100], [97, 101])
      expect(context.session.selected).toEqual([0])
    })
  })

  describe('unmanaged errors', () => {
    it('says it loudly when the document finds nothing to weld the tool offered', () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { store, context } = threeOutlines()
      store.setState({ threadAnchor: () => null })
      dragAnchor(context, [100, 300], [94, 200])
      expect(error).toHaveBeenCalledOnce()
    })

    // The drag showed a snap the release does not keep: the screen says so too, not the console alone.
    it('says on screen that nothing was welded when the document finds nothing', () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { store, context, reports } = threeOutlines()
      store.setState({ threadAnchor: () => null })
      dragAnchor(context, [100, 300], [94, 200])
      expect(reports.at(-1)).toBe('not welded — nothing to weld onto there')
    })
  })

  describe('edge cases', () => {
    // Its own border, shared or not, is the target's points — a move, never a weld.
    it('offers no weld on the target’s own stretch, even shared with a neighbour', () => {
      const { context } = threeOutlines()
      expect(weldOfferAt(context, 0, [298, 200])).toBeNull()
      expect(weldOfferAt(context, 0, [200, 102])).toBeNull()
    })

    // QUAL-002: the target's own points are not a neighbour's border, even where it shares them.
    it('never offers an anchor the target holds, even one a neighbour shares', () => {
      const { context } = threeOutlines()
      expect(weldOfferAt(context, 0, [300, 300])).not.toMatchObject({ kind: 'anchor' })
    })

    // ARCH-002: anchor 1 is shared with the Empire, so no ring of the Empire could take it — no offer.
    it('offers no stretch that only rings already holding the anchor run over', () => {
      const { context } = threeOutlines()
      expect(weldOfferAt(context, 1, [498, 200])).toBeNull()
    })

    // ARCH-004: held by no other polity's claim — a deliberate gap alone — there is no name to give.
    it('names nobody when no other polity holds the anchor welded onto', () => {
      const { store, context, reports } = threeOutlines()
      store.setState({ weldAnchor: () => ({ polities: ['fr'] }) })
      expect(releaseWeld(context, 0, { kind: 'anchor', into: 7, at: [0, 0] })).toBe(true)
      expect(reports.at(-1)).toBe('welded onto the anchor')
    })

    // A selection moves as one shape: only an anchor dragged alone welds.
    it('does not weld when the dragged anchor is part of a selection of several', () => {
      const { store, context } = threeOutlines()
      context.session.selected = [0, 3]
      dragAnchor(context, [100, 100], [97, 101])
      expect(ringsOf(store, 'fr')).toEqual([[0, 1, 2, 3]])
      expect(context.session.weld).toBeNull()
    })
  })
})
