import { describe, expect, it } from 'vitest'

import { addressForYear, openingYearOf } from './openingYear'

describe('openingYearOf', () => {
  describe('happy path', () => {
    it('reads ?year=1200 as 1200', () => {
      expect(openingYearOf('?year=1200', 1100)).toBe(1200)
    })
  })

  describe('variants', () => {
    it('opens on the first year when the address names none', () => {
      expect(openingYearOf('', 1100)).toBe(1100)
      expect(openingYearOf('?break=polities-panel', 1100)).toBe(1100)
    })

    it('reads the year among other parameters, with or without the leading ?', () => {
      expect(openingYearOf('?break=x&year=1300', 1100)).toBe(1300)
      expect(openingYearOf('year=1300', 1100)).toBe(1300)
    })

    it('reads a year before Christ as negative', () => {
      expect(openingYearOf('?year=-44', 1100)).toBe(-44)
    })
  })

  describe('managed errors', () => {
    // A naive reading — Number(asked) || firstYear — would open 1100 here, and the author would draw on the wrong year.
    it('refuses a year that is not one, naming what it read, rather than opening the first year', () => {
      expect(() => openingYearOf('?year=abc', 1100)).toThrow('« abc »')
      expect(() => openingYearOf('?year=12.5', 1100)).toThrow('« 12.5 »')
      expect(() => openingYearOf('?year=', 1100)).toThrow('«  »')
    })
  })

  // L4: N/A — a pure reading of a string; nothing asynchronous, nothing to go missing.

  describe('edge cases', () => {
    it('refuses five digits, which years/ cannot hold', () => {
      expect(() => openingYearOf('?year=12000', 1100)).toThrow('« 12000 »')
    })

    it('reads year 0 as 0 — the format accepts it (known-issues/core.md), the address does not judge it', () => {
      expect(openingYearOf('?year=0', 1100)).toBe(0)
    })
  })
})

describe('addressForYear', () => {
  describe('happy path', () => {
    it('writes the year into an empty query', () => {
      expect(addressForYear('', 1200)).toBe('?year=1200')
    })
  })

  describe('variants', () => {
    it('replaces a year already there and keeps the other parameters', () => {
      expect(addressForYear('?break=polities-panel&year=1100', 1200)).toBe(
        '?break=polities-panel&year=1200'
      )
    })
  })

  // L3, L4: N/A — any year is written; which years exist is the dialogue's list.

  describe('edge cases', () => {
    it('round-trips through openingYearOf', () => {
      expect(openingYearOf(addressForYear('?slow=save', -44), 1100)).toBe(-44)
    })
  })
})
