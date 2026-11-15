import { describe, expect, it } from 'vitest'

import { linkLabel, titleLabel } from './claimTitles'

import type { EventDateFields } from './historicalDate'

const NO_MOMENT = {
  year: null,
  month: null,
  day: null,
  circa: false,
  margin: null,
  calendar: 'julian' as const,
}

/**
 * A date group from one year to another, the end left empty for a year alone.
 * @param start - the first year
 * @param end - the last, or `null`
 * @returns the group
 */
function years(start: number | null, end: number | null): EventDateFields {
  return { start: { ...NO_MOMENT, year: start }, end: { ...NO_MOMENT, year: end } }
}

describe('titleLabel', () => {
  it('names a title by its holder, its territory and its years', () => {
    expect(titleLabel('Mathias II', 'comté de Nantes', years(1084, 1103))).toBe(
      'Mathias II — comté de Nantes, 1084–1103'
    )
  })

  it('names a title of a single year by that year', () => {
    expect(titleLabel('Mathias II', 'comté de Nantes', years(1100, null))).toBe(
      'Mathias II — comté de Nantes, 1100'
    )
  })

  it('gives no name to a title whose date cannot be read — the date field refuses the save', () => {
    expect(titleLabel('Mathias II', 'comté de Nantes', years(null, null))).toBeNull()
  })
})

describe('linkLabel', () => {
  it('names a link by its two titles', () => {
    expect(
      linkLabel(
        'Mathias II — comté de Nantes, 1084–1103',
        'Alain IV — duché de Bretagne, 1084–1112'
      )
    ).toBe('Mathias II — comté de Nantes, 1084–1103 → Alain IV — duché de Bretagne, 1084–1112')
  })

  it('names a link to no one « personne »: a sovereign, as a source states it', () => {
    expect(linkLabel('Philippe Ier — royaume de France, 1060–1108', null)).toBe(
      'Philippe Ier — royaume de France, 1060–1108 → personne'
    )
  })
})
