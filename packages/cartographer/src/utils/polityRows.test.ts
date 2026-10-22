import { describe, expect, it } from 'vitest'

import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'

import { polityRows } from './polityRows'

const COLOURS = new Map([
  ['fr-couronne', '#aa0000'],
  ['hre', '#00aa00'],
])

describe('polityRows', () => {
  describe('happy path', () => {
    // s16 — the list is the stack, the front first; s01 — "its colour swatch, its name, and its rank".
    it('lists every polity front first, with its colour and rank', () => {
      const rows = polityRows(sharedBorderDocument(), COLOURS)
      expect(rows.map((row) => row.id)).toEqual(['hre', 'fr-couronne'])
      expect(rows[1]).toMatchObject({ rank: 'kingdom', colour: '#aa0000', depth: 0 })
    })

    // s16 — the dev's layer model: a suzerain's vassals beneath it, indented, front first.
    it('lists each suzerain followed by its vassals, one level deeper, front first', () => {
      const document = sharedBorderDocument()
      const [france, empire] = document.polities
      if (france === undefined || empire === undefined) throw new Error('fixture changed')
      document.polities = [
        france,
        { ...france, id: 'normandy', name: 'Normandie', suzerain: 'fr-couronne' },
        { ...france, id: 'aquitaine', name: 'Aquitaine', suzerain: 'fr-couronne' },
        empire,
      ]
      const rows = polityRows(document, COLOURS)
      expect(rows.map((row) => [row.id, row.depth])).toEqual([
        ['hre', 0],
        ['fr-couronne', 0],
        ['aquitaine', 1],
        ['normandy', 1],
      ])
    })
  })

  describe('variants', () => {
    // s02 — "Kingdom of France · kingdom · 987–".
    it('writes "987–" for a start with no end, and "962–1806" for both', () => {
      const document = sharedBorderDocument()
      const empire = document.polities[1]
      if (empire) empire.existsTo = 1806
      const rows = polityRows(document, COLOURS)
      expect(rows.map((row) => row.dates)).toEqual(['962–1806', '987–'])
    })

    it('marks a polity with territory, and one without', () => {
      const document = sharedBorderDocument()
      document.claims = document.claims.filter((claim) => claim.polity === 'hre')
      const rows = polityRows(document, COLOURS)
      expect(rows.map((row) => [row.id, row.hasTerritory])).toEqual([
        ['hre', true],
        ['fr-couronne', false],
      ])
    })

    // The dev, 2026-10-15: a suzerain made of its vassals has territory.
    it('gives territory to a suzerain whose only ground is its vassal’s', () => {
      const document = sharedBorderDocument()
      const france = document.polities.find((polity) => polity.id === 'fr-couronne')
      if (france) france.suzerain = 'hre'
      document.claims = document.claims.filter((claim) => claim.polity === 'fr-couronne')
      const rows = polityRows(document, COLOURS)
      expect(rows.find((row) => row.id === 'hre')?.hasTerritory).toBe(true)
    })
  })

  describe('managed errors', () => {
    // s02 — territory-less is the normal starting state: a claim with no ring is no territory either.
    it('counts a claim with no ring as no territory', () => {
      const document = sharedBorderDocument()
      const claim = document.claims[0]
      if (claim) claim.rings = []
      expect(
        polityRows(document, COLOURS).find((row) => row.id === 'fr-couronne')?.hasTerritory
      ).toBe(false)
    })
  })

  describe('unmanaged errors', () => {
    it('leaves the dates and the rank empty when nothing is known', () => {
      const document = sharedBorderDocument()
      for (const polity of document.polities) {
        polity.rank = null
        polity.existsFrom = null
        polity.existsTo = null
      }
      expect(polityRows(document, COLOURS).map((row) => [row.rank, row.dates])).toEqual([
        ['', ''],
        ['', ''],
      ])
    })
  })

  describe('edge cases', () => {
    it('writes "–1806" for an end with no start', () => {
      const document = sharedBorderDocument()
      const empire = document.polities[1]
      if (empire) {
        empire.existsFrom = null
        empire.existsTo = 1806
      }
      expect(polityRows(document, COLOURS).find((row) => row.id === 'hre')?.dates).toBe('–1806')
    })

    // QUAL-001: a polity the colour source has no colour for gets null, never an empty string.
    it('gives a null colour to a polity the colour map lacks', () => {
      expect(polityRows(sharedBorderDocument(), new Map())[0]?.colour).toBeNull()
    })

    // A loop of homage: listed, at the top level, last — documentFaults says so.
    it('lists the polities of a loop of homage last, at the top level', () => {
      const document = sharedBorderDocument()
      document.polities = document.polities.map((polity) => ({
        ...polity,
        suzerain: polity.id === 'hre' ? 'fr-couronne' : 'hre',
      }))
      expect(polityRows(document, COLOURS).map((row) => [row.id, row.depth])).toEqual([
        ['fr-couronne', 0],
        ['hre', 1],
      ])
    })

    it('lists nothing for a year with no polity', () => {
      const document = sharedBorderDocument()
      document.polities = []
      expect(polityRows(document, COLOURS)).toEqual([])
    })
  })
})
