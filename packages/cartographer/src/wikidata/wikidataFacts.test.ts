import { describe, expect, it } from 'vitest'

import { anachronism, readEntity, suggestionsFor, yearOfTime } from './wikidataFacts'

import type { WikidataFacts } from './wikidataFacts'

/** A time claim as the API sends it. */
const time = (value: string, rank = 'normal') => ({
  rank,
  mainsnak: { datavalue: { value: { time: value, precision: 9 } } },
})

/** An item claim as the API sends it. */
const item = (id: string, rank = 'normal') => ({
  rank,
  mainsnak: { datavalue: { value: { 'entity-type': 'item', id } } },
})

/** The County of Tripoli, Q272033, as the API answered on 2026-10-17 — reduced to what is read. */
const TRIPOLI = {
  id: 'Q272033',
  labels: {
    en: { language: 'en', value: 'County of Tripoli' },
    fr: { language: 'fr', value: 'comté de Tripoli' },
  },
  sitelinks: {
    enwiki: { site: 'enwiki', title: 'County of Tripoli' },
    frwiki: { site: 'frwiki', title: 'Comté de Tripoli' },
  },
  claims: {
    P571: [time('+1102-00-00T00:00:00Z')],
    P576: [time('+1289-04-26T00:00:00Z')],
    P1365: [item('Q160307')],
    P17: [item('Q55502')],
  },
}

/** The Kingdom of Jerusalem, Q55502: its country lists modern states, one of them deprecated. */
const JERUSALEM = {
  id: 'Q55502',
  labels: { en: { language: 'en', value: 'Kingdom of Jerusalem' } },
  sitelinks: {},
  claims: {
    P571: [time('+1099-07-15T00:00:00Z')],
    P576: [time('+1291-05-18T00:00:00Z')],
    P17: [item('Q858'), item('Q822'), item('Q801', 'deprecated')],
    P1366: [item('Q282428')],
    P155: [item('Q12407080')],
  },
}

/** Q25167513, entered for the Emirate of Mosul: a Wikipedia category, not a polity. */
const MOSUL_CATEGORY = {
  id: 'Q25167513',
  labels: { en: { language: 'en', value: 'Category:Hamdanid emirate of Mosul' } },
  claims: { P31: [item('Q4167836')] },
}

/** Read a fixture, failing the test if it is not read. */
function facts(entity: unknown): WikidataFacts {
  const read = readEntity(entity)
  if (read === null) throw new Error('fixture not read')
  return read
}

/** The year's polities, as the suzerain match reads them. */
const POLITIES = [
  { id: 'jerusalem', name: 'Kingdom of Jerusalem', wikidata: 'Q55502' },
  { id: 'cilicia', name: 'Barony of Cilician Armenia', wikidata: 'Q335088' },
]

/** An empty form. */
const EMPTY = { name: '', existsFrom: '', existsTo: '', suzerain: null }

describe('readEntity', () => {
  describe('happy path', () => {
    it('reads the County of Tripoli: names, years, belonging, articles', () => {
      expect(facts(TRIPOLI)).toEqual({
        id: 'Q272033',
        labels: { en: 'County of Tripoli', fr: 'comté de Tripoli' },
        inception: 1102,
        dissolved: 1289,
        belongsTo: ['Q55502'],
        predecessors: ['Q160307'],
        successors: [],
        wikipedia: {
          en: 'https://en.wikipedia.org/wiki/County_of_Tripoli',
          fr: 'https://fr.wikipedia.org/wiki/Comt%C3%A9_de_Tripoli',
        },
        notASubject: null,
      })
    })
  })

  describe('variants', () => {
    it('drops a deprecated claim and keeps the others in order', () => {
      expect(facts(JERUSALEM).belongsTo).toEqual(['Q858', 'Q822'])
    })

    it('puts a preferred claim before a normal one', () => {
      const entity = {
        id: 'Q1',
        claims: {
          P571: [time('+1100-00-00T00:00:00Z'), time('+1098-00-00T00:00:00Z', 'preferred')],
        },
      }
      expect(facts(entity).inception).toBe(1098)
    })

    it('says when an item is a Wikipedia category rather than a polity', () => {
      expect(facts(MOSUL_CATEGORY).notASubject).toBe('a Wikipedia category')
    })

    it('reads predecessors and successors from both pairs of properties', () => {
      expect(facts(JERUSALEM).predecessors).toEqual(['Q12407080'])
      expect(facts(JERUSALEM).successors).toEqual(['Q282428'])
    })
  })

  describe('managed errors', () => {
    it('answers null for an item the API marks missing', () => {
      expect(readEntity({ id: 'Q9', missing: '' })).toBeNull()
    })
  })

  describe('unmanaged errors', () => {
    it('answers null for something that is not an item', () => {
      expect(readEntity(null)).toBeNull()
      expect(readEntity('Q1')).toBeNull()
      expect(readEntity({ claims: {} })).toBeNull()
    })

    it('ignores a claim whose value has the wrong shape, rather than throwing', () => {
      const entity = {
        id: 'Q1',
        claims: { P571: [{ rank: 'normal', mainsnak: { datavalue: { value: 1102 } } }] },
      }
      expect(facts(entity).inception).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('reads an item with no claims, labels or articles as empty facts', () => {
      expect(facts({ id: 'Q1' })).toMatchObject({
        labels: { en: null, fr: null },
        inception: null,
        belongsTo: [],
      })
    })
  })
})

describe('yearOfTime', () => {
  it('reads a year of the common era and one before it', () => {
    expect(yearOfTime('+1102-00-00T00:00:00Z')).toBe(1102)
    expect(yearOfTime('-0044-03-15T00:00:00Z')).toBe(-44)
  })

  it('answers null for a string that is not a Wikidata time', () => {
    expect(yearOfTime('1102')).toBeNull()
  })
})

describe('anachronism', () => {
  it('warns that the County of Tripoli does not exist yet in 1100', () => {
    // CARTO-243's first acceptance case, from the dev's own 1100.
    expect(anachronism(1100, facts(TRIPOLI))).toBe(
      'Wikidata: County of Tripoli 1102–1289 — does not exist yet in 1100'
    )
  })

  it('warns that a polity no longer exists after its end', () => {
    expect(anachronism(1300, facts(JERUSALEM))).toBe(
      'Wikidata: Kingdom of Jerusalem 1099–1291 — no longer exists in 1300'
    )
  })

  it('says nothing when the year lies within the dates, its bounds included', () => {
    expect(anachronism(1100, facts(JERUSALEM))).toBeNull()
    expect(anachronism(1099, facts(JERUSALEM))).toBeNull()
    expect(anachronism(1291, facts(JERUSALEM))).toBeNull()
  })

  it('says nothing when the item gives no dates', () => {
    expect(anachronism(1100, facts({ id: 'Q1' }))).toBeNull()
  })
})

describe('suggestionsFor', () => {
  describe('happy path', () => {
    it('offers the name, the years and the suzerain found in the year, for an empty form', () => {
      expect(suggestionsFor(EMPTY, facts(TRIPOLI), POLITIES)).toEqual([
        { field: 'name', value: 'County of Tripoli', shown: 'County of Tripoli', state: 'empty' },
        { field: 'existsFrom', value: '1102', shown: '1102', state: 'empty' },
        { field: 'existsTo', value: '1289', shown: '1289', state: 'empty' },
        { field: 'suzerain', value: 'jerusalem', shown: 'Kingdom of Jerusalem', state: 'empty' },
      ])
    })
  })

  describe('variants', () => {
    it('marks a field the author filled differently, and one that agrees', () => {
      const form = { ...EMPTY, name: 'County of tripoly', existsFrom: '1102' }
      const states = suggestionsFor(form, facts(TRIPOLI), POLITIES).map((s) => [s.field, s.state])
      expect(states).toContainEqual(['name', 'differs'])
      expect(states).toContainEqual(['existsFrom', 'same'])
    })

    it('offers no suzerain the year does not hold — modern states are left out', () => {
      // Jerusalem's country is Syria and Lebanon: neither is a polity of 1100.
      expect(suggestionsFor(EMPTY, facts(JERUSALEM), POLITIES).map((s) => s.field)).not.toContain(
        'suzerain'
      )
    })
  })

  // L3/L4: N/A — a comparison of literals; nothing is refused or thrown.

  describe('edge cases', () => {
    it('offers nothing for an item that says nothing', () => {
      expect(suggestionsFor(EMPTY, facts({ id: 'Q1' }), POLITIES)).toEqual([])
    })

    it('falls back on the French name when there is no English one', () => {
      const frenchOnly = {
        id: 'Q1',
        labels: { fr: { language: 'fr', value: 'royaume de Bourgogne' } },
      }
      expect(suggestionsFor(EMPTY, facts(frenchOnly), POLITIES)[0]?.value).toBe(
        'royaume de Bourgogne'
      )
    })
  })
})
