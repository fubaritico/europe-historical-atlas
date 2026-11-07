import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { AUTOMATIC_PALETTE } from '@europe-historical-atlas/core/data/regionPalette'
import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'

import { testStore } from '../../../canvas/testGestureContext'
import { createPolityColourSource } from '../../../state/polityColourSource'
import { renderInEnglish } from '../../testing/renderInEnglish'
import { showRow } from '../../utils/showRow'

import { CitiesPanel } from './CitiesPanel'

import type { CityMark } from '../../../state/citiesSlice'
import type { YearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

// The scroll is jsdom's blind spot (nothing is laid out): what is checked is which row it is asked for.
vi.mock('../../utils/showRow', () => ({ showRow: vi.fn() }))

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
  const panel = <CitiesPanel store={store} colours={createPolityColourSource(AUTOMATIC_PALETTE)} />
  const { unmount } = renderInEnglish(panel)
  return {
    store,
    user: userEvent.setup(),
    /** Unmount the panel and mount it again over the same store — a panel docked or floated (CARTO-342). */
    remount: () => {
      unmount()
      renderInEnglish(panel)
    },
  }
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
      // The detail carries it too: its verdict line takes the same yellow (CARTO-386).
      expect(screen.getByRole('region', { name: 'Metz' }).getAttribute('data-verdict')).toBe(
        'misplaced'
      )
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
      expect(screen.getByRole('region', { name: 'Metz' }).getAttribute('data-verdict')).toBe(
        'toDeclare'
      )
    })

    it('says a holder with no Wikidata id cannot be compared', async () => {
      const { user } = mount([
        { ...METZ, holder: { name: 'Kingdom of the Isles', wikidata: null }, holderSources: [] },
      ])
      expect(await detailOf(user, 'Metz')).toContain(
        'Kingdom of the Isles has no Wikidata id: nothing to compare by.'
      )
    })

    it('says the holder is not entered yet, gives no verdict, and marks the row for the red', async () => {
      const { user } = mount()
      const row = screen.getByRole('button', { name: 'Paris' }).closest('li')
      expect(row?.getAttribute('data-verdict')).toBe('notEntered')
      const detail = await detailOf(user, 'Paris')
      expect(detail).toContain('By the sources: not entered yet')
      expect(detail).toContain('On the map: Reaume de France')
      expect(detail).not.toContain('right place')
    })

    // The dev, 2026-11-05: a box in place of the round eye heading the list.
    it('shows every city of 1100 by the box heading the list, then hides them all', async () => {
      const { store, user } = mount()
      await user.click(screen.getByRole('checkbox', { name: 'Show all the cities of 1100' }))
      expect([...store.getState().shownCities].sort()).toEqual(['metz', 'paris'])
      await user.click(screen.getByRole('checkbox', { name: 'Show all the cities of 1100' }))
      expect(store.getState().shownCities.size).toBe(0)
    })

    // The dev, 2026-11-05: the cities shown drawn as points, in their holder's colour.
    it('draws the cities as points by the second box, and back', async () => {
      const { store, user } = mount()
      await user.click(screen.getByRole('checkbox', { name: 'Show as points' }))
      expect(store.getState().citiesAsPoints).toBe(true)
      await user.click(screen.getByRole('checkbox', { name: 'Show as points' }))
      expect(store.getState().citiesAsPoints).toBe(false)
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
// CARTO-385: the list grows to the panel's height only as a direct child of the panel's body — the stylesheet's
// `.panel__body:has(> .city-list)` makes that body a column. A wrapper between them would bring the 240px cap back.
describe('CitiesPanel — the list in the panel (CARTO-385)', () => {
  describe('happy path', () => {
    it('renders the list of 1100 as a direct child of the panel body', () => {
      mount()
      const list = screen.getByRole('list', { name: 'Cities' })
      expect(list.classList.contains('city-list')).toBe(true)
      expect(list.parentElement?.classList.contains('panel__body')).toBe(true)
    })
  })

  // L2: N/A — one layout, whatever the cities. L3, L4: N/A — nothing to fail in rendering the list.
  // L5: the stylesheet's own floor and basis are pinned in editor-chrome.test.ts.
})

/**
 * The dot of a city's row.
 * @param city - the city's name
 * @returns its dot
 */
function dotOfRow(city: string): HTMLElement {
  const name = screen.getByRole('button', { name: city })
  const dot = name.closest('li')?.querySelector<HTMLElement>('.city-row__dot')
  if (dot === null || dot === undefined) throw new Error(`no dot on the row of ${city}`)
  return dot
}

describe('CitiesPanel — the holder’s dot (CARTO-367)', () => {
  describe('happy path', () => {
    it('colours Metz’s dot in the Empire’s colour, the one its point has on the canvas', () => {
      const { store } = mount()
      const empire = store.getState().document.polities.find(({ id }) => id === 'hre')
      if (empire === undefined) throw new Error('the fixture lost the Empire')
      const colour = createPolityColourSource(AUTOMATIC_PALETTE)
        .coloursOf(store.getState().document, store.getState().version)
        .get(empire.id)
      if (colour === undefined) throw new Error('the palette gave the Empire no colour')
      const dot = dotOfRow('Metz')
      expect(dot.getAttribute('data-empty')).toBe('false')
      // jsdom writes an inline colour as rgb(): the expected one is written the same way, through a probe.
      const probe = window.document.createElement('span')
      probe.style.background = colour
      expect(dot.style.background).toBe(probe.style.background)
    })

    it('names the Empire in a bubble when Metz’s dot is hovered', async () => {
      const { user } = mount()
      await user.hover(dotOfRow('Metz'))
      expect((await screen.findByRole('tooltip')).textContent).toBe('Sacrum Imperium')
    })
  })

  describe('variants', () => {
    it('rings Paris’s dot hollow and says its holder is not entered yet', async () => {
      const { user } = mount()
      const dot = dotOfRow('Paris')
      expect(dot.getAttribute('data-empty')).toBe('true')
      expect(dot.style.background).toBe('')
      await user.hover(dot)
      expect((await screen.findByRole('tooltip')).textContent).toBe('Holder not entered yet')
    })
  })

  describe('edge cases', () => {
    // Review of CARTO-367: the document is edited in place, so only the version says the suzerain changed.
    it('names France as the Empire’s overlord once the Empire is made its vassal in the map', async () => {
      const { store, user } = mount()
      const empire = store.getState().document.polities.find(({ id }) => id === 'hre')
      if (empire === undefined) throw new Error('the fixture lost the Empire')
      act(() => {
        store
          .getState()
          .editPolity(
            { ...empire, suzerain: 'fr-couronne' },
            { kind: 'edit-polity', label: 'edit polity' }
          )
      })
      await user.hover(dotOfRow('Metz'))
      expect((await screen.findByRole('tooltip')).textContent).toBe(
        'Sacrum Imperium — overlord: Reaume de France'
      )
    })

    it('takes the bubble away once the pointer leaves the dot', async () => {
      const { user } = mount()
      await user.hover(dotOfRow('Metz'))
      await screen.findByRole('tooltip')
      await user.unhover(dotOfRow('Metz'))
      await waitFor(() => {
        expect(screen.queryByRole('tooltip')).toBeNull()
      })
    })
  })

  // L3, L4: the dot's own cases — a holder off the map, without an id, a suzerain the registry lacks — are holderDot's.
})

describe('CitiesPanel — the filter (CARTO-360)', () => {
  describe('happy path', () => {
    it('lists only Paris for « par », and its box shows Paris alone', async () => {
      const { store, user } = mount()
      await user.type(filter(), 'par')
      expect(screen.getAllByRole('listitem').map((row) => row.textContent)).toEqual(['Paris'])
      await user.click(screen.getByRole('checkbox', { name: 'Show the city found' }))
      expect([...store.getState().shownCities]).toEqual(['paris'])
    })
  })

  describe('variants', () => {
    it('hides the cities found and leaves shown the cities the filter left out', async () => {
      const { store, user } = mount()
      store.getState().setCitiesShown(['paris', 'metz'], true)
      await user.type(filter(), 'par')
      await user.click(screen.getByRole('checkbox', { name: 'Show the city found' }))
      expect([...store.getState().shownCities]).toEqual(['metz'])
    })

    it('keeps the box for every city of 1100 when every city answers the filter', async () => {
      const { user } = mount([PARIS, { ...METZ, name: 'Pavie' }])
      await user.type(filter(), 'p')
      expect(screen.getAllByRole('listitem')).toHaveLength(2)
      expect(screen.getByRole('checkbox', { name: 'Show all the cities of 1100' })).toBeTruthy()
    })

    it('names the box for every city of 1100 again once ‹esc› clears the filter', async () => {
      const { user } = mount()
      await user.type(filter(), 'par{Escape}')
      expect(screen.getAllByRole('listitem')).toHaveLength(2)
      expect(screen.getByRole('checkbox', { name: 'Show all the cities of 1100' })).toBeTruthy()
    })

    it('counts the cities found when several answer', async () => {
      const { user } = mount([PARIS, METZ, { ...PARIS, id: 'pavia', name: 'Pavie' }])
      await user.type(filter(), 'pa')
      expect(screen.getByRole('checkbox', { name: 'Show the 2 cities found' })).toBeTruthy()
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

/** A city the sources give to a holder no polity of the map carries. */
const VENICE_HOLDER = { name: 'Repubblica di Venezia', wikidata: 'Q4948' }
const TREVISO: CityMark = {
  ...METZ,
  id: 'treviso',
  name: 'Treviso',
  lon: 12,
  holder: VENICE_HOLDER,
}

/**
 * Open the advanced filters by the funnel.
 * @param user - the user
 * @returns the dialogue
 */
async function openFilters(user: ReturnType<typeof userEvent.setup>): Promise<HTMLElement> {
  await user.click(screen.getByRole('button', { name: 'Advanced filters' }))
  return screen.getByRole('dialog', { name: 'Advanced filters' })
}

/**
 * The names of the cities in the panel's list, read from the page even while the dialogue makes it inert.
 * @returns their names
 */
function listedBehind(): (string | null)[] {
  return [...document.querySelectorAll('.city-list > li')].map((row) => row.textContent)
}

/** The names of the cities listed — in the panel's list, never the dialogue's boxes. */
function listed(): (string | null)[] {
  return within(screen.getByRole('list', { name: 'Cities' }))
    .getAllByRole('listitem')
    .map((row) => row.textContent)
}

const funnel = () => screen.getByRole('button', { name: /^Advanced filters/ })

/**
 * The countries' boxes of the dialogue — its two sections of holders, not « By verification » at its head (CARTO-369).
 * @param dialogue - the advanced filters
 * @returns the boxes
 */
function countryBoxes(dialogue: HTMLElement): HTMLElement[] {
  return within(dialogue)
    .getAllByRole('checkbox')
    .filter((box) => box.closest('section')?.getAttribute('aria-label') !== 'By verification')
}

// CARTO-370, the dev, 2026-11-06/07 (`s20`, « The advanced filters »): a funnel opens a dialogue; the polities of the
// map ticked keep the cities the sources give them; the holders not on the map and « No holder » too.
describe('CitiesPanel — the advanced filters (CARTO-370)', () => {
  describe('happy path', () => {
    it('keeps only Metz once the Empire is ticked, and counts it on the box heading the list', async () => {
      const { store, user } = mount([PARIS, METZ, TREVISO])
      const dialogue = await openFilters(user)
      await user.click(within(dialogue).getByRole('checkbox', { name: 'Sacrum Imperium (1)' }))
      expect([...store.getState().cityHolders]).toEqual(['wd:Q12548'])
      await user.click(within(dialogue).getByRole('button', { name: 'Close' }))
      expect(listed()).toEqual(['Metz'])
      expect(screen.getByRole('checkbox', { name: 'Show the city found' })).toBeTruthy()
    })
  })

  describe('variants', () => {
    // The map's polities as {Polities} lists them, the front first: the Empire is painted over France in the fixture.
    it('lists the map polities, then Venice as not on the map, then the cities with no holder', async () => {
      const { user } = mount([PARIS, METZ, TREVISO])
      const dialogue = await openFilters(user)
      const boxes = countryBoxes(dialogue).map(
        (box) => box.getAttribute('aria-label') ?? box.closest('label')?.textContent
      )
      expect(boxes).toEqual([
        'Sacrum Imperium (1)',
        'Reaume de France (0)',
        'Repubblica di Venezia (1)',
        'No holder (1)',
      ])
    })

    it('keeps the cities of either holder when two are ticked: Metz and Treviso', async () => {
      const { user } = mount([PARIS, METZ, TREVISO])
      const dialogue = await openFilters(user)
      await user.click(within(dialogue).getByRole('checkbox', { name: 'Sacrum Imperium (1)' }))
      await user.click(
        within(dialogue).getByRole('checkbox', { name: 'Repubblica di Venezia (1)' })
      )
      await user.click(within(dialogue).getByRole('button', { name: 'Close' }))
      expect(listed()).toEqual(['Metz', 'Treviso'])
    })

    it('applies a box at once, the dialogue still open: Metz alone behind it', async () => {
      const { user } = mount([PARIS, METZ, TREVISO])
      const dialogue = await openFilters(user)
      await user.click(within(dialogue).getByRole('checkbox', { name: 'Sacrum Imperium (1)' }))
      expect(listedBehind()).toEqual(['Metz'])
    })

    it('counts the cities found by the holders on the box heading the list: the 2 of the Empire', () => {
      const { store } = mount([PARIS, METZ, { ...METZ, id: 'trier', name: 'Trier' }])
      act(() => {
        store.getState().setCityHolderTicked('wd:Q12548', true)
      })
      expect(screen.getByRole('checkbox', { name: 'Show the 2 cities found' })).toBeTruthy()
    })

    it('marks the funnel active once a holder is ticked, at rest before', () => {
      const { store } = mount([PARIS, METZ])
      expect(funnel().getAttribute('data-active')).toBe('false')
      act(() => {
        store.getState().setCityHolderTicked('wd:Q12548', true)
      })
      expect(funnel().getAttribute('data-active')).toBe('true')
    })

    // ‹esc› closes the dialogue in the browser (`<dialog>`'s own cancel): jsdom's stand-in has none — walked in the app.

    it('keeps the holders ticked when the panel is mounted again, docked or floated', () => {
      const { store, remount } = mount([PARIS, METZ])
      act(() => {
        store.getState().setCityHolderTicked('wd:Q12548', true)
      })
      remount()
      expect(listed()).toEqual(['Metz'])
      expect(screen.getByRole('button', { name: 'Advanced filters: 1 filter ticked' })).toBeTruthy()
    })

    // The dev, 2026-11-07: « il nous faut le quick filter pour les listes longues ».
    it("narrows both sections by the dialogue's filter: « ven » leaves Venice alone", async () => {
      const { user } = mount([PARIS, METZ, TREVISO])
      const dialogue = await openFilters(user)
      await user.type(
        within(dialogue).getByRole('searchbox', { name: 'Filter the countries' }),
        'ven'
      )
      expect(countryBoxes(dialogue).map((box) => box.closest('label')?.textContent)).toEqual([
        'Repubblica di Venezia (1)',
      ])
      expect(within(dialogue).getByText('No country answers “ven”.')).toBeTruthy()
    })

    it("empties the dialogue's filter when it closes", async () => {
      const { user } = mount([PARIS, METZ, TREVISO])
      let dialogue = await openFilters(user)
      await user.type(
        within(dialogue).getByRole('searchbox', { name: 'Filter the countries' }),
        'ven'
      )
      await user.click(within(dialogue).getByRole('button', { name: 'Close' }))
      dialogue = await openFilters(user)
      expect(countryBoxes(dialogue)).toHaveLength(4)
    })

    it('keeps Paris alone by « No holder »', async () => {
      const { user } = mount([PARIS, METZ, TREVISO])
      const dialogue = await openFilters(user)
      await user.click(within(dialogue).getByRole('checkbox', { name: 'No holder (1)' }))
      await user.click(within(dialogue).getByRole('button', { name: 'Close' }))
      expect(listed()).toEqual(['Paris'])
    })

    it('applies the name filter with the holders: « tre » under the Empire and Venice keeps Treviso', async () => {
      const { store, user } = mount([PARIS, METZ, TREVISO])
      act(() => {
        store.getState().setCityHolderTicked('wd:Q12548', true)
        store.getState().setCityHolderTicked('wd:Q4948', true)
      })
      await user.type(filter(), 'tre')
      expect(listed()).toEqual(['Treviso'])
    })

    it('names the funnel with the count of holders ticked, and unticks them all', async () => {
      const { store, user } = mount([PARIS, METZ, TREVISO])
      act(() => {
        store.getState().setCityHolderTicked('wd:Q12548', true)
        store.getState().setCityHolderTicked('wd:Q4948', true)
      })
      expect(
        screen.getByRole('button', { name: 'Advanced filters: 2 filters ticked' }).textContent
      ).toBe('2')
      await user.click(screen.getByRole('button', { name: 'Advanced filters: 2 filters ticked' }))
      await user.click(screen.getByRole('button', { name: 'Untick all' }))
      expect(store.getState().cityHolders.size).toBe(0)
      expect(listed()).toEqual(['Paris', 'Metz', 'Treviso'])
    })
  })

  // L3–L4: N/A — nothing is refused, nothing is read.

  describe('edge cases', () => {
    it('greys a polity of the map with no Wikidata id: it cannot be ticked', async () => {
      const { store, user } = mount([PARIS, METZ])
      act(() => {
        const france = store.getState().document.polities.find(({ id }) => id !== 'hre')
        if (france === undefined) throw new Error('the fixture has France')
        france.wikidata = null
        store.getState().setCities([PARIS, METZ])
      })
      const dialogue = await openFilters(user)
      const box = within(dialogue).getByRole('checkbox', {
        name: 'Reaume de France — no Wikidata id',
      })
      expect(box.hasAttribute('disabled')).toBe(true)
    })

    it('says no city answers the filters when a holder ticked holds none, and nothing is typed', () => {
      const { store } = mount([PARIS, METZ])
      act(() => {
        store.getState().setCityHolderTicked('wd:Q70972', true)
      })
      expect(screen.getByText('No city answers the filters.')).toBeTruthy()
    })

    it('filters nothing by a holder ticked that no box of this map stands for', () => {
      const { store } = mount([PARIS, METZ])
      act(() => {
        store.getState().setCityHolderTicked('wd:Q4948', true)
      })
      expect(listed()).toEqual(['Paris', 'Metz'])
      expect(screen.getByRole('button', { name: 'Advanced filters' })).toBeTruthy()
    })
  })
})

/**
 * A city's row in the list.
 * @param name - the city's name
 * @returns its row
 */
function rowOf(name: string): HTMLElement {
  const row = screen.getByRole('button', { name }).closest('li')
  if (row === null) throw new Error(`no row for ${name}`)
  return row
}

// CARTO-384, the dev, 2026-11-07: a click on a city's point on the map chooses it in the list, which scrolls to it;
// a double-click, in the list or on the point, opens its information box in place of the detail under the list.
/** A city of the Empire by the sources that the map puts in France — 1° E is France's ground in the fixture. */
const WESTMETZ: CityMark = { ...METZ, id: 'westmetz', name: 'Westmetz', lon: 1 }

// CARTO-369, the dev, 2026-11-07 (`s20`, « By verification »): the states of a city, at the head of the dialogue.
describe('CitiesPanel — the advanced filters by state (CARTO-369)', () => {
  describe('happy path', () => {
    it('keeps only Westmetz once « Not at the right place » is ticked', async () => {
      const { store, user } = mount([PARIS, METZ, TREVISO, WESTMETZ])
      const dialogue = await openFilters(user)
      await user.click(
        within(dialogue).getByRole('checkbox', { name: 'Not at the right place (1)' })
      )
      expect([...store.getState().cityStates]).toEqual(['misplaced'])
      await user.click(within(dialogue).getByRole('button', { name: 'Close' }))
      expect(listed()).toEqual(['Westmetz'])
    })
  })

  describe('variants', () => {
    it('keeps the cities of either state ticked: Treviso not drawn, Westmetz misplaced', async () => {
      const { user } = mount([PARIS, METZ, TREVISO, WESTMETZ])
      const dialogue = await openFilters(user)
      await user.click(
        within(dialogue).getByRole('checkbox', { name: 'Not at the right place (1)' })
      )
      await user.click(
        within(dialogue).getByRole('checkbox', { name: 'Holder not on the map yet (1)' })
      )
      expect(listedBehind()).toEqual(['Treviso', 'Westmetz'])
    })

    it('applies a state and a holder together: the Empire at the right place keeps Metz alone', async () => {
      const { user } = mount([PARIS, METZ, TREVISO, WESTMETZ])
      const dialogue = await openFilters(user)
      await user.click(within(dialogue).getByRole('checkbox', { name: 'Sacrum Imperium (2)' }))
      await user.click(within(dialogue).getByRole('checkbox', { name: 'At the right place (1)' }))
      expect(listedBehind()).toEqual(['Metz'])
    })

    it('counts the states and the holders ticked together on the funnel', async () => {
      const { user } = mount([PARIS, METZ, TREVISO, WESTMETZ])
      const dialogue = await openFilters(user)
      await user.click(within(dialogue).getByRole('checkbox', { name: 'Sacrum Imperium (2)' }))
      await user.click(
        within(dialogue).getByRole('checkbox', { name: 'Not at the right place (1)' })
      )
      await user.click(within(dialogue).getByRole('button', { name: 'Close' }))
      expect(funnel().getAttribute('aria-label') ?? funnel().textContent).toContain(
        'Advanced filters: 2 filters ticked'
      )
    })

    it('unticks the states with the holders by « Untick all »', async () => {
      const { store, user } = mount([PARIS, METZ, TREVISO, WESTMETZ])
      const dialogue = await openFilters(user)
      await user.click(
        within(dialogue).getByRole('checkbox', { name: 'Not at the right place (1)' })
      )
      await user.click(within(dialogue).getByRole('button', { name: 'Untick all' }))
      expect(store.getState().cityStates.size).toBe(0)
      expect(listedBehind()).toEqual(['Paris', 'Metz', 'Treviso', 'Westmetz'])
    })
  })

  describe('edge cases', () => {
    it('offers a state no city is in, counted 0, so the section keeps its shape', async () => {
      const { user } = mount([PARIS, METZ, TREVISO, WESTMETZ])
      const dialogue = await openFilters(user)
      expect(
        within(dialogue).getByRole('checkbox', { name: 'Cannot be compared (0)' })
      ).toBeTruthy()
    })

    it('says no city answers when the state ticked holds none of the holder ticked', async () => {
      const { user } = mount([PARIS, METZ, TREVISO, WESTMETZ])
      const dialogue = await openFilters(user)
      await user.click(within(dialogue).getByRole('checkbox', { name: 'Sacrum Imperium (2)' }))
      await user.click(
        within(dialogue).getByRole('checkbox', { name: 'Holder not on the map yet (1)' })
      )
      await user.click(within(dialogue).getByRole('button', { name: 'Close' }))
      expect(screen.getByText('No city answers the filters.')).toBeTruthy()
    })
  })

  // L3, L4: N/A — ticking a box refuses nothing; the states come from the verdicts, tested in cityVerdict.
})

// CARTO-382, the dev, 2026-11-07 (`s20`, « The sort »): his icon opens the design system's Dropdown.
describe('CitiesPanel — the sort (CARTO-382)', () => {
  describe('happy path', () => {
    it('sorts the list by name once « By name » is chosen in the menu', async () => {
      const { store, user } = mount([PARIS, TREVISO, WESTMETZ, METZ])
      await user.click(screen.getByRole('button', { name: 'Sort the cities: The export’s order' }))
      await user.click(screen.getByRole('option', { name: 'By name' }))
      expect(store.getState().citySort).toBe('name')
      expect(listed()).toEqual(['Metz', 'Paris', 'Treviso', 'Westmetz'])
    })
  })

  describe('variants', () => {
    it('puts the map to correct first by verification: Westmetz misplaced, Treviso not drawn', () => {
      const { store } = mount([PARIS, METZ, TREVISO, WESTMETZ])
      act(() => {
        store.getState().setCitySort('verification')
      })
      expect(listed()).toEqual(['Westmetz', 'Treviso', 'Paris', 'Metz'])
    })

    it('sorts the cities found, under a filter', () => {
      const { store } = mount([PARIS, METZ, TREVISO, WESTMETZ])
      act(() => {
        store.getState().setCityHolderTicked('wd:Q12548', true)
        store.getState().setCitySort('name')
      })
      expect(listed()).toEqual(['Metz', 'Westmetz'])
    })
  })

  describe('edge cases', () => {
    it('names the order in use on its button, and marks it active out of the export’s order', () => {
      const { store } = mount([PARIS, METZ])
      act(() => {
        store.getState().setCitySort('holder')
      })
      const button = screen.getByRole('button', { name: 'Sort the cities: By holder' })
      expect(button.closest('.city-sort')?.getAttribute('data-active')).toBe('true')
    })
  })

  // L3, L4: N/A — choosing an order refuses nothing; an order read back that is none is keepCityFilters'.
})

describe('CitiesPanel — the city chosen and its box (CARTO-384)', () => {
  describe('happy path', () => {
    it('marks Metz and scrolls to its row when the map chooses it', () => {
      const { store } = mount()
      vi.mocked(showRow).mockClear()
      act(() => {
        store.getState().selectCity('metz')
      })
      expect(rowOf('Metz').getAttribute('data-selected')).toBe('true')
      expect(rowOf('Paris').getAttribute('data-selected')).toBe('false')
      expect(vi.mocked(showRow)).toHaveBeenCalledWith('city-row-metz')
    })

    it("opens Metz's box when the map opens it, Metz chosen in the list", () => {
      const { store } = mount()
      act(() => {
        store.getState().openCity('metz')
      })
      expect(screen.getByRole('dialog', { name: 'Metz' })).toBeDefined()
      expect(rowOf('Metz').getAttribute('data-selected')).toBe('true')
    })
  })

  describe('variants', () => {
    it('chooses Metz on a click on its name', async () => {
      const { store, user } = mount()
      await user.click(screen.getByRole('button', { name: 'Metz' }))
      expect(store.getState().selectedCity).toBe('metz')
    })

    it("opens Metz's box on a double-click on its name", async () => {
      const { store, user } = mount()
      await user.dblClick(screen.getByRole('button', { name: 'Metz' }))
      expect(store.getState().openedCity).toBe('metz')
      expect(screen.getByRole('dialog', { name: 'Metz' })).toBeDefined()
    })

    it('closes the box on « Close », Metz staying chosen, the hint still under the list', async () => {
      const { store, user } = mount()
      await user.dblClick(screen.getByRole('button', { name: 'Metz' }))
      await user.click(screen.getByRole('button', { name: 'Close' }))
      expect([store.getState().openedCity, store.getState().selectedCity]).toEqual([null, 'metz'])
      expect(screen.queryByRole('dialog')).toBeNull()
      expect(screen.getByText('Double-click a city to see who holds it.')).toBeDefined()
    })
  })

  // L3–L4: N/A — the panel reads the store and forwards.

  describe('edge cases', () => {
    it('opens no box for a city of another year chosen on the map', () => {
      const { store } = mount()
      act(() => {
        store.getState().openCity('later')
      })
      expect(screen.queryByRole('dialog')).toBeNull()
    })

    it('keeps Metz chosen and its box open when the panel is docked or floated', () => {
      const { store, remount } = mount()
      act(() => {
        store.getState().openCity('metz')
      })
      remount()
      expect(screen.getByRole('dialog', { name: 'Metz' })).toBeDefined()
      expect(rowOf('Metz').getAttribute('data-selected')).toBe('true')
    })
  })
})
