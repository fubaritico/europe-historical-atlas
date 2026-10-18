import { describe, expect, it, vi } from 'vitest'

import { hexToRgb } from '../utils/color'

import { addAnchor, addPolity, closeRing } from './documentEdits'
import { sharedBorderDocument } from './documentFixtures'
import { homageLevels } from './homageLevels'
import {
  authoredRegionColours,
  authoredTintLevels,
  polityColours,
  polityNeighbours,
} from './polityColours'
import { createYearDocument, openYearDocument, saveYearDocument } from './yearDocument'

import type { HomageLevels } from './homageLevels'
import type { Region } from '../data/regionSource'
import type { AuthoredYear } from '../data/yearFormat'

const PALETTE: [string, ...string[]] = ['#aa0000', '#00aa00', '#0000aa']

describe('polityColours', () => {
  describe('happy path', () => {
    // s02 — "it takes a palette colour no neighbour is using".
    it('gives two neighbours two different palette slots', () => {
      const colours = polityColours(sharedBorderDocument(), PALETTE)
      expect(colours.get('fr-couronne')).not.toBe(colours.get('hre'))
      expect(PALETTE).toContain(colours.get('fr-couronne'))
      expect(PALETTE).toContain(colours.get('hre'))
    })

    it('finds neighbours through the anchors their rings share', () => {
      expect(polityNeighbours(sharedBorderDocument())).toEqual([new Set([1]), new Set([0])])
    })
  })

  describe('variants', () => {
    // s02 — "explicit when given".
    it('keeps a colour the author pinned', () => {
      const doc = sharedBorderDocument()
      const france = doc.polities[0]
      if (france) france.colour = '#123456'
      expect(polityColours(doc, PALETTE).get('fr-couronne')).toBe('#123456')
    })

    it('gives a polity with no neighbour the first slot', () => {
      const doc = createYearDocument(1100)
      addPolity(doc, { ...base('alone') })
      expect(polityColours(doc, PALETTE).get('alone')).toBe('#aa0000')
    })
  })

  describe('managed errors', () => {
    // L3: N/A — nothing is refused; an empty palette is excluded by the type.
    it('colours a polity with no territory, which is the normal starting state', () => {
      const doc = createYearDocument(1100)
      addPolity(doc, base('fr'))
      expect(polityColours(doc, PALETTE).get('fr')).toBe('#aa0000')
    })
  })

  describe('unmanaged errors', () => {
    // A claim naming a polity the registry lacks is ignored for adjacency rather than thrown on.
    it('ignores a claim whose polity is not in the registry', () => {
      const doc = sharedBorderDocument()
      doc.polities.pop()
      expect(polityNeighbours(doc)).toEqual([new Set()])
    })
  })

  describe('edge cases', () => {
    // Touching at one corner is not sharing a border: no edge in common, no constraint on colour.
    it('does not count a single shared anchor as a border', () => {
      const doc = createYearDocument(1100)
      for (const point of [
        [0, 0],
        [1, 0],
        [1, 1],
        [2, 1],
        [2, 2],
      ] as [number, number][])
        addAnchor(doc, point, 0)
      addPolity(doc, base('a'))
      addPolity(doc, base('b'))
      closeRing(doc, 'a', [0, 1, 2])
      closeRing(doc, 'b', [2, 3, 4])
      expect(polityNeighbours(doc)).toEqual([new Set(), new Set()])
    })
  })
})

/** A polity with only an id and a name. */
function base(id: string) {
  return {
    id,
    name: id,
    rank: null,
    status: null,
    suzerain: null,
    existsFrom: null,
    existsTo: null,
    colour: null,
    wikidata: null,
  }
}

const authored = () => ({ year: 1100, ...saveYearDocument(sharedBorderDocument()) })

describe('authoredRegionColours', () => {
  describe('happy path', () => {
    it('paints each region in its polity’s editor colour, in the regions’ order', () => {
      const byId = polityColours(sharedBorderDocument(), PALETTE)

      const colours = authoredRegionColours(
        authored(),
        [{ polityId: 'hre' }, { polityId: 'fr-couronne' }],
        PALETTE
      )

      expect(colours).toEqual([
        hexToRgb(byId.get('hre') ?? ''),
        hexToRgb(byId.get('fr-couronne') ?? ''),
      ])
    })
  })

  describe('variants', () => {
    it('keeps a colour the author pinned', () => {
      const year = authored()
      const france = year.registry.polities.find((polity) => polity.id === 'fr-couronne')
      if (france) france.colour = '#123456'

      expect(authoredRegionColours(year, [{ polityId: 'fr-couronne' }], PALETTE)).toEqual([
        { r: 0x12, g: 0x34, b: 0x56 },
      ])
    })
  })

  describe('managed errors', () => {
    // Every adapted region carries its id: a miss is a defect, never a guessed colour.
    it('refuses a region naming no polity of the year', () => {
      expect(() => authoredRegionColours(authored(), [{ polityId: 'nobody' }], PALETTE)).toThrow(
        /names no polity/
      )
    })

    it('refuses a region carrying no polity id', () => {
      expect(() => authoredRegionColours(authored(), [{}], PALETTE)).toThrow(/names no polity/)
    })
  })

  // L4: N/A — a lookup over a map the year built; nothing awaited or caught.

  describe('edge cases', () => {
    it('answers no colour for no region', () => {
      expect(authoredRegionColours(authored(), [], PALETTE)).toEqual([])
    })
  })
})

/** France, Burgundy under it, Nevers under Burgundy, and Hungary alone — each colour pinned. */
function homageYear() {
  const doc = createYearDocument(1100)
  addPolity(doc, { ...base('france'), colour: '#000001' })
  addPolity(doc, { ...base('burgundy'), suzerain: 'france', colour: '#000002' })
  addPolity(doc, { ...base('nevers'), suzerain: 'burgundy', colour: '#000003' })
  addPolity(doc, { ...base('hungary'), colour: '#000004' })
  return { year: 1100, ...saveYearDocument(doc) }
}

const rgb = (b: number) => ({ r: 0, g: 0, b })

/**
 * The tint levels of a year, its colours and homage derived as the atlas derives them.
 * @param year - the year's three files
 * @param regions - the regions, by polity id
 * @param homage - the homage to read the levels from; the year's own by default
 * @returns one list per level
 */
const levelsOf = (
  year: AuthoredYear,
  regions: readonly Pick<Region, 'polityId'>[],
  homage: HomageLevels = homageLevels(year.registry.polities)
) => authoredTintLevels(polityColours(openYearDocument(year), PALETTE), regions, homage)

describe('authoredTintLevels', () => {
  const regions = [
    { polityId: 'france' },
    { polityId: 'burgundy' },
    { polityId: 'nevers' },
    { polityId: 'hungary' },
  ]

  describe('happy path', () => {
    it('paints each region in its ancestor at every level, level 0 first', () => {
      expect(levelsOf(homageYear(), regions)).toEqual([
        [rgb(1), rgb(1), rgb(1), rgb(4)],
        [rgb(1), rgb(2), rgb(2), rgb(4)],
        [rgb(1), rgb(2), rgb(3), rgb(4)],
      ])
    })

    it('ends on the colours the atlas painted before levels, exactly', () => {
      const year = authored()
      const pair = [{ polityId: 'hre' }, { polityId: 'fr-couronne' }]
      const levels = levelsOf(year, pair)
      expect(levels[levels.length - 1]).toEqual(authoredRegionColours(year, pair, PALETTE))
    })

    // The invariant the atlas's pipeline relies on: it asks the compute for `authoredRegionColours`, and
    // uses those tints as the deepest level beside the levels read from `polityColours`.
    it('ends on authoredRegionColours for a year with sub-vassals, same year and palette', () => {
      const year = homageYear()
      const levels = levelsOf(year, regions)
      expect(levels).toHaveLength(3)
      expect(levels[2]).toEqual(authoredRegionColours(year, regions, PALETTE))
    })
  })

  describe('variants', () => {
    it('has one level for a year with no vassal', () => {
      expect(levelsOf(authored(), [{ polityId: 'hre' }])).toHaveLength(1)
    })

    it('reads the levels from the homage it is handed', () => {
      const ancestorAt = vi.fn(() => 'france')
      const levels = levelsOf(homageYear(), [{ polityId: 'nevers' }], {
        chainOf: () => [],
        ancestorAt,
        splitLevel: () => 0,
        deepest: 1,
      })
      expect(levels).toEqual([[rgb(1)], [rgb(1)]])
      expect(ancestorAt).toHaveBeenCalledWith('nevers', 1)
    })

    it('paints from the colour map it is handed, not one of its own', () => {
      const colours = new Map([
        ['france', '#0000aa'],
        ['burgundy', '#0000bb'],
        ['nevers', '#0000cc'],
        ['hungary', '#0000dd'],
      ])
      const levels = authoredTintLevels(
        colours,
        [{ polityId: 'nevers' }],
        homageLevels(homageYear().registry.polities)
      )
      expect(levels).toEqual([[rgb(0xaa)], [rgb(0xbb)], [rgb(0xcc)]])
    })
  })

  describe('managed errors', () => {
    it('refuses a region naming no polity of the year', () => {
      expect(() => levelsOf(homageYear(), [{ polityId: 'nobody' }])).toThrow(/names no polity/)
    })

    it('refuses a region carrying no polity id', () => {
      expect(() => levelsOf(homageYear(), [{}])).toThrow(/names no polity/)
    })
  })

  // L4: N/A — lookups over maps the year built; nothing awaited or caught.

  describe('edge cases', () => {
    it('answers every level empty for no region', () => {
      expect(levelsOf(homageYear(), [])).toEqual([[], [], []])
    })
  })
})
