import { describe, expect, it } from 'vitest'

import { whyNotMapName } from './mapNaming'
import { persistenceWords } from './persistenceWords'

const WORDS = persistenceWords('en')

describe('whyNotMapName', () => {
  describe('happy path', () => {
    it('lets a working map take any name a folder can', () => {
      expect(whyNotMapName('1100-essai.bretagne_2', 1100, WORDS)).toBeNull()
    })
  })

  describe('variants', () => {
    it('lets the map of a year take that year’s name, before the Common Era too', () => {
      expect([whyNotMapName('1110', 1110, WORDS), whyNotMapName('-50', -50, WORDS)]).toEqual([
        null,
        null,
      ])
    })
  })

  describe('managed errors', () => {
    it('refuses a name a folder cannot take', () => {
      expect(whyNotMapName('a/b', 1100, WORDS)).toContain('letters, digits')
    })

    it('refuses the name of another year, which the atlas would publish as that year', () => {
      expect(whyNotMapName('1200', 1100, WORDS)).toBe(
        'A map named 1200 is the map of the year 1200, which the atlas publishes — this map is 1100. Choose another name'
      )
    })
  })

  // L4: N/A — a pure reading of a string.

  describe('edge cases', () => {
    it('refuses an empty name, and one past 99 characters', () => {
      expect([whyNotMapName('', 1100, WORDS), whyNotMapName('a'.repeat(100), 1100, WORDS)]).toEqual(
        [expect.stringContaining('letters') as string, expect.stringContaining('letters') as string]
      )
    })
  })
})
