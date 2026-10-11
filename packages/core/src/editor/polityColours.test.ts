import { describe, expect, it } from 'vitest'

import { addAnchor, addPolity, closeRing } from './documentEdits'
import { FIXTURE_ZONE, sharedBorderDocument } from './documentFixtures'
import { polityColours, polityNeighbours } from './polityColours'
import { createYearDocument } from './yearDocument'

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
      const doc = createYearDocument(1100, FIXTURE_ZONE)
      addPolity(doc, { ...base('alone') })
      expect(polityColours(doc, PALETTE).get('alone')).toBe('#aa0000')
    })
  })

  describe('managed errors', () => {
    // L3: N/A — nothing is refused; an empty palette is excluded by the type.
    it('colours a polity with no territory, which is the normal starting state', () => {
      const doc = createYearDocument(1100, FIXTURE_ZONE)
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
      const doc = createYearDocument(1100, FIXTURE_ZONE)
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
