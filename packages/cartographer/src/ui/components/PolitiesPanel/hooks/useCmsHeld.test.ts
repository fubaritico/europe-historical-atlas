import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useCmsHeld } from './useCmsHeld'

import type { CmsChannel } from '../../../utils/cmsChannel'
import type { WikidataView } from '../../../utils/wikidataView'
import type { ContentTerritory } from '@europe-historical-atlas/core/data/contentFormat'
import type { YearPolity } from '@europe-historical-atlas/core/data/yearFormat'

/** León in the CMS: its name and both dates. */
const LEON: ContentTerritory = {
  id: 15,
  name: 'royaume de León',
  wikidata: 'Q199442',
  existsFrom: 910,
  existsTo: 1230,
}

/** León on the map, aligned on the CMS: all three fields held. */
const ALIGNED: YearPolity = {
  id: 'leon',
  name: 'royaume de León',
  rank: 'kingdom',
  status: 'country',
  suzerain: null,
  existsFrom: 910,
  existsTo: 1230,
  colour: null,
  wikidata: 'Q199442',
  territory: 15,
}

const OFFLINE: CmsChannel = {
  mode: 'offline',
  territories: { add: vi.fn(), list: vi.fn() },
  pageOf: (id) => `http://cms/territories/${String(id)}`,
  sessionLost: vi.fn(),
  report: vi.fn(),
}

/**
 * The hook on a polity, with a spy for the draft's writer.
 * @param editing - the polity edited
 * @param channel - the channel
 * @returns the hook's result and the spy
 */
function hold(editing: YearPolity | null, channel: CmsChannel = OFFLINE) {
  const write = vi.fn()
  const { result } = renderHook(() => useCmsHeld(editing, [LEON], channel, write))
  return { held: result.current, write }
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useCmsHeld', () => {
  describe('happy path', () => {
    it('declines every field the CMS holds, the name and both dates, said in the console', () => {
      const { held, write } = hold(ALIGNED)

      held.onField('name', 'Crown of León')
      held.onField('existsFrom', '914')
      held.onField('existsTo', '1200')

      expect(write).not.toHaveBeenCalled()
      expect(console.warn).toHaveBeenCalledTimes(3)
    })

    it('writes a field the CMS does not hold', () => {
      const { held, write } = hold(ALIGNED)

      held.onField('rank', 'empire')

      expect(write).toHaveBeenCalledWith('rank', 'empire')
    })

    it('links to the territory’s page', () => {
      expect(hold(ALIGNED).held.cmsHeld.page).toBe('http://cms/territories/15')
    })
  })

  describe('variants', () => {
    it('writes a date the CMS lacks', () => {
      const { held, write } = hold({ ...ALIGNED, existsTo: 1217 })

      held.onField('existsTo', '1215')

      expect(write).toHaveBeenCalledWith('existsTo', '1215')
    })

    it('holds nothing for a new polity', () => {
      const { held, write } = hold(null)

      held.onField('name', 'X')

      expect(write).toHaveBeenCalledWith('name', 'X')
      expect(held.cmsHeld.page).toBeNull()
    })

    it('gives no page online', () => {
      expect(hold(ALIGNED, { mode: 'online' }).held.cmsHeld.page).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('leaves out the proposals for a field it holds, an agreeing one kept', () => {
      const { held } = hold(ALIGNED)

      expect(
        held.proposals([
          { field: 'name', value: 'X', state: 'differs' },
          { field: 'existsFrom', value: '910', state: 'same' },
          { field: 'rank', value: 'kingdom', state: 'same' },
        ])
      ).toEqual([
        { field: 'existsFrom', value: '910', state: 'same' },
        { field: 'rank', value: 'kingdom', state: 'same' },
      ])
    })

    it('leaves out Wikidata’s proposals for a field it holds, a view not found untouched', () => {
      const { held } = hold(ALIGNED)
      const reading: WikidataView = { kind: 'reading', id: 'Q199442' }

      expect(held.view(reading)).toBe(reading)
    })
  })

  // L3, L4: N/A — no reading nor writing here but the injected writer.
})
