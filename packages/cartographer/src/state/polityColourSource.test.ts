import { afterEach, describe, expect, it, vi } from 'vitest'

import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'

import { createPolityColourSource } from './polityColourSource'

const PALETTE: [string, ...string[]] = ['#aa0000', '#00aa00']

afterEach(() => {
  vi.restoreAllMocks()
})

describe('polityColourSource', () => {
  describe('happy path', () => {
    it('gives every polity of the document a colour', () => {
      const colours = createPolityColourSource(PALETTE).coloursOf(sharedBorderDocument(), 0)
      expect([...colours.keys()]).toEqual(['fr-couronne', 'hre'])
    })
  })

  describe('variants', () => {
    it('hands back the same map while the version stays', () => {
      const source = createPolityColourSource(PALETTE)
      const document = sharedBorderDocument()
      expect(source.coloursOf(document, 3)).toBe(source.coloursOf(document, 3))
    })

    it('recomputes when the version moves', () => {
      const source = createPolityColourSource(PALETTE)
      const document = sharedBorderDocument()
      const before = source.coloursOf(document, 3)
      const france = document.polities[0]
      if (france) france.colour = '#123456'
      expect(source.coloursOf(document, 4).get('fr-couronne')).toBe('#123456')
      expect(source.coloursOf(document, 4)).not.toBe(before)
    })
  })

  describe('managed errors', () => {
    it('reports a faulty document once per version, not once per read', () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const source = createPolityColourSource(PALETTE)
      const document = sharedBorderDocument()
      document.claims.push({ polity: 'ghost', rings: [] })
      source.coloursOf(document, 1)
      source.coloursOf(document, 1)
      expect(error).toHaveBeenCalledTimes(1)
    })
  })

  describe('unmanaged errors', () => {
    it('says nothing for a sound document', () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      createPolityColourSource(PALETTE).coloursOf(sharedBorderDocument(), 0)
      expect(error).not.toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    // Two stores both start at version 0: the version alone does not tell their documents apart.
    it('does not hand one document another’s colours at the same version', () => {
      const source = createPolityColourSource(PALETTE)
      const first = sharedBorderDocument()
      const second = sharedBorderDocument()
      const pinned = second.polities[0]
      if (pinned) pinned.colour = '#123456'
      source.coloursOf(first, 0)
      expect(source.coloursOf(second, 0).get('fr-couronne')).toBe('#123456')
    })

    it('gives an empty map for a year with no polity', () => {
      const document = sharedBorderDocument()
      document.polities = []
      expect(createPolityColourSource(PALETTE).coloursOf(document, 0).size).toBe(0)
    })
  })
})
