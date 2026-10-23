import { createToaster } from '@fubaritico/behaviors'
import { createToastApi } from '@fubaritico/react/Toast'
import { act, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderInEnglish } from '../../testing/renderInEnglish'

import { NoticeToaster } from './NoticeToaster'

import type { ReactToastContent } from '@fubaritico/react/Toast'

/** Mount the stack over a toaster of its own, and the API that shows toasts on it. */
function mounted() {
  const toaster = createToaster<ReactToastContent>({ uid: 'test' })
  renderInEnglish(<NoticeToaster toaster={toaster} />)
  return createToastApi(() => toaster)
}

describe('NoticeToaster', () => {
  describe('happy path', () => {
    it('shows a toast sent to its own stack', () => {
      const toast = mounted()

      act(() => {
        toast.success('saved 1100 · 2 polities · 6 vertices', { id: 'year' })
      })

      expect(screen.getByText('saved 1100 · 2 polities · 6 vertices')).toBeTruthy()
    })

    it('names the stack and its close buttons in the page’s language', () => {
      const toast = mounted()

      act(() => {
        toast.success('saved 1100', { id: 'year' })
      })

      expect(screen.getByRole('region').getAttribute('aria-label')).toMatch(/^Notifications/)
      expect(screen.getByRole('button', { name: 'Close saved 1100' })).toBeTruthy()
    })
  })

  describe('variants', () => {
    it('sits at the bottom centre of the page', () => {
      mounted()

      expect(screen.getByRole('region').classList.contains('ui-toaster--bottom-center')).toBe(true)
    })

    it('keeps one toast per id: a newer one of the same topic takes its place', () => {
      const toast = mounted()

      act(() => {
        toast.warning('still reading 1100 from disk', { id: 'year' })
        toast.success('saved 1100', { id: 'year' })
      })

      expect(screen.queryByText('still reading 1100 from disk')).toBeNull()
      expect(screen.getByText('saved 1100')).toBeTruthy()
    })
  })

  // L3–L5: N/A — the stack's timers, keyboard and announcements are the design system's, tested there.
})
