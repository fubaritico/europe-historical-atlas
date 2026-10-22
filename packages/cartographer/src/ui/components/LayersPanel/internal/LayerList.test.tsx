import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { DEFAULT_LAYERS, LAYER_IDS } from '../../../../state/layersSlice'
import { renderInEnglish } from '../../../testing/renderInEnglish'

import { LayerList } from './LayerList'

import type { LayerListProps } from '../layerListProps'

/**
 * Render the list with spies, overriding what a test needs.
 * @param overrides - the props that differ
 * @returns the props rendered and a user
 */
function mount(overrides: Partial<LayerListProps> = {}) {
  const props: LayerListProps = {
    layers: DEFAULT_LAYERS,
    onVisible: vi.fn(),
    onOpacity: vi.fn(),
    ...overrides,
  }
  renderInEnglish(<LayerList {...props} />)
  return { ...props, user: userEvent.setup() }
}

describe('LayerList', () => {
  describe('happy path', () => {
    it('lists every layer in painting order, each with its eye and its opacity', () => {
      mount()
      const rows = screen.getAllByRole('listitem')
      expect(rows.map((row) => row.querySelector('.layer-row__name')?.textContent)).toEqual([
        ...LAYER_IDS,
      ])
      expect(screen.getByRole('slider', { name: 'rivers opacity' })).toBeDefined()
      expect(rows[0]?.querySelector('.layer-row__figure')?.textContent).toBe('100%')
    })

    it('hides a layer on its eye', async () => {
      const { onVisible, user } = mount()
      await user.click(screen.getByRole('button', { name: 'Hide borders' }))
      expect(onVisible).toHaveBeenCalledWith('borders', false)
    })
  })

  describe('variants', () => {
    it('shows a hidden layer on its eye, which reads "Show" and is not pressed', async () => {
      const layers = { ...DEFAULT_LAYERS, unclaimed: { visible: false, opacity: 100 } }
      const { onVisible, user } = mount({ layers })
      const eye = screen.getByRole('button', { name: 'Show unclaimed' })
      expect(eye.getAttribute('aria-pressed')).toBe('false')
      await user.click(eye)
      expect(onVisible).toHaveBeenCalledWith('unclaimed', true)
    })

    // The range's arrows are the browser's own behaviour, which jsdom lacks: walked in Chrome instead.
    it('reports a moved opacity', () => {
      const { onOpacity } = mount()
      fireEvent.change(screen.getByRole('slider', { name: 'fills opacity' }), {
        target: { value: '40' },
      })
      expect(onOpacity).toHaveBeenCalledWith('fills', 40)
    })
  })

  // L3: N/A — a view; the slice refuses what it cannot hold (layersSlice.test.ts).
  // L4: N/A — nothing can fail at runtime in the list itself.

  describe('edge cases', () => {
    it('writes a layer’s figure as its opacity', () => {
      mount({ layers: { ...DEFAULT_LAYERS, fills: { visible: true, opacity: 40 } } })
      const fills = screen.getAllByRole('listitem')[LAYER_IDS.indexOf('fills')]
      expect(fills?.querySelector('.layer-row__figure')?.textContent).toBe('40%')
    })
  })
})
