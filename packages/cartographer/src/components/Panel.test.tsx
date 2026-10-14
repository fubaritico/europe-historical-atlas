import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'

import { Panel } from './Panel'

describe('Panel', () => {
  describe('happy path', () => {
    it('is a region named by its title, the title its head’s tab, the view in its body', () => {
      render(
        <Panel title="Layers">
          <p>the view</p>
        </Panel>
      )
      const region = screen.getByRole('region', { name: 'Layers' })
      expect(screen.getByRole('heading', { level: 2, name: 'Layers' })).toBeDefined()
      expect(region.getAttribute('aria-labelledby')).toBe(
        screen.getByRole('heading', { level: 2 }).id
      )
      expect(region.querySelector('.panel__body')?.textContent).toBe('the view')
    })
  })

  describe('variants', () => {
    it('is as tall as what it holds unless asked to fill the dock', () => {
      const { rerender } = render(<Panel title="Line">x</Panel>)
      expect(screen.getByRole('region').classList.contains('panel--fill')).toBe(false)
      rerender(
        <Panel title="Polities" fill>
          x
        </Panel>
      )
      expect(screen.getByRole('region').classList.contains('panel--fill')).toBe(true)
    })

    it('pins a foot after the body, outside it', () => {
      render(
        <Panel title="Polities" foot={<footer>actions</footer>}>
          rows
        </Panel>
      )
      const foot = screen.getByText('actions')
      expect(foot.closest('.panel__body')).toBeNull()
      expect(screen.getByRole('region').contains(foot)).toBe(true)
    })

    it('hands its element to a ref, for a binding that gives the focus back into it', () => {
      const ref = createRef<HTMLElement>()
      render(
        <Panel title="Polities" ref={ref}>
          rows
        </Panel>
      )
      expect(ref.current).toBe(screen.getByRole('region', { name: 'Polities' }))
    })
  })

  // L3: N/A — a shell refuses nothing. L4: N/A — no optional collaborator.

  describe('edge cases', () => {
    it('renders no foot when none is given', () => {
      render(<Panel title="Overrides">x</Panel>)
      expect(screen.getByRole('region').lastElementChild?.classList.contains('panel__body')).toBe(
        true
      )
    })
  })
})
