import { describe, expect, it } from 'vitest'

import { isAssetError } from './assetError'
import { assembleAuthoredYear } from './yearConsistency'

import type { AssetError } from './assetError'
import type { YearFiles } from './yearConsistency'

/** A minimal year that passes every check: France, its vassal Aquitaine, one shared border. */
function validYear(): YearFiles {
  return {
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
        [1, 48],
        [1, 47],
        [0, 47],
      ],
      anchorSource: [0, 0, 0, 0],
      claims: [
        { polity: 'fr-couronne', rings: [[0, 1, 2, 3]] },
        { polity: 'aquitaine', rings: [[0, 1, 2]] },
      ],
      deliberateGaps: [],
    },
    borders: {
      version: 1,
      year: 1100,
      pairs: [
        {
          between: ['fr-couronne', 'aquitaine'],
          type: 'agreed',
          hand: null,
          source: 0,
          note: null,
        },
      ],
      runs: [{ run: [0, 1], hand: 'bold', source: null, note: null }],
    },
  }
}

/** Run the assembly and hand back the failure, so each case can read its fields. */
function failureOf(files: YearFiles): AssetError {
  try {
    assembleAuthoredYear(files, 'years/1100')
    throw new Error('expected a failure and got none')
  } catch (error: unknown) {
    if (!isAssetError(error)) throw error
    return error
  }
}

describe('assembleAuthoredYear', () => {
  describe('happy path', () => {
    it('binds three agreeing files into one year', () => {
      const year = assembleAuthoredYear(validYear(), 'years/1100')
      expect(year.year).toBe(1100)
      expect(year.registry.polities).toHaveLength(2)
      expect(year.polities.claims).toHaveLength(2)
    })

    it('accepts a year with nothing drawn yet', () => {
      const files = validYear()
      files.polities.anchors = []
      files.polities.anchorSource = []
      files.polities.claims = []
      files.borders.pairs = []
      files.borders.runs = []
      expect(assembleAuthoredYear(files, 'years/1100').year).toBe(1100)
    })
  })

  describe('variants', () => {
    it('accepts a chain of homage several links deep', () => {
      const files = validYear()
      files.registry.polities.push({
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
      expect(assembleAuthoredYear(files, 'years/1100').registry.polities).toHaveLength(3)
    })

    it('accepts a polity with no territory, which is the normal starting state', () => {
      const files = validYear()
      files.polities.claims = [{ polity: 'fr-couronne', rings: [[0, 1, 2, 3]] }]
      expect(assembleAuthoredYear(files, 'years/1100').registry.polities).toHaveLength(2)
    })

    it('accepts a declared gap whose ring is in range', () => {
      const files = validYear()
      files.polities.deliberateGaps = [{ ring: [0, 1, 2], reason: 'marches' }]
      expect(assembleAuthoredYear(files, 'years/1100').polities.deliberateGaps).toHaveLength(1)
    })
  })

  describe('managed errors', () => {
    it('refuses a ring pointing past the end of the anchor table', () => {
      // The check this file exists for: index 4 of 4 anchors resolves to undefined, whose coordinates
      // are NaN, and a NaN ring rasterises as a polity claiming nothing anywhere.
      const files = validYear()
      files.polities.claims[0] = { polity: 'fr-couronne', rings: [[0, 1, 4]] }
      const error = failureOf(files)
      expect(error.failure).toBe('consistency')
      expect(error.asset).toBe('yearPolities')
      expect(error.detail).toContain('anchor 4 of 4')
    })

    it('refuses a claim naming a polity the registry has never heard of', () => {
      const files = validYear()
      files.polities.claims[0] = { polity: 'burgundy', rings: [[0, 1, 2]] }
      const error = failureOf(files)
      expect(error.failure).toBe('consistency')
      expect(error.detail).toContain('burgundy')
    })

    it('refuses two polities sharing an id', () => {
      const files = validYear()
      const first = files.registry.polities[0]
      if (first === undefined) throw new Error('fixture')
      files.registry.polities.push({ ...first, name: 'something else' })
      const error = failureOf(files)
      expect(error.asset).toBe('yearRegistry')
      expect(error.detail).toContain('share the id')
    })

    it('refuses a suzerain that is in no registry entry', () => {
      const files = validYear()
      const vassal = files.registry.polities[1]
      if (vassal === undefined) throw new Error('fixture')
      vassal.suzerain = 'hre'
      const error = failureOf(files)
      expect(error.asset).toBe('yearRegistry')
      expect(error.detail).toContain('hre')
    })

    it('refuses a loop of homage, which would hang anything walking the chain', () => {
      const files = validYear()
      const [crown, vassal] = files.registry.polities
      if (crown === undefined || vassal === undefined) throw new Error('fixture')
      crown.suzerain = vassal.id
      const error = failureOf(files)
      expect(error.detail).toContain('loop')
    })

    it('refuses three files that do not describe the same year', () => {
      const files = validYear()
      files.polities.year = 1110
      const error = failureOf(files)
      expect(error.asset).toBe('yearPolities')
      expect(error.detail).toContain('the registry says 1100')
    })

    it('refuses a format version it does not know, as semantic and not consistency', () => {
      // Internally sound, simply not ours to read — the same class as a mask cropped elsewhere.
      const files = validYear()
      files.borders.version = 2
      const error = failureOf(files)
      expect(error.failure).toBe('semantic')
      expect(error.asset).toBe('yearBorders')
    })

    it('refuses an anchor source table of the wrong length', () => {
      const files = validYear()
      files.polities.anchorSource = [0, 0]
      const error = failureOf(files)
      expect(error.detail).toContain('2 anchor sources for 4 anchors')
    })

    it('refuses an anchor citing a provenance nobody declared', () => {
      const files = validYear()
      files.polities.anchorSource = [0, 0, 0, 7]
      const error = failureOf(files)
      expect(error.detail).toContain('names source 7, undeclared')
    })

    it('refuses a border naming a polity the registry lacks', () => {
      const files = validYear()
      files.borders.pairs = [
        { between: ['fr-couronne', 'hre'], type: 'agreed', hand: null, source: null, note: null },
      ]
      const error = failureOf(files)
      expect(error.asset).toBe('yearBorders')
      expect(error.detail).toContain('hre')
    })

    it('refuses a dressed run pointing past the anchor table', () => {
      const files = validYear()
      files.borders.runs = [{ run: [0, 99], hand: 'bold', source: null, note: null }]
      const error = failureOf(files)
      expect(error.asset).toBe('yearBorders')
      expect(error.detail).toContain('anchor 99 of 4')
    })

    it('refuses a declared gap pointing past the anchor table', () => {
      const files = validYear()
      files.polities.deliberateGaps = [{ ring: [0, 1, 50], reason: 'marches' }]
      expect(failureOf(files).detail).toContain('anchor 50 of 4')
    })
  })

  describe('unmanaged errors', () => {
    // L4: no async operation and no external collaborator — the input is three already-checked payloads.

    it('names the file holding the bad reference, not the file it points at', () => {
      // A claim citing an unknown polity is the territory file's problem: that is the file to edit.
      const files = validYear()
      files.polities.claims[0] = { polity: 'nowhere', rings: [[0, 1, 2]] }
      expect(failureOf(files).asset).toBe('yearPolities')
    })

    it('reports the first disagreement and stops, rather than guessing which file is right', () => {
      const files = validYear()
      files.polities.year = 1110
      files.polities.claims[0] = { polity: 'nowhere', rings: [[0, 1, 2]] }
      // The year is checked before the claims, so that is what is reported.
      expect(failureOf(files).detail).toContain('the registry says 1100')
    })
  })

  describe('edge cases', () => {
    it('accepts an index exactly one below the anchor count', () => {
      const files = validYear()
      files.polities.claims[0] = { polity: 'fr-couronne', rings: [[1, 2, 3]] }
      expect(assembleAuthoredYear(files, 'years/1100').polities.claims).toHaveLength(2)
    })

    it('refuses an index exactly at the anchor count', () => {
      const files = validYear()
      files.polities.claims[0] = { polity: 'fr-couronne', rings: [[1, 2, 4]] }
      expect(failureOf(files).detail).toContain('anchor 4 of 4')
    })

    it('refuses a polity owing itself, which is the shortest loop there is', () => {
      const files = validYear()
      const crown = files.registry.polities[0]
      if (crown === undefined) throw new Error('fixture')
      crown.suzerain = crown.id
      expect(failureOf(files).detail).toContain('loop')
    })

    it('accepts an empty registry with an empty territory', () => {
      const files = validYear()
      files.registry.polities = []
      files.polities.claims = []
      files.borders.pairs = []
      expect(assembleAuthoredYear(files, 'years/1100').registry.polities).toHaveLength(0)
    })
  })
})
