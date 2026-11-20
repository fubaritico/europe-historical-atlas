// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { createTranslator } from '@europe-historical-atlas/core/i18n/catalogue'

import { CITY_SHEET_MESSAGES } from '../i18n'

import { ChainReadingLine } from './ChainReadingLine'

import type { ChainReading } from '../utils/readVassalChain'

const say = createTranslator(CITY_SHEET_MESSAGES, 'fr')

const COUNT = { id: 10, name: 'Mathias II — comté de Nantes', kind: 'county' }
const DUKE = { id: 20, name: 'Alain IV — duché de Bretagne', kind: 'duchy' }
const KING = { id: 30, name: 'Philippe Ier — royaume de France', kind: 'kingdom' }

/**
 * The warnings a reading shows under its line.
 * @param reading - the reading
 * @returns each warning's text
 */
function warningsOf(reading: ChainReading): (string | null)[] {
  const { container } = render(
    <ul>
      <ChainReadingLine reading={reading} say={say} />
    </ul>
  )
  return [...container.querySelectorAll('.city-sheet__chain-rank')].map(
    (warning) => warning.textContent
  )
}

afterEach(cleanup)

// CORE-489, the dev, 2026-11-20: a vassal never outranks its suzerain — said on the sheet, never refused.
describe('ChainReadingLine', () => {
  describe('happy path', () => {
    it('says nothing of a chain that climbs: a county, a duchy, a kingdom', () => {
      expect(warningsOf({ titles: [COUNT, DUKE, KING], steps: [], end: 'sovereign' })).toEqual([])
    })

    it('says a king put under a count, with the two titles', () => {
      expect(warningsOf({ titles: [KING, COUNT], steps: [], end: 'unknown' })).toEqual([
        `À vérifier : « ${KING.name} » a un rang plus élevé que son suzerain, « ${COUNT.name} ».`,
      ])
    })
  })

  describe('variants', () => {
    it('says every step at fault of one reading', () => {
      expect(warningsOf({ titles: [KING, DUKE, COUNT], steps: [], end: 'unknown' })).toHaveLength(2)
    })

    it('says nothing of two equal ranks: a principality under a county', () => {
      const prince = { id: 50, name: 'Orange', kind: 'principality' }
      expect(warningsOf({ titles: [prince, COUNT], steps: [], end: 'unknown' })).toEqual([])
    })
  })

  describe('managed errors', () => {
    it('says nothing of a title whose territory’s kind was not read', () => {
      const unread = { id: 30, name: KING.name }
      expect(warningsOf({ titles: [unread, COUNT], steps: [], end: 'unknown' })).toEqual([])
    })

    it('says nothing of a kind that is no rank: a king under a city, an abbey, an office', () => {
      for (const kind of ['city', 'abbey', 'office']) {
        const other = { id: 60, name: 'X', kind }
        expect(warningsOf({ titles: [KING, other], steps: [], end: 'unknown' })).toEqual([])
      }
    })
  })

  // L4: N/A — no async work: the reading is handed in

  describe('edge cases', () => {
    it('says nothing of a chain of one title', () => {
      expect(warningsOf({ titles: [KING], steps: [], end: 'sovereign' })).toEqual([])
    })
  })
})
