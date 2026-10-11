import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ToolFlyout } from './ToolFlyout'

import type { ToolVariant } from './ToolFlyout'

const VARIANTS: ToolVariant[] = [
  { id: 'a', label: 'First', shortcut: 'P', icon: 'draw', enabled: true },
  { id: 'b', label: 'Second', shortcut: null, icon: 'draw', enabled: false },
  { id: 'c', label: 'Third', shortcut: null, icon: 'draw', enabled: true },
]

/**
 * Mount a flyout on literals.
 * @param current - the variant marked in use
 * @returns the two spies and a user
 */
function mount(current = 'a') {
  const onChoose = vi.fn()
  const onDismiss = vi.fn()
  const view = render(
    <ToolFlyout
      label="Group"
      variants={VARIANTS}
      current={current}
      onChoose={onChoose}
      onDismiss={onDismiss}
    />
  )
  return { onChoose, onDismiss, view, user: userEvent.setup() }
}

const item = (name: string) => screen.getByRole('menuitemradio', { name: new RegExp(name) })

describe('ToolFlyout', () => {
  describe('happy path', () => {
    it('focuses the variant in use when it opens', () => {
      mount('c')
      expect(document.activeElement).toBe(item('Third'))
    })
  })

  describe('variants', () => {
    // ↑ ↓ walk the enabled rows only, and wrap.
    it('walks the enabled rows with the arrows, skipping a disabled one and wrapping', async () => {
      const { user } = mount('a')
      await user.keyboard('{ArrowDown}')
      expect(document.activeElement).toBe(item('Third'))
      await user.keyboard('{ArrowDown}')
      expect(document.activeElement).toBe(item('First'))
      await user.keyboard('{ArrowUp}')
      expect(document.activeElement).toBe(item('Third'))
    })

    it('chooses with Space as with Enter', async () => {
      const { onChoose, user } = mount('a')
      await user.keyboard(' ')
      expect(onChoose).toHaveBeenCalledWith('a')
    })
  })

  describe('managed errors', () => {
    it('does not choose a disabled row, by click or by key', async () => {
      const { onChoose, user } = mount('a')
      await user.click(item('Second'))
      item('Second').focus()
      await user.keyboard('{Enter} ')
      expect(onChoose).not.toHaveBeenCalled()
    })
  })

  describe('unmanaged errors', () => {
    // useEffectEvent: a parent re-render hands a new onDismiss, and must not pull the focus back.
    it('keeps the focus where the author moved it when the parent re-renders', async () => {
      const { view, user } = mount('a')
      await user.keyboard('{ArrowDown}')
      view.rerender(
        <ToolFlyout
          label="Group"
          variants={VARIANTS}
          current="a"
          onChoose={vi.fn()}
          onDismiss={vi.fn()}
        />
      )
      expect(document.activeElement).toBe(item('Third'))
    })
  })

  describe('edge cases', () => {
    it('focuses the first enabled row when the one in use is not listed', () => {
      mount('zzz')
      expect(document.activeElement).toBe(item('First'))
    })
  })
})
