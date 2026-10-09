import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { WORKBENCH_ENTRIES } from './entries'
import { Workbench } from './Workbench'

import type { WorkbenchEntry } from './Workbench'

const PLATES: readonly WorkbenchEntry[] = [
  { id: 'first', title: 'First plate', render: () => <p>first content</p> },
  {
    id: 'second',
    title: 'Second plate',
    note: 'look at the border',
    width: 400,
    render: () => <p>second content</p>,
  },
]

/** Moves the hash the way a click on a plate's link does, and lets React see it. */
function goTo(hash: string) {
  act(() => {
    window.location.hash = hash
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
}

afterEach(() => {
  window.location.hash = ''
})

describe('Workbench', () => {
  describe('happy path', () => {
    it('lists every plate and shows the first', () => {
      render(<Workbench entries={PLATES} />)
      const links = screen.getAllByRole('link')
      expect(links.map((link) => link.textContent)).toEqual(['First plate', 'Second plate'])
      expect(screen.getByText('first content')).toBeTruthy()
      expect(links[0]?.getAttribute('aria-current')).toBe('page')
    })
  })

  describe('variants', () => {
    it('shows the plate the hash names, with its note and width', () => {
      render(<Workbench entries={PLATES} />)
      goTo('second')
      expect(screen.getByText('second content')).toBeTruthy()
      expect(screen.getByText('look at the border')).toBeTruthy()
      expect(screen.getByText('second content').parentElement?.style.width).toBe('400px')
      expect(screen.getByRole('link', { name: 'Second plate' }).getAttribute('aria-current')).toBe(
        'page'
      )
    })

    // The registry itself: a plate that throws would blank the whole page, and nothing else renders it.
    it.each(WORKBENCH_ENTRIES.map((entry) => [entry.id, entry] as const))(
      'mounts the real plate %s',
      (_, entry) => {
        expect(() => render(<>{entry.render()}</>)).not.toThrow()
      }
    )
  })

  // L3: N/A — the workbench handles no failure: a broken plate is a broken plate.
  // L4: N/A — no async path, no external input beyond the hash, covered below.

  describe('edge cases', () => {
    it('falls back to the first plate on a hash that names none', () => {
      window.location.hash = 'nowhere'
      render(<Workbench entries={PLATES} />)
      expect(screen.getByText('first content')).toBeTruthy()
    })

    it('says so when there is no plate at all', () => {
      render(<Workbench entries={[]} />)
      expect(screen.getByText('No plate yet.')).toBeTruthy()
    })

    it('gives every plate a distinct id, since the id is the address', () => {
      const ids = WORKBENCH_ENTRIES.map((entry) => entry.id)
      expect(new Set(ids).size).toBe(ids.length)
    })
  })
})
