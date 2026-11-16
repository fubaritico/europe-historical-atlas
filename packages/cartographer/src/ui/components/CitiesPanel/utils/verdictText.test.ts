import { describe, expect, it } from 'vitest'

import { verdictText } from './verdictText'

import type { CityVerdict } from '../../../../canvas/cityVerdict'

const MAINZ = { name: 'Mainz', wikidata: 'Q1' }
const CHAIN = [{ titles: [{ name: 'Ruthard — Mayence', wikidata: 'Q1' }], end: 'unknown' as const }]

/**
 * A verdict.
 * @param fields - what differs from a city judged by its holder alone, at the right place
 * @returns the verdict
 */
function verdict(fields: Partial<CityVerdict>): CityVerdict {
  return { onMap: MAINZ, bySources: MAINZ, kind: 'agrees', chain: null, expected: null, ...fields }
}

describe('verdictText', () => {
  describe('happy path', () => {
    it('names the sources’ holder for a city judged by its holder alone', () => {
      expect(
        verdictText(verdict({ kind: 'misplaced', bySources: { name: 'Hongrie', wikidata: 'Q2' } }))
      ).toEqual({
        key: 'misplaced',
        polity: 'Hongrie',
      })
    })
  })

  describe('variants', () => {
    it('names the polity under the city for a city judged by its chain', () => {
      expect(verdictText(verdict({ kind: 'misplaced', chain: CHAIN }))).toEqual({
        key: 'misplacedChain',
        polity: 'Mainz',
      })
      expect(verdictText(verdict({ kind: 'incomplete', chain: CHAIN }))).toEqual({
        key: 'incomplete',
        polity: 'Mainz',
      })
      expect(verdictText(verdict({ kind: 'cannotCompare', chain: CHAIN }))).toEqual({
        key: 'cannotCompareMap',
        polity: 'Mainz',
      })
    })
  })

  describe('managed errors', () => {
    it('says nothing while nobody has entered the holder', () => {
      expect(verdictText(verdict({ kind: 'notEntered', bySources: null }))).toBeNull()
    })
  })

  describe('unmanaged errors', () => {
    it('says « no polity on the map » for a city judged by its chain over unclaimed ground', () => {
      expect(verdictText(verdict({ kind: 'misplaced', chain: CHAIN, onMap: null }))).toEqual({
        key: 'unclaimed',
        polity: '',
      })
    })
  })

  // L5: N/A — one branch per verdict, each above.
})
