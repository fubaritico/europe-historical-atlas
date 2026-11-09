import { describe, expect, it } from 'vitest'

import { fingerprint } from './fingerprint'

// ATLAS-333, ATLAS-399: one key for the build and the page.

describe('fingerprint', () => {
  describe('happy path', () => {
    it('gives the same text the same fingerprint', () => {
      expect(fingerprint('1100')).toBe(fingerprint('1100'))
    })
  })

  describe('variants', () => {
    it('tells two texts of the same length apart', () => {
      expect(fingerprint('ab')).not.toBe(fingerprint('ba'))
    })
  })

  // L3, L4: N/A — any text is fingerprinted.

  describe('edge cases', () => {
    it('fingerprints the empty text with its length, nought', () => {
      expect(fingerprint('').endsWith('.0')).toBe(true)
    })
  })
})
