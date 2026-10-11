import { describe, expect, it } from 'vitest'

import { documentFaults } from './documentFaults'
import { sharedBorderDocument } from './documentFixtures'

describe('documentFaults', () => {
  describe('happy path', () => {
    it('finds nothing wrong with a sound document', () => {
      expect(documentFaults(sharedBorderDocument())).toEqual([])
    })
  })

  describe('variants', () => {
    it('names a claim whose polity the registry does not hold', () => {
      const doc = sharedBorderDocument()
      doc.polities.pop()
      expect(documentFaults(doc)).toEqual(['a claim names "hre", which the registry does not hold'])
    })

    it('names the indices a ring holds past the anchor table', () => {
      const doc = sharedBorderDocument()
      doc.claims[0]?.rings[0]?.push(40, 41)
      expect(documentFaults(doc)).toEqual([
        'a ring of "fr-couronne" points past the anchor table: 40, 41',
      ])
    })
  })

  describe('managed errors', () => {
    it('reports a negative index as past the table', () => {
      const doc = sharedBorderDocument()
      doc.claims[0]?.rings[0]?.push(-1)
      expect(documentFaults(doc)).toHaveLength(1)
    })
  })

  describe('unmanaged errors', () => {
    it('reports every fault, not the first', () => {
      const doc = sharedBorderDocument()
      doc.polities.length = 0
      expect(documentFaults(doc)).toHaveLength(2)
    })
  })

  describe('edge cases', () => {
    it('finds nothing wrong with an empty year', () => {
      const doc = sharedBorderDocument()
      doc.claims.length = 0
      doc.polities.length = 0
      expect(documentFaults(doc)).toEqual([])
    })
  })
})
