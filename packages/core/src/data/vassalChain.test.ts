import { describe, expect, it } from 'vitest'

import { chainPaths, vassalChain } from './vassalChain'

import type { VassalLink } from './vassalChain'
import type { HistoricalDate, HistoricalMoment } from '../time/historicalDate'

/**
 * A year as a moment.
 * @param year - the year
 * @returns the moment
 */
function moment(year: number): HistoricalMoment {
  return { year, month: null, day: null, calendar: null, circa: false, margin: null }
}

/**
 * From one year to another, both included.
 * @param from - the first year
 * @param to - the last
 * @returns the interval
 */
function span(from: number, to: number): HistoricalDate {
  return { kind: 'interval', from: moment(from), to: moment(to) }
}

/**
 * A link, its id read from its two ends.
 * @param vassal - the vassal's title
 * @param suzerain - the suzerain's title, or `null` for « answers to no one »
 * @param date - when it holds
 * @returns the link
 */
function link(vassal: string, suzerain: string | null, date: HistoricalDate): VassalLink {
  return { id: `${vassal}>${suzerain ?? 'none'}`, vassal, suzerain, date }
}

// Nantes in 1100, the plan's case: the count of Nantes under the duke of Brittany under the king of France
const NANTES: VassalLink[] = [
  link('count-nantes', 'duke-brittany', span(1084, 1103)),
  link('duke-brittany', 'king-france', span(1084, 1112)),
  link('king-france', null, span(1060, 1108)),
]

describe('vassalChain', () => {
  describe('happy path', () => {
    it('climbs from the sheet’s title to the sovereign, each step naming the link it came by', () => {
      expect(vassalChain('count-nantes', 1100, NANTES)).toEqual({
        title: 'count-nantes',
        via: null,
        end: null,
        above: [
          {
            title: 'duke-brittany',
            via: 'count-nantes>duke-brittany',
            end: null,
            above: [
              {
                title: 'king-france',
                via: 'duke-brittany>king-france',
                end: 'sovereign',
                above: [],
              },
            ],
          },
        ],
      })
    })

    it('lists that chain as one path', () => {
      expect(chainPaths(vassalChain('count-nantes', 1100, NANTES))).toEqual([
        { titles: ['count-nantes', 'duke-brittany', 'king-france'], end: 'sovereign' },
      ])
    })
  })

  describe('variants', () => {
    it('keeps only the links valid in the year: in 1105 the count’s has ended, so nothing is known above him', () => {
      expect(chainPaths(vassalChain('count-nantes', 1105, NANTES))).toEqual([
        { titles: ['count-nantes'], end: 'unknown' },
      ])
    })

    it('reads a link dated by a year alone as holding that year only', () => {
      const once = [link('count-nantes', 'duke-brittany', { kind: 'instant', at: moment(1100) })]
      expect(chainPaths(vassalChain('count-nantes', 1100, once))[0]?.titles).toEqual([
        'count-nantes',
        'duke-brittany',
      ])
      expect(chainPaths(vassalChain('count-nantes', 1101, once))).toEqual([
        { titles: ['count-nantes'], end: 'unknown' },
      ])
    })

    it('splits where the sources diverge, both branches kept: Robert II’s Imperial Flanders and Flanders', () => {
      const flanders = [
        link('count-flanders', 'king-france', span(1093, 1111)),
        link('count-flanders', 'emperor', span(1093, 1111)),
        link('king-france', null, span(1060, 1108)),
        link('emperor', null, span(1084, 1105)),
      ]
      expect(chainPaths(vassalChain('count-flanders', 1100, flanders))).toEqual([
        { titles: ['count-flanders', 'king-france'], end: 'sovereign' },
        { titles: ['count-flanders', 'emperor'], end: 'sovereign' },
      ])
    })

    it('keeps a « answers to no one » reading beside a suzerain read by another source', () => {
      const doubt = [
        link('duke-brittany', null, span(1084, 1112)),
        link('duke-brittany', 'king-france', span(1084, 1112)),
        link('king-france', null, span(1060, 1108)),
      ]
      expect(chainPaths(vassalChain('duke-brittany', 1100, doubt))).toEqual([
        { titles: ['duke-brittany'], end: 'sovereign' },
        { titles: ['duke-brittany', 'king-france'], end: 'sovereign' },
      ])
    })
  })

  describe('managed errors', () => {
    it('says « we do not know » where no link says whom a title answers to — never a silent gap', () => {
      const partial = [link('count-nantes', 'duke-brittany', span(1084, 1103))]
      expect(chainPaths(vassalChain('count-nantes', 1100, partial))).toEqual([
        { titles: ['count-nantes', 'duke-brittany'], end: 'unknown' },
      ])
    })

    it('ends a branch as a loop when the links lead back to a title already in it', () => {
      const circle = [
        link('count-a', 'duke-b', span(1090, 1110)),
        link('duke-b', 'count-a', span(1090, 1110)),
      ]
      expect(chainPaths(vassalChain('count-a', 1100, circle))).toEqual([
        { titles: ['count-a', 'duke-b', 'count-a'], end: 'loop' },
      ])
    })
  })

  describe('unmanaged errors', () => {
    it('refuses to list a branch that ends with no reason — a node it did not build', () => {
      expect(() => chainPaths({ title: 'count-nantes', via: null, above: [], end: null })).toThrow(
        'ends at count-nantes with no reason'
      )
    })
  })

  describe('edge cases', () => {
    it('gives the title alone, unknown above, when no link is entered at all', () => {
      expect(vassalChain('count-nantes', 1100, [])).toEqual({
        title: 'count-nantes',
        via: null,
        above: [],
        end: 'unknown',
      })
    })

    it('reads a link’s first and last years as within it', () => {
      expect(chainPaths(vassalChain('count-nantes', 1084, NANTES))[0]?.titles).toHaveLength(3)
      expect(chainPaths(vassalChain('count-nantes', 1103, NANTES))[0]?.titles).toHaveLength(3)
    })

    it('lets two vassals share their suzerain’s branch without it counting as a loop', () => {
      const shared = [
        link('count-nantes', 'duke-brittany', span(1084, 1103)),
        link('count-rennes', 'duke-brittany', span(1084, 1103)),
        link('duke-brittany', null, span(1084, 1112)),
      ]
      expect(chainPaths(vassalChain('count-rennes', 1100, shared))).toEqual([
        { titles: ['count-rennes', 'duke-brittany'], end: 'sovereign' },
      ])
    })
  })
})
