import { describe, expect, it } from 'vitest'

import { anachronism, lordsIn, readEntity, suggestionsFor, yearOfTime } from './wikidataFacts'

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

/** An item claim dated by its start and end qualifiers, as the API sends it. */
const dated = (id: string, from: string | null, to: string | null) => ({
  ...item(id),
  qualifiers: {
    ...(from === null
      ? {}
      : { P580: [{ snaktype: 'value', datavalue: { value: { time: from } } }] }),
    ...(to === null ? {} : { P582: [{ snaktype: 'value', datavalue: { value: { time: to } } }] }),
  },
})

/** The County of Flanders, Q157070, as the API answered on 2026-10-17: three lords, each dated. */
const FLANDERS = {
  id: 'Q157070',
  labels: { en: { language: 'en', value: 'County of Flanders' } },
  claims: {
    P17: [
      dated('Q70972', '+0864-00-00T00:00:00Z', '+1529-00-00T00:00:00Z'),
      dated('Q12548', '+1529-00-00T00:00:00Z', '+1556-00-00T00:00:00Z'),
      dated('Q1031430', '+1556-00-00T00:00:00Z', '+1795-00-00T00:00:00Z'),
    ],
  },
}

/** The Duchy of Bohemia, Q2162698: no country, an instance of a State of the Holy Roman Empire. */
const BOHEMIA = {
  id: 'Q2162698',
  labels: { en: { language: 'en', value: 'Duchy of Bohemia' } },
  claims: { P31: [item('Q3024240'), item('Q154547'), item('Q26830017')] },
}

/** The Duchy of Burgundy, Q4712: an instance of a vassal state, its country undated. */
const BURGUNDY = {
  id: 'Q4712',
  labels: { en: { language: 'en', value: 'Duchy of Burgundy' } },
  claims: { P31: [item('Q1371288'), item('Q154547')], P17: [item('Q70972')] },
}

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
        belongsTo: [{ id: 'Q55502', from: null, to: null }],
        imperialState: false,
        vassalState: false,
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
      expect(facts(JERUSALEM).belongsTo.map((belonging) => belonging.id)).toEqual(['Q858', 'Q822'])
    })

    it("reads each country's start and end qualifiers as years", () => {
      expect(facts(FLANDERS).belongsTo).toEqual([
        { id: 'Q70972', from: 864, to: 1529 },
        { id: 'Q12548', from: 1529, to: 1556 },
        { id: 'Q1031430', from: 1556, to: 1795 },
      ])
    })

    it('reads an instance of a State of the Holy Roman Empire, and one of a vassal state', () => {
      expect(facts(BOHEMIA)).toMatchObject({ imperialState: true, vassalState: false })
      expect(facts(BURGUNDY)).toMatchObject({ imperialState: false, vassalState: true })
    })

    it('keeps one lord twice when it comes back with other years, and drops an exact repeat', () => {
      const entity = {
        id: 'Q1',
        claims: {
          P17: [
            dated('Q2', '+0900-00-00T00:00:00Z', '+1000-00-00T00:00:00Z'),
            dated('Q2', '+1200-00-00T00:00:00Z', null),
          ],
          P361: [dated('Q2', '+1200-00-00T00:00:00Z', null)],
        },
      }
      expect(facts(entity).belongsTo).toEqual([
        { id: 'Q2', from: 900, to: 1000 },
        { id: 'Q2', from: 1200, to: null },
      ])
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

    it('reads an unknown start, or a malformed qualifier, as no bound rather than throwing', () => {
      const entity = {
        id: 'Q1',
        claims: {
          P17: [
            { ...item('Q2'), qualifiers: { P580: [{ snaktype: 'somevalue' }], P582: 'nonsense' } },
          ],
        },
      }
      expect(facts(entity).belongsTo).toEqual([{ id: 'Q2', from: null, to: null }])
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

describe('lordsIn', () => {
  describe('happy path', () => {
    it('gives the lord whose years hold the year edited', () => {
      expect(lordsIn(facts(FLANDERS), 1100)).toEqual(['Q70972'])
    })
  })

  describe('variants', () => {
    it('gives the Holy Roman Empire for one of its States', () => {
      expect(lordsIn(facts(BOHEMIA), 1100)).toEqual(['Q12548'])
    })

    it('keeps an undated country as a lord in any year', () => {
      expect(lordsIn(facts(BURGUNDY), 1100)).toEqual(['Q70972'])
    })

    it('puts a lord dated in the year before an undated one, whatever their order in the item', () => {
      // Normandy's undated country is modern France: a claim naming the year is the stronger word.
      const entity = {
        id: 'Q1',
        claims: { P17: [item('Q142'), dated('Q70972', '+0911-00-00T00:00:00Z', null)] },
      }
      expect(lordsIn(facts(entity), 1100)).toEqual(['Q70972', 'Q142'])
    })
  })

  // L3/L4: N/A — the facts are already read; a malformed qualifier is readEntity's (see its suite).

  describe('edge cases', () => {
    it('holds both ends of a span: in 1529 Flanders has two lords, France first', () => {
      expect(lordsIn(facts(FLANDERS), 1529)).toEqual(['Q70972', 'Q12548'])
    })

    it('gives no lord in a year no span holds', () => {
      expect(lordsIn(facts(FLANDERS), 800)).toEqual([])
    })

    it('gives the Empire once, when it is both a country and the lord of a State', () => {
      const entity = { ...BOHEMIA, claims: { ...BOHEMIA.claims, P17: [item('Q12548')] } }
      expect(lordsIn(facts(entity), 1100)).toEqual(['Q12548'])
    })
  })
})

describe('suggestionsFor', () => {
  describe('happy path', () => {
    it('offers the name, the years and the suzerain found in the year, for an empty form', () => {
      expect(suggestionsFor(EMPTY, facts(TRIPOLI), POLITIES, 1100)).toEqual([
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
      const states = suggestionsFor(form, facts(TRIPOLI), POLITIES, 1100).map((s) => [
        s.field,
        s.state,
      ])
      expect(states).toContainEqual(['name', 'differs'])
      expect(states).toContainEqual(['existsFrom', 'same'])
    })

    it('offers no suzerain the year does not hold — modern states are left out', () => {
      // Jerusalem's country is Syria and Lebanon: neither is a polity of 1100.
      expect(
        suggestionsFor(EMPTY, facts(JERUSALEM), POLITIES, 1100).map((s) => s.field)
      ).not.toContain('suzerain')
    })

    it("offers Flanders' lord of the year edited: France in 1100, the Empire in 1540", () => {
      // CARTO-248's first acceptance case. Ignoring the dates would offer France in 1540 too.
      const lords = [
        { id: 'france', name: 'Kingdom of France', wikidata: 'Q70972' },
        { id: 'empire', name: 'Holy Roman Empire', wikidata: 'Q12548' },
      ]
      const suzerain = (year: number) =>
        suggestionsFor(EMPTY, facts(FLANDERS), lords, year).find((s) => s.field === 'suzerain')
      expect(suzerain(1100)?.value).toBe('france')
      expect(suzerain(1540)?.value).toBe('empire')
    })
  })

  // L3/L4: N/A — a comparison of literals; nothing is refused or thrown.

  describe('edge cases', () => {
    it('offers nothing for an item that says nothing', () => {
      expect(suggestionsFor(EMPTY, facts({ id: 'Q1' }), POLITIES, 1100)).toEqual([])
    })

    it('falls back on the French name when there is no English one', () => {
      const frenchOnly = {
        id: 'Q1',
        labels: { fr: { language: 'fr', value: 'royaume de Bourgogne' } },
      }
      expect(suggestionsFor(EMPTY, facts(frenchOnly), POLITIES, 1100)[0]?.value).toBe(
        'royaume de Bourgogne'
      )
    })
  })
})
