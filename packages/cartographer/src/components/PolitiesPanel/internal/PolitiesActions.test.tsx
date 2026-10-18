import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { PolitiesActions } from './PolitiesActions'

function mount(canDelete: boolean) {
  const onNew = vi.fn()
  const onDelete = vi.fn()
  render(<PolitiesActions onNew={onNew} onDelete={onDelete} canDelete={canDelete} />)
  return { onNew, onDelete, user: userEvent.setup() }
}

describe('PolitiesActions', () => {
  describe('happy path', () => {
    it('reports [+] and the trash, with no store behind it', async () => {
      const { onNew, onDelete, user } = mount(true)
      await user.click(screen.getByRole('button', { name: 'New polity' }))
      await user.click(screen.getByRole('button', { name: 'Delete polity' }))
      expect(onNew).toHaveBeenCalledTimes(1)
      expect(onDelete).toHaveBeenCalledTimes(1)
    })
  })

  describe('variants', () => {
    it('draws the dev’s plus and trash, hidden from assistive tech', () => {
      mount(true)
      const icons = [...document.querySelectorAll('svg')]
      expect(icons.map((icon) => icon.getAttribute('data-icon'))).toEqual(['plus', 'trash'])
      expect(icons.every((icon) => icon.getAttribute('aria-hidden') === 'true')).toBe(true)
    })
  })

  describe('managed errors', () => {
    it('reports nothing from a disabled trash, and says why it is disabled', async () => {
      const { onDelete, user } = mount(false)
      const trash = screen.getByRole('button', { name: 'Delete polity' })
      await user.click(trash)
      expect(onDelete).not.toHaveBeenCalled()
      expect(trash.getAttribute('title')).toBe('Select a polity to delete')
    })
  })

  // L4: N/A — a view with two callbacks, nothing to fail.

  describe('edge cases', () => {
    it('is one toolbar, named, so the bar is reached as a group', () => {
      mount(false)
      expect(screen.getByRole('toolbar', { name: 'Polity actions' }).children).toHaveLength(2)
    })
  })
})
