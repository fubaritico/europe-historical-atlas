import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { createLocaleStore } from '../../../i18n/localeStore'
import { LocaleProvider } from '../LocaleProvider'

import { Panel } from './Panel'

import type { ReactNode } from 'react'

/** A panel view whose render throws. */
function FailingView(): ReactNode {
  // Render
  throw new Error('the view broke')
}

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

  // L4: N/A — no optional collaborator.

  describe('managed errors', () => {
    // Every panel guarded by the shell they share (the dev's call, 2026-10-21): the view fails, the panel
    // stays, with its name, and says so in place of the view.
    it('keeps its name and shows the failure in place of a view that throws', () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      render(
        <LocaleProvider store={createLocaleStore('en')}>
          <Panel title="Layers">
            <FailingView />
          </Panel>
        </LocaleProvider>
      )
      expect(screen.getByRole('heading', { level: 2, name: 'Layers' })).toBeDefined()
      expect(screen.getByRole('alert').textContent).toContain('This area could not be shown.')
      vi.restoreAllMocks()
    })
  })

  describe('edge cases', () => {
    it('renders no foot when none is given', () => {
      render(<Panel title="Overrides">x</Panel>)
      expect(screen.getByRole('region').lastElementChild?.classList.contains('panel__body')).toBe(
        true
      )
    })
  })
})
