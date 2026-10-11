import { describe, expect, it } from 'vitest'

import { projectRegions } from './regionSource'
import { toRegionPayload } from './toRegionPayload'

import type { AuthoredYear } from './yearFormat'
import type { GeoBounds } from '../geo/mercator'

/** The render frame, which is the DEM's and deliberately not the editorial zone. */
const renderBbox: GeoBounds = { west: -45, south: 11.18, east: 78.75, north: 76.84 }

/** France, its vassal Aquitaine drawn inside it, and a square of four anchors they share. */
function authoredYear(): AuthoredYear {
  return {
    year: 1100,
    registry: {
      version: 1,
      year: 1100,
      polities: [
        {
          id: 'fr-couronne',
          name: 'Reaume de France',
          rank: 'kingdom',
          status: 'country',
          suzerain: null,
          existsFrom: 987,
          existsTo: null,
          colour: null,
          wikidata: null,
        },
        {
          id: 'aquitaine',
          name: 'Duché d’Aquitaine',
          rank: 'duchy',
          status: null,
          suzerain: 'fr-couronne',
          existsFrom: 1058,
          existsTo: null,
          colour: null,
          wikidata: null,
        },
      ],
    },
    polities: {
      version: 1,
      year: 1100,
      editorialZone: { west: -45, south: 20, east: 60, north: 76 },
      sources: [{ id: 0, name: 'Natural Earth 10m coastline', licence: 'public domain' }],
      anchors: [
        [0, 48],
        [2, 48],
        [2, 46],
        [0, 46],
      ],
      anchorSource: [0, 0, 0, 0],
      claims: [
        // The vassal first on purpose: the adapter must reorder, not trust file order.
        { polity: 'aquitaine', rings: [[0, 1, 2]] },
        { polity: 'fr-couronne', rings: [[0, 1, 2, 3]] },
      ],
      deliberateGaps: [],
    },
    borders: { version: 1, year: 1100, pairs: [], runs: [] },
  }
}

describe('toRegionPayload', () => {
  describe('happy path', () => {
    it('resolves indices into the coordinates their anchors hold', () => {
      const payload = toRegionPayload(authoredYear(), renderBbox)
      const france = payload.regions.find((region) => region.name === 'Reaume de France')
      expect(france?.rings[0]?.slice(0, 4)).toEqual([
        [0, 48],
        [2, 48],
        [2, 46],
        [0, 46],
      ])
    })

    it('writes the name flat, out of the year’s own registry', () => {
      const payload = toRegionPayload(authoredYear(), renderBbox)
      expect(payload.regions.map((region) => region.name).sort()).toEqual([
        'Duché d’Aquitaine',
        'Reaume de France',
      ])
    })

    it('carries the year and the render frame it was given', () => {
      const payload = toRegionPayload(authoredYear(), renderBbox)
      expect(payload.year).toBe(1100)
      expect(payload.bbox).toEqual(renderBbox)
    })
  })

  describe('variants', () => {
    it('fills subjectTo with the suzerain’s NAME, which is what the atlas groups on', () => {
      const payload = toRegionPayload(authoredYear(), renderBbox)
      const aquitaine = payload.regions.find((region) => region.name === 'Duché d’Aquitaine')
      expect(aquitaine?.subjectTo).toBe('Reaume de France')
    })

    it('leaves subjectTo null for a polity owing nobody', () => {
      const payload = toRegionPayload(authoredYear(), renderBbox)
      const france = payload.regions.find((region) => region.name === 'Reaume de France')
      expect(france?.subjectTo).toBeNull()
    })

    it('paints a vassal over its lord', () => {
      // `rasteriseRegions` resolves an overlap by "later index wins", so the suzerain has to come first.
      // This is H-05a implemented in the adapter rather than in the rasteriser.
      const payload = toRegionPayload(authoredYear(), renderBbox)
      expect(payload.regions.map((region) => region.name)).toEqual([
        'Reaume de France',
        'Duché d’Aquitaine',
      ])
    })

    // s16 — a group brought forward covers the group behind it, vassals included.
    it('paints a later group over an earlier group’s vassal', () => {
      const year = authoredYear()
      year.registry.polities.push({
        id: 'hre',
        name: 'Sacrum Imperium',
        rank: 'empire',
        status: null,
        suzerain: null,
        existsFrom: 962,
        existsTo: null,
        colour: null,
        wikidata: null,
      })
      year.polities.claims.push({ polity: 'hre', rings: [[1, 2, 3]] })
      const payload = toRegionPayload(year, renderBbox)
      expect(payload.regions.map((region) => region.name)).toEqual([
        'Reaume de France',
        'Duché d’Aquitaine',
        'Sacrum Imperium',
      ])
    })

    it('orders a rear-vassal last of the three', () => {
      const year = authoredYear()
      year.registry.polities.push({
        id: 'poitou',
        name: 'Comté de Poitou',
        rank: 'county',
        status: null,
        suzerain: 'aquitaine',
        existsFrom: 900,
        existsTo: null,
        colour: null,
        wikidata: null,
      })
      year.polities.claims.unshift({ polity: 'poitou', rings: [[1, 2, 3]] })
      const payload = toRegionPayload(year, renderBbox)
      expect(payload.regions.map((region) => region.name)).toEqual([
        'Reaume de France',
        'Duché d’Aquitaine',
        'Comté de Poitou',
      ])
    })

    it('keeps several rings on one polity — a hole or an exclave, unchanged', () => {
      const year = authoredYear()
      year.polities.claims = [
        {
          polity: 'fr-couronne',
          rings: [
            [0, 1, 2, 3],
            [1, 2, 3],
          ],
        },
      ]
      expect(toRegionPayload(year, renderBbox).regions[0]?.rings).toHaveLength(2)
    })

    it('says nothing about partOf, because the format declares no such thing', () => {
      const payload = toRegionPayload(authoredYear(), renderBbox)
      for (const region of payload.regions) expect(region.partOf).toBeNull()
    })

    it('declares no simplification, because the anchors are what the author placed', () => {
      expect(toRegionPayload(authoredYear(), renderBbox).tolerance).toBe(0)
    })
  })

  describe('managed errors', () => {
    it('drops a claim whose polity is in no registry entry rather than naming an unknown power', () => {
      // Refused upstream by `assembleAuthoredYear`; this is the belt, and it must not invent a name.
      const year = authoredYear()
      year.polities.claims.push({ polity: 'burgundy', rings: [[0, 1, 2]] })
      const payload = toRegionPayload(year, renderBbox)
      expect(payload.regions).toHaveLength(2)
      expect(payload.regions.map((region) => region.name)).not.toContain('burgundy')
    })

    it('drops a ring whose indices point nowhere rather than emitting NaN coordinates', () => {
      const year = authoredYear()
      year.polities.claims = [{ polity: 'fr-couronne', rings: [[9, 10, 11]] }]
      expect(toRegionPayload(year, renderBbox).regions).toHaveLength(0)
    })
  })

  describe('unmanaged errors', () => {
    // L4: pure, no async, no collaborator. The malformed-input class is covered above, since the
    // adapter is reached only after the schema and the consistency checks have both passed.

    it('survives a suzerain the registry lacks, leaving subjectTo null', () => {
      const year = authoredYear()
      const vassal = year.registry.polities[1]
      if (vassal === undefined) throw new Error('fixture')
      vassal.suzerain = 'hre'
      const payload = toRegionPayload(year, renderBbox)
      const aquitaine = payload.regions.find((region) => region.name === 'Duché d’Aquitaine')
      expect(aquitaine?.subjectTo).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('closes each ring, so a triangle survives projectRegions rather than vanishing', () => {
      // Our rings imply closure; `projectRegions` drops anything under four points. A three-index
      // ring is legal in the format, so without the closing vertex a small polity would disappear
      // with nothing said — verified through the real consumer rather than against the adapter alone.
      const year = authoredYear()
      year.polities.claims = [{ polity: 'fr-couronne', rings: [[0, 1, 2]] }]
      const payload = toRegionPayload(year, renderBbox)
      expect(payload.regions[0]?.rings[0]).toHaveLength(4)
      expect(projectRegions(payload).regions).toHaveLength(1)
    })

    it('repeats the first vertex exactly, rather than a rounded copy of it', () => {
      const rings = toRegionPayload(authoredYear(), renderBbox).regions[0]?.rings[0]
      expect(rings?.[rings.length - 1]).toEqual(rings?.[0])
    })

    it('gives an empty payload for a year with nothing drawn, and not a broken one', () => {
      const year = authoredYear()
      year.polities.claims = []
      const payload = toRegionPayload(year, renderBbox)
      expect(payload.regions).toEqual([])
      expect(payload.year).toBe(1100)
    })

    it('keeps shared anchors as duplicated coordinates, which is right for a read-only consumer', () => {
      const payload = toRegionPayload(authoredYear(), renderBbox)
      const france = payload.regions.find((region) => region.name === 'Reaume de France')
      const aquitaine = payload.regions.find((region) => region.name === 'Duché d’Aquitaine')
      expect(france?.rings[0]?.[0]).toEqual(aquitaine?.rings[0]?.[0])
      // Separate arrays: the export is lossy and one-way, so nothing downstream can move both at once.
      expect(france?.rings[0]?.[0]).not.toBe(aquitaine?.rings[0]?.[0])
    })
  })
})
