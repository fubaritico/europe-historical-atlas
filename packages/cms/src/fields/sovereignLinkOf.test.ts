import { describe, expect, it, vi } from 'vitest'

import { sovereignLinkOf } from './sovereignLinkOf'

const DATE = { start: { year: 1060 }, end: { year: 1108 } }

describe('sovereignLinkOf', () => {
  describe('happy path', () => {
    it("ends the chain at a title ticked « souverain », over the title's dates", () => {
      const link = sovereignLinkOf({ id: 30, sovereign: true, date: DATE })
      expect(link).toMatchObject({ id: 'sovereign:30', vassal: '30', suzerain: null })
      expect(link?.date).toMatchObject({ kind: 'interval' })
    })
  })

  describe('variants', () => {
    it('ends nothing at a title not ticked, or ticked off', () => {
      expect(sovereignLinkOf({ id: 30, date: DATE })).toBeNull()
      expect(sovereignLinkOf({ id: 30, sovereign: false, date: DATE })).toBeNull()
      expect(sovereignLinkOf({ id: 30, sovereign: null, date: DATE })).toBeNull()
    })
  })

  describe('managed errors', () => {
    it('ends nothing at a ticked title whose date cannot be read, and says so', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      expect(sovereignLinkOf({ id: 30, sovereign: true, date: null })).toBeNull()
      expect(warn).toHaveBeenCalledWith(
        '[CMS] the title 30 is ticked « souverain » but its date cannot be read'
      )
      expect(sovereignLinkOf({ id: 30, sovereign: true, date: { start: { year: 0 } } })).toBeNull()
    })
  })

  // L4: N/A — a pure reading of one stored title; L5: the year 0 above is its edge.
})
