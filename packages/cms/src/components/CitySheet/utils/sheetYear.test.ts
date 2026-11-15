import { describe, expect, it } from 'vitest'

import { sheetYear } from './sheetYear'

describe('sheetYear', () => {
  describe('happy path', () => {
    it('reads a whole year', () => {
      expect(sheetYear('1100')).toBe(1100)
    })
  })

  describe('variants', () => {
    it('reads a year before our era', () => {
      expect(sheetYear('-44')).toBe(-44)
    })
  })

  describe('managed errors', () => {
    it('reads no year from an empty field', () => {
      expect(sheetYear('')).toBeNull()
    })
  })

  describe('unmanaged errors', () => {
    it('reads no year from what is not a number', () => {
      expect(sheetYear('mil cent')).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('reads no year from 0, which does not exist, nor from a fraction', () => {
      expect([sheetYear('0'), sheetYear('1100.5')]).toEqual([null, null])
    })
  })
})
