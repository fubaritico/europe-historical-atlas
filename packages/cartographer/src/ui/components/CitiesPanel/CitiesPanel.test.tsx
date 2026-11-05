import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'

import { testStore } from '../../../canvas/testGestureContext'
import { renderInEnglish } from '../../testing/renderInEnglish'

import { CitiesPanel } from './CitiesPanel'

import type { CityMark } from '../../../state/citiesSlice'
import type { YearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

const in1100 = {
  kind: 'instant',
  at: { year: 1100, month: null, day: null, calendar: null, circa: false, margin: null },
} as const
/** France holds 0–2° E, the Empire 2–4° E, both 46–48° N (the fixture); here France is Q70972, the Empire Q12548. */
const FRANCE = { name: 'Reaume de France', wikidata: 'Q70972' }
const EMPIRE = { name: 'Sacrum Imperium', wikidata: 'Q12548' }
const PARIS: CityMark = {
  id: 'paris',
  name: 'Paris',
  lon: 1,
  lat: 47,
  date: in1100,
  holder: null,
  holderSources: [],
}
const METZ: CityMark = {
  id: 'metz',
  name: 'Metz',
  lon: 3,
  lat: 47,
  date: in1100,
  holder: EMPIRE,
  holderSources: [{ title: 'Duby, Atlas historique', where: 'p. 46', holder: EMPIRE }],
}
const LATER: CityMark = {
  ...PARIS,
  id: 'later',
  name: 'Later',
  date: { ...in1100, at: { ...in1100.at, year: 1200 } },
}

/**
 * The two-polity fixture of 1100, its polities given their Wikidata ids.
 * @returns the document
 */
function documentWithIds(): YearDocument {
  const document = sharedBorderDocument()
  for (const polity of document.polities)
    polity.wikidata = polity.id === 'hre' ? EMPIRE.wikidata : FRANCE.wikidata
  return document
}

/**
 * Mount the panel over a real store on the two-polity fixture of 1100, its cities read.
 * @param cities - the cities of the export, none read when `null`
 * @returns the store and a user
 */
function mount(cities: readonly CityMark[] | null = [PARIS, METZ, LATER]) {
  const store = testStore(documentWithIds())
  if (cities !== null) store.getState().setCities(cities)
  renderInEnglish(<CitiesPanel store={store} />)
  return { store, user: userEvent.setup() }
}

/**
 * Double-click a city's name and read its detail.
 * @param user - the user
 * @param name - the city's name
 * @returns the detail's text
 */
async function detailOf(user: ReturnType<typeof userEvent.setup>, name: string): Promise<string> {
  await user.dblClick(screen.getByText(name))
  return screen.getByRole('region', { name }).textContent ?? ''
}

// CARTO-193, the dev, 2026-11-02: an eye per city, none at opening; a double-click says who holds it, by the sources
// and on the map; not at the right place, or a polity not declared yet, is said.
describe('CitiesPanel', () => {
  describe('happy path', () => {
    it('lists the cities of 1100, none shown, and shows Paris in the store on its eye', async () => {
      const { store, user } = mount()
      expect(screen.getAllByRole('listitem').map((row) => row.textContent)).toEqual([
        'Paris',
        'Metz',
      ])
      expect(store.getState().shownCities.size).toBe(0)
      await user.click(screen.getByRole('button', { name: 'Show Paris' }))
      expect([...store.getState().shownCities]).toEqual(['paris'])
    })

    it('says Metz is held by the Empire by the sources, with its source, and that the map agrees', async () => {
      const { user } = mount()
      const detail = await detailOf(user, 'Metz')
      expect(detail).toContain('By the sources: Sacrum Imperium')
      expect(detail).toContain('Source: Duby, Atlas historique, p. 46')
      expect(detail).toContain('On the map: Sacrum Imperium')
      expect(detail).toContain('At the right place.')
    })
  })

  describe('variants', () => {
    it('says a city the map puts in France is not at the right place, and marks it in the list', async () => {
      const { user } = mount([{ ...METZ, lon: 1 }])
      expect(await detailOf(user, 'Metz')).toContain(
        'Not at the right place: the sources put it in Sacrum Imperium.'
      )
      expect(screen.getByRole('listitem').getAttribute('data-verdict')).toBe('misplaced')
    })

    it('agrees by the Wikidata id when the sources write the Empire under another name', async () => {
      const { user } = mount([
        { ...METZ, holder: { name: 'Saint-Empire', wikidata: EMPIRE.wikidata } },
      ])
      expect(await detailOf(user, 'Metz')).toContain('At the right place.')
    })

    it('says a holder no polity of the map carries is to declare', async () => {
      const venice = { name: 'Repubblica di Venezia', wikidata: 'Q4948' }
      const { user } = mount([{ ...METZ, holder: venice, holderSources: [] }])
      expect(await detailOf(user, 'Metz')).toContain(
        'Repubblica di Venezia is not declared in this map: to declare.'
      )
      expect(screen.getByRole('listitem').getAttribute('data-verdict')).toBe('toDeclare')
    })

    it('says a holder with no Wikidata id cannot be compared', async () => {
      const { user } = mount([
        { ...METZ, holder: { name: 'Kingdom of the Isles', wikidata: null }, holderSources: [] },
      ])
      expect(await detailOf(user, 'Metz')).toContain(
        'Kingdom of the Isles has no Wikidata id: nothing to compare by.'
      )
    })

    it('says the holder is not entered yet, and gives no verdict', async () => {
      const { user } = mount()
      const detail = await detailOf(user, 'Paris')
      expect(detail).toContain('By the sources: not entered yet')
      expect(detail).toContain('On the map: Reaume de France')
      expect(detail).not.toContain('right place')
    })

    it('shows every city of 1100 on the eye for them all, then hides them all', async () => {
      const { store, user } = mount()
      await user.click(screen.getByRole('button', { name: 'Show every city' }))
      expect([...store.getState().shownCities].sort()).toEqual(['metz', 'paris'])
      await user.click(screen.getByRole('button', { name: 'Hide every city' }))
      expect(store.getState().shownCities.size).toBe(0)
    })

    it('opens the detail of Metz on ‹enter›, its name focused', async () => {
      const { user } = mount()
      screen.getByRole('button', { name: 'Metz' }).focus()
      await user.keyboard('{Enter}')
      expect(screen.getByRole('region', { name: 'Metz' }).textContent).toContain(
        'At the right place.'
      )
    })

    it('closes the detail and gives the hint back', async () => {
      const { user } = mount()
      await detailOf(user, 'Paris')
      await user.click(screen.getByRole('button', { name: 'Close' }))
      expect(screen.queryByRole('region', { name: 'Paris' })).toBeNull()
      expect(screen.getByText('Double-click a city to see who holds it.')).toBeDefined()
    })
  })

  describe('managed errors', () => {
    it('says the cities could not be read, in place of the list', () => {
      const { store } = mount(null)
      act(() => {
        store.getState().setCitiesFailed('HTTP 404')
      })
      expect(screen.getByText('The cities could not be read: HTTP 404')).toBeDefined()
      expect(screen.queryAllByRole('listitem')).toEqual([])
    })
  })

  // L4: N/A — the panel only reads and forwards.

  describe('edge cases', () => {
    it('says while the cities are read', () => {
      mount(null)
      expect(screen.getByText('Reading the cities…')).toBeDefined()
    })

    it('says no city is entered for 1100 when the export has none of that year', () => {
      mount([LATER])
      expect(screen.getByText('No city entered for 1100.')).toBeDefined()
    })

    it('says nobody holds a city outside every territory, and that it is not at the right place', async () => {
      const { user } = mount([{ ...METZ, lon: 10 }])
      const detail = await detailOf(user, 'Metz')
      expect(detail).toContain('On the map: no polity')
      expect(detail).toContain('Not at the right place')
    })

    it('judges again, the detail open, once a border is moved: Metz moved into France by the map', async () => {
      const { store, user } = mount([METZ])
      expect(await detailOf(user, 'Metz')).toContain('At the right place.')
      act(() => {
        store.getState().moveAnchors(
          [
            { index: 1, to: [4, 48] },
            { index: 2, to: [4, 46] },
          ],
          { kind: 'move-anchor', label: 'move anchor' }
        )
      })
      expect(screen.getByRole('region', { name: 'Metz' }).textContent).toContain(
        'Not at the right place'
      )
    })
  })
})

/** The panel's filter. */
function filter(): HTMLElement {
  return screen.getByRole('searchbox', { name: 'Filter the cities' })
}

// CARTO-360, the dev, 2026-11-05: a field at the head of the list; the eye at its head acts on the cities found.
describe('CitiesPanel — the filter (CARTO-360)', () => {
  describe('happy path', () => {
    it('lists only Paris for « par », and its eye shows Paris alone', async () => {
      const { store, user } = mount()
      await user.type(filter(), 'par')
      expect(screen.getAllByRole('listitem').map((row) => row.textContent)).toEqual(['Paris'])
      expect(screen.getByText('The city found')).toBeTruthy()
      await user.click(screen.getByRole('button', { name: 'Show the cities found' }))
      expect([...store.getState().shownCities]).toEqual(['paris'])
    })
  })

  describe('variants', () => {
    it('hides the cities found and leaves shown the cities the filter left out', async () => {
      const { store, user } = mount()
      store.getState().setCitiesShown(['paris', 'metz'], true)
      await user.type(filter(), 'par')
      await user.click(screen.getByRole('button', { name: 'Hide the cities found' }))
      expect([...store.getState().shownCities]).toEqual(['metz'])
    })

    it('keeps the eye for every city of 1100 when every city answers the filter', async () => {
      const { user } = mount([PARIS, { ...METZ, name: 'Pavie' }])
      await user.type(filter(), 'p')
      expect(screen.getAllByRole('listitem')).toHaveLength(2)
      expect(screen.getByRole('button', { name: 'Show every city' })).toBeTruthy()
    })

    it('names the eye for every city of 1100 again once ‹esc› clears the filter', async () => {
      const { user } = mount()
      await user.type(filter(), 'par{Escape}')
      expect(screen.getAllByRole('listitem')).toHaveLength(2)
      expect(screen.getByRole('button', { name: 'Show every city' })).toBeTruthy()
    })

    it('counts the cities found when several answer', async () => {
      const { user } = mount([PARIS, METZ, { ...PARIS, id: 'pavia', name: 'Pavie' }])
      await user.type(filter(), 'pa')
      expect(screen.getByText('The 2 cities found')).toBeTruthy()
    })
  })

  // L3–L4: N/A — nothing is refused, nothing is read.

  describe('edge cases', () => {
    it('says that no city answers, in place of the list, and keeps the filter', async () => {
      const { user } = mount()
      await user.type(filter(), 'kiev')
      expect(screen.queryByRole('listitem')).toBeNull()
      expect(screen.getByText('No city answers “kiev”.')).toBeTruthy()
      expect(filter()).toBeTruthy()
    })
  })
})
