import { describe, expect, it } from 'vitest'

import { linkNamesOf } from './linkNames'

import type { ChainReading } from './readVassalChain'

const COUNT = { id: 10, name: 'Mathias II — comté de Nantes' }
const DUKE = { id: 20, name: 'Alain IV — duché de Bretagne' }
const KING = { id: 30, name: 'Philippe Iᵉʳ — royaume de France' }

const CHAIN: ChainReading = {
  titles: [COUNT, DUKE, KING],
  steps: [
    { link: '7', source: null },
    { link: '8', source: null },
  ],
  end: 'sovereign',
}

describe('linkNamesOf', () => {
  describe('happy path', () => {
    it('names the first link by the holder and its suzerain', () => {
      expect(linkNamesOf([CHAIN], '7')).toEqual({ vassal: COUNT.name, suzerain: DUKE.name })
    })
  })

  describe('variants', () => {
    it('names a link higher up by the two titles it joins', () => {
      expect(linkNamesOf([CHAIN], '8')).toEqual({ vassal: DUKE.name, suzerain: KING.name })
    })

    it('finds a link in a second reading, where the sources diverge', () => {
      const other: ChainReading = {
        titles: [COUNT, KING],
        steps: [{ link: '9', source: null }],
        end: 'sovereign',
      }
      expect(linkNamesOf([CHAIN, other], '9')).toEqual({ vassal: COUNT.name, suzerain: KING.name })
    })
  })

  describe('managed errors', () => {
    it('answers null for a link no reading holds', () => {
      expect(linkNamesOf([CHAIN], '99')).toBeNull()
    })
  })

  // L4: N/A — pure, over typed readings

  describe('edge cases', () => {
    it('answers null with no reading at all', () => {
      expect(linkNamesOf([], '7')).toBeNull()
    })

    it('answers null for a step whose suzerain the reading lacks', () => {
      const cut: ChainReading = {
        titles: [COUNT],
        steps: [{ link: '7', source: null }],
        end: 'unknown',
      }
      expect(linkNamesOf([cut], '7')).toBeNull()
    })
  })
})
