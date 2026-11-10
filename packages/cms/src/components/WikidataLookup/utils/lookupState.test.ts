import { describe, expect, it } from 'vitest'

import { said, withoutChoice } from './lookupState'

const ITALY = { wikidata: 'Q38', name: 'Italie' }
const SICILY = { wikidata: 'Q1460', name: 'Sicile' }

describe('lookupState', () => {
  describe('happy path', () => {
    it('drops the list just answered and keeps the other', () => {
      const state = {
        kind: 'said' as const,
        message: 'm',
        tone: 'info' as const,
        lotChoices: { country: [ITALY], region: [SICILY] },
      }
      expect(withoutChoice(state, 'country')).toEqual({
        ...state,
        lotChoices: { region: [SICILY] },
      })
    })
  })

  describe('variants', () => {
    it('says a sentence with no list under it', () => {
      expect(said('Écrivez d’abord un nom.', 'info')).toEqual({
        kind: 'said',
        message: 'Écrivez d’abord un nom.',
        tone: 'info',
        lotChoices: {},
      })
    })
  })

  describe('edge cases', () => {
    it('leaves a state with no sentence as it is', () => {
      const busy = { kind: 'busy' as const }
      expect(withoutChoice(busy, 'region')).toBe(busy)
    })
  })

  // L3–L4: N/A — pure state transitions, no input to refuse.
})
