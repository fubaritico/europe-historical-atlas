import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'

import { testStore } from '../../canvas/testGestureContext'

import { OverridesPanel } from './OverridesPanel'

import type { YearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

/*
 * The binding, not the view: `internal/OverridesList.test.tsx` proves [Clear] reports its row with a spy;
 * here a real store proves the row's kind and index reach `clearOverride` — the right override goes, and
 * only it (QUAL-005).
 *
 * France holds the ring 0 1 2 3, the Empire 1 4 5 2.
 */

/** How the fixture's two polities are named on a row. */
const BETWEEN = 'Reaume de France – Sacrum Imperium'

/**
 * Mount the panel over a real store on the shared-border document, after dressing it.
 * @param dress - what to override before the store opens
 * @returns the store and a user
 */
function mount(dress: (document: YearDocument) => void = () => undefined) {
  const document = sharedBorderDocument()
  dress(document)
  const store = testStore(document)
  render(<OverridesPanel store={store} />)
  return { store, user: userEvent.setup() }
}

/**
 * Two run overrides — 0–1 dotted, 2–3 double — and a dashed pair between France and the Empire.
 * @param document - the document, edited in place
 */
function dressThree(document: YearDocument) {
  document.runs.push(
    { run: [0, 1], hand: 'dotted', source: null, note: null },
    { run: [2, 3], hand: 'double', source: null, note: null }
  )
  document.pairs.push({
    between: ['fr-couronne', 'hre'],
    type: 'indefinite',
    hand: 'dashed',
    source: null,
    note: null,
  })
}

describe('OverridesPanel', () => {
  describe('happy path', () => {
    it('lists a stretch override and removes it from the store on [Clear], recorded as clear-override', async () => {
      const { store, user } = mount((document) => {
        document.runs.push({ run: [1, 2], hand: 'dotted', source: null, note: null })
      })
      expect(screen.getByText(`1 segment · ${BETWEEN}`)).toBeDefined()
      await user.click(screen.getByRole('button', { name: /^Clear dotted/ }))
      expect(store.getState().document.runs).toEqual([])
      expect(store.getState().rows.at(-1)?.kind).toBe('clear-override')
      expect(store.getState().rows.at(-1)?.label).toBe(`clear 1 segment · ${BETWEEN}`)
    })
  })

  describe('variants', () => {
    it('clears the second stretch override only, the first and the pair kept', async () => {
      const { store, user } = mount(dressThree)
      await user.click(screen.getByRole('button', { name: /^Clear double/ }))
      expect(store.getState().document.runs.map((override) => override.hand)).toEqual(['dotted'])
      expect(store.getState().document.pairs.map((pair) => pair.hand)).toEqual(['dashed'])
    })

    it('clears the pair override only, both stretches kept', async () => {
      const { store, user } = mount(dressThree)
      await user.click(screen.getByRole('button', { name: /^Clear dashed/ }))
      expect(store.getState().document.pairs).toEqual([])
      expect(store.getState().document.runs.map((override) => override.hand)).toEqual([
        'dotted',
        'double',
      ])
    })
  })

  describe('managed errors', () => {
    // s13, *When an override goes stale*: a stretch no ring holds is still the author's decision.
    it('lists an orphaned stretch override and clears it from the store', async () => {
      const { store, user } = mount((document) => {
        document.runs.push({ run: [4, 0], hand: 'dotted', source: null, note: null })
      })
      expect(screen.getByRole('listitem').getAttribute('data-orphaned')).toBe('true')
      await user.click(screen.getByRole('button', { name: /^Clear dotted/ }))
      expect(store.getState().document.runs).toEqual([])
    })
  })

  // L4: N/A — a row is read from the document the click clears, so its index cannot miss.

  describe('edge cases', () => {
    it('says nothing is overridden on a document with no override', () => {
      mount()
      expect(screen.getByText(/Nothing overridden/)).toBeDefined()
    })

    it('says nothing is overridden once the last override is cleared', async () => {
      const { user } = mount((document) => {
        document.runs.push({ run: [1, 2], hand: 'dotted', source: null, note: null })
      })
      await user.click(screen.getByRole('button', { name: /^Clear dotted/ }))
      expect(screen.getByText(/Nothing overridden/)).toBeDefined()
    })
  })
})
