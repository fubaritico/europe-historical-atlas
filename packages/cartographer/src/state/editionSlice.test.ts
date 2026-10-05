import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { moveAnchor } from '@europe-historical-atlas/core/editor/documentEdits'
import {
  firstSharedAnchor,
  ringOf,
  sharedAnchorsBetween,
  sharedBorderDocument,
} from '@europe-historical-atlas/core/editor/documentFixtures'
import {
  cloneYearDocument,
  createYearDocument,
} from '@europe-historical-atlas/core/editor/yearDocument'

import { UNFRAMED } from '../view/viewport'

import { editionActions, snapshot } from './editionSlice'
import { createCartographerStore } from './store'

import type { History, HistoryStep } from '@europe-historical-atlas/core/editor/history'
import type { YearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

/** A gesture to record, named so an assertion on a label reads. */
const MOVE: HistoryStep = { kind: 'move-anchor', label: 'move anchor' }

/** A second gesture, so a line can hold two distinguishable steps. */
const CLOSE: HistoryStep = { kind: 'close-ring', label: 'close ring' }

/**
 * A line that answers whatever a test needs it to answer.
 *
 * The reason it exists: {@link editionActions} takes a line and a publisher, so the whole action set is
 * exercisable against literals — no store, no document, no React.
 * @param overrides - the members this test cares about
 * @returns a complete line, inert except where overridden
 */
function stubLine(overrides: Partial<History<YearDocument>> = {}): History<YearDocument> {
  return {
    rows: [],
    markers: [],
    canUndo: false,
    canRedo: false,
    undoLabel: null,
    redoLabel: null,
    depth: 0,
    commit: (): void => undefined,
    goTo: (): null => null,
    undo: (): null => null,
    redo: (): null => null,
    mark: (): number => 1,
    restoreMarker: (): null => null,
    dropMarker: (): boolean => false,
    reset: (): void => undefined,
    ...overrides,
  }
}

/** A store on the shared-border fixture, which is the document every guarantee here turns on. */
function openStore(limit?: number) {
  const document = sharedBorderDocument()
  return {
    document,
    store: createCartographerStore({
      edition: {
        document,
        clone: cloneYearDocument,
        ...(limit === undefined ? {} : { limit }),
      },
      viewport: { viewport: UNFRAMED },
    }),
  }
}

describe('editionSlice', () => {
  describe('happy path', () => {
    it('opens on the document, with one row, no undo and no redo', () => {
      const { document, store } = openStore()
      const state = store.getState()

      expect(state.document).toBe(document)
      expect(state.version).toBe(0)
      expect(state.rows).toHaveLength(1)
      expect(state.rows[0]?.current).toBe(true)
      expect(state.canUndo).toBe(false)
      expect(state.canRedo).toBe(false)
      expect(state.undoLabel).toBeNull()
      expect(state.redoLabel).toBeNull()
    })

    it('reads every member the line exposes, and no more', () => {
      const document = sharedBorderDocument()
      const line = stubLine({
        rows: [{ ...MOVE, index: 0, current: true }],
        markers: [{ ...CLOSE, id: 7, depth: 2 }],
        canUndo: true,
        canRedo: true,
        undoLabel: 'move anchor',
        redoLabel: 'close ring',
      })

      expect(snapshot(line, document, 4)).toEqual({
        document,
        version: 4,
        rows: line.rows,
        markers: line.markers,
        canUndo: true,
        canRedo: true,
        undoLabel: 'move anchor',
        redoLabel: 'close ring',
      })
    })
  })

  describe('variants', () => {
    it('records a gesture, which enables undo and names it', () => {
      const { store } = openStore()

      store.getState().commit(MOVE)

      expect(store.getState().rows).toHaveLength(2)
      expect(store.getState().canUndo).toBe(true)
      expect(store.getState().undoLabel).toBe('move anchor')
      expect(store.getState().redoLabel).toBeNull()
    })

    it('gives back the document as it stood, and enables redo', () => {
      const { document, store } = openStore()
      const shared = firstSharedAnchor(document)
      moveAnchor(document, shared, [1, 47])
      store.getState().commit(MOVE)

      store.getState().undo()

      expect(ringOf(store.getState().document, 'fr-couronne')).not.toContainEqual([1, 47])
      expect(store.getState().canRedo).toBe(true)
      expect(store.getState().redoLabel).toBe('move anchor')
    })

    it('applies an undone gesture again', () => {
      const { document, store } = openStore()
      const shared = firstSharedAnchor(document)
      moveAnchor(document, shared, [1, 47])
      store.getState().commit(MOVE)
      store.getState().undo()

      store.getState().redo()

      expect(ringOf(store.getState().document, 'fr-couronne')).toContainEqual([1, 47])
      expect(store.getState().canRedo).toBe(false)
    })

    it('stands on any row of the line', () => {
      const { store } = openStore()
      store.getState().commit(MOVE)
      store.getState().commit(CLOSE)

      store.getState().goTo(0)

      expect(store.getState().rows[0]?.current).toBe(true)
      expect(store.getState().canUndo).toBe(false)
      expect(store.getState().canRedo).toBe(true)
    })

    it('lists a marker with what it holds', () => {
      const { store } = openStore()
      store.getState().commit(MOVE)
      store.getState().commit(CLOSE)

      const id = store.getState().mark({ kind: 'milestone', label: 'before the coast' })

      expect(store.getState().markers).toEqual([
        { kind: 'milestone', label: 'before the coast', id, depth: 2 },
      ])
    })

    it('puts back what a marker froze, past a truncation', () => {
      const { store } = openStore()
      store.getState().commit(MOVE)
      store.getState().commit(CLOSE)
      const id = store.getState().mark({ kind: 'milestone', label: 'both gestures' })
      store.getState().undo()
      store.getState().undo()
      store.getState().commit({ kind: 'add-anchor', label: 'add anchor' })

      expect(store.getState().rows.map((row) => row.kind)).toEqual(['open', 'add-anchor'])

      store.getState().restoreMarker(id)

      expect(store.getState().rows.map((row) => row.kind)).toEqual([
        'open',
        'move-anchor',
        'close-ring',
      ])
      expect(store.getState().canRedo).toBe(false)
    })

    it('forgets a marker', () => {
      const { store } = openStore()
      store.getState().commit(MOVE)
      const id = store.getState().mark({ kind: 'milestone', label: 'one gesture' })

      store.getState().dropMarker(id)

      expect(store.getState().markers).toEqual([])
    })

    it('opens another document on a fresh line', () => {
      const { store } = openStore()
      store.getState().commit(MOVE)
      const next = createYearDocument(1200, { west: -45, south: 20, east: 60, north: 76 })

      store.getState().open(next, { kind: 'open', label: 'ouvrir' })

      expect(store.getState().document).toBe(next)
      expect(store.getState().rows).toEqual([
        { kind: 'open', label: 'ouvrir', index: 0, current: true },
      ])
      expect(store.getState().canUndo).toBe(false)
      expect(store.getState().markers).toEqual([])
    })

    it('bumps the version on every action, including the ones that leave the document alone', () => {
      const { document, store } = openStore()
      store.getState().commit(MOVE)
      store.getState().commit(CLOSE)
      const id = store.getState().mark({ kind: 'milestone', label: 'both' })
      const before = store.getState().version

      const acted: Record<string, () => void> = {
        commit: () => {
          store.getState().commit(MOVE)
        },
        undo: () => {
          store.getState().undo()
        },
        redo: () => {
          store.getState().redo()
        },
        goTo: () => {
          store.getState().goTo(1)
        },
        mark: () => {
          store.getState().mark({ kind: 'milestone', label: 'again' })
        },
        restoreMarker: () => {
          store.getState().restoreMarker(id)
        },
        dropMarker: () => {
          store.getState().dropMarker(id)
        },
        open: () => {
          store.getState().open(document)
        },
      }

      let seen = before
      for (const [name, run] of Object.entries(acted)) {
        const was = store.getState().version
        run()
        expect(store.getState().version, `${name} must bump the version`).toBe(was + 1)
        seen = store.getState().version
      }

      expect(seen).toBe(before + Object.keys(acted).length)
    })

    it('keeps the rows reference between two actions, and replaces it at each one', () => {
      const { store } = openStore()

      const first = store.getState().rows
      expect(store.getState().rows).toBe(first)

      store.getState().commit(MOVE)

      expect(store.getState().rows).not.toBe(first)
      expect(store.getState().rows).toBe(store.getState().rows)
    })

    it('notifies a selector subscription, painting at once when asked to', () => {
      const { store } = openStore()
      const seen: number[] = []

      const unsubscribe = store.subscribe(
        (state) => state.version,
        (version) => {
          seen.push(version)
        },
        { fireImmediately: true }
      )
      store.getState().commit(MOVE)
      unsubscribe()
      store.getState().commit(CLOSE)

      expect(seen).toEqual([0, 1])
    })

    it('is readable as a React hook', () => {
      // The binding is deliberately not `use`-prefixed: `renderHook` is its only caller, and a `use…`
      // name makes the rules-of-hooks lint read this arrow as a component it is not.
      const { store } = openStore()

      const { result } = renderHook(() => store((state) => state.version))
      expect(result.current).toBe(0)

      act(() => {
        store.getState().commit(MOVE)
      })
      expect(result.current).toBe(1)
    })
  })

  describe('managed errors', () => {
    it('does nothing when there is nothing to take back', () => {
      const { store } = openStore()

      expect(() => {
        store.getState().undo()
      }).not.toThrow()
      expect(store.getState().version).toBe(0)
      expect(store.getState().rows).toHaveLength(1)
    })

    it('does nothing when there is nothing to apply again', () => {
      const { store } = openStore()
      store.getState().commit(MOVE)
      const version = store.getState().version

      expect(() => {
        store.getState().redo()
      }).not.toThrow()
      expect(store.getState().version).toBe(version)
    })

    it('keeps no undo at all when the limit is zero', () => {
      const { store } = openStore(0)

      store.getState().commit(MOVE)

      expect(store.getState().canUndo).toBe(false)
      expect(store.getState().rows).toHaveLength(1)
    })

    it('treats a nonsensical limit as no undo rather than draining forever', () => {
      const { store } = openStore(-5)

      store.getState().commit(MOVE)
      store.getState().commit(CLOSE)

      expect(store.getState().canUndo).toBe(false)
      expect(store.getState().rows).toHaveLength(1)
    })
  })

  describe('unmanaged errors', () => {
    it('leaves the state exactly as it was when the copier throws', () => {
      const document = sharedBorderDocument()
      let failing = false
      const store = createCartographerStore({
        edition: {
          document,
          clone: (doc: YearDocument): YearDocument => {
            if (failing) throw new Error('copier failed')
            return cloneYearDocument(doc)
          },
        },
        viewport: { viewport: UNFRAMED },
      })
      failing = true

      expect(() => {
        store.getState().commit(MOVE)
      }).toThrow('copier failed')
      expect(store.getState().version).toBe(0)
      expect(store.getState().rows).toHaveLength(1)
      expect(store.getState().canUndo).toBe(false)
    })

    it('refuses a row the line does not hold, naming it', () => {
      const { store } = openStore()

      expect(() => {
        store.getState().goTo(99)
      }).toThrow(/row 99 is not in the line/)
      expect(store.getState().version).toBe(0)
    })

    it('refuses a marker the line does not hold, naming it', () => {
      const { store } = openStore()

      expect(() => {
        store.getState().restoreMarker(999)
      }).toThrow(/marker 999 is not in the line/)
      expect(() => {
        store.getState().dropMarker(999)
      }).toThrow(/marker 999 is not in the line/)
      expect(store.getState().version).toBe(0)
    })

    it('publishes nothing when a jump it was told to make finds nothing', () => {
      const publish = vi.fn()
      const document = sharedBorderDocument()
      const actions = editionActions(stubLine(), publish, () => document)

      expect(() => {
        actions.goTo(3)
      }).toThrow(/row 3/)
      expect(() => {
        actions.restoreMarker(3)
      }).toThrow(/marker 3/)
      expect(() => {
        actions.dropMarker(3)
      }).toThrow(/marker 3/)
      expect(publish).not.toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    it('restores the sharing, not coordinates — two outlines still move together after an undo', () => {
      const { document, store } = openStore()
      const shared = firstSharedAnchor(document)
      moveAnchor(document, shared, [1, 47])
      store.getState().commit(MOVE)
      moveAnchor(document, shared, [9, 9])
      store.getState().commit(MOVE)

      store.getState().undo()
      const restored = store.getState().document

      expect(sharedAnchorsBetween(restored, 'fr-couronne', 'hre')).toEqual(
        sharedAnchorsBetween(document, 'fr-couronne', 'hre')
      )

      moveAnchor(restored, shared, [5, 5])

      expect(ringOf(restored, 'fr-couronne')).toContainEqual([5, 5])
      expect(ringOf(restored, 'hre')).toContainEqual([5, 5])
    })

    it('adopts the document an undo returns instead of keeping its own', () => {
      const { store } = openStore()
      store.getState().commit(MOVE)
      const before = store.getState().document

      store.getState().undo()

      expect(store.getState().document).not.toBe(before)
    })

    it('does not let an edit of a restored document reach the line', () => {
      const { document, store } = openStore()
      const shared = firstSharedAnchor(document)
      store.getState().commit(MOVE)
      store.getState().undo()

      moveAnchor(store.getState().document, shared, [7, 7])
      store.getState().goTo(0)

      expect(ringOf(store.getState().document, 'fr-couronne')).not.toContainEqual([7, 7])
    })

    it('opens on a year with nothing in it', () => {
      const document = createYearDocument(1100, { west: -45, south: 20, east: 60, north: 76 })
      const store = createCartographerStore({
        edition: { document, clone: cloneYearDocument },
        viewport: { viewport: UNFRAMED },
      })

      store.getState().commit({ kind: 'add-anchor', label: 'add anchor' })
      store.getState().undo()

      expect(store.getState().document.anchors).toEqual([])
      expect(store.getState().rows).toHaveLength(2)
    })

    it('drops the oldest step past the limit instead of growing without end', () => {
      const { store } = openStore(2)

      store.getState().commit(MOVE)
      store.getState().commit(CLOSE)
      store.getState().commit({ kind: 'add-anchor', label: 'add anchor' })

      expect(store.getState().rows).toHaveLength(3)
      expect(store.getState().rows.map((row) => row.kind)).toEqual([
        'move-anchor',
        'close-ring',
        'add-anchor',
      ])
    })
  })
})
