import { describe, expect, it } from 'vitest'

import { snapLayersOf } from './snapLayers'

const LINE = {
  points: [[0, 0] as [number, number]],
  closed: false,
  bounds: { left: 0, top: 0, right: 0, bottom: 0 },
}
const COAST_SOURCE = { name: 'shore', licence: 'CC0' }
const RIVER_SOURCE = { name: 'rivers', licence: 'PD' }

const layers = snapLayersOf({
  coast: [LINE],
  coastProvenance: COAST_SOURCE,
  rivers: [
    { ...LINE, name: 'Maas' },
    { ...LINE, name: null },
  ],
  riverProvenance: RIVER_SOURCE,
})

describe('snapLayersOf', () => {
  describe('happy path', () => {
    it('gives each layer its lines and its provenance', () => {
      expect(layers.coast.lines).toHaveLength(1)
      expect(layers.coast.provenance).toEqual(COAST_SOURCE)
      expect(layers.river.lines).toHaveLength(2)
      expect(layers.river.provenance).toEqual(RIVER_SOURCE)
    })
  })

  describe('variants', () => {
    // s02 — "Following the coastline …", "Following the Maas …", "no river within reach".
    it('names the coast by its noun and a river by its name, verbatim', () => {
      expect([layers.coast.noun, layers.coast.label(0)]).toEqual(['coastline', 'coastline'])
      expect([layers.river.noun, layers.river.label(0)]).toEqual(['river', 'Maas'])
    })
  })

  describe('managed errors', () => {
    it('names a river the dataset leaves unnamed as such', () => {
      expect(layers.river.label(1)).toBe('unnamed river')
    })
  })

  // L4: N/A — a record over data already loaded.

  describe('edge cases', () => {
    it('builds the table over no line at all', () => {
      const empty = snapLayersOf({
        coast: [],
        coastProvenance: COAST_SOURCE,
        rivers: [],
        riverProvenance: RIVER_SOURCE,
      })
      expect([empty.coast.lines, empty.river.lines]).toEqual([[], []])
    })
  })
})
