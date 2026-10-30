import { APIError } from 'payload'
import { describe, expect, it } from 'vitest'

import { refuseInvalidSheet } from './refuseInvalidSheet'

import type { CollectionBeforeChangeHook } from 'payload'

/** Rome in 1100, as Payload is about to save it: valid. */
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
 * Run the hook as Payload would, in the admin's language.
 * @param data - the sheet
 * @param language - the admin's language
 * @returns what the hook answers
 */
function run(data: Record<string, unknown>, language = 'fr'): unknown {
  const args = {
    data,
    req: { i18n: { language } },
  } as unknown as Parameters<CollectionBeforeChangeHook>[0]
  return refuseInvalidSheet(args) as unknown
}

/**
 * The refusal the hook throws.
 * @param data - the sheet
 * @param language - the admin's language
 * @returns the error
 */
function refusal(data: Record<string, unknown>, language = 'fr') {
  try {
    run(data, language)
  } catch (error) {
    if (error instanceof APIError)
      return error as APIError<{ errors: { path: string; message: string }[] }>
    throw error
  }
  throw new Error('the hook did not refuse')
}

describe('refuseInvalidSheet', () => {
  describe('happy path', () => {
    it('lets a valid sheet through, unchanged', () => {
      expect(run(rome)).toBe(rome)
    })
  })

  describe('variants', () => {
    it('reads populated relations by their ids', () => {
      const populated = { ...rome, place: { id: 5 }, reasons: [{ id: 1 }] }
      expect(run(populated)).toBe(populated)
    })
  })

  describe('managed errors', () => {
    it('refuses a line about the population without its figure, under that field, in the admin’s language', () => {
      const line = { ...rome.testimonies[0], population: null }
      const error = refusal({ ...rome, testimonies: [line] })
      expect(error.status).toBe(400)
      expect(error.data.errors.map((one) => one.path)).toEqual(['testimonies.0.population'])
      expect(error.message).toMatch(/^La fiche est refusée : testimonies\.0\.population/)
      expect(refusal({ ...rome, testimonies: [line] }, 'en').message).toMatch(
        /^The sheet is refused/
      )
    })

    it('refuses a line without its source, and a reason line without its reason', () => {
      const noSource = { ...rome.testimonies[0], source: null }
      const noReason = { ...rome.testimonies[0], subject: 'reason', population: null, reason: null }
      const error = refusal({ ...rome, testimonies: [noSource, noReason] })
      expect(error.data.errors.map((one) => one.path)).toEqual([
        'testimonies.0.source',
        'testimonies.1.reason',
      ])
    })

    it('reads a reason line whose reason is populated', () => {
      const line = {
        ...rome.testimonies[0],
        subject: 'reason',
        population: null,
        reason: { id: 2 },
      }
      const sheet = { ...rome, testimonies: [line] }
      expect(run(sheet)).toBe(sheet)
    })
  })

  describe('unmanaged errors', () => {
    // Payload's own date rule runs after this hook and says it under the right end, in its words.
    it('leaves a date that does not read to the date field’s rule', () => {
      const zero = { ...rome, date: { start: { ...rome.date.start, year: 0 } } }
      expect(run(zero)).toBe(zero)
    })
  })

  describe('edge cases', () => {
    it('names every issue, not the first only', () => {
      const error = refusal({ ...rome, importance: 'village', reasons: [''] })
      expect(error.data.errors.map((one) => one.path)).toEqual(['importance', 'reasons.0'])
    })
  })
})
