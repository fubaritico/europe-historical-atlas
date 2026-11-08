import { afterEach, describe, expect, it, vi } from 'vitest'

import { drawOutlineAt, testGestureContext, testPolity, testStore } from '../testGestureContext'

import { edgeHolders, eraseSelectedEdge, keptEdge, selectEdgeAt } from './edgeGestures'
import { arrowPress, arrowRelease, toolKey } from './toolGestures'

import type { CartographerStoreHook } from '../../state/store'

// CARTO-397 — the dev, 2026-11-08: "il faudrait qu'on puisse enlever un trait entre deux points"; a shared edge leaves
// both polities ("c'est spécialement pour les lacs"). France is a square 0 → 1 → 2 → 3, the Empire beside it shares
// its right-hand side, anchors 1 and 2.

afterEach(() => {
  vi.restoreAllMocks()
})

/** France's square, screen positions at scale 1. */
const SQUARE: [number, number][] = [
  [100, 100],
  [300, 100],
  [300, 300],
  [100, 300],
]

/** The Empire's square, sharing France's right-hand side. */
const EAST: [number, number][] = [
  [300, 100],
  [500, 100],
  [500, 300],
  [300, 300],
]

/**
 * France and the Empire side by side, France aimed at under the white arrow.
 * @returns the context, its reports and the store
 */
function openSquares() {
  const store = testStore()
  store.getState().createPolity(testPolity('fr', 'Reaume de France'), { kind: 'c', label: 'fr' })
  store.getState().createPolity(testPolity('hre', 'Sacrum Imperium'), { kind: 'c', label: 'hre' })
  drawOutlineAt(store, 'fr', SQUARE)
  drawOutlineAt(store, 'hre', EAST, [1, null, null, 2])
  store.getState().aimAt('fr')
  store.getState().selectTool('edit')
  return { store, ...testGestureContext(store) }
}

/**
 * A polity's claim.
 * @param store - the store
 * @param polity - whose
 * @returns its rings and open positions
 */
function claimOf(store: CartographerStoreHook, polity: string) {
  return store.getState().document.claims.find((claim) => claim.polity === polity)
}

/**
 * A click of the white arrow: a press and a release in place.
 * @param context - the gesture context
 * @param at - where, in screen pixels
 */
function click(context: Parameters<typeof arrowPress>[0], at: [number, number]): void {
  arrowPress(context, at, false)
  arrowRelease(context, at)
}

describe('edgeGestures', () => {
  describe('happy path', () => {
    it('selects the shared edge on a click on it, and names both polities', () => {
      const { context, reports } = openSquares()

      click(context, [300, 200])

      expect(context.session.edge).toEqual([1, 2])
      expect(reports.at(-1)).toBe(
        'edge selected — Reaume de France, Sacrum Imperium · ‹delete› erases it'
      )
    })

    it('erases the shared edge from both polities on ‹delete›, in one step', () => {
      const { store, context, reports } = openSquares()
      click(context, [300, 200])

      expect(toolKey(context, 'Delete')).toBe(true)

      expect(claimOf(store, 'fr')).toMatchObject({ rings: [[2, 3, 0, 1]], open: [0] })
      expect(claimOf(store, 'hre')?.open).toEqual([0])
      expect(reports.at(-1)).toBe(
        'edge erased — Reaume de France, Sacrum Imperium: 2 outlines opened'
      )
      expect(store.getState().undoLabel).toBe('erase edge')
      expect(context.session.edge).toBeNull()
    })

    it('puts the edge back on one undo', () => {
      const { store, context } = openSquares()
      click(context, [300, 200])
      toolKey(context, 'Delete')

      store.getState().undo()

      expect(claimOf(store, 'fr')?.open).toBeUndefined()
      expect(claimOf(store, 'hre')?.open).toBeUndefined()
    })
  })

  describe('variants', () => {
    it('erases an edge no one shares from the target alone', () => {
      const { store, context, reports } = openSquares()
      click(context, [200, 100])
      toolKey(context, 'Backspace')

      expect(claimOf(store, 'fr')?.open).toEqual([0])
      expect(claimOf(store, 'hre')?.open).toBeUndefined()
      expect(reports.at(-1)).toBe('edge erased — Reaume de France: an outline opened')
    })

    it('drops the edge when a handle is taken — a selection is points or an edge', () => {
      const { context } = openSquares()
      click(context, [300, 200])

      click(context, [100, 100])

      expect(context.session.edge).toBeNull()
      expect(context.session.selected).toEqual([0])
    })

    it('drops the edge on ‹escape›', () => {
      const { context } = openSquares()
      click(context, [300, 200])

      toolKey(context, 'Escape')

      expect(context.session.edge).toBeNull()
    })

    it('drops the edge on a click off every edge', () => {
      const { context } = openSquares()
      click(context, [300, 200])

      click(context, [200, 200])

      expect(context.session.edge).toBeNull()
    })
    it('cuts an open outline and names the piece of one point it leaves out', () => {
      const { store, context, reports } = openSquares()
      click(context, [200, 100])
      toolKey(context, 'Delete')

      // France is now open from anchor 1 round to 0: its last edge, 3–0, is the west side.
      click(context, [100, 200])
      toolKey(context, 'Delete')

      expect(claimOf(store, 'fr')).toMatchObject({ rings: [[1, 2, 3]], open: [0] })
      expect(reports.at(-1)).toBe(
        'edge erased — Reaume de France · an outline cut in two · a piece of one point left out'
      )
    })

    it('names the outline of two points an erasure removes whole', () => {
      const { context, reports } = openSquares()
      // France opened at its top edge, then cut at its bottom one: [1, 2] and [3, 0] are left.
      for (const at of [
        [200, 100],
        [200, 300],
      ] as [number, number][]) {
        click(context, at)
        toolKey(context, 'Delete')
      }

      click(context, [100, 200])
      toolKey(context, 'Delete')

      expect(reports.at(-1)).toBe(
        'edge erased — Reaume de France · an outline of two points removed'
      )
    })

    it('selects no edge from afar: the click chooses the polity under it, as it always did', () => {
      const { store, context } = openSquares()
      context.fromAfar = () => true

      click(context, [303, 200])

      expect(context.session.edge).toBeNull()
      expect(store.getState().target).toBe('hre')
    })
  })

  describe('managed errors', () => {
    it('declines, said in the console, an edge an undo took away since the click', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { store, context } = openSquares()
      click(context, [300, 200])
      store.getState().eraseEdge(1, 2, { kind: 'erase-edge', label: 'erase edge' })

      expect(eraseSelectedEdge(context)).toBe(true)

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('no edge erased'))
    })

    it('selects nothing with nobody aimed at', () => {
      const { store, context } = openSquares()
      store.getState().chooseTarget(null)

      expect(selectEdgeAt(context, [300, 200])).toBe(false)
    })
  })

  // L4: N/A — the edge is two indices the canvas took from the document; a stale one is the managed case above.

  describe('edge cases', () => {
    it('leaves ‹delete› to the anchors when no edge is selected', () => {
      const { store, context } = openSquares()
      click(context, [100, 100])

      toolKey(context, 'Delete')

      expect(store.getState().undoLabel).toBe('delete anchor')
    })

    it('keeps the edge selected while an outline draws it, and drops it once an undo took it away', () => {
      const { store } = openSquares()

      expect(keptEdge([1, 2], store.getState().document)).toEqual([1, 2])
      store.getState().eraseEdge(1, 2, { kind: 'erase-edge', label: 'erase edge' })
      expect(keptEdge([1, 2], store.getState().document)).toBeNull()
      expect(keptEdge(null, store.getState().document)).toBeNull()
    })

    it('names nobody for two anchors no outline joins', () => {
      const { store } = openSquares()

      expect(edgeHolders(store.getState().document, 0, 2)).toEqual([])
    })
  })
})
