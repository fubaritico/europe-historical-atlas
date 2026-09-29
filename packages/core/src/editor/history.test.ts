import { describe, expect, it, vi } from 'vitest'

import { moveAnchor } from './documentEdits'
import { firstSharedAnchor, ringOf, sharedBorderDocument } from './documentFixtures'
import { DEFAULT_HISTORY_LIMIT, createHistory } from './history'
import { cloneYearDocument } from './yearDocument'

import type { HistoryStep } from './history'

/** A state small enough to read in an assertion, with something mutable in it to catch aliasing. */
interface Probe {
  n: number
  tag: string[]
}

const cloneProbe = (state: Probe): Probe => ({ n: state.n, tag: [...state.tag] })

const probe = (n: number, ...tag: string[]): Probe => ({ n, tag })

const step = (kind: string, label = kind): HistoryStep => ({ kind, label })

/** A line on three recorded gestures, which is what most of the cursor arithmetic needs. */
function threeGestures(): ReturnType<typeof createHistory<Probe>> {
  const history = createHistory(probe(0), { clone: cloneProbe })
  history.commit(step('one'), probe(1))
  history.commit(step('two'), probe(2))
  history.commit(step('three'), probe(3))
  return history
}

describe('createHistory', () => {
  describe('happy path', () => {
    it('opens with both arrows disabled, because nothing has been edited yet', () => {
      const history = createHistory(probe(0), { clone: cloneProbe })
      expect(history.canUndo).toBe(false)
      expect(history.canRedo).toBe(false)
      expect(history.depth).toBe(0)
      expect(history.undoLabel).toBeNull()
      expect(history.redoLabel).toBeNull()
    })

    it('makes undo available and names the step it would take back', () => {
      const history = createHistory(probe(0), { clone: cloneProbe })
      history.commit(step('move-anchor', 'move anchor'), probe(1))
      expect(history.canUndo).toBe(true)
      expect(history.canRedo).toBe(false)
      expect(history.undoLabel).toBe('move anchor')
      expect(history.depth).toBe(1)
    })

    it('gives back the state as it stood before the gesture', () => {
      const history = createHistory(probe(0), { clone: cloneProbe })
      history.commit(step('one'), probe(1))
      expect(history.undo()?.n).toBe(0)
    })

    it('applies the gesture again on redo', () => {
      const history = createHistory(probe(0), { clone: cloneProbe })
      history.commit(step('one'), probe(1))
      history.undo()
      expect(history.redo()?.n).toBe(1)
      expect(history.canRedo).toBe(false)
    })
  })

  describe('the panel rows', () => {
    it('lists the origin and every gesture, oldest first', () => {
      const rows = threeGestures().rows
      expect(rows.map((row) => row.label)).toEqual(['open', 'one', 'two', 'three'])
      expect(rows.map((row) => row.index)).toEqual([0, 1, 2, 3])
    })

    it('marks exactly one row as current, and it follows the cursor', () => {
      const history = threeGestures()
      expect(history.rows.filter((row) => row.current).map((row) => row.index)).toEqual([3])
      history.undo()
      history.undo()
      expect(history.rows.filter((row) => row.current).map((row) => row.index)).toEqual([1])
    })

    it('CARRIES THE KIND BESIDE THE LABEL, so an icon is never keyed on display text', () => {
      // A polity *being* its display string is what gave the old payload nine colour regexes and an
      // ordering that had to test the United Kingdom before Ireland. The panel's icon reads `kind`.
      const history = createHistory(probe(0), { clone: cloneProbe })
      history.commit({ kind: 'move-anchor', label: 'déplacer une ancre' }, probe(1))
      const row = history.rows[1]
      expect(row?.kind).toBe('move-anchor')
      expect(row?.label).toBe('déplacer une ancre')
    })

    it('lets the caller name the origin, since core ships no display text', () => {
      const history = createHistory(probe(0), {
        clone: cloneProbe,
        origin: { kind: 'open', label: 'Ouvrir' },
      })
      expect(history.rows[0]?.label).toBe('Ouvrir')
    })
  })

  describe('variants', () => {
    it("DROPS THE OLD FUTURE at the next commit — the dev's own sequence, 2026-09-29", () => {
      // Three gestures, undo the third, undo the second, then do something else. Gestures two and three
      // are gone, and the new one takes the place the second held.
      const history = threeGestures()
      expect(history.undo()?.n).toBe(2)
      expect(history.undo()?.n).toBe(1)
      expect(history.depth).toBe(3) // nothing destroyed yet — the undos only moved the cursor

      history.commit(step('something-else'), probe(9))

      expect(history.depth).toBe(2)
      expect(history.canRedo).toBe(false)
      expect(history.redoLabel).toBeNull()
      expect(history.rows.map((row) => row.label)).toEqual(['open', 'one', 'something-else'])
      expect(history.undo()?.n).toBe(1)
    })

    it('REACHES A GESTURE IN ONE JUMP, which is what the panel is for', () => {
      // "Ça permet de naviguer plus vite à une opération sans avoir fait 10 fois undo" — the dev.
      const history = threeGestures()
      expect(history.goTo(1)?.n).toBe(1)
      expect(history.rows[1]?.current).toBe(true)
      expect(history.goTo(3)?.n).toBe(3) // and forward again, in one jump too
    })

    it('destroys nothing on a jump, so the row ahead is still reachable', () => {
      const history = threeGestures()
      history.goTo(1)
      expect(history.depth).toBe(3)
      expect(history.canRedo).toBe(true)
      expect(history.goTo(2)?.n).toBe(2)
    })

    it('destroys nothing while undoing, which is what lets redo work at all', () => {
      const history = threeGestures()
      history.undo()
      history.undo()
      expect(history.depth).toBe(3)
      expect(history.canRedo).toBe(true)
      expect(history.redoLabel).toBe('two')
      expect(history.redo()?.n).toBe(2)
    })

    it('always leaves the cursor at the end of the line after a commit', () => {
      const history = threeGestures()
      history.undo()
      history.commit(step('four'), probe(4))
      expect(history.canRedo).toBe(false)
      expect(history.undo()?.n).toBe(2)
    })

    it('names both directions from where the cursor sits', () => {
      const history = threeGestures()
      expect(history.undoLabel).toBe('three')
      expect(history.redoLabel).toBeNull()
      history.undo()
      expect(history.undoLabel).toBe('two')
      expect(history.redoLabel).toBe('three')
    })

    it('starts a new line on reset, because the old one belonged to the file just closed', () => {
      const history = threeGestures()
      history.mark(step('before'))
      history.reset(probe(100))
      expect(history.canUndo).toBe(false)
      expect(history.depth).toBe(0)
      expect(history.markers).toEqual([])
      history.commit(step('first-of-the-new-file'), probe(101))
      expect(history.undo()?.n).toBe(100)
    })

    it('KEEPS THE SHARING through a snapshot, composed with the real document', () => {
      // The guarantee of step 2, carried into step 3: restoring must restore the sharing and not just the
      // coordinates. Written to fail if a snapshot ever resolved rings back to points.
      const doc = sharedBorderDocument()
      const history = createHistory(doc, { clone: cloneYearDocument })
      const shared = firstSharedAnchor(doc)

      moveAnchor(doc, shared, [99, 99])
      history.commit(step('move-anchor', 'move anchor'), doc)

      const before = history.undo()
      if (before === null) throw new Error('there was a gesture to take back')
      expect(ringOf(before, 'fr-couronne')).not.toContainEqual([99, 99])

      // The restored document is still one where two rings hold the same point.
      moveAnchor(before, shared, [77, 77])
      expect(ringOf(before, 'fr-couronne')).toContainEqual([77, 77])
      expect(ringOf(before, 'hre')).toContainEqual([77, 77])
    })
  })

  describe('markers', () => {
    it('HOLDS THE STEPS BEFORE IT, not only the state — the dev, 2026-09-29', () => {
      // A marker set at gesture three survives the truncation that kills two and three, and brings the
      // whole run back. Without a branch, this is the only way past a truncation.
      const history = threeGestures()
      const id = history.mark(step('before-the-detour', 'before the detour'))

      history.undo()
      history.undo()
      history.commit(step('something-else'), probe(9))
      expect(history.rows.map((row) => row.label)).toEqual(['open', 'one', 'something-else'])

      expect(history.restoreMarker(id)?.n).toBe(3)
      expect(history.rows.map((row) => row.label)).toEqual(['open', 'one', 'two', 'three'])
      expect(history.canUndo).toBe(true)
      expect(history.undo()?.n).toBe(2)
    })

    it('freezes the line where the cursor stands, not where it ends', () => {
      const history = threeGestures()
      history.undo()
      const id = history.mark(step('at-two'))
      expect(history.markers[0]?.depth).toBe(2)
      expect(history.restoreMarker(id)?.n).toBe(2)
      expect(history.rows.map((row) => row.label)).toEqual(['open', 'one', 'two'])
    })

    it('reports its markers for the panel, with what each is called', () => {
      const history = threeGestures()
      history.mark({ kind: 'marker', label: 'avant Aquitaine' })
      expect(history.markers).toEqual([
        { kind: 'marker', label: 'avant Aquitaine', id: 1, depth: 3 },
      ])
    })

    it('survives the limit dropping the steps it froze', () => {
      const history = createHistory(probe(0), { clone: cloneProbe, limit: 2 })
      history.commit(step('one'), probe(1))
      const id = history.mark(step('kept'))
      history.commit(step('two'), probe(2))
      history.commit(step('three'), probe(3))
      expect(history.depth).toBe(2) // the origin and gesture one have fallen off the live line
      expect(history.restoreMarker(id)?.n).toBe(1)
      expect(history.rows.map((row) => row.label)).toEqual(['open', 'one'])
    })

    it('forgets a marker on request, and says whether there was one', () => {
      const history = threeGestures()
      const id = history.mark(step('temporary'))
      expect(history.dropMarker(id)).toBe(true)
      expect(history.markers).toEqual([])
      expect(history.dropMarker(id)).toBe(false)
      expect(history.restoreMarker(id)).toBeNull()
    })

    it('never reuses an id, so a dropped marker cannot come back meaning something else', () => {
      const history = threeGestures()
      const first = history.mark(step('a'))
      history.dropMarker(first)
      expect(history.mark(step('b'))).not.toBe(first)
    })
  })

  describe('managed errors', () => {
    it('answers null rather than a state when there is nothing to take back', () => {
      const history = createHistory(probe(0), { clone: cloneProbe })
      expect(history.undo()).toBeNull()
      expect(history.canUndo).toBe(false)
    })

    it('answers null rather than a state when there is nothing ahead', () => {
      const history = createHistory(probe(0), { clone: cloneProbe })
      history.commit(step('one'), probe(1))
      expect(history.redo()).toBeNull()
    })

    it('refuses a jump outside the line and leaves the cursor alone', () => {
      const history = threeGestures()
      expect(history.goTo(-1)).toBeNull()
      expect(history.goTo(4)).toBeNull()
      expect(history.rows[3]?.current).toBe(true)
    })

    it('answers null rather than a state for a marker that is not there', () => {
      expect(threeGestures().restoreMarker(404)).toBeNull()
    })

    it('drops the oldest step past the limit, and says so through its depth', () => {
      const history = createHistory(probe(0), { clone: cloneProbe, limit: 2 })
      history.commit(step('one'), probe(1))
      history.commit(step('two'), probe(2))
      history.commit(step('three'), probe(3))
      expect(history.depth).toBe(2)
      expect(history.undo()?.n).toBe(2)
      expect(history.undo()?.n).toBe(1)
      expect(history.canUndo).toBe(false) // the origin is gone, and the arrow says it
    })

    it('honours a limit of zero as no undo at all', () => {
      const history = createHistory(probe(0), { clone: cloneProbe, limit: 0 })
      history.commit(step('one'), probe(1))
      expect(history.canUndo).toBe(false)
      expect(history.depth).toBe(0)
    })
  })

  describe('unmanaged errors', () => {
    it('COPIES ON THE WAY OUT — undo, edit what came back, redo, and the line is still honest', () => {
      // The defect the plausible version ships with: hand back the stored object and the next gesture
      // rewrites an entry in place. Verified by removing the clone in `at()` — this is the test that falls.
      const history = threeGestures()

      const restored = history.undo()
      if (restored === null) throw new Error('there was a gesture to take back')
      restored.tag.push('edited in place')
      restored.n = 999

      history.undo()
      const again = history.redo()
      expect(again?.n).toBe(2)
      expect(again?.tag).toEqual([])
    })

    it('copies on the way in, so editing on after a commit does not rewrite the step', () => {
      const history = createHistory(probe(0), { clone: cloneProbe })
      const live = probe(1)
      history.commit(step('one'), live)
      live.n = 999
      live.tag.push('edited after the commit')
      history.undo()
      const again = history.redo()
      expect(again?.n).toBe(1)
      expect(again?.tag).toEqual([])
    })

    it('does not hang on a negative limit, which is a programming error and not a depth', () => {
      const history = createHistory(probe(0), { clone: cloneProbe, limit: -5 })
      history.commit(step('one'), probe(1))
      expect(history.depth).toBe(0)
      expect(history.canUndo).toBe(false)
    })

    it('lets a failing copier throw rather than storing a state it could not copy', () => {
      const clone = vi.fn((state: Probe) => {
        if (state.n === 7) throw new Error('cannot copy')
        return cloneProbe(state)
      })
      const history = createHistory(probe(0), { clone })
      expect(() => {
        history.commit(step('bad'), probe(7))
      }).toThrow('cannot copy')
    })

    it('LEAVES THE LINE UNTOUCHED when a commit fails, future included', () => {
      // A commit that throws must not have destroyed the redo branch on its way out. Verified by
      // truncating before the copy instead of after — that order is what makes this test fall.
      let failing = false
      const clone = (state: Probe): Probe => {
        if (failing) throw new Error('cannot copy')
        return cloneProbe(state)
      }
      const history = createHistory(probe(0), { clone })
      history.commit(step('one'), probe(1))
      history.commit(step('two'), probe(2))
      history.undo()

      failing = true
      expect(() => {
        history.commit(step('three'), probe(3))
      }).toThrow('cannot copy')

      failing = false
      expect(history.depth).toBe(2)
      expect(history.canRedo).toBe(true)
      expect(history.redoLabel).toBe('two')
      expect(history.redo()?.n).toBe(2)
    })
  })

  describe('edge cases', () => {
    it('keeps exactly one undoable step at a limit of one', () => {
      const history = createHistory(probe(0), { clone: cloneProbe, limit: 1 })
      history.commit(step('one'), probe(1))
      history.commit(step('two'), probe(2))
      expect(history.depth).toBe(1)
      expect(history.undo()?.n).toBe(1)
      expect(history.canUndo).toBe(false)
    })

    it('carries a primitive state, since it only ever asks its copier', () => {
      const history = createHistory(0, { clone: (n: number) => n })
      history.commit(step('one'), 1)
      expect(history.undo()).toBe(0)
      expect(history.redo()).toBe(1)
    })

    it('defaults to a limit deep enough for a working session', () => {
      const history = createHistory(probe(0), { clone: cloneProbe })
      for (let index = 1; index <= DEFAULT_HISTORY_LIMIT + 5; index += 1)
        history.commit(step(`step-${String(index)}`), probe(index))
      expect(history.depth).toBe(DEFAULT_HISTORY_LIMIT)
    })

    it('accepts a jump to where the cursor already stands', () => {
      const history = threeGestures()
      expect(history.goTo(3)?.n).toBe(3)
      expect(history.rows[3]?.current).toBe(true)
    })

    it('marks an untouched line, which is the whole file as opened', () => {
      const history = createHistory(probe(0), { clone: cloneProbe })
      const id = history.mark(step('pristine'))
      expect(history.markers[0]?.depth).toBe(0)
      history.commit(step('one'), probe(1))
      expect(history.restoreMarker(id)?.n).toBe(0)
      expect(history.canUndo).toBe(false)
    })

    it('carries an empty document, which is how a year authored from scratch starts', () => {
      const doc = sharedBorderDocument()
      doc.polities = []
      doc.claims = []
      const history = createHistory(doc, { clone: cloneYearDocument })
      history.commit(step('remove-everyone'), doc)
      expect(history.undo()?.polities).toEqual([])
    })
  })
})
