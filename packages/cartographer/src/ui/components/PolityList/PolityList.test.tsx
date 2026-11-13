import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { renderInEnglish } from '../../testing/renderInEnglish'

import { PolityList } from './PolityList'

import type { PolityListProps } from './PolityList'
import type { PolityRow } from '../../utils/polityRows'

/**
 * The list with its filter's text held as the store holds it (CARTO-427), so typing in the filter filters.
 * @param props - the list's props, the filter's text left out
 * @returns the list
 */
function TypedPolityList(props: Omit<PolityListProps, 'search'>) {
  // State
  const search = useState('')

  // Render
  return <PolityList {...props} search={search} />
}

afterEach(() => {
  vi.unstubAllGlobals()
})

/** A row of the list, 20 pixels high, at its place in the list. */
function row(id: string): PolityRow {
  return {
    id,
    name: id,
    rank: '',
    dates: '',
    colour: '#888888',
    hasTerritory: true,
    depth: 0,
    suzerainName: null,
    wikidata: null,
  }
}

const ROWS = Array.from({ length: 100 }, (_, index) => row(`p${String(index)}`))

/**
 * The list laid out as a browser would: each row 20 pixels high at its place, the list 200 pixels high and
 * scrolled to the top — jsdom lays nothing out — and its `scrollTo` recorded.
 */
function laidOut(): ReturnType<typeof vi.fn> {
  const list = screen.getByRole('listbox')
  const scrollTo = vi.fn()
  Object.assign(list, { scrollTo })
  Object.defineProperty(list, 'clientHeight', { value: 200, configurable: true })
  Object.defineProperty(list, 'scrollTop', { value: 0, configurable: true, writable: true })
  screen.getAllByRole('option').forEach((option, index) => {
    Object.defineProperty(option, 'offsetTop', { value: index * 20, configurable: true })
    Object.defineProperty(option, 'offsetHeight', { value: 20, configurable: true })
  })
  return scrollTo
}

/** The system's reduced-motion setting. */
function motion(reduce: boolean): void {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: reduce, media: query }))
}

/** The list over the hundred rows, aimed at one. */
function list(targetId: string | null) {
  return (
    <TypedPolityList
      year={1100}
      rows={ROWS}
      targetId={targetId}
      onChoose={vi.fn()}
      onMenu={vi.fn()}
      onEdit={vi.fn()}
    />
  )
}

describe('PolityList — the target brought into view (the dev, 2026-10-14)', () => {
  describe('happy path', () => {
    it('scrolls smoothly to centre the target’s row when it is out of view', () => {
      motion(false)
      const { rerender } = renderInEnglish(list(null))
      const scrollTo = laidOut()
      rerender(list('p50'))
      expect(scrollTo).toHaveBeenCalledWith({ top: 910, behavior: 'smooth' })
    })
  })

  describe('variants', () => {
    it('scrolls at once when the system asks for less motion', () => {
      motion(true)
      const { rerender } = renderInEnglish(list(null))
      const scrollTo = laidOut()
      rerender(list('p50'))
      expect(scrollTo).toHaveBeenCalledWith({ top: 910, behavior: 'auto' })
    })

    // A row clicked in the list is in view: it must not move under the pointer.
    it('leaves the list where it is when the target’s row is already in view', () => {
      motion(false)
      const { rerender } = renderInEnglish(list(null))
      const scrollTo = laidOut()
      rerender(list('p3'))
      expect(scrollTo).not.toHaveBeenCalled()
    })
  })

  // L3: N/A — nothing is refused.

  describe('unmanaged errors', () => {
    // A target an undo took away from the document has no row: nothing to bring into view.
    it('does nothing for a target that has no row', () => {
      motion(false)
      const { rerender } = renderInEnglish(list(null))
      const scrollTo = laidOut()
      rerender(list('gone'))
      expect(scrollTo).not.toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    it('does not scroll when the target is cleared', () => {
      motion(false)
      const { rerender } = renderInEnglish(list('p3'))
      const scrollTo = laidOut()
      rerender(list(null))
      expect(scrollTo).not.toHaveBeenCalled()
    })
  })
})

/** France with its vassal Champagne, then Poland: a tree of three rows. */
const TREE: PolityRow[] = [
  { ...row('france'), name: 'Royaume de France' },
  { ...row('champagne'), name: 'Comté de Champagne', depth: 1, suzerainName: 'Royaume de France' },
  { ...row('pologne'), name: 'Pologne' },
]

/** The tree's list, aimed at one polity or none; a user to type in its filter, and the callbacks it reports to. */
function tree(targetId: string | null = null) {
  const onChoose = vi.fn()
  const onEdit = vi.fn()
  renderInEnglish(
    <TypedPolityList
      year={1100}
      rows={TREE}
      targetId={targetId}
      onChoose={onChoose}
      onMenu={vi.fn()}
      onEdit={onEdit}
    />
  )
  return {
    user: userEvent.setup(),
    filter: screen.getByRole('searchbox', { name: 'Filter the polities' }),
    onChoose,
    onEdit,
  }
}

/** The names of the options listed, each with whether it is greyed. */
function listed(): string[] {
  return screen
    .getAllByRole('option')
    .map(
      (option) =>
        `${option.querySelector('.polity-row__name')?.textContent ?? ''}${option.getAttribute('data-dimmed') === 'true' ? ' (greyed)' : ''}`
    )
}

// CARTO-360, the dev, 2026-11-05: a field at the head of the list, filtering it as one types.
describe('PolityList — the filter (CARTO-360)', () => {
  describe('happy path', () => {
    it('lists the vassal found under its suzerain, greyed, and counts one of three', async () => {
      const { user, filter } = tree()
      await user.type(filter, 'champ')
      expect(listed()).toEqual(['Royaume de France (greyed)', 'Comté de Champagne'])
      expect(screen.getByText('1 of 3')).toBeTruthy()
    })
  })

  describe('variants', () => {
    it('finds a name typed without its accent', async () => {
      const { user, filter } = tree()
      await user.type(filter, 'comte')
      expect(listed()).toEqual(['Royaume de France (greyed)', 'Comté de Champagne'])
    })

    it('lists every polity again, none greyed, once ‹esc› clears the filter', async () => {
      const { user, filter } = tree()
      await user.type(filter, 'pol{Escape}')
      expect(listed()).toEqual(['Royaume de France', 'Comté de Champagne', 'Pologne'])
      expect(screen.getByText('3')).toBeTruthy()
    })
  })

  // L3–L4: N/A — nothing is refused, nothing is read.

  describe('edge cases', () => {
    it('walks the rows shown with the keys: ↓ from the top chooses Champagne, not Poland', async () => {
      const { user, filter, onChoose } = tree()
      await user.type(filter, 'champ')
      screen.getByRole('listbox').focus()
      await user.keyboard('{ArrowDown}{ArrowDown}{Enter}')
      expect(onChoose).toHaveBeenLastCalledWith('champagne')
    })

    it('opens no form on ‹enter› for a target the filter hides', async () => {
      const { user, filter, onEdit } = tree('pologne')
      await user.type(filter, 'champ')
      screen.getByRole('listbox').focus()
      await user.keyboard('{Enter}')
      expect(onEdit).not.toHaveBeenCalled()
    })

    it('still opens the target’s form on ‹enter› when the filter shows it', async () => {
      const { user, filter, onEdit } = tree('champagne')
      await user.type(filter, 'champ')
      screen.getByRole('listbox').focus()
      await user.keyboard('{Enter}')
      expect(onEdit).toHaveBeenCalledWith('champagne')
    })

    it('says that no polity answers, in place of the list', async () => {
      const { user, filter } = tree()
      await user.type(filter, 'kiev')
      expect(screen.queryByRole('listbox')).toBeNull()
      expect(screen.getByText('No polity answers “kiev”.')).toBeTruthy()
    })

    it('shows no filter over a year with no polity', () => {
      renderInEnglish(
        <TypedPolityList
          year={1100}
          rows={[]}
          targetId={null}
          onChoose={vi.fn()}
          onMenu={vi.fn()}
          onEdit={vi.fn()}
        />
      )
      expect(screen.queryByRole('searchbox')).toBeNull()
    })
  })
})
