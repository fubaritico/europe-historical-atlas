import { describe, expect, it } from 'vitest'

import { vassalLinkOf } from './vassalLinkOf'

const DATE = { start: { year: 1084 }, end: { year: 1103 } }
const READ = {
  kind: 'interval',
  from: { year: 1084, month: null, day: null, calendar: null, circa: false, margin: null },
  to: { year: 1103, month: null, day: null, calendar: null, circa: false, margin: null },
}

describe('vassalLinkOf', () => {
  describe('happy path', () => {
    it('reads a link naming a suzerain as the title it answers to', () => {
      expect(
        vassalLinkOf({ id: 1, vassal: 7, answersTo: 'suzerain', suzerain: 8, date: DATE })
      ).toEqual({
        id: '1',
        vassal: '7',
        suzerain: '8',
        date: READ,
      })
    })
  })

  describe('variants', () => {
    it('reads a « no one » link as sovereign, whatever its suzerain field holds', () => {
      expect(
        vassalLinkOf({ id: 2, vassal: 9, answersTo: 'no-one', suzerain: 8, date: DATE })?.suzerain
      ).toBeNull()
    })

    it('reads relations populated as well as bare', () => {
      expect(
        vassalLinkOf({
          id: 1,
          vassal: { id: 7 },
          answersTo: 'suzerain',
          suzerain: { id: 8 },
          date: DATE,
        })
      ).toMatchObject({ vassal: '7', suzerain: '8' })
    })
  })

  describe('managed errors', () => {
    it('leaves out a link whose suzerain is gone — « we do not know », never a sovereign', () => {
      expect(
        vassalLinkOf({ id: 1, vassal: 7, answersTo: 'suzerain', suzerain: null, date: DATE })
      ).toBeNull()
    })

    it('leaves out a link whose vassal is gone', () => {
      expect(
        vassalLinkOf({ id: 1, vassal: null, answersTo: 'suzerain', suzerain: 8, date: DATE })
      ).toBeNull()
    })

    it('leaves out a link whose date cannot be read', () => {
      expect(
        vassalLinkOf({
          id: 1,
          vassal: 7,
          answersTo: 'suzerain',
          suzerain: 8,
          date: { start: { year: null } },
        })
      ).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('leaves out a link with no date at all', () => {
      expect(vassalLinkOf({ id: 1, vassal: 7, answersTo: 'suzerain', suzerain: 8 })).toBeNull()
    })
  })

  // L4: N/A — a record in, a link or null out; nothing read from outside.
})
