import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'

import { testStore } from '../../../canvas/testGestureContext'
import { renderInEnglish } from '../../testing/renderInEnglish'

import { LinePanel } from './LinePanel'

/*
 * The binding, not the view: `internal/LineView.test.tsx` proves the buttons report with spies; here a real
 * store proves the scope picks the action — a stretch is a run override, the whole border a pair override
 * (QUAL-005).
 *
 * France holds the ring 0 1 2 3, the Empire 1 4 5 2: the segment 1–2 is their shared limit, 0–1 is against
 * nobody.
 */

/** How the fixture's two polities are named on a step's label. */
const BETWEEN = 'Reaume de France – Sacrum Imperium'

/**
 * Mount the panel over a real store on the shared-border document, France aimed at.
 * @param selected - the anchors the white arrow has selected
 * @returns the store and a user
 */
function mount(selected: readonly number[]) {
  const store = testStore(sharedBorderDocument())
  store.getState().chooseTarget('fr-couronne')
  store.getState().setSelectedAnchors(selected)
  renderInEnglish(<LinePanel store={store} />)
  return { store, user: userEvent.setup() }
}

/**
 * The run overrides of the store's document, each as its sorted anchors and its hand.
 * @param store - the store
 * @returns the runs
 */
function runsOf(store: ReturnType<typeof mount>['store']) {
  return store.getState().document.runs.map((override) => ({
    run: [...override.run].sort((a, b) => a - b),
    hand: override.hand,
  }))
}

/**
 * The history's last step.
 * @param store - the store
 * @returns its kind and label
 */
function lastStep(store: ReturnType<typeof mount>['store']) {
  const row = store.getState().rows.at(-1)
  return { kind: row?.kind, label: row?.label }
}

describe('LinePanel', () => {
  describe('happy path', () => {
    it('dresses the selected stretch with a run override on [Dotted], recorded as dress-run', async () => {
      const { store, user } = mount([1, 2])
      await user.click(screen.getByRole('button', { name: 'Dotted' }))
      expect(runsOf(store)).toEqual([{ run: [1, 2], hand: 'dotted' }])
      expect(store.getState().document.pairs).toEqual([])
      expect(lastStep(store)).toEqual({ kind: 'dress-run', label: `dotted ${BETWEEN}` })
    })
  })

  describe('variants', () => {
    it('dresses the whole border with a pair override under [Whole border], recorded as dress-pair', async () => {
      const { store, user } = mount([1, 2])
      await user.click(screen.getByRole('radio', { name: 'Whole border' }))
      await user.click(screen.getByRole('button', { name: 'Dashed' }))
      expect(store.getState().document.pairs.map((pair) => [pair.between, pair.hand])).toEqual([
        [['fr-couronne', 'hre'], 'dashed'],
      ])
      expect(store.getState().document.runs).toEqual([])
      expect(lastStep(store)).toEqual({ kind: 'dress-pair', label: `dashed ${BETWEEN}` })
    })

    it('reads the pair’s hand as chosen once the whole border is dressed', async () => {
      const { user } = mount([1, 2])
      await user.click(screen.getByRole('radio', { name: 'Whole border' }))
      await user.click(screen.getByRole('button', { name: 'Double' }))
      expect(screen.getByRole('button', { name: 'Double' }).getAttribute('aria-pressed')).toBe(
        'true'
      )
    })

    it('gives a dressed stretch back to the rule on [Auto]', async () => {
      const { store, user } = mount([1, 2])
      await user.click(screen.getByRole('button', { name: 'Dotted' }))
      await user.click(screen.getByRole('button', { name: 'Auto' }))
      expect(store.getState().document.runs).toEqual([])
      expect(lastStep(store)).toEqual({ kind: 'dress-run', label: `auto ${BETWEEN}` })
    })
  })

  describe('managed errors', () => {
    it('does not offer the whole border for a stretch against nobody, and dresses the stretch', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { store, user } = mount([0, 1])
      const border = screen.getByRole('radio', { name: 'Whole border' })
      expect(border.getAttribute('aria-disabled')).toBe('true')
      await user.click(border)
      expect(warn).toHaveBeenCalledOnce()
      await user.click(screen.getByRole('button', { name: 'Solid' }))
      expect(runsOf(store)).toEqual([{ run: [0, 1], hand: 'solid' }])
      expect(store.getState().document.pairs).toEqual([])
      warn.mockRestore()
    })

    it('shows the hint and no pattern with nobody aimed at', () => {
      const { store } = mount([1, 2])
      act(() => {
        store.getState().chooseTarget(null)
      })
      expect(screen.getByText(/Select a stretch of the aimed polity/)).toBeDefined()
      expect(screen.queryByRole('button', { name: 'Dotted' })).toBeNull()
    })
  })

  // L4: N/A — a pattern is offered only over at least one segment, which the slice always dresses.

  describe('edge cases', () => {
    it('dresses the stretch when the whole border was chosen and the selection then lost its neighbour', async () => {
      const { store, user } = mount([1, 2])
      await user.click(screen.getByRole('radio', { name: 'Whole border' }))
      act(() => {
        store.getState().setSelectedAnchors([0, 1])
      })
      expect(screen.getByRole('radio', { name: 'This stretch' }).getAttribute('aria-checked')).toBe(
        'true'
      )
      await user.click(screen.getByRole('button', { name: 'Dotted' }))
      expect(runsOf(store)).toEqual([{ run: [0, 1], hand: 'dotted' }])
      expect(store.getState().document.pairs).toEqual([])
    })

    it('reads a selection published after mounting', () => {
      const { store } = mount([])
      expect(screen.queryByRole('button', { name: 'Dotted' })).toBeNull()
      act(() => {
        store.getState().setSelectedAnchors([1, 2])
      })
      expect(screen.getByText(`1 segment · ${BETWEEN}`)).toBeDefined()
    })
  })
})
