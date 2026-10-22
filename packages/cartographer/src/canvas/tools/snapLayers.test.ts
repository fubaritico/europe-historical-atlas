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
    // s02 — "Following the coastline …", "Following the Maas …": the coast has no name of its own.
    it('names a river by its name, verbatim, and the coast by none', () => {
      expect([layers.coast.noun, layers.coast.name(0)]).toEqual(['coastline', null])
      expect([layers.river.noun, layers.river.name(0)]).toEqual(['river', 'Maas'])
    })
  })

  describe('managed errors', () => {
    it('gives no name to a river the dataset leaves unnamed, for the bar to say so', () => {
      expect(layers.river.name(1)).toBeNull()
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
