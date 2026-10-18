import { describe, expect, it } from 'vitest'

import {
  borderFactSchema,
  pairBorderSchema,
  runBorderSchema,
  yearBordersSchema,
  yearClaimSchema,
  yearPolitiesSchema,
  yearPolitySchema,
  yearRegistrySchema,
} from './yearFormat'

import type { YearBorders, YearPolities, YearPolity, YearRegistry } from './yearFormat'

/** The Kingdom of France as OHM actually holds it at 1100 — no Wikidata id there, measured 2026-09-27. */
const polity: YearPolity = {
  id: 'fr-couronne',
  name: 'Reaume de France',
  rank: 'kingdom',
  status: 'country',
  suzerain: null,
  existsFrom: 987,
  existsTo: null,
  colour: null,
  wikidata: 'Q237131',
}

const registry: YearRegistry = { version: 1, year: 1100, polities: [polity] }

const polities: YearPolities = {
  version: 1,
  year: 1100,
  sources: [{ id: 0, name: 'Natural Earth 10m coastline', licence: 'public domain' }],
  anchors: [
    [2.35, 48.85],
    [2.41, 48.9],
    [2.5, 49],
  ],
  anchorSource: [0, 0, 0],
  claims: [{ polity: 'fr-couronne', rings: [[0, 1, 2]] }],
  deliberateGaps: [],
}

const borders: YearBorders = {
  version: 1,
  year: 1100,
  pairs: [{ between: ['fr-couronne', 'hre'], type: 'agreed', hand: 'bold', source: 0, note: null }],
  runs: [{ run: [0, 1], hand: 'bold', source: null, note: null }],
}

/**
 * A copy of an object with one key replaced — keeps each case to the one field it is about.
 *
 * Returns `unknown` on purpose: every case here feeds a `safeParse`, which takes `unknown`, and typing
 * the result would make the invalid literals unwritable.
 * @param base - the valid object to copy
 * @param patch - the keys to replace, or to add where the case is about an unrecognised one
 * @returns the copy, untyped
 */
function withField(base: object, patch: Record<string, unknown>): unknown {
  return { ...base, ...patch }
}

describe('yearFormat schemas', () => {
  describe('happy path', () => {
    it('reads a registry and gives back what it was given', () => {
      expect(yearRegistrySchema.parse(registry)).toEqual(registry)
    })

    it('reads a territory file, rings as index lists', () => {
      const parsed = yearPolitiesSchema.parse(polities)
      expect(parsed.claims[0]?.rings[0]).toEqual([0, 1, 2])
      expect(parsed.anchors[0]).toEqual([2.35, 48.85])
    })

    it('reads a borders file, dressed by pair and by run', () => {
      const parsed = yearBordersSchema.parse(borders)
      expect(parsed.pairs[0]?.between).toEqual(['fr-couronne', 'hre'])
      expect(parsed.runs[0]?.run).toEqual([0, 1])
    })
  })

  describe('variants', () => {
    it('accepts null everywhere the format allows it — most of a polity is optional data', () => {
      const bare = {
        ...polity,
        rank: null,
        status: null,
        suzerain: null,
        existsFrom: null,
        existsTo: null,
        colour: null,
        wikidata: null,
      }
      expect(yearPolitySchema.parse(bare)).toEqual(bare)
    })

    it('accepts a suzerain, which is how vassalage is declared', () => {
      const vassal = withField(polity, { id: 'aquitaine', suzerain: 'fr-couronne' })
      expect(yearPolitySchema.safeParse(vassal).success).toBe(true)
    })

    it('accepts a pinned colour as six hex digits', () => {
      expect(yearPolitySchema.safeParse(withField(polity, { colour: '#b8554a' })).success).toBe(
        true
      )
      expect(yearPolitySchema.safeParse(withField(polity, { colour: '#B8554A' })).success).toBe(
        true
      )
    })

    it('accepts a year before the common era', () => {
      expect(yearRegistrySchema.safeParse(withField(registry, { year: -500 })).success).toBe(true)
    })

    it('accepts every fact a limit can be, and nothing else', () => {
      for (const fact of ['agreed', 'de-facto', 'contested', 'indefinite'])
        expect(borderFactSchema.safeParse(fact).success).toBe(true)
      expect(borderFactSchema.safeParse('undefined').success).toBe(false)
    })

    it('accepts several rings on one claim — a hole or an exclave, told apart by inclusion', () => {
      const twoRings = {
        polity: 'pl-couronne',
        rings: [
          [0, 1, 2, 3],
          [4, 5, 6],
        ],
      }
      expect(yearClaimSchema.parse(twoRings).rings).toHaveLength(2)
    })
  })

  describe('managed errors', () => {
    it('refuses an unrecognised key rather than dropping it — the reason every object is strict', () => {
      // `colours` for `colour` is the case this guards: stripped in silence, a pinned colour would
      // vanish and the polity would quietly take a palette colour instead.
      const result = yearPolitySchema.safeParse(withField(polity, { colours: '#b8554a' }))
      expect(result.success).toBe(false)
    })

    it('refuses a colour that is not six hex digits', () => {
      for (const colour of ['blue', '#fff', '#1234567', 'b8554a'])
        expect(yearPolitySchema.safeParse(withField(polity, { colour })).success).toBe(false)
    })

    it('refuses a Wikidata id that is not a Q-number', () => {
      for (const wikidata of ['70972', 'q237131', 'Q', 'Q12a'])
        expect(yearPolitySchema.safeParse(withField(polity, { wikidata })).success).toBe(false)
    })

    it('refuses a territory file that still carries an editorial zone', () => {
      // The zone left the format on 2026-10-18. A file written before then is refused, not stripped,
      // like any other unrecognised key.
      const legacy = withField(polities, {
        editorialZone: { west: -45, south: 20, east: 60, north: 76 },
      })
      expect(yearPolitiesSchema.safeParse(legacy).success).toBe(false)
    })

    it('refuses a ring of fewer than three indices, which encloses no area', () => {
      expect(yearClaimSchema.safeParse({ polity: 'x', rings: [[0, 1]] }).success).toBe(false)
    })

    it('refuses a run of fewer than two indices, which is not a segment', () => {
      expect(
        runBorderSchema.safeParse({ run: [0], hand: null, source: null, note: null }).success
      ).toBe(false)
    })

    it('refuses a negative anchor index', () => {
      expect(yearClaimSchema.safeParse({ polity: 'x', rings: [[0, -1, 2]] }).success).toBe(false)
    })

    it('refuses an empty id or an empty name', () => {
      expect(yearPolitySchema.safeParse(withField(polity, { id: '' })).success).toBe(false)
      expect(yearPolitySchema.safeParse(withField(polity, { name: '' })).success).toBe(false)
    })

    it('names the field that is wrong, so a message can say where', () => {
      const result = yearRegistrySchema.safeParse(
        withField(registry, { polities: [withField(polity, { colour: 'blue' })] })
      )
      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.error.issues[0]?.path).toEqual(['polities', 0, 'colour'])
    })
  })

  describe('unmanaged errors', () => {
    // L4: no async operation here — a schema is pure. What follows is the malformed-payload class:
    // values nobody declared, arriving from a file someone edited by hand.

    it('refuses anything that is not an object where one is expected', () => {
      for (const value of [null, undefined, 42, 'registry', [], true])
        expect(yearRegistrySchema.safeParse(value).success).toBe(false)
    })

    it('refuses a string where a number belongs', () => {
      expect(yearRegistrySchema.safeParse(withField(registry, { year: '1100' })).success).toBe(
        false
      )
    })

    it('refuses a non-finite coordinate, which is the guarantee `.finite()` used to state', () => {
      // Zod 4 rejects NaN and Infinity from `z.number()` by default, which is why the explicit
      // `.finite()` calls were removed on 2026-09-27. Asserted rather than taken on trust: a NaN
      // coordinate rasterises as a polity claiming nothing anywhere — a country silently absent.
      for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
        expect(
          yearPolitiesSchema.safeParse(withField(polities, { anchors: [[bad, 48]] })).success
        ).toBe(false)
      }
    })

    it('refuses an anchor that is not a pair', () => {
      expect(yearPolitiesSchema.safeParse(withField(polities, { anchors: [[2.35]] })).success).toBe(
        false
      )
    })

    it('refuses a missing field rather than reading it as null', () => {
      const { colour: _colour, ...withoutColour } = polity
      expect(yearPolitySchema.safeParse(withoutColour).success).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('accepts year zero', () => {
      expect(yearRegistrySchema.safeParse(withField(registry, { year: 0 })).success).toBe(true)
    })

    it('refuses format version zero, so an unversioned file cannot pass as version-less', () => {
      expect(yearRegistrySchema.safeParse(withField(registry, { version: 0 })).success).toBe(false)
    })

    it('accepts an empty registry — a year created from nothing starts with no polity', () => {
      expect(yearRegistrySchema.safeParse(withField(registry, { polities: [] })).success).toBe(true)
    })

    it('accepts a territory file with nothing drawn yet', () => {
      const empty = withField(polities, { anchors: [], anchorSource: [], claims: [] })
      expect(yearPolitiesSchema.safeParse(empty).success).toBe(true)
    })

    it('accepts a ring of exactly three and a run of exactly two', () => {
      expect(yearClaimSchema.safeParse({ polity: 'x', rings: [[0, 1, 2]] }).success).toBe(true)
      expect(
        runBorderSchema.safeParse({ run: [0, 1], hand: null, source: null, note: null }).success
      ).toBe(true)
    })

    it('accepts anchor index zero, which is a real anchor and not an absence', () => {
      expect(yearClaimSchema.safeParse({ polity: 'x', rings: [[0, 1, 2]] }).success).toBe(true)
    })

    it('lets a polity end before it began, because that is not a schema question', () => {
      // Deliberate: `existsTo < existsFrom` is a *consistency* failure, and the taxonomy keeps those
      // out of the schema layer. Asserted so nobody adds the check here and splits the taxonomy.
      const impossible = withField(polity, { existsFrom: 1200, existsTo: 1100 })
      expect(yearPolitySchema.safeParse(impossible).success).toBe(true)
    })

    it('lets a pair name a polity twice, for the same reason', () => {
      const selfPair = withField(borders.pairs[0] ?? {}, {
        between: ['fr-couronne', 'fr-couronne'],
      })
      expect(pairBorderSchema.safeParse(selfPair).success).toBe(true)
    })
  })
})
