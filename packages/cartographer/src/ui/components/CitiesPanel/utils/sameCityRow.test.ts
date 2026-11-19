import { describe, expect, it } from 'vitest'

import { sameCityRow } from './sameCityRow'

import type { CityRowProps } from '../cityListProps'

const LYON: CityRowProps['city'] = {
  id: 'lyon',
  name: 'Lyon',
  lon: 4.8,
  lat: 45.7,
  date: {
    kind: 'instant',
    at: { year: 1100, month: null, day: null, calendar: null, circa: false, margin: null },
  },
  holder: null,
  chain: null,
  holderSources: [],
}

const noop = (): void => undefined

/** Lyon's row, hidden, not chosen, at the right place, held by the Empire. */
const ROW: CityRowProps = {
  city: LYON,
  visible: false,
  chosen: false,
  opened: false,
  verdict: 'agrees',
  dot: { colour: '#3355aa', key: 'dotHolder', values: { name: 'Sacrum Imperium' } },
  onShown: noop,
  onSelect: noop,
  onOpen: noop,
}

// CARTO-485: a row is drawn again only when something it shows has changed.
describe('sameCityRow', () => {
  describe('happy path', () => {
    it('takes the same props twice as the same row', () => {
      expect(sameCityRow(ROW, { ...ROW })).toBe(true)
    })

    it('takes a dot made anew with the same colour and the same bubble as the same row', () => {
      expect(sameCityRow(ROW, { ...ROW, dot: { ...ROW.dot, values: { ...ROW.dot.values } } })).toBe(
        true
      )
    })
  })

  describe('variants', () => {
    it.each<[string, Partial<CityRowProps>]>([
      ['its eye is ticked', { visible: true }],
      ['it is chosen', { chosen: true }],
      ['its box is opened', { opened: true }],
      ['its verdict turns to misplaced', { verdict: 'misplaced' }],
      ['its verdict is gone', { verdict: undefined }],
      ['its sheet is read again', { city: { ...LYON } }],
      ['its dot takes another colour', { dot: { ...ROW.dot, colour: '#aa3355' } }],
      ['its dot loses its colour', { dot: { ...ROW.dot, colour: null } }],
      ['its bubble says another sentence', { dot: { ...ROW.dot, key: 'dotOffMap' } }],
      ['its bubble names another holder', { dot: { ...ROW.dot, values: { name: 'Francia' } } }],
      ['its eye calls another function', { onShown: (): void => undefined }],
      ['its name calls another function', { onSelect: (): void => undefined }],
      ['its double-click calls another function', { onOpen: (): void => undefined }],
    ])('takes the row as changed when %s', (_what, change) => {
      expect(sameCityRow(ROW, { ...ROW, ...change })).toBe(false)
    })
  })

  // L3, L4: N/A — a comparison of literals, nothing to fail.

  describe('edge cases', () => {
    it('takes the row as changed when its bubble gains a value', () => {
      const vassal = { ...ROW.dot, values: { name: 'Sacrum Imperium', suzerain: 'Roma' } }
      expect(sameCityRow(ROW, { ...ROW, dot: vassal })).toBe(false)
    })

    it('takes the row as changed when its bubble loses a value', () => {
      const vassal = { ...ROW.dot, values: { name: 'Sacrum Imperium', suzerain: 'Roma' } }
      expect(sameCityRow({ ...ROW, dot: vassal }, ROW)).toBe(false)
    })

    it('takes two dots with no value as the same', () => {
      const empty = { colour: null, key: 'dotNotEntered', values: {} } as const
      expect(sameCityRow({ ...ROW, dot: empty }, { ...ROW, dot: { ...empty, values: {} } })).toBe(
        true
      )
    })
  })
})
