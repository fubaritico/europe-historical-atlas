import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { BarButton } from './BarButton'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('BarButton', () => {
  describe('happy path', () => {
    it('acts on a click, with its hint as tooltip', async () => {
      const onPress = vi.fn()
      render(<BarButton label="Save" onPress={onPress} hint="Save the year" />)
      const button = screen.getByRole('button', { name: 'Save' })

      await userEvent.click(button)
      expect(onPress).toHaveBeenCalledOnce()
      expect(button.getAttribute('title')).toBe('Save the year')
      expect(button.getAttribute('aria-disabled')).toBeNull()
      expect(button.getAttribute('type')).toBe('button')
    })
  })

  describe('variants', () => {
    it('names a glyph button by its label, the glyph in its place', () => {
      render(<BarButton label="Undo" onPress={vi.fn()} icon={<svg />} variant="icon" />)
      const button = screen.getByRole('button', { name: 'Undo' })

      expect(button.textContent).toBe('')
      expect(button.className).toContain('bar-button--icon')
    })

    it('acts on ‹enter› from the keyboard', async () => {
      const onPress = vi.fn()
      render(<BarButton label="Save" onPress={onPress} />)
      screen.getByRole('button', { name: 'Save' }).focus()
      await userEvent.keyboard('{Enter}')
      expect(onPress).toHaveBeenCalledOnce()
    })
  })

  describe('managed errors', () => {
    it('stays focusable when unavailable, says why, and warns on a click', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      render(<BarButton label="Open…" unavailable="not built yet (s01)" />)
      const button = screen.getByRole('button', { name: 'Open…' })

      expect(button.hasAttribute('disabled')).toBe(false)
      expect(button.getAttribute('aria-disabled')).toBe('true')
      expect(button.getAttribute('title')).toBe('Open… — not built yet (s01)')
      await userEvent.click(button)
      expect(warn).toHaveBeenCalledWith('[Cartographer] Open… refused: not built yet (s01).')
    })
  })

  describe('unmanaged errors', () => {
    it('lets an action that throws propagate', () => {
      render(
        <BarButton
          label="Save"
          onPress={() => {
            throw new Error('boom')
          }}
        />
      )
      // React reports a throwing handler instead of swallowing it; it reaches the window's error event.
      const errors: unknown[] = []
      const listen = (event: ErrorEvent) => {
        errors.push(event.error)
        event.preventDefault()
      }
      window.addEventListener('error', listen)
      screen.getByRole('button', { name: 'Save' }).click()
      window.removeEventListener('error', listen)
      expect(errors).toHaveLength(1)
    })
  })

  describe('edge cases', () => {
    it('reaches the keyboard order when unavailable, unlike a native disabled button', async () => {
      render(<BarButton label="Registry" unavailable="not built yet (s07)" />)
      await userEvent.tab()
      expect(document.activeElement?.textContent).toBe('Registry')
    })
  })
})
