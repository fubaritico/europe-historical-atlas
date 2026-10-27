// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import { planeHeight } from '@europe-historical-atlas/core/pipeline/gridDrape'

import { GRID, PATCH, nodeY, options } from './testing/tribeFixtures'
import { tribeBuffers } from './tribeBuffers'

describe('tribeBuffers', () => {
  describe('happy path', () => {
    it('lays each vertex on the relief plane under it, in world space', () => {
      const { positions } = tribeBuffers(options())
      expect(positions[0]).toBeCloseTo((0.1 - 0.5) * 4)
      expect(positions[1]).toBeCloseTo(planeHeight(0.1, 0.1, GRID, nodeY))
      expect(positions[2]).toBeCloseTo((0.1 - 0.5) * 2)
    })

    it('carries each vertex’s distances, its land and the tribe’s colour beside it', () => {
      const { distances, tints, claimed, land } = tribeBuffers(options())
      expect([...distances]).toEqual([-20, -10, 0, 5, 10, 30])
      expect([...claimed]).toEqual([40, 40, 40, 40, -3, 40])
      expect([...land]).toEqual([1, 1, 1, 1, 1, 0])
      expect([...tints.slice(0, 3)]).toEqual([65, 88, 11])
    })
  })

  describe('variants', () => {
    it('puts two tribes one after the other, each in its colour', () => {
      const other = { ...PATCH, tint: { r: 1, g: 2, b: 3 } }
      const { tints, distances } = tribeBuffers(options({ patches: [PATCH, other] }))
      expect(distances.length).toBe(12)
      expect([...tints.slice(18, 21)]).toEqual([1, 2, 3])
    })
  })

  describe('managed errors', () => {
    it('refuses a patch with fewer distances than vertices', () => {
      const short = { ...PATCH, distances: Float32Array.from([1, 2]) }
      expect(() => tribeBuffers(options({ patches: [short] }))).toThrow(/distances/)
    })

    it('refuses a patch with fewer land values than vertices', () => {
      const short = { ...PATCH, land: Float32Array.from([1]) }
      expect(() => tribeBuffers(options({ patches: [short] }))).toThrow(/land/)
    })
  })

  describe('unmanaged errors', () => {
    // L4: N/A — arithmetic over typed arrays the caller built; nothing asynchronous.
    it('carries a NaN distance through, rather than reading it as far outside', () => {
      const broken = { ...PATCH, distances: Float32Array.from([Number.NaN, 0, 0, 0, 0, 0]) }
      expect(tribeBuffers(options({ patches: [broken] })).distances[0]).toBeNaN()
    })
  })

  describe('edge cases', () => {
    it('builds empty buffers for no tribe', () => {
      const { positions, distances } = tribeBuffers(options({ patches: [] }))
      expect(positions.length).toBe(0)
      expect(distances.length).toBe(0)
    })
  })
})
