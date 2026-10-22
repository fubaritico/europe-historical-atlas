import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { renderInEnglish } from '../../../testing/renderInEnglish'

import { LineView } from './LineView'

import type { LineViewProps } from './LineView'

afterEach(() => {
  vi.restoreAllMocks()
})

/**
 * Render the view with spies, overriding what a test needs.
 * @param overrides - the props that differ
 * @returns the props rendered and a user
 */
function mount(overrides: Partial<LineViewProps> = {}) {
  const props: LineViewProps = {
    segments: 11,
    between: 'Royaume de France – Royaume de Bourgogne',
    canDressBorder: true,
    hand: null,
    mixed: false,
    scope: 'stretch',
    onScope: vi.fn(),
    onHand: vi.fn(),
    ...overrides,
  }
  renderInEnglish(<LineView {...props} />)
  return { ...props, user: userEvent.setup() }
}

describe('LineView', () => {
  describe('happy path', () => {
    it('says what is selected, and dresses it with the pattern chosen', async () => {
      const { onHand, user } = mount()
      expect(
        screen.getByText('11 segments · Royaume de France – Royaume de Bourgogne')
      ).toBeDefined()
      await user.click(screen.getByRole('button', { name: 'Dotted' }))
      expect(onHand).toHaveBeenCalledWith('dotted')
    })
  })

  describe('variants', () => {
    it('gives the stretch back to the rule with Auto', async () => {
      const { onHand, user } = mount({ hand: 'dotted' })
      await user.click(screen.getByRole('button', { name: 'Auto' }))
      expect(onHand).toHaveBeenCalledWith(null)
    })

    it('marks the hand in force, and Auto when none is', () => {
      mount({ hand: 'dashed' })
      expect(screen.getByRole('button', { name: 'Dashed' }).getAttribute('aria-pressed')).toBe(
        'true'
      )
      expect(screen.getByRole('button', { name: 'Auto' }).getAttribute('aria-pressed')).toBe(
        'false'
      )
    })

    it('switches to the whole border', async () => {
      const { onScope, user } = mount()
      await user.click(screen.getByRole('radio', { name: 'Whole border' }))
      expect(onScope).toHaveBeenCalledWith('border')
    })
  })

  describe('managed errors', () => {
    it('refuses the whole border when the stretch runs against several neighbours, and says so', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { onScope, user } = mount({ canDressBorder: false })
      const whole = screen.getByRole('radio', { name: 'Whole border' })
      expect(whole.getAttribute('aria-disabled')).toBe('true')
      await user.click(whole)
      expect(onScope).not.toHaveBeenCalled()
      expect(warn).toHaveBeenCalledOnce()
    })
  })

  // L4: N/A — a view; the edits' refusals are the slice's (borderOverrides.test.ts).

  describe('edge cases', () => {
    it('shows the hint, and no pattern, when nothing is selected', () => {
      mount({ segments: 0 })
      expect(screen.getByText(/Select a stretch/)).toBeDefined()
      expect(screen.queryByRole('button', { name: 'Dotted' })).toBeNull()
    })

    it('marks no pattern when the stretch carries different hands', () => {
      mount({ hand: null, mixed: true })
      expect(screen.getByRole('button', { name: 'Auto' }).getAttribute('aria-pressed')).toBe(
        'false'
      )
    })
  })
})
