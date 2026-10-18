import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { OverridesList } from './OverridesList'

import type { OverrideRow } from '../overrideRows'

const DOTTED: OverrideRow = {
  kind: 'run',
  index: 0,
  hand: 'dotted',
  label: '32 segments · Royaume de France – Royaume de Bourgogne',
  orphaned: false,
}

describe('OverridesList', () => {
  describe('happy path', () => {
    it('lists an override with its hand and what it dresses, and clears it on [Clear]', async () => {
      const onClear = vi.fn()
      render(<OverridesList rows={[DOTTED]} onClear={onClear} />)
      expect(screen.getByText(DOTTED.label)).toBeDefined()
      await userEvent.setup().click(screen.getByRole('button', { name: /^Clear dotted/ }))
      expect(onClear).toHaveBeenCalledWith(DOTTED)
    })
  })

  describe('variants', () => {
    it('names a pair entry that states only a fact', () => {
      render(
        <OverridesList
          rows={[{ ...DOTTED, kind: 'pair', hand: null, label: 'whole border · A – B' }]}
          onClear={vi.fn()}
        />
      )
      expect(screen.getByText('fact')).toBeDefined()
    })
  })

  describe('managed errors', () => {
    it('marks an orphaned stretch, still listed and clearable', () => {
      render(<OverridesList rows={[{ ...DOTTED, orphaned: true }]} onClear={vi.fn()} />)
      expect(screen.getByRole('listitem').getAttribute('data-orphaned')).toBe('true')
      expect(screen.getByRole('button', { name: /^Clear/ })).toBeDefined()
    })
  })

  // L4: N/A — a view; clearing is the slice's undoable step.

  describe('edge cases', () => {
    it('says so when nothing is overridden', () => {
      render(<OverridesList rows={[]} onClear={vi.fn()} />)
      expect(screen.getByText(/Nothing overridden/)).toBeDefined()
    })
  })
})
