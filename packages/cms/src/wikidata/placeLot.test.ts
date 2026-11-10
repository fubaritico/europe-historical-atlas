import { describe, expect, it } from 'vitest'

import { FIRST_LEVEL_DIVISION, lotUrl, readLotAnswer } from './placeLot'

const uri = (id: string) => ({ value: `http://www.wikidata.org/entity/${id}` })

/**
 * A query-service row.
 * @param cells - the cells, by variable: an id becomes an entity URI, a label stays a literal
 * @returns the row
 */
function row(cells: {
  country?: string
  countryLabel?: string
  region?: string
  regionLabel?: string
}) {
  return {
    ...(cells.country === undefined ? {} : { country: uri(cells.country) }),
    ...(cells.countryLabel === undefined ? {} : { countryLabel: { value: cells.countryLabel } }),
    ...(cells.region === undefined ? {} : { region: uri(cells.region) }),
    ...(cells.regionLabel === undefined ? {} : { regionLabel: { value: cells.regionLabel } }),
  }
}

/**
 * The query service's answer.
 * @param rows - its rows
 * @returns the JSON
 */
function answer(...rows: ReturnType<typeof row>[]) {
  return { head: { vars: [] }, results: { bindings: rows } }
}

describe('placeLot', () => {
  describe('happy path', () => {
    it('reads Palermo as Italy and Sicily', () => {
      const lot = readLotAnswer(
        answer(
          row({ country: 'Q38', countryLabel: 'Italie', region: 'Q1460', regionLabel: 'Sicile' })
        )
      )
      expect(lot).toEqual({
        countries: [{ wikidata: 'Q38', name: 'Italie' }],
        regions: [{ wikidata: 'Q1460', name: 'Sicile' }],
      })
    })

    it('asks the query service for the item’s country and first-level division, in JSON', () => {
      const url = new URL(lotUrl('Q2656'))
      const query = url.searchParams.get('query') ?? ''
      expect([url.host, url.searchParams.get('format'), query.includes('wd:Q2656 p:P17')]).toEqual([
        'query.wikidata.org',
        'json',
        true,
      ])
      expect(query).toContain(`wd:${FIRST_LEVEL_DIVISION}`)
    })

    it('asks for today only — a country statement ended, a country or a division dissolved are left out', () => {
      const query = new URL(lotUrl('Q2656')).searchParams.get('query') ?? ''
      expect([
        query.includes('FILTER NOT EXISTS { ?statement pq:P582 [] }'),
        query.includes('FILTER NOT EXISTS { ?country wdt:P576 [] }'),
        query.includes('FILTER NOT EXISTS { ?region wdt:P576 [] }'),
        query.includes('wikibase:DeprecatedRank'),
      ]).toEqual([true, true, true, true])
    })
  })

  describe('variants', () => {
    it('keeps every region of one country, the country once — the rows cross both', () => {
      const lot = readLotAnswer(
        answer(
          row({
            country: 'Q928',
            countryLabel: 'Philippines',
            region: 'Q13615',
            regionLabel: 'Vallée de Cagayan',
          }),
          row({
            country: 'Q928',
            countryLabel: 'Philippines',
            region: 'Q13826',
            regionLabel: 'Isabela',
          })
        )
      )
      expect([lot.countries.length, lot.regions.map((each) => each.wikidata)]).toEqual([
        1,
        ['Q13615', 'Q13826'],
      ])
    })

    it('keeps two countries a disputed place has', () => {
      const lot = readLotAnswer(
        answer(row({ country: 'Q1', countryLabel: 'A' }), row({ country: 'Q2', countryLabel: 'B' }))
      )
      expect(lot.countries.map((each) => each.wikidata)).toEqual(['Q1', 'Q2'])
    })

    it('names an item with no label by its id, as the query service does', () => {
      const lot = readLotAnswer(answer(row({ country: 'Q38' })))
      expect(lot.countries).toEqual([{ wikidata: 'Q38', name: 'Q38' }])
    })

    it('reads a place Wikidata gives no country nor region as an empty lot', () => {
      expect(readLotAnswer(answer(row({})))).toEqual({ countries: [], regions: [] })
    })
  })

  describe('managed errors', () => {
    it('throws on an answer that is not the query service’s', () => {
      expect(() => readLotAnswer({ error: 'timeout' })).toThrow()
    })
  })

  // L4–L5: N/A — pure reading, no state nor concurrency; the route's failures are tested in placeEndpoints.test.ts.
})
