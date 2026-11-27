import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { cloneYearDocument } from '@europe-historical-atlas/core/data/yearDocument'

import { openEmptyYear } from '../../../../state/openEmptyYear'
import { createCartographerStore } from '../../../../state/store'
import { UNFRAMED } from '../../../../viewport/viewport'
import { renderInEnglish } from '../../../testing/renderInEnglish'
import { CmsChannelContext } from '../../../utils/cmsChannel'

import { PolityDialog } from './PolityDialog'

import type { WikidataSource } from '../../../../wikidata/wikidataSource'
import type { CmsChannel } from '../../../utils/cmsChannel'
import type { ContentTerritory } from '@europe-historical-atlas/core/data/contentFormat'
import type { YearPolity } from '@europe-historical-atlas/core/data/yearFormat'
import type { ReactNode } from 'react'

/** Wikidata knowing nothing. */
const WIKIDATA: WikidataSource = {
  read: () => Promise.resolve({ found: new Map(), unknown: [] }),
}

/** The Kingdom of Castile in the CMS: its name, its beginning, no end. */
const CASTILE: ContentTerritory = {
  id: 16,
  name: 'royaume de Castille',
  wikidata: 'Q217196',
  existsFrom: 1065,
  existsTo: null,
}

/** Castile on the map, aligned on the CMS: its number, its name and its beginning the CMS's, an end of its own. */
const ALIGNED: YearPolity = {
  id: 'castile',
  name: 'royaume de Castille',
  rank: 'kingdom',
  status: 'country',
  suzerain: null,
  existsFrom: 1065,
  existsTo: 1230,
  colour: null,
  wikidata: 'Q217196',
  territory: 16,
}

/**
 * The dialogue on a polity, on the author's machine or online.
 * @param polity - the polity edited
 * @param mode - where the page is served
 * @returns the store and the user
 */
function open(polity: YearPolity, mode: CmsChannel['mode'] = 'offline') {
  const store = createCartographerStore({
    edition: { document: openEmptyYear(1100), clone: cloneYearDocument },
    viewport: { viewport: UNFRAMED },
  })
  store.getState().createPolity(polity, { kind: 'create-polity', label: 'create polity' })
  store.getState().setTerritories([CASTILE])
  const channel: CmsChannel =
    mode === 'online'
      ? { mode: 'online' }
      : {
          mode: 'offline',
          territories: { add: vi.fn(), list: vi.fn() },
          pageOf: (id) => `http://localhost:3100/admin/collections/territories/${String(id)}`,
          sessionLost: vi.fn(),
          report: vi.fn(),
        }
  renderInEnglish(
    <PolityDialog store={store} editing={polity} isOpen onClose={vi.fn()} wikidata={WIKIDATA} />,
    {
      wrapper: ({ children }: { children: ReactNode }) => (
        <CmsChannelContext value={channel}>{children}</CmsChannelContext>
      ),
    }
  )
  return { store, user: userEvent.setup() }
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

// CARTO-568, `s10`: « an aligned polity is locked »
describe('PolityDialog — what the CMS holds', () => {
  describe('happy path', () => {
    it('shows the name and the dates the CMS gives read-only, and links to its page', () => {
      open(ALIGNED)

      expect(screen.getByLabelText('Name').hasAttribute('readonly')).toBe(true)
      expect(screen.getByLabelText('Exists from').hasAttribute('readonly')).toBe(true)
      const link = screen.getByRole('link', { name: 'Edit in the CMS' })
      expect(link.getAttribute('href')).toBe(
        'http://localhost:3100/admin/collections/territories/16'
      )
      expect(screen.getAllByText('Held by the CMS: it is changed in the CMS.')).toHaveLength(2)
    })

    it('saves the polity as it was, a key typed in a locked field writing nothing', async () => {
      const { store, user } = open(ALIGNED)

      await user.type(screen.getByLabelText('Name'), 'X')
      await user.click(screen.getByRole('button', { name: 'OK' }))

      expect(store.getState().document.polities[0]?.name).toBe('royaume de Castille')
    })
  })

  describe('variants', () => {
    it('leaves a date the CMS lacks editable', async () => {
      const { store, user } = open(ALIGNED)
      const end = screen.getByLabelText('Exists to')

      expect(end.hasAttribute('readonly')).toBe(false)
      await user.clear(end)
      await user.type(end, '1217')
      await user.click(screen.getByRole('button', { name: 'OK' }))

      expect(store.getState().document.polities[0]?.existsTo).toBe(1217)
    })

    it('leaves a name not yet aligned editable', () => {
      open({ ...ALIGNED, name: 'Kingdom of Castile' })

      expect(screen.getByLabelText('Name').hasAttribute('readonly')).toBe(false)
      expect(screen.getByLabelText('Exists from').hasAttribute('readonly')).toBe(true)
    })

    it('locks nothing on a polity tied by its Wikidata item only', () => {
      const { territory: _dropped, ...byWikidata } = ALIGNED
      open(byWikidata)

      expect(screen.getByLabelText('Name').hasAttribute('readonly')).toBe(false)
      expect(screen.queryByRole('link', { name: 'Edit in the CMS' })).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('offers no proposal of Wikidata for a field the CMS holds (review ARCH-001)', async () => {
      // The trap: the field is read-only to the keyboard, but Wikidata's « Replace » writes through `onField`, whose
      // guard (`useCmsHeld.test.ts`) would decline it with nothing on screen
      const wikidata: WikidataSource = {
        read: () =>
          Promise.resolve({
            found: new Map([
              [
                'Q217196',
                {
                  id: 'Q217196',
                  labels: { en: 'Crown of Castile', fr: 'couronne de Castille' },
                  inception: 1065,
                  dissolved: 1230,
                  belongsTo: [],
                  imperialState: false,
                  vassalState: false,
                  predecessors: [],
                  successors: [],
                  wikipedia: { en: null, fr: null },
                  notASubject: null,
                },
              ],
            ]),
            unknown: [],
          }),
      }
      const store = createCartographerStore({
        edition: { document: openEmptyYear(1100), clone: cloneYearDocument },
        viewport: { viewport: UNFRAMED },
      })
      store.getState().createPolity(ALIGNED, { kind: 'create-polity', label: 'create polity' })
      store.getState().setTerritories([CASTILE])
      renderInEnglish(
        <PolityDialog
          store={store}
          editing={ALIGNED}
          isOpen
          onClose={vi.fn()}
          wikidata={wikidata}
        />,
        {
          wrapper: ({ children }: { children: ReactNode }) => (
            <CmsChannelContext value={{ mode: 'online' }}>{children}</CmsChannelContext>
          ),
        }
      )

      // The panel is read once its agreeing line is there — an agreement says something true, and stays
      expect(await screen.findByRole('button', { name: /1230 for Exists to/ })).toBeTruthy()
      expect(screen.queryByRole('button', { name: /Crown of Castile for Name/ })).toBeNull()
    })

    it('keeps the lock online, without the link', () => {
      open(ALIGNED, 'online')

      expect(screen.getByLabelText('Name').hasAttribute('readonly')).toBe(true)
      expect(screen.queryByRole('link', { name: 'Edit in the CMS' })).toBeNull()
    })
  })

  // L3, L4: N/A — nothing is read nor written here but the store; the CMS is read by [Check this year].
})
