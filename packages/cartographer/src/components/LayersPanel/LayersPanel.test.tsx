import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { testStore } from '../../canvas/testGestureContext'
import { DEFAULT_LAYERS } from '../../state/layersSlice'

import { LayersPanel } from './LayersPanel'

/*
 * The binding, not the view: `internal/LayerList.test.tsx` proves the rows report with spies; here a real
 * store proves the eye reaches `setLayerVisible` and the slider `setLayerOpacity` — and not the other way
 * round, which the slice would take in silence or with a console error (QUAL-005).
 */

/**
 * Mount the panel over a real store on an empty 1100.
 * @returns the store and a user
 */
function mount() {
  const store = testStore()
  render(<LayersPanel store={store} />)
  return { store, user: userEvent.setup() }
}

describe('LayersPanel', () => {
  describe('happy path', () => {
    it('hides the borders in the store on their eye, their opacity untouched', async () => {
      const { store, user } = mount()
      await user.click(screen.getByRole('button', { name: 'Hide borders' }))
      expect(store.getState().layers.borders).toEqual({ visible: false, opacity: 100 })
    })
  })

  describe('variants', () => {
    // The range's arrows are the browser's own behaviour, which jsdom lacks (as in LayerList.test.tsx).
    it('sets the fills to 40 % in the store on their slider, their visibility untouched', () => {
      const { store } = mount()
      fireEvent.change(screen.getByRole('slider', { name: 'fills opacity' }), {
        target: { value: '40' },
      })
      expect(store.getState().layers.fills).toEqual({ visible: true, opacity: 40 })
    })

    it('shows a layer hidden in the store on its eye', async () => {
      const { store, user } = mount()
      act(() => {
        store.getState().setLayerVisible('unclaimed', false)
      })
      await user.click(screen.getByRole('button', { name: 'Show unclaimed' }))
      expect(store.getState().layers.unclaimed.visible).toBe(true)
    })
  })

  // L3: N/A — the slider cannot produce what the slice refuses (a non-number); layersSlice.test.ts holds it.
  // L4: N/A — the panel only forwards; nothing in it can fail at runtime.

  describe('edge cases', () => {
    it('leaves every other layer as it was when one is hidden', async () => {
      const { store, user } = mount()
      await user.click(screen.getByRole('button', { name: 'Hide rivers' }))
      expect(store.getState().layers).toEqual({
        ...DEFAULT_LAYERS,
        rivers: { visible: false, opacity: 100 },
      })
    })

    it('redraws a row when the store changes the layer from elsewhere', () => {
      const { store } = mount()
      act(() => {
        store.getState().setLayerVisible('rivers', false)
        store.getState().setLayerOpacity('rivers', 25)
      })
      const eye = screen.getByRole('button', { name: 'Show rivers' })
      expect(eye.getAttribute('aria-pressed')).toBe('false')
      expect(eye.closest('li')?.querySelector('.layer-row__figure')?.textContent).toBe('25%')
    })
  })
})
