import { describe, expect, it, vi } from 'vitest'

import { moveAnchor } from './documentEdits'
import { firstSharedAnchor, ringOf, sharedBorderDocument } from './documentFixtures'
import { DEFAULT_HISTORY_LIMIT, createHistory } from './history'
import { cloneYearDocument } from './yearDocument'

/** A state small enough to read in an assertion, with something mutable in it to catch aliasing. */
interface Probe {
  n: number
  tag: string[]
}

const cloneProbe = (state: Probe): Probe => ({ n: state.n, tag: [...state.tag] })

const probe = (n: number, ...tag: string[]): Probe => ({ n, tag })

/** A line on three committed gestures, which is what most of the cursor arithmetic needs. */
function threeGestures(): ReturnType<typeof createHistory<Probe>> {
  const history = createHistory(probe(0), { clone: cloneProbe })
  history.commit('one', probe(1))
  history.commit('two', probe(2))
  history.commit('three', probe(3))
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
      history.commit('move anchor', probe(1))
      expect(history.canUndo).toBe(true)
      expect(history.canRedo).toBe(false)
      expect(history.undoLabel).toBe('move anchor')
      expect(history.depth).toBe(1)
    })

    it('gives back the state as it stood before the gesture', () => {
      const history = createHistory(probe(0), { clone: cloneProbe })
      history.commit('one', probe(1))
      expect(history.undo()?.n).toBe(0)
    })

    it('applies the gesture again on redo', () => {
      const history = createHistory(probe(0), { clone: cloneProbe })
      history.commit('one', probe(1))
      history.undo()
      expect(history.redo()?.n).toBe(1)
      expect(history.canRedo).toBe(false)
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

      history.commit('something else', probe(9))

      expect(history.depth).toBe(2)
      expect(history.canRedo).toBe(false)
      expect(history.redoLabel).toBeNull()
      expect(history.undoLabel).toBe('something else')
      expect(history.undo()?.n).toBe(1) // back to after gesture one, and two and three are unreachable
      expect(history.undoLabel).toBe('one')
    })

    it('destroys nothing while undoing, which is what lets redo work at all', () => {
      const history = threeGestures()
      history.undo()
      history.undo()
      expect(history.depth).toBe(3)
      expect(history.canRedo).toBe(true)
      expect(history.redoLabel).toBe('two')
      expect(history.redo()?.n).toBe(2)
      expect(history.redo()?.n).toBe(3)
    })

    it('always leaves the cursor at the end of the line after a commit', () => {
      const history = threeGestures()
      history.undo()
      history.commit('four', probe(4))
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
      history.reset(probe(100))
      expect(history.canUndo).toBe(false)
      expect(history.canRedo).toBe(false)
      expect(history.depth).toBe(0)
      history.commit('first of the new file', probe(101))
      expect(history.undo()?.n).toBe(100)
    })

    it('KEEPS THE SHARING through a snapshot, composed with the real document', () => {
      // The guarantee of step 2, carried into step 3: restoring must restore the sharing and not just the
      // coordinates. Written to fail if a snapshot ever resolved rings back to points.
      const doc = sharedBorderDocument()
      const history = createHistory(doc, { clone: cloneYearDocument })
      const shared = firstSharedAnchor(doc)

      moveAnchor(doc, shared, [99, 99])
      history.commit('move anchor', doc)

      const before = history.undo()
      if (before === null) throw new Error('there was a gesture to take back')
      expect(ringOf(before, 'fr-couronne')).not.toContainEqual([99, 99])

      // The restored document is still one where two rings hold the same point.
      moveAnchor(before, shared, [77, 77])
      expect(ringOf(before, 'fr-couronne')).toContainEqual([77, 77])
      expect(ringOf(before, 'hre')).toContainEqual([77, 77])
    })

    it('leaves the document it was given alone, so a restore is not the live document', () => {
      const doc = sharedBorderDocument()
      const history = createHistory(doc, { clone: cloneYearDocument })
      const restored = history.undo()
      expect(restored).toBeNull() // nothing committed yet
      moveAnchor(doc, 0, [5, 5])
      history.commit('move anchor', doc)
      history.undo()
      expect(ringOf(doc, 'fr-couronne')).toContainEqual([5, 5]) // the live one still holds the edit
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
      history.commit('one', probe(1))
      expect(history.redo()).toBeNull()
    })

    it('leaves the cursor where it was when there is nothing to take back', () => {
      const history = createHistory(probe(0), { clone: cloneProbe })
      history.undo()
      history.undo()
      history.commit('one', probe(1))
      expect(history.undo()?.n).toBe(0)
    })

    it('drops the oldest step past the limit, and says so through its depth', () => {
      const history = createHistory(probe(0), { clone: cloneProbe, limit: 2 })
      history.commit('one', probe(1))
      history.commit('two', probe(2))
      history.commit('three', probe(3))
      expect(history.depth).toBe(2)
      expect(history.undo()?.n).toBe(2)
      expect(history.undo()?.n).toBe(1)
      expect(history.canUndo).toBe(false) // the baseline is gone, and the arrow says it
    })

    it('honours a limit of zero as no undo at all', () => {
      const history = createHistory(probe(0), { clone: cloneProbe, limit: 0 })
      history.commit('one', probe(1))
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
      history.commit('one', live)
      live.n = 999
      live.tag.push('edited after the commit')
      history.undo()
      const again = history.redo()
      expect(again?.n).toBe(1)
      expect(again?.tag).toEqual([])
    })

    it('does not hang on a negative limit, which is a programming error and not a depth', () => {
      const history = createHistory(probe(0), { clone: cloneProbe, limit: -5 })
      history.commit('one', probe(1))
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
        history.commit('bad', probe(7))
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
      history.commit('one', probe(1))
      history.commit('two', probe(2))
      history.undo()

      failing = true
      expect(() => {
        history.commit('three', probe(3))
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
      history.commit('one', probe(1))
      history.commit('two', probe(2))
      expect(history.depth).toBe(1)
      expect(history.undo()?.n).toBe(1)
      expect(history.canUndo).toBe(false)
    })

    it('carries a primitive state, since it only ever asks its copier', () => {
      const history = createHistory(0, { clone: (n: number) => n })
      history.commit('one', 1)
      expect(history.undo()).toBe(0)
      expect(history.redo()).toBe(1)
    })

    it('defaults to a limit deep enough for a working session', () => {
      const history = createHistory(probe(0), { clone: cloneProbe })
      for (let step = 1; step <= DEFAULT_HISTORY_LIMIT + 5; step += 1)
        history.commit(`step ${String(step)}`, probe(step))
      expect(history.depth).toBe(DEFAULT_HISTORY_LIMIT)
    })

    it('accepts a gesture with no name, and reports it as such', () => {
      const history = createHistory(probe(0), { clone: cloneProbe })
      history.commit('', probe(1))
      expect(history.canUndo).toBe(true)
      expect(history.undoLabel).toBe('')
    })

    it('carries an empty document, which is how a year authored from scratch starts', () => {
      const doc = sharedBorderDocument()
      doc.polities = []
      doc.claims = []
      const history = createHistory(doc, { clone: cloneYearDocument })
      history.commit('remove everyone', doc)
      expect(history.undo()?.polities).toEqual([])
    })
  })
})
