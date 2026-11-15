import { describe, expect, it } from 'vitest'

import { chainRegister, contentChain } from './toContentChain'

import type { DocTitle } from './toContentChain'

/**
 * A date group from one year to another.
 * @param from - the first year
 * @param to - the last
 * @returns the group
 */
function span(from: number, to: number) {
  return { start: { year: from }, end: { year: to } }
}

/** Nantes in 1100: the count, the duke, the king — each title with its territory resolved. */
const TITLES: DocTitle[] = [
  { id: 10, label: 'Mathias II — comté de Nantes', territory: { id: 1, wikidata: 'Q1' } },
  { id: 20, label: 'Alain IV — duché de Bretagne', territory: { id: 2, wikidata: 'Q2' } },
  { id: 30, label: 'Philippe Ier — royaume de France', territory: { id: 3, wikidata: null } },
]

const LINKS = [
  { id: 1, vassal: 10, answersTo: 'suzerain', suzerain: 20, date: span(1084, 1103) },
  { id: 2, vassal: 20, answersTo: 'suzerain', suzerain: 30, date: span(1084, 1112) },
]

describe('contentChain', () => {
  describe('happy path', () => {
    it('writes the chain of Nantes in 1100, each title with its territory’s Wikidata id', () => {
      expect(contentChain(chainRegister(TITLES, LINKS), 10, 1100, 'city sheet 1')).toEqual([
        {
          titles: [
            { name: 'Mathias II — comté de Nantes', wikidata: 'Q1' },
            { name: 'Alain IV — duché de Bretagne', wikidata: 'Q2' },
            { name: 'Philippe Ier — royaume de France', wikidata: null },
          ],
          end: 'unknown',
        },
      ])
    })
  })

  describe('variants', () => {
    it('reads a resolved title as a bare one', () => {
      const register = chainRegister(TITLES, LINKS)
      expect(contentChain(register, { id: 10 }, 1100, 'city sheet 1')).toEqual(
        contentChain(register, 10, 1100, 'city sheet 1')
      )
    })

    it('writes no chain for a sheet that names no title', () => {
      expect(contentChain(chainRegister(TITLES, LINKS), null, 1100, 'city sheet 1')).toBeNull()
    })

    it('writes two links entered alike as one reading', () => {
      const twice = [...LINKS, { ...LINKS[0], id: 9 }]
      expect(contentChain(chainRegister(TITLES, twice), 10, 1100, 'city sheet 1')).toHaveLength(1)
    })
  })

  describe('managed errors', () => {
    it('stops the export at a title with no name, naming it', () => {
      expect(() => chainRegister([{ id: 40, territory: { id: 4 } }], [])).toThrow(
        'title 40: no name'
      )
    })

    it('stops the export at a title whose territory is missing', () => {
      expect(() => chainRegister([{ id: 40, label: 'X' }], [])).toThrow('title 40: no territory')
    })
  })

  describe('unmanaged errors', () => {
    it('stops the export when the chain names a title the register lacks', () => {
      expect(() => contentChain(chainRegister([], LINKS), 10, 1100, 'city sheet 1')).toThrow(
        'city sheet 1: its chain names title 10'
      )
    })
  })

  describe('edge cases', () => {
    it('stops at the holder’s own title in a year no link covers: beyond, we do not know', () => {
      const chain = contentChain(chainRegister(TITLES, LINKS), 10, 1110, 'city sheet 1')
      expect(chain).toEqual([
        { titles: [{ name: 'Mathias II — comté de Nantes', wikidata: 'Q1' }], end: 'unknown' },
      ])
    })
  })
})
