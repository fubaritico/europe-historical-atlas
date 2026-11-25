import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { renderInEnglish } from '../../testing/renderInEnglish'

import { DocTab } from './DocTab'

import type { DocTabProps } from './docTabProps'

/**
 * Render a tab, its gestures spies.
 * @param overrides - what differs from the active tab of « 1100-essai »
 * @returns the props rendered
 */
function mount(overrides: Partial<DocTabProps> = {}): DocTabProps {
  const props: DocTabProps = {
    id: '1100-essai',
    name: '1100-essai',
    active: true,
    zoomRef: () => undefined,
    onActivate: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  }
  renderInEnglish(
    <div role="tablist">
      <DocTab {...props} />
    </div>
  )
  return props
}

describe('DocTab', () => {
  describe('happy path', () => {
    it('names the map, its zoom beside it, marked as the tab shown', () => {
      mount()
      expect(
        screen.getByRole('tab', { name: '1100-essai @ —' }).getAttribute('aria-selected')
      ).toBe('true')
    })

    it('closes its map on its cross, naming it', async () => {
      const { onClose } = mount()
      await userEvent.click(screen.getByRole('button', { name: 'Close 1100-essai' }))
      expect(onClose).toHaveBeenCalledWith('1100-essai')
    })
  })

  describe('variants', () => {
    it('shows its map on a click on the tab', async () => {
      const { onActivate, onClose } = mount()
      await userEvent.click(screen.getByRole('tab'))
      expect(onActivate).toHaveBeenCalledWith('1100-essai')
      expect(onClose).not.toHaveBeenCalled()
    })

    it('writes no zoom on a tab that is not shown', () => {
      renderInEnglish(
        <div role="tablist">
          <DocTab id="1100" name="1100" active={false} onActivate={vi.fn()} onClose={vi.fn()} />
        </div>
      )
      const tab = screen.getByRole('tab')
      expect([tab.textContent, tab.getAttribute('aria-selected')]).toEqual(['1100', 'false'])
    })
  })

  // L3, L4: N/A — a view; what closing can refuse is « save first? »'s, tested in `persistence/mapChange`.

  describe('edge cases', () => {
    it('hands the zoom’s node to whoever writes it', () => {
      const zoomRef = vi.fn()
      mount({ zoomRef })
      expect(zoomRef).toHaveBeenCalledWith(expect.any(HTMLSpanElement))
    })
  })
})
