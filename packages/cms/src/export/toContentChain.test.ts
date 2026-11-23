import { describe, expect, it } from 'vitest'

import { chainRegister, contentChain, titleHolder } from './toContentChain'

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
  {
    id: 10,
    label: 'Mathias II — comté de Nantes',
    territory: { id: 1, name: 'comté de Nantes', wikidata: 'Q1' },
  },
  {
    id: 20,
    label: 'Alain IV — duché de Bretagne',
    territory: { id: 2, name: 'duché de Bretagne', wikidata: 'Q2' },
  },
  {
    id: 30,
    label: 'Philippe Ier — royaume de France',
    territory: { id: 3, name: 'royaume de France', wikidata: null },
  },
]

const LINKS = [
  { id: 1, vassal: 10, answersTo: 'suzerain', suzerain: 20, date: span(1084, 1103) },
  { id: 2, vassal: 20, answersTo: 'suzerain', suzerain: 30, date: span(1084, 1112) },
]

describe('contentChain', () => {
  describe('happy path', () => {
    it('writes the kind of each title’s territory, the rank the chain is checked by (CARTO-491)', () => {
      const titles = [
        {
          id: 10,
          label: 'Mathias II',
          territory: { id: 1, name: 'comté de Nantes', wikidata: 'Q1', kind: 'county' },
        },
        {
          id: 20,
          label: 'Alain IV',
          territory: { id: 2, name: 'duché de Bretagne', wikidata: null },
        },
      ]
      const register = chainRegister(titles, [])
      expect(register.titles.get('10')).toEqual({
        name: 'Mathias II',
        wikidata: 'Q1',
        territory: 1,
        kind: 'county',
      })
      expect(register.titles.get('20')).toEqual({ name: 'Alain IV', wikidata: null, territory: 2 })
    })

    it('writes the chain of Nantes in 1100, each title with its territory’s Wikidata id and number', () => {
      expect(contentChain(chainRegister(TITLES, LINKS), 10, 1100, 'city sheet 1')).toEqual([
        {
          titles: [
            { name: 'Mathias II — comté de Nantes', wikidata: 'Q1', territory: 1 },
            { name: 'Alain IV — duché de Bretagne', wikidata: 'Q2', territory: 2 },
            { name: 'Philippe Ier — royaume de France', wikidata: null, territory: 3 },
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

    // The dev, 2026-11-16: the sovereign is ticked on its title, never a link to no one.
    it('ends the chain on a sovereign at a title ticked « souverain », over its dates', () => {
      const king = { ...TITLES[2], id: 30, sovereign: true, date: span(1060, 1108) }
      const titles = [TITLES[0], TITLES[1], king] as DocTitle[]
      expect(contentChain(chainRegister(titles, LINKS), 10, 1100, 'city sheet 1')?.[0]?.end).toBe(
        'sovereign'
      )
      expect(
        contentChain(chainRegister(titles, LINKS), 10, 1110, 'city sheet 1')?.[0]?.end
      ).not.toBe('sovereign')
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

    it('stops the export at a title whose territory has no name, the holder a city would be written with', () => {
      expect(() => chainRegister([{ id: 40, label: 'X', territory: { id: 4 } }], [])).toThrow(
        'title 40: its territory has no name'
      )
    })
  })
})

// 2026-11-23, the dev's « plein de villes sans détenteur »: a sheet's holder is its title's territory.
describe('titleHolder', () => {
  const register = chainRegister(TITLES, LINKS)

  describe('happy path', () => {
    it('gives the territory the sheet’s title holds, by its name and its Wikidata id', () => {
      expect(titleHolder(register, 10, 'city sheet 1')).toEqual({
        name: 'comté de Nantes',
        wikidata: 'Q1',
      })
    })
  })

  describe('variants', () => {
    it('reads a resolved title as a bare one, and a territory with no Wikidata id', () => {
      expect(titleHolder(register, { id: 30 }, 'city sheet 1')).toEqual({
        name: 'royaume de France',
        wikidata: null,
      })
    })
  })

  describe('managed errors', () => {
    it('stops the export at a sheet whose title the export did not read, naming both', () => {
      expect(() => titleHolder(register, 99, 'city sheet 7')).toThrow(
        'city sheet 7: its holder is title 99, which the export did not read'
      )
    })
  })

  // L4: N/A — pure, its input checked by the export's register.

  describe('edge cases', () => {
    it('gives no holder for a sheet that names no title', () => {
      expect(titleHolder(register, null, 'city sheet 1')).toBeNull()
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
        {
          titles: [{ name: 'Mathias II — comté de Nantes', wikidata: 'Q1', territory: 1 }],
          end: 'unknown',
        },
      ])
    })
  })
})
