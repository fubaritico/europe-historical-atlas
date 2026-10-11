import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { moveAnchor } from '@europe-historical-atlas/core/editor/documentEdits'
import {
  AQUITAINE_IDENTITY,
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

import { FREE_POINT_PROVENANCE, editionActions, snapshot } from './editionSlice'
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

/** The gesture `s02` creates with — its own, because `{History}`'s icon table is keyed on `kind`. */
const CREATE: HistoryStep = { kind: 'create-polity', label: 'create polity' }

describe('editionSlice.createPolity', () => {
  describe('happy path', () => {
    it('adds an identity with no territory, and records one step', () => {
      const { store } = openStore()
      const rowsBefore = store.getState().rows.length

      expect(store.getState().createPolity(AQUITAINE_IDENTITY, CREATE)).toBe(true)

      const state = store.getState()
      expect(state.document.polities.map((polity) => polity.id)).toContain('aquitaine')
      expect(state.document.claims.some((claim) => claim.polity === 'aquitaine')).toBe(false)
      expect(state.rows).toHaveLength(rowsBefore + 1)
      expect(state.undoLabel).toBe('create polity')
    })
  })

  describe('variants', () => {
    it('bumps the version, which is the only thing a selector can watch', () => {
      const { store } = openStore()
      const before = store.getState().version

      store.getState().createPolity(AQUITAINE_IDENTITY, CREATE)

      expect(store.getState().version).toBe(before + 1)
    })

    it('an undo takes the identity back, and a redo puts it there again', () => {
      const { store } = openStore()

      store.getState().createPolity(AQUITAINE_IDENTITY, CREATE)
      store.getState().undo()
      expect(store.getState().document.polities.map((p) => p.id)).not.toContain('aquitaine')

      store.getState().redo()
      expect(store.getState().document.polities.map((p) => p.id)).toContain('aquitaine')
    })

    it('keeps the suzerain tie, which is what the vassal hand is derived from', () => {
      const { store } = openStore()

      store.getState().createPolity(AQUITAINE_IDENTITY, CREATE)

      const stored = store.getState().document.polities.find((p) => p.id === 'aquitaine')
      expect(stored?.suzerain).toBe('fr-couronne')
    })
  })

  describe('managed errors', () => {
    // A taken id is something the **author** typed, so it is returned rather than thrown: the form has
    // to be able to point at the id field. Unlike `goTo`, whose only caller renders from `rows` and can
    // therefore only miss through a programming fault.
    it('refuses a taken id and changes nothing at all', () => {
      const { store } = openStore()
      const before = store.getState()
      const politiesBefore = before.document.polities.length
      const rowsBefore = before.rows.length
      const versionBefore = before.version

      const taken = { ...AQUITAINE_IDENTITY, id: 'fr-couronne' }
      expect(store.getState().createPolity(taken, CREATE)).toBe(false)

      const after = store.getState()
      expect(after.document.polities).toHaveLength(politiesBefore)
      expect(after.rows).toHaveLength(rowsBefore)
      expect(after.version).toBe(versionBefore)
      expect(after.canUndo).toBe(false)
    })

    it('refusing one does not disturb a name that happens to repeat', () => {
      const { store } = openStore()

      const sameName = { ...AQUITAINE_IDENTITY, id: 'aquitaine-2', name: 'Duché d’Aquitaine' }
      store.getState().createPolity(AQUITAINE_IDENTITY, CREATE)

      expect(store.getState().createPolity(sameName, CREATE)).toBe(true)
      expect(
        store.getState().document.polities.filter((p) => p.name === 'Duché d’Aquitaine')
      ).toHaveLength(2)
    })
  })

  describe('unmanaged errors', () => {
    // The copier is made to fail only after the store is built: `createHistory` copies its baseline at
    // construction, so a copier that always throws would never reach the action under test.
    //
    // **What this records is a real exposure, not a guarantee.** The document is mutated before the line
    // is asked to record, so the polity is in the document and not in the line: an undo cannot take it
    // back. Every geometric action at 4d-2 (d) will have the same shape, so it is written up once in
    // `known-issues.md` rather than argued per action. The assertion here is the honest one — the line
    // did not move, and the failure is loud.
    it('propagates a failing copier, leaving the line where it was', () => {
      const document = sharedBorderDocument()
      let failing = false
      const store = createCartographerStore({
        edition: {
          document,
          clone: (doc: YearDocument): YearDocument => {
            if (failing) throw new Error('copier refused')
            return cloneYearDocument(doc)
          },
        },
        viewport: { viewport: UNFRAMED },
      })
      failing = true

      expect(() => store.getState().createPolity(AQUITAINE_IDENTITY, CREATE)).toThrow(
        'copier refused'
      )
      expect(store.getState().rows).toHaveLength(1)
      expect(store.getState().canUndo).toBe(false)
      expect(store.getState().version).toBe(0)
    })
  })

  describe('edge cases', () => {
    // The caller's object must not stay wired to the document: `addPolity` copies what it keeps, so a
    // form reusing its own draft object cannot rewrite a polity already recorded.
    it('does not hold the caller’s object', () => {
      const { store } = openStore()
      const draft = { ...AQUITAINE_IDENTITY }

      store.getState().createPolity(draft, CREATE)
      draft.name = 'rewritten after the fact'

      const stored = store.getState().document.polities.find((p) => p.id === 'aquitaine')
      expect(stored?.name).toBe('Duché d’Aquitaine')
    })

    it('creates into a year that holds nothing yet', () => {
      const document = createYearDocument(1100, { west: -45, south: 20, east: 60, north: 76 })
      const store = createCartographerStore({
        edition: { document, clone: cloneYearDocument },
        viewport: { viewport: UNFRAMED },
      })

      expect(store.getState().createPolity(AQUITAINE_IDENTITY, CREATE)).toBe(true)
      expect(store.getState().document.polities).toHaveLength(1)
    })
  })
})

/** The Pen's closing gesture, named as the gestures module names it. */
const DRAW: HistoryStep = { kind: 'draw-outline', label: 'draw outline' }

/** A small triangle west of the fixture's two squares. */
const OUTLINE = (
  [
    [-4, 47],
    [-2, 48],
    [-2, 46],
  ] as [number, number][]
).map((at) => ({ at, provenance: FREE_POINT_PROVENANCE }))

describe('editionSlice.drawOutline and moveAnchor', () => {
  describe('happy path', () => {
    // H-10 — one gesture, one step: the whole outline comes back out in one ctrl+z.
    it('adds a closed outline as one step, and one undo takes it all back', () => {
      const { store } = openStore()
      const anchors = store.getState().document.anchors.length
      expect(store.getState().drawOutline('fr-couronne', OUTLINE, DRAW)).toBe(true)
      expect(store.getState().document.anchors).toHaveLength(anchors + 3)
      store.getState().undo()
      expect(store.getState().document.anchors).toHaveLength(anchors)
    })

    it('moves an anchor as one step, and the undo puts it back', () => {
      const { store } = openStore()
      expect(store.getState().moveAnchor(1, [3, 49], MOVE)).toBe(true)
      expect(store.getState().document.anchors[1]).toEqual([3, 49])
      store.getState().undo()
      expect(store.getState().document.anchors[1]).toEqual([2, 48])
    })
  })

  describe('variants', () => {
    it('records a drawn point under the free point’s provenance', () => {
      const { store } = openStore()
      store.getState().drawOutline('fr-couronne', OUTLINE, DRAW)
      const { document } = store.getState()
      const source = document.anchorSource.at(-1)
      expect(document.sources.find((entry) => entry.id === source)).toMatchObject(
        FREE_POINT_PROVENANCE
      )
    })
  })

  describe('managed errors', () => {
    it('records nothing for an outline the document refuses', () => {
      const { store } = openStore()
      const version = store.getState().version
      expect(store.getState().drawOutline('nobody', OUTLINE, DRAW)).toBe(false)
      expect(store.getState().version).toBe(version)
      expect(store.getState().canUndo).toBe(false)
    })

    it('records nothing for an anchor that is not there', () => {
      const { store } = openStore()
      expect(store.getState().moveAnchor(99, [0, 0], MOVE)).toBe(false)
      expect(store.getState().canUndo).toBe(false)
    })
  })

  describe('unmanaged errors', () => {
    // L4: N/A — both actions refuse before writing; a throwing copier is covered for every action above.
    it('bumps the version once per recorded gesture, so the canvas repaints', () => {
      const { store } = openStore()
      const version = store.getState().version
      store.getState().moveAnchor(1, [3, 49], MOVE)
      expect(store.getState().version).toBe(version + 1)
    })
  })

  describe('edge cases', () => {
    it('restores a shared anchor for both owners on undo', () => {
      const { store } = openStore()
      store.getState().moveAnchor(1, [3, 49], MOVE)
      store.getState().undo()
      const { document } = store.getState()
      expect(document.claims.map((claim) => claim.rings[0]?.includes(1))).toEqual([true, true])
      expect(document.anchors[1]).toEqual([2, 48])
    })
  })
})

/** How the white arrow's two anchor edits are named. */
const INSERT: HistoryStep = { kind: 'insert-anchor', label: 'insert anchor' }
const DELETE: HistoryStep = { kind: 'delete-anchor', label: 'delete anchor' }

describe('editionSlice.insertAnchor and deleteAnchor', () => {
  describe('happy path', () => {
    it('inserts an anchor on the shared side into both rings, as one step', () => {
      const { store } = openStore()

      expect(store.getState().insertAnchor(1, 2, [2, 47], INSERT)).toBe(6)

      const rings = store.getState().document.claims.map((claim) => claim.rings[0])
      expect(rings).toEqual([
        [0, 1, 6, 2, 3],
        [1, 4, 5, 2, 6],
      ])
      store.getState().undo()
      expect(store.getState().document.anchors).toHaveLength(6)
    })

    it('removes the shared anchor from both rings, naming both holders', () => {
      const { store } = openStore()

      expect(store.getState().deleteAnchor(1, DELETE)).toEqual({ polities: ['fr-couronne', 'hre'] })

      expect(store.getState().document.claims.map((claim) => claim.rings[0])).toEqual([
        [0, 2, 3],
        [4, 5, 2],
      ])
    })
  })

  describe('variants', () => {
    it('records the inserted point as reported by eye', () => {
      const { store } = openStore()
      store.getState().insertAnchor(0, 1, [1, 48], INSERT)
      const { document } = store.getState()
      const source = document.anchorSource.at(-1)
      expect(document.sources.find((entry) => entry.id === source)).toMatchObject(
        FREE_POINT_PROVENANCE
      )
    })
  })

  describe('managed errors', () => {
    it('records nothing for two anchors no ring joins', () => {
      const { store } = openStore()
      expect(store.getState().insertAnchor(0, 2, [1, 47], INSERT)).toBeNull()
      expect(store.getState().canUndo).toBe(false)
      expect(store.getState().document.anchors).toHaveLength(6)
    })

    it('records nothing for a deletion that would leave a ring of two', () => {
      const { store } = openStore()
      store.getState().deleteAnchor(0, DELETE)
      const steps = store.getState().rows.length
      expect(store.getState().deleteAnchor(3, DELETE)).toBeNull()
      expect(store.getState().rows).toHaveLength(steps)
    })
  })

  describe('unmanaged errors', () => {
    it('records nothing for an anchor no ring holds', () => {
      const { store } = openStore()
      expect(store.getState().deleteAnchor(99, DELETE)).toBeNull()
      expect(store.getState().canUndo).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('keeps the deleted anchor in the table, so an undo finds it at the same index', () => {
      const { store } = openStore()
      store.getState().deleteAnchor(1, DELETE)
      expect(store.getState().document.anchors).toHaveLength(6)
      store.getState().undo()
      expect(store.getState().document.claims[0]?.rings[0]).toEqual([0, 1, 2, 3])
    })
  })
})

describe('editionSlice.restackPolity', () => {
  /** How s16 names the step. */
  const FRONT: HistoryStep = { kind: 'restack', label: 'bring to front — Sacrum Imperium' }

  const ids = (store: ReturnType<typeof openStore>['store']): string[] =>
    store.getState().document.polities.map((polity) => polity.id)

  describe('happy path', () => {
    // s16 — "{History} gains one step … And ‹ctrl+Z› puts France back on top".
    it('moves a group as one step, and the undo puts the order back', () => {
      const { store } = openStore()
      const before = ids(store)
      expect(store.getState().restackPolity(before[0] ?? '', 'front', FRONT)).toBe(true)
      expect(ids(store)).toEqual([...before].reverse())
      expect(store.getState().undoLabel).toBe('bring to front — Sacrum Imperium')
      store.getState().undo()
      expect(ids(store)).toEqual(before)
    })
  })

  describe('variants', () => {
    it('publishes the move, so the canvas repaints', () => {
      const { store } = openStore()
      const version = store.getState().version
      store.getState().restackPolity(ids(store)[0] ?? '', 'front', FRONT)
      expect(store.getState().version).toBeGreaterThan(version)
    })
  })

  describe('managed errors', () => {
    it('records nothing for a move that would change nothing', () => {
      const { store } = openStore()
      const version = store.getState().version
      expect(store.getState().restackPolity(ids(store)[1] ?? '', 'front', FRONT)).toBe(false)
      expect(store.getState().version).toBe(version)
      expect(store.getState().canUndo).toBe(false)
    })
  })

  describe('unmanaged errors', () => {
    it('records nothing for a polity the year does not hold', () => {
      const { store } = openStore()
      expect(store.getState().restackPolity('nobody', 'back', FRONT)).toBe(false)
      expect(store.getState().canUndo).toBe(false)
    })
  })

  // L5: the edge cases of the order itself are `core/editor/stacking`'s; this only records it.
})

describe('editionSlice.editPolity', () => {
  const EDIT: HistoryStep = { kind: 'edit-polity', label: 'edit Royaume de France' }

  describe('happy path', () => {
    // s07 — "When I validate / Then the change lands".
    it('changes a polity as one step, and the undo puts it back', () => {
      const { store } = openStore()
      const france = store.getState().document.polities[0]
      if (france === undefined) throw new Error('fixture changed')
      expect(store.getState().editPolity({ ...france, name: 'Royaume de France' }, EDIT)).toBe(true)
      expect(store.getState().document.polities[0]?.name).toBe('Royaume de France')
      expect(store.getState().undoLabel).toBe('edit Royaume de France')
      store.getState().undo()
      expect(store.getState().document.polities[0]?.name).toBe(france.name)
    })
  })

  describe('managed errors', () => {
    it('records nothing for a suzerain that would loop', () => {
      const { store } = openStore()
      const france = store.getState().document.polities[0]
      if (france === undefined) throw new Error('fixture changed')
      expect(store.getState().editPolity({ ...france, suzerain: france.id }, EDIT)).toBe(false)
      expect(store.getState().canUndo).toBe(false)
    })
  })

  // L2/L4/L5: the variants and edges of the change are `core/editor/documentEdits.updatePolity`'s.
})
