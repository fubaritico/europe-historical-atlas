import { describe, expect, it } from 'vitest'

import { createTranslator } from '@europe-historical-atlas/core/i18n/catalogue'

import { CITY_SHEET_MESSAGES } from '../components/CitySheet/i18n'
import { sheetValues } from '../components/CitySheet/utils/sheetValues'
import { validateSheet } from '../components/CitySheet/utils/validateSheet'

import { refuseInvalidSheet } from './refuseInvalidSheet'

import type { CollectionBeforeChangeHook } from 'payload'

/** The form's French texts. */
const say = createTranslator(CITY_SHEET_MESSAGES, 'fr')

/** The sources' titles, as the form's server half reads them. */
const NAMES = new Map([['4', 'Buringh 2021']])

/** Rome in 1100, as the base holds it. */
const rome = {
  place: 5,
  date: {
    start: { year: 1100, month: null, day: null, circa: true, margin: null, calendar: 'julian' },
  },
  importance: 'capital',
  reasons: [1],
  testimonies: [
    {
      id: 'r1',
      source: 4,
      subject: 'population',
      population: 35000,
      importance: null,
      reason: null,
      where: null,
    },
  ],
}

/**
 * Whether the server refuses a sheet.
 * @param doc - the sheet as Payload is about to save it
 * @returns `true` when it does
 */
function serverRefuses(doc: Record<string, unknown>): boolean {
  const args = {
    data: doc,
    req: { i18n: { language: 'fr' } },
  } as unknown as Parameters<CollectionBeforeChangeHook>[0]
  try {
    refuseInvalidSheet(args)
    return false
  } catch {
    return true
  }
}

/**
 * Whether the form, opened on the same sheet, holds an error.
 * @param doc - the sheet as the base holds it
 * @returns `true` when it does
 */
function formRefuses(doc: Record<string, unknown>): boolean {
  return Object.keys(validateSheet(sheetValues(doc, 'Rome', NAMES), say)).length > 0
}

/** Sheets each side must judge alike, by what is wrong with them. */
const CASES: readonly [string, Record<string, unknown>][] = [
  ['nothing', rome],
  ['no importance', { ...rome, importance: null }],
  [
    'a line without its figure',
    { ...rome, testimonies: [{ ...rome.testimonies[0], population: null }] },
  ],
  [
    'a line without its source',
    { ...rome, testimonies: [{ ...rome.testimonies[0], source: null }] },
  ],
  [
    'a line without its subject',
    { ...rome, testimonies: [{ ...rome.testimonies[0], subject: null }] },
  ],
  [
    'a reason line without its reason',
    { ...rome, testimonies: [{ ...rome.testimonies[0], subject: 'reason', population: null }] },
  ],
  ['no reason and no line', { ...rome, reasons: [], testimonies: [] }],
]

// One schema for the form and the server (decision 8) only holds if the two adapters that feed it — the form's values,
// the document Payload saves — say the same thing about the same sheet.
describe('the form and the server judge a sheet alike', () => {
  describe('happy path', () => {
    it.each(CASES)('with %s wrong', (_name, doc) => {
      expect(formRefuses(doc)).toBe(serverRefuses(doc))
    })
  })

  describe('variants', () => {
    it('refuses on both sides every case but the valid ones', () => {
      expect(CASES.map(([name, doc]) => [name, serverRefuses(doc)])).toEqual([
        ['nothing', false],
        ['no importance', true],
        ['a line without its figure', true],
        ['a line without its source', true],
        ['a line without its subject', true],
        ['a reason line without its reason', true],
        ['no reason and no line', false],
      ])
    })
  })

  // L3–L5: N/A — each side's own errors and bounds are in its own suite; this one only holds them to each other.
})
