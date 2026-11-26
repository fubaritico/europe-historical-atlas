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

import type { CmsTerritoryPort, TerritoryAdded } from '../../../../persistence/cmsTerritory'
import type { WikidataFacts } from '../../../../wikidata/wikidataFacts'
import type { WikidataSource } from '../../../../wikidata/wikidataSource'
import type { CmsChannel } from '../../../utils/cmsChannel'
import type { YearPolity } from '@europe-historical-atlas/core/data/yearFormat'
import type { ReactNode } from 'react'

/** The County of Tripoli, as Wikidata gives it. */
const TRIPOLI: WikidataFacts = {
  id: 'Q272033',
  labels: { en: 'County of Tripoli', fr: 'comté de Tripoli' },
  inception: 1102,
  dissolved: 1289,
  belongsTo: [],
  imperialState: false,
  vassalState: false,
  predecessors: [],
  successors: [],
  wikipedia: { en: null, fr: null },
  notASubject: null,
}

/** Wikidata answering with Tripoli. */
const WIKIDATA: WikidataSource = {
  read: () => Promise.resolve({ found: new Map([[TRIPOLI.id, TRIPOLI]]), unknown: [] }),
}

/** Tripoli on the map, tied to Wikidata and to no territory of the CMS. */
const TRIPOLI_ON_MAP: YearPolity = {
  id: 'county-of-tripoli',
  name: 'County of Tripoli',
  rank: 'county',
  status: 'country',
  suzerain: null,
  existsFrom: null,
  existsTo: null,
  colour: null,
  wikidata: 'Q272033',
}

const STEP = { kind: 'create-polity', label: 'create polity' }

/**
 * The dialogue on Tripoli, on the author's machine, the CMS answering as asked.
 * @param answer - what the CMS answers, made at the click
 * @param polity - the polity edited
 * @returns the store, the user, the port, the session's spy and how to unmount the dialogue
 */
function openOffline(answer: () => Promise<TerritoryAdded>, polity: YearPolity = TRIPOLI_ON_MAP) {
  const store = createCartographerStore({
    edition: { document: openEmptyYear(1100), clone: cloneYearDocument },
    viewport: { viewport: UNFRAMED },
  })
  store.getState().createPolity(polity, STEP)
  const territories = { add: vi.fn<CmsTerritoryPort['add']>(answer) }
  const sessionLost = vi.fn()
  const channel: CmsChannel = {
    mode: 'offline',
    territories,
    pageOf: (id) => `http://localhost:3100/admin/collections/territories/${String(id)}`,
    sessionLost,
  }
  const { unmount } = renderInEnglish(
    <PolityDialog store={store} editing={polity} isOpen onClose={vi.fn()} wikidata={WIKIDATA} />,
    {
      wrapper: ({ children }: { children: ReactNode }) => (
        <CmsChannelContext value={channel}>{children}</CmsChannelContext>
      ),
    }
  )
  return { store, territories, sessionLost, unmount, user: userEvent.setup() }
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

// CARTO-498, the flow offline: « Ajouter au CMS » from the polity's form
describe('PolityDialog — « Ajouter au CMS »', () => {
  describe('happy path', () => {
    it('creates Tripoli in the CMS, ties the polity to it, and links to its page', async () => {
      const { store, territories, user } = openOffline(() =>
        Promise.resolve({ kind: 'linked', id: 512, created: true })
      )
      await user.click(await screen.findByRole('button', { name: 'Add to the CMS' }))
      expect(territories.add).toHaveBeenCalledWith({
        name: 'comté de Tripoli',
        nameEn: 'County of Tripoli',
        kind: 'county',
        wikidata: 'Q272033',
        existsFrom: 1102,
        existsTo: 1289,
      })
      expect(await screen.findByText(/^Created in the CMS, no\. 512\./)).toBeTruthy()
      const link = screen.getByRole('link', { name: 'Complete its record in the CMS' })
      expect(link.getAttribute('href')).toBe(
        'http://localhost:3100/admin/collections/territories/512'
      )
      await user.click(screen.getByRole('button', { name: 'OK' }))
      expect(store.getState().document.polities[0]?.territory).toBe(512)
    })
  })

  describe('variants', () => {
    it('says the CMS already had it, and ties the polity to that one', async () => {
      const { store, user } = openOffline(() =>
        Promise.resolve({ kind: 'linked', id: 42, created: false })
      )
      await user.click(await screen.findByRole('button', { name: 'Add to the CMS' }))
      expect(
        await screen.findByText('The CMS already had it: tied to territory no. 42.')
      ).toBeTruthy()
      await user.click(screen.getByRole('button', { name: 'OK' }))
      expect(store.getState().document.polities[0]?.territory).toBe(42)
    })

    it('offers the page, not the button, to a polity already tied', () => {
      openOffline(() => Promise.resolve({ kind: 'offline' }), { ...TRIPOLI_ON_MAP, territory: 42 })
      expect(screen.getByRole('link', { name: 'Complete its record in the CMS' })).toBeTruthy()
      expect(screen.queryByRole('button', { name: 'Add to the CMS' })).toBeNull()
    })
  })

  describe('managed errors', () => {
    it('asks to start the CMS when it does not answer, and writes nothing', async () => {
      const { store, user } = openOffline(() => Promise.resolve({ kind: 'offline' }))
      await user.click(await screen.findByRole('button', { name: 'Add to the CMS' }))
      expect((await screen.findByRole('alert')).textContent).toBe(
        'The CMS does not answer: start it, then try again. Nothing was written.'
      )
      await user.click(screen.getByRole('button', { name: 'OK' }))
      expect(store.getState().document.polities[0]?.territory).toBeUndefined()
    })

    it('asks to sign in again when the session expired, opens its dialogue, and writes nothing', async () => {
      const { store, sessionLost, user } = openOffline(() => Promise.resolve({ kind: 'signedOut' }))
      await user.click(await screen.findByRole('button', { name: 'Add to the CMS' }))
      expect((await screen.findByRole('alert')).textContent).toBe(
        'Your CMS session has expired: sign in again, then try again. Nothing was written.'
      )
      expect(sessionLost).toHaveBeenCalledTimes(1)
      await user.click(screen.getByRole('button', { name: 'OK' }))
      expect(store.getState().document.polities[0]?.territory).toBeUndefined()
    })

    it('says no other outcome as a lost session', async () => {
      const { sessionLost, user } = openOffline(() => Promise.resolve({ kind: 'offline' }))
      await user.click(await screen.findByRole('button', { name: 'Add to the CMS' }))
      await screen.findByRole('alert')
      expect(sessionLost).not.toHaveBeenCalled()
    })

    it('hands back the CMS refusal in its words', async () => {
      const { user } = openOffline(() => Promise.resolve({ kind: 'refused', reason: 'Nom requis' }))
      await user.click(await screen.findByRole('button', { name: 'Add to the CMS' }))
      expect((await screen.findByRole('alert')).textContent).toBe(
        'The CMS refused: Nom requis. Nothing was written.'
      )
    })
  })

  describe('unmanaged errors', () => {
    it('says a dev server gone as a refusal, and logs it', async () => {
      const { user } = openOffline(() => Promise.reject(new TypeError('Failed to fetch')))
      await user.click(await screen.findByRole('button', { name: 'Add to the CMS' }))
      expect((await screen.findByRole('alert')).textContent).toContain('Failed to fetch')
      expect(console.error).toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    it('offers no button online', async () => {
      const store = createCartographerStore({
        edition: { document: openEmptyYear(1100), clone: cloneYearDocument },
        viewport: { viewport: UNFRAMED },
      })
      store.getState().createPolity(TRIPOLI_ON_MAP, STEP)
      renderInEnglish(
        <PolityDialog
          store={store}
          editing={TRIPOLI_ON_MAP}
          isOpen
          onClose={vi.fn()}
          wikidata={WIKIDATA}
        />
      )
      expect((await screen.findAllByText(/County of Tripoli/)).length).toBeGreaterThan(0)
      expect(screen.queryByRole('button', { name: 'Add to the CMS' })).toBeNull()
    })

    it('tells the session it was refused even when the dialogue closed before the answer', async () => {
      let answer: (outcome: TerritoryAdded) => void = () => undefined
      const { sessionLost, unmount, user } = openOffline(
        () => new Promise<TerritoryAdded>((resolve) => (answer = resolve))
      )
      await user.click(await screen.findByRole('button', { name: 'Add to the CMS' }))
      unmount()

      answer({ kind: 'signedOut' })
      await Promise.resolve()

      expect(sessionLost).toHaveBeenCalledTimes(1)
    })

    it('does not tie the polity when its Wikidata item changed while the CMS answered', async () => {
      let answer: (outcome: TerritoryAdded) => void = () => undefined
      const { store, user } = openOffline(
        () => new Promise<TerritoryAdded>((resolve) => (answer = resolve))
      )
      await user.click(await screen.findByRole('button', { name: 'Add to the CMS' }))
      const wikidata = screen.getByLabelText('Wikidata id')
      await user.clear(wikidata)
      await user.type(wikidata, 'Q1')

      answer({ kind: 'linked', id: 512, created: true })
      await screen.findByText(/^Created in the CMS, no\. 512\./)
      await user.click(screen.getByRole('button', { name: 'OK' }))

      expect(store.getState().document.polities[0]?.territory).toBeUndefined()
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('not tied'))
    })

    it('waits while the CMS answers: the button cannot be clicked twice', async () => {
      const { territories, user } = openOffline(() => new Promise<TerritoryAdded>(() => undefined))
      await user.click(await screen.findByRole('button', { name: 'Add to the CMS' }))
      const waiting = screen.getByRole('button', { name: 'Adding to the CMS…' })
      expect(waiting.hasAttribute('disabled')).toBe(true)
      expect(territories.add).toHaveBeenCalledTimes(1)
    })
  })
})
