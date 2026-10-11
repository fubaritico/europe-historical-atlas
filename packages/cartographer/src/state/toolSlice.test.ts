import { describe, expect, it } from 'vitest'

import {
  AQUITAINE_IDENTITY,
  FIXTURE_ZONE,
  sharedBorderDocument,
} from '@europe-historical-atlas/core/editor/documentFixtures'
import {
  cloneYearDocument,
  createYearDocument,
} from '@europe-historical-atlas/core/editor/yearDocument'

import { UNFRAMED } from '../view/viewport'

import { describeDrawingTarget } from './drawingTarget'
import { createCartographerStore } from './store'
import { isPenMode } from './toolSlice'

import type { HistoryStep } from '@europe-historical-atlas/core/editor/history'

/** The gesture `s02` creates with. */
const CREATE: HistoryStep = { kind: 'create-polity', label: 'create polity' }

/**
 * A store on the two-polity fixture — `fr-couronne` and `hre` both exist in it.
 *
 * **`editionSlice.test.ts` has one of these too, and the copy is deliberate** — raised in review on
 * 2026-10-08 together with the `AQUITAINE_IDENTITY` copy, which *was* extracted. The two are not the same
 * hazard: a fixture drifts **silently** (those two copies disagreed on `colour` within the hour and no
 * test failed), while this wiring cannot — change what `createCartographerStore` takes and `tsc` refuses
 * both copies on the spot. And it cannot follow the identity down into `core`, which knows nothing about
 * this package's store. Ten lines of wiring whose drift is a compile error is cheaper than a shared
 * test-support module with a boundary row and a guard test of its own.
 */
function openStore() {
  const document = sharedBorderDocument()
  return {
    document,
    store: createCartographerStore({
      edition: { document, clone: cloneYearDocument },
      viewport: { viewport: UNFRAMED },
    }),
  }
}

describe('toolSlice', () => {
  describe('happy path', () => {
    // `s00`'s Background: "⟨navigate⟩ is the active tool", and nothing has been aimed at.
    it('opens on ⟨navigate⟩ with nobody aimed at', () => {
      const { store } = openStore()

      expect(store.getState().tool).toBe('navigate')
      expect(store.getState().target).toBeNull()
    })

    // THE guard of `aimAt`. The plausible shape is two actions — set the target, then select the tool —
    // and the half a caller forgets is the tool, which leaves a banner naming a polity the author
    // cannot draw for. `s02` states both as one consequence of pressing [OK].
    it('aiming hands over the Pen as well as the target, in one action', () => {
      const { store } = openStore()

      store.getState().aimAt('fr-couronne')

      expect(store.getState().target).toBe('fr-couronne')
      expect(store.getState().tool).toBe('draw')
    })
  })

  describe('variants', () => {
    it('puts any of the three tools in hand', () => {
      const { store } = openStore()

      for (const tool of ['draw', 'edit', 'navigate'] as const) {
        store.getState().selectTool(tool)
        expect(store.getState().tool).toBe(tool)
      }
    })

    // `s02`: "[Draw territory] hands me the Pen again, with it as the target". Clearing the target on a
    // tool change would make that sentence unreachable, and would lose the aim every time the author
    // reached for ‹space› to pan.
    it('changing tool leaves the target alone', () => {
      const { store } = openStore()

      store.getState().aimAt('fr-couronne')
      store.getState().selectTool('edit')
      expect(store.getState().target).toBe('fr-couronne')

      store.getState().selectTool('draw')
      expect(store.getState().target).toBe('fr-couronne')
    })

    it('aiming again moves the target', () => {
      const { store } = openStore()

      store.getState().aimAt('fr-couronne')
      store.getState().aimAt('hre')

      expect(store.getState().target).toBe('hre')
    })
  })

  describe('managed errors', () => {
    // The slice does not check the id; the document is the authority, and `describeDrawingTarget` is
    // where the question is asked. Asserted so the division of labour is a decision and not an accident.
    it('accepts an id the document does not hold, and the description refuses it', () => {
      const { store } = openStore()

      store.getState().aimAt('nowhere')

      expect(store.getState().target).toBe('nowhere')
      expect(describeDrawingTarget(store.getState().document, 'nowhere')).toBeNull()
    })
  })

  describe('unmanaged errors', () => {
    it('survives being aimed at the empty string, which resolves to nobody', () => {
      const { store } = openStore()

      store.getState().aimAt('')

      // Only the resolution is asserted: that `aimAt` also hands over the Pen is a different claim,
      // guarded by its own test, and a test that fails for two reasons cannot say which one broke.
      expect(describeDrawingTarget(store.getState().document, '')).toBeNull()
    })
  })

  describe('edge cases', () => {
    // `s99`: "a history step holds the document, not the session… Undo must never put a tool back in
    // someone's hand, and choosing a tool must never become a step to undo." Both halves, measured.
    it('choosing a tool records no step, and an undo does not give a tool back', () => {
      const { store } = openStore()
      const rowsBefore = store.getState().rows.length

      store.getState().selectTool('edit')
      expect(store.getState().rows).toHaveLength(rowsBefore)

      store.getState().createPolity(AQUITAINE_IDENTITY, CREATE)
      store.getState().selectTool('draw')
      store.getState().undo()

      expect(store.getState().tool).toBe('draw')
    })

    // THE guard of the whole rung. The target is session state and the polity is document state, so the
    // undo line moves the second without touching the first — and the honest answer is that the target
    // stops resolving, which is what makes the banner vanish and the Pen refuse with nothing to clear.
    // The plausible implementation holds the polity object instead of its id, and goes on naming a
    // polity the document no longer has.
    it('undoing the creation makes the target stop resolving, on its own', () => {
      const { store } = openStore()

      expect(store.getState().createPolity(AQUITAINE_IDENTITY, CREATE)).toBe(true)
      store.getState().aimAt(AQUITAINE_IDENTITY.id)
      expect(describeDrawingTarget(store.getState().document, store.getState().target)?.name).toBe(
        'Duché d’Aquitaine'
      )

      store.getState().undo()

      expect(store.getState().target).toBe('aquitaine')
      expect(describeDrawingTarget(store.getState().document, store.getState().target)).toBeNull()
    })

    it('redoing the creation makes the same target resolve again', () => {
      const { store } = openStore()

      store.getState().createPolity(AQUITAINE_IDENTITY, CREATE)
      store.getState().aimAt(AQUITAINE_IDENTITY.id)
      store.getState().undo()
      store.getState().redo()

      expect(describeDrawingTarget(store.getState().document, store.getState().target)?.id).toBe(
        'aquitaine'
      )
    })

    it('is a session slice, so it does not move when a fresh document is opened', () => {
      const { store } = openStore()

      // The tool is chosen explicitly rather than through `aimAt`, so this test turns only on what
      // opening a file does — not on `aimAt` also handing over the Pen, which is guarded elsewhere.
      store.getState().selectTool('draw')
      store.getState().aimAt('fr-couronne')
      store.getState().open(createYearDocument(1110, FIXTURE_ZONE))

      // The tool stays in the author's hand; the target stops resolving because the new year does not
      // hold that polity. Opening a file is not a reason to take someone's tool away.
      expect(store.getState().tool).toBe('draw')
      expect(describeDrawingTarget(store.getState().document, store.getState().target)).toBeNull()
    })
  })

  describe('the Pen’s mode', () => {
    it('opens with the Pen placing free points', () => {
      expect(openStore().store.getState().penMode).toBe('free')
    })

    it('puts the Pen in hand with the mode chosen', () => {
      const { store } = openStore()
      store.getState().choosePenMode('coast')
      expect(store.getState().tool).toBe('draw')
      expect(store.getState().penMode).toBe('coast')
    })

    it('knows its modes, and no other', () => {
      expect(isPenMode('coast')).toBe(true)
      expect(isPenMode('river')).toBe(true)
      expect(isPenMode('lake')).toBe(false)
    })

    // The mode is the session's: an undo never changes how the Pen places its points.
    it('keeps the mode across a tool change and an undo', () => {
      const { store } = openStore()
      store.getState().choosePenMode('coast')
      store.getState().selectTool('edit')
      store.getState().undo()
      expect(store.getState().penMode).toBe('coast')
    })
  })

  describe('chooseTarget', () => {
    // A click in a fill aims without changing the tool: the arrow stays the arrow.
    it('aims at a polity and leaves the tool in hand', () => {
      const { store } = openStore()
      store.getState().selectTool('edit')
      store.getState().chooseTarget('fr-couronne')
      expect(store.getState().target).toBe('fr-couronne')
      expect(store.getState().tool).toBe('edit')
    })
  })
})
