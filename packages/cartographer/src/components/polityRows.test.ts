import { describe, expect, it } from 'vitest'

import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'

import { polityRows } from './polityRows'

const COLOURS = new Map([
  ['fr-couronne', '#aa0000'],
  ['hre', '#00aa00'],
])

describe('polityRows', () => {
  describe('happy path', () => {
    // s01 — "sorted by name", "its colour swatch, its name, and its rank".
    it('lists every polity, sorted by name, with its colour and rank', () => {
      const rows = polityRows(sharedBorderDocument(), COLOURS)
      expect(rows.map((row) => row.name)).toEqual(['Reaume de France', 'Sacrum Imperium'])
      expect(rows[0]).toMatchObject({ id: 'fr-couronne', rank: 'kingdom', colour: '#aa0000' })
    })
  })

  describe('variants', () => {
    // s02 — "Kingdom of France · kingdom · 987–".
    it('writes "987–" for a start with no end, and "962–1806" for both', () => {
      const document = sharedBorderDocument()
      const empire = document.polities[1]
      if (empire) empire.existsTo = 1806
      const rows = polityRows(document, COLOURS)
      expect(rows.map((row) => row.dates)).toEqual(['987–', '962–1806'])
    })

    it('marks a polity with territory, and one without', () => {
      const document = sharedBorderDocument()
      document.claims = document.claims.filter((claim) => claim.polity === 'hre')
      const rows = polityRows(document, COLOURS)
      expect(rows.map((row) => row.hasTerritory)).toEqual([false, true])
    })
  })

  describe('managed errors', () => {
    // s02 — territory-less is the normal starting state: a claim with no ring is no territory either.
    it('counts a claim with no ring as no territory', () => {
      const document = sharedBorderDocument()
      const claim = document.claims[0]
      if (claim) claim.rings = []
      expect(polityRows(document, COLOURS)[0]?.hasTerritory).toBe(false)
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
      expect(polityRows(document, COLOURS)[1]?.dates).toBe('–1806')
    })

    // QUAL-001: a polity the colour source has no colour for gets null, never an empty string.
    it('gives a null colour to a polity the colour map lacks', () => {
      expect(polityRows(sharedBorderDocument(), new Map())[0]?.colour).toBeNull()
    })

    it('lists nothing for a year with no polity', () => {
      const document = sharedBorderDocument()
      document.polities = []
      expect(polityRows(document, COLOURS)).toEqual([])
    })
  })
})
