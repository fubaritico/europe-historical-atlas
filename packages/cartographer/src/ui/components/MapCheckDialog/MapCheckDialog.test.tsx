import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { cloneYearDocument } from '@europe-historical-atlas/core/data/yearDocument'

import { openEmptyYear } from '../../../state/openEmptyYear'
import { createCartographerStore } from '../../../state/store'
import { UNFRAMED } from '../../../viewport/viewport'
import { renderInEnglish } from '../../testing/renderInEnglish'

import { useMapCheck } from './hooks/useMapCheck'
import { MapCheckDialog } from './MapCheckDialog'

import type { CmsTerritoryPort, TerritoriesRead } from '../../../persistence/cmsTerritory'
import type { Report } from '../../../persistence/notice'
import type { CartographerStoreHook } from '../../../state/store'
import type { CmsChannel } from '../../utils/cmsChannel'
import type { ContentTerritory } from '@europe-historical-atlas/core/data/contentFormat'
import type { YearPolity } from '@europe-historical-atlas/core/data/yearFormat'

const LEON: ContentTerritory = {
  id: 15,
  name: 'royaume de León',
  wikidata: 'Q199442',
  existsFrom: 910,
  existsTo: 1230,
}
const CASTILE: ContentTerritory = {
  id: 16,
  name: 'royaume de Castille',
  wikidata: 'Q217196',
  existsFrom: null,
  existsTo: null,
}
const ABBASIDS: ContentTerritory = {
  id: 40,
  name: 'califat abbasside',
  wikidata: 'Q12536',
  existsFrom: 750,
  existsTo: 1258,
}

const polity = (fields: Partial<YearPolity> & Pick<YearPolity, 'id' | 'name'>): YearPolity => ({
  rank: 'kingdom',
  status: 'country',
  suzerain: null,
  existsFrom: null,
  existsTo: null,
  colour: null,
  wikidata: null,
  ...fields,
})

/** León tied by number, its English name the map's. */
const LEON_ON_MAP = polity({
  id: 'leon',
  name: 'Kingdom of León',
  territory: 15,
  existsFrom: 910,
  existsTo: 1230,
})
/** Castile tied by number, its beginning the map's alone. */
const CASTILE_ON_MAP = polity({
  id: 'castile',
  name: 'royaume de Castille',
  territory: 16,
  existsFrom: 1065,
})
/** The Buyids, carrying the Abbasids' item, as Cliopatria wrote it. */
const BUYIDS = polity({ id: 'buyids', name: 'Buyid Dynasty', wikidata: 'Q12536' })
/** Friesland, tied to nothing. */
const FRIESLAND = polity({ id: 'friesland', name: 'Friesland' })

/**
 * The check and its dialogue, as the document bar mounts them.
 * @param props - the store and the channel
 * @param props.store - the store
 * @param props.channel - the channel
 * @returns the button and the dialogue
 */
function Harness({ store, channel }: { store: CartographerStoreHook; channel: CmsChannel }) {
  // State
  const check = useMapCheck(store, channel)

  // Render
  return (
    <>
      <button type="button" onClick={check.start}>
        press
      </button>
      <MapCheckDialog check={check} pageOf={(id) => `http://cms/territories/${String(id)}`} />
    </>
  )
}

/**
 * A map of four polities and a CMS answering as asked.
 * @param read - what the CMS answers
 * @param polities - the map's polities
 * @returns the store, the spies and the user
 */
function open(
  read: () => Promise<TerritoriesRead> = () =>
    Promise.resolve({ kind: 'read', territories: [LEON, CASTILE, ABBASIDS] }),
  polities: readonly YearPolity[] = [LEON_ON_MAP, CASTILE_ON_MAP, BUYIDS, FRIESLAND]
) {
  const store = createCartographerStore({
    edition: { document: openEmptyYear(1100), clone: cloneYearDocument },
    viewport: { viewport: UNFRAMED },
  })
  for (const each of polities) store.getState().createPolity(each, { kind: 'create', label: 'c' })
  const territories = { add: vi.fn<CmsTerritoryPort['add']>(), list: vi.fn(read) }
  const report = vi.fn<Report>()
  const sessionLost = vi.fn()
  const channel: CmsChannel = {
    mode: 'offline',
    territories,
    pageOf: (id) => `http://cms/territories/${String(id)}`,
    sessionLost,
    report,
  }
  renderInEnglish(<Harness store={store} channel={channel} />)
  return { store, territories, report, sessionLost, user: userEvent.setup() }
}

/**
 * A group of the dialogue, its tab chosen, by the start of its tab's label.
 * @param user - the user who chooses the tab
 * @param heading - the label's first words
 * @returns the group's panel
 */
async function group(user: ReturnType<typeof userEvent.setup>, heading: string) {
  const name = new RegExp(`^${heading}`)
  await user.click(await screen.findByRole('tab', { name }))
  return screen.getByRole('tabpanel', { name })
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('MapCheckDialog', () => {
  describe('happy path', () => {
    it('reads the CMS at the press and lists the four groups, one tab each, the first open', async () => {
      const { store, territories, user } = open()

      await user.click(screen.getByRole('button', { name: 'press' }))

      const tabs = await screen.findAllByRole('tab')
      expect(tabs.map((tab) => tab.firstChild?.textContent)).toEqual([
        'Different from the CMS',
        'To confirm',
        'To enter in the CMS',
        'Tied to nothing',
      ])
      expect(tabs.map((tab) => tab.querySelector('.map-check__count')?.textContent)).toEqual([
        '1',
        '1',
        '1',
        '1',
      ])
      expect(screen.getByRole('tabpanel').getAttribute('aria-labelledby')).toBe(tabs[0]?.id)
      expect(
        within(await group(user, 'Different')).getByText('→ royaume de León · 910 – 1230')
      ).toBeTruthy()
      expect(
        within(await group(user, 'To confirm')).getByText('→ califat abbasside · 750 – 1258')
      ).toBeTruthy()
      expect(within(await group(user, 'To enter')).getByText('beginning')).toBeTruthy()
      expect(within(await group(user, 'Tied to nothing')).getByText('Friesland')).toBeTruthy()
      expect(territories.list).toHaveBeenCalledOnce()
      expect(store.getState().territories).toEqual([LEON, CASTILE, ABBASIDS])
    })

    it('aligns every polity tied by number as one step, the Buyids left to confirm, their tab open', async () => {
      const { store, user } = open()
      await user.click(screen.getByRole('button', { name: 'press' }))

      await user.click(await screen.findByRole('button', { name: 'Align all' }))

      const leon = store.getState().document.polities.find(({ id }) => id === 'leon')
      expect(leon?.name).toBe('royaume de León')
      expect(store.getState().document.polities.find(({ id }) => id === 'buyids')?.name).toBe(
        'Buyid Dynasty'
      )
      expect(store.getState().undoLabel).toBe('align royaume de León on the CMS')
      expect(screen.queryByRole('tab', { name: /^Different/ })).toBeNull()
      expect(screen.getByRole('tabpanel', { name: /^To confirm/ })).toBeTruthy()
    })

    it('aligns one polity to confirm on its click, writing its number', async () => {
      const { store, user } = open()
      await user.click(screen.getByRole('button', { name: 'press' }))

      await user.click(
        await within(await group(user, 'To confirm')).findByRole('button', {
          name: 'Align Buyid Dynasty on the CMS',
        })
      )

      const buyids = store.getState().document.polities.find(({ id }) => id === 'buyids')
      expect(buyids).toMatchObject({ name: 'califat abbasside', territory: 40, existsFrom: 750 })
    })
  })

  describe('variants', () => {
    it('links a date to enter to its territory in the CMS', async () => {
      const { user } = open()
      await user.click(screen.getByRole('button', { name: 'press' }))

      const link = await within(await group(user, 'To enter')).findByRole('link', {
        name: 'Edit in the CMS',
      })

      expect(link.getAttribute('href')).toBe('http://cms/territories/16')
    })

    it('opens a polity’s form from its row, the dialogue closed', async () => {
      const { store, user } = open()
      await user.click(screen.getByRole('button', { name: 'press' }))

      await user.click(
        await within(await group(user, 'Tied to nothing')).findByRole('button', {
          name: 'Open the sheet of Friesland',
        })
      )

      expect(store.getState().polityForm).toBe('friesland')
      expect(screen.queryByRole('tab')).toBeNull()
    })

    it('says a map aligned on the CMS has nothing to report', async () => {
      const aligned = { ...LEON_ON_MAP, name: 'royaume de León' }
      const { user } = open(undefined, [aligned])

      await user.click(screen.getByRole('button', { name: 'press' }))

      expect(
        await screen.findByText('The map is aligned on the CMS: nothing to report.')
      ).toBeTruthy()
      expect(screen.queryByRole('tablist')).toBeNull()
    })

    it('makes no tab for an empty group, the first group with a polity open', async () => {
      const { user } = open(undefined, [BUYIDS, FRIESLAND])

      await user.click(screen.getByRole('button', { name: 'press' }))

      const tabs = await screen.findAllByRole('tab')
      expect(tabs.map((tab) => tab.firstChild?.textContent)).toEqual([
        'To confirm',
        'Tied to nothing',
      ])
      expect(screen.getByRole('tabpanel', { name: /^To confirm/ })).toBeTruthy()
    })
  })

  describe('managed errors', () => {
    it('opens the alarm when the CMS does not answer, nothing changed', async () => {
      const { store, report, user } = open(() => Promise.resolve({ kind: 'offline' }))

      await user.click(screen.getByRole('button', { name: 'press' }))

      await vi.waitFor(() => {
        expect(report).toHaveBeenCalledWith({
          tone: 'alarm',
          topic: 'cms',
          text: 'The CMS does not answer: start it, then try again. Nothing changed on the map.',
        })
      })
      expect(screen.queryByRole('dialog')).toBeNull()
      expect(store.getState().territories).toEqual([])
    })

    it('opens the session’s dialogue when the CMS refuses the session', async () => {
      const { sessionLost, report, user } = open(() => Promise.resolve({ kind: 'signedOut' }))

      await user.click(screen.getByRole('button', { name: 'press' }))

      await vi.waitFor(() => {
        expect(sessionLost).toHaveBeenCalledOnce()
      })
      expect(report).not.toHaveBeenCalled()
    })

    it('says a refusal in the CMS’s words', async () => {
      const { report, user } = open(() =>
        Promise.resolve({ kind: 'refused', reason: 'territory 4: no French name' })
      )

      await user.click(screen.getByRole('button', { name: 'press' }))

      await vi.waitFor(() => {
        expect(report.mock.calls[0]?.[0].text).toBe(
          'The CMS refused: territory 4: no French name. Nothing changed on the map.'
        )
      })
    })
  })

  describe('unmanaged errors', () => {
    it('says a dev server gone, as an error and on screen', async () => {
      const { report, user } = open(() => Promise.reject(new TypeError('Failed to fetch')))

      await user.click(screen.getByRole('button', { name: 'press' }))

      await vi.waitFor(() => {
        expect(report.mock.calls[0]?.[0].text).toBe(
          'The CMS refused: Failed to fetch. Nothing changed on the map.'
        )
      })
      expect(console.error).toHaveBeenCalled()
    })

    it('says an alignment the document refuses, as an error and on screen, nothing changed (review QUAL-001)', async () => {
      const { store, report, user } = open()
      await user.click(screen.getByRole('button', { name: 'press' }))
      await screen.findByRole('tabpanel', { name: /^Different/ })
      vi.spyOn(store.getState(), 'editPolities').mockReturnValue(false)

      await user.click(screen.getByRole('button', { name: 'Align all' }))

      expect(report).toHaveBeenCalledWith({
        tone: 'alarm',
        topic: 'cms',
        text: 'The map refused the alignment: nothing changed.',
      })
      expect(console.error).toHaveBeenCalled()
      expect(store.getState().document.polities.find(({ id }) => id === 'leon')?.name).toBe(
        'Kingdom of León'
      )
    })
  })

  describe('edge cases', () => {
    it('words every row: an end or both dates to enter, a number gone, a date the CMS lacks (review QUAL-003)', async () => {
      const both = polity({
        id: 'both',
        name: 'royaume de Castille',
        territory: 16,
        existsFrom: 1065,
        existsTo: 1230,
      })
      const gone = polity({ id: 'gone', name: 'Gone', territory: 99 })
      const castileByItem = polity({ id: 'castile', name: 'Castile', wikidata: 'Q217196' })
      const { user } = open(undefined, [both, gone, castileByItem])

      await user.click(screen.getByRole('button', { name: 'press' }))

      expect(within(await group(user, 'To enter')).getByText('beginning and end')).toBeTruthy()
      expect(
        within(await group(user, 'Tied to nothing')).getByText(
          'territory no. 99 is no longer in the CMS'
        )
      ).toBeTruthy()
      expect(
        within(await group(user, 'To confirm')).getByText('→ royaume de Castille · ? – ?')
      ).toBeTruthy()
    })

    it('names the CMS’s Wikidata item of a polity tied by number to another', async () => {
      const leon = { ...LEON_ON_MAP, name: 'royaume de León', wikidata: 'Q12536' }
      const { user } = open(undefined, [leon])

      await user.click(screen.getByRole('button', { name: 'press' }))

      expect(
        within(await group(user, 'Different')).getByText(
          "→ royaume de León · 910 – 1230 · the CMS's Wikidata: Q199442"
        )
      ).toBeTruthy()
    })

    it('drops a reading answered after the dialogue was closed', async () => {
      let answer: (read: TerritoriesRead) => void = () => undefined
      const { store, user } = open(
        () =>
          new Promise((resolve) => {
            answer = resolve
          })
      )
      await user.click(screen.getByRole('button', { name: 'press' }))
      expect(screen.getByText('Reading the CMS…')).toBeTruthy()

      await user.click(screen.getByRole('button', { name: 'Close' }))
      answer({ kind: 'read', territories: [LEON] })

      await vi.waitFor(() => {
        expect(console.warn).toHaveBeenCalled()
      })
      expect(store.getState().territories).toEqual([])
      expect(screen.queryByRole('dialog')).toBeNull()
    })

    it('declines a press online, the CMS not asked', async () => {
      const store = createCartographerStore({
        edition: { document: openEmptyYear(1100), clone: cloneYearDocument },
        viewport: { viewport: UNFRAMED },
      })
      renderInEnglish(<Harness store={store} channel={{ mode: 'online' }} />)

      await userEvent.click(screen.getByRole('button', { name: 'press' }))

      expect(screen.queryByRole('dialog')).toBeNull()
      expect(console.warn).toHaveBeenCalled()
    })
  })
})
