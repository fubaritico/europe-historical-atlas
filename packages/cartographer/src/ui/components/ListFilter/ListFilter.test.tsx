import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { renderInEnglish } from '../../testing/renderInEnglish'

import { ListFilter } from './ListFilter'

/** The field over a text it owns, as a panel holds it; every change also reported to `seen`. */
function Owned({ start, seen }: { start: string; seen: (value: string) => void }) {
  // State
  const [value, setValue] = useState(start)

  // Handlers
  const change = (next: string) => {
    seen(next)
    setValue(next)
  }

  // Render
  return <ListFilter value={value} onChange={change} label="Filter the cities" />
}

/** The field, by its name. */
function field(): HTMLInputElement {
  return screen.getByRole('searchbox', { name: 'Filter the cities' })
}

describe('ListFilter', () => {
  describe('happy path', () => {
    it('reports each letter typed', async () => {
      const seen = vi.fn()
      renderInEnglish(<Owned start="" seen={seen} />)

      await userEvent.type(field(), 'Kiev')

      expect(seen).toHaveBeenLastCalledWith('Kiev')
      expect(field().value).toBe('Kiev')
    })

    it('shows the magnifier and the placeholder', () => {
      renderInEnglish(<Owned start="" seen={vi.fn()} />)

      expect(field().getAttribute('placeholder')).toBe('Filter…')
      expect(field().parentElement?.querySelector('svg')).not.toBeNull()
    })
  })

  describe('variants', () => {
    // CARTO-370: `{Cities}`' funnel sits at the right of the field.
    it('shows the buttons it is given beside the field', () => {
      renderInEnglish(
        <ListFilter
          value=""
          onChange={vi.fn()}
          label="Filter the cities"
          actions={<button type="button">Advanced filters</button>}
        />
      )
      const button = screen.getByRole('button', { name: 'Advanced filters' })
      // At the right of the field: after it in the page, in the same box.
      expect([
        field().compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING,
        button.parentElement?.className,
      ]).toEqual([Node.DOCUMENT_POSITION_FOLLOWING, 'list-filter'])
    })

    it('clears the text on ‹esc› and keeps ‹esc› from the page', async () => {
      const seen = vi.fn()
      const page = vi.fn()
      document.addEventListener('keydown', page)
      renderInEnglish(<Owned start="Kiev" seen={seen} />)

      await userEvent.type(field(), '{Escape}')

      expect(seen).toHaveBeenLastCalledWith('')
      expect(field().value).toBe('')
      expect(page).not.toHaveBeenCalled()
      document.removeEventListener('keydown', page)
    })
  })

  // L3–L4: N/A — a controlled field; nothing is read, nothing can fail.

  describe('edge cases', () => {
    it('leaves ‹esc› to the page when the field is already empty', async () => {
      const seen = vi.fn()
      const page = vi.fn()
      document.addEventListener('keydown', page)
      renderInEnglish(<Owned start="" seen={seen} />)

      await userEvent.type(field(), '{Escape}')

      expect(seen).not.toHaveBeenCalled()
      expect(page).toHaveBeenCalled()
      document.removeEventListener('keydown', page)
    })
  })
})
