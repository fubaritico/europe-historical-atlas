import { describe, expect, it } from 'vitest'

import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'

import { holderDotsOf } from './holderDotsOf'

import type { CityMark } from '../../../../state/citiesSlice'
import type { YearDocument } from '@europe-historical-atlas/core/data/yearDocument'

const EMPIRE = { name: 'Sacrum Imperium', wikidata: 'Q12548' }
const COLOURS = new Map([['hre', '#3355aa']])

/**
 * A city of 1100 held by a holder.
 * @param id - its id
 * @param holder - its holder by the sources
 * @returns the city
 */
function city(id: string, holder: CityMark['holder']): CityMark {
  return {
    id,
    name: id,
    lon: 3,
    lat: 47,
    date: {
      kind: 'instant',
      at: { year: 1100, month: null, day: null, calendar: null, circa: false, margin: null },
    },
    holder,
    chain: null,
    holderSources: [],
  }
}

/**
 * The two-polity fixture, the Empire carrying its Wikidata id.
 * @returns the document
 */
function documentWithEmpire(): YearDocument {
  const document = sharedBorderDocument()
  for (const polity of document.polities) if (polity.id === 'hre') polity.wikidata = EMPIRE.wikidata
  return document
}

// CARTO-485: one dot per holder, the same object for every city of that holder.
describe('holderDotsOf', () => {
  describe('happy path', () => {
    it('colours Metz in the Empire', () => {
      const dotOf = holderDotsOf(documentWithEmpire(), COLOURS)
      expect(dotOf(city('metz', EMPIRE)).colour).toBe('#3355aa')
    })

    it('hands Metz and Toul, both the Empire’s, the very same dot', () => {
      const dotOf = holderDotsOf(documentWithEmpire(), COLOURS)
      expect(dotOf(city('metz', EMPIRE))).toBe(dotOf(city('toul', EMPIRE)))
    })
  })

  describe('variants', () => {
    it('hands a city with no holder the « not entered » dot, and the same to the next', () => {
      const dotOf = holderDotsOf(documentWithEmpire(), COLOURS)
      const dot = dotOf(city('paris', null))
      expect([dot.key, dotOf(city('reims', null)) === dot]).toEqual(['dotNotEntered', true])
    })

    it('keeps apart two holders with no Wikidata id, each named in its own bubble', () => {
      const dotOf = holderDotsOf(documentWithEmpire(), COLOURS)
      const names = ['Comté de Foix', 'Comté de Bigorre'].map(
        (name) => dotOf(city(name, { name, wikidata: null })).values.name
      )
      expect(names).toEqual(['Comté de Foix', 'Comté de Bigorre'])
    })
  })

  // L3, L4: N/A — every holder has a dot (`holderDot`), nothing here can fail.

  describe('edge cases', () => {
    // A holder off the map is named in its bubble as its sheet wrote it: two spellings, two bubbles.
    it('keeps apart two sheets naming one Wikidata id differently, off the map', () => {
      const dotOf = holderDotsOf(documentWithEmpire(), COLOURS)
      const names = ['León', 'Regnum Legionense'].map(
        (name) => dotOf(city(name, { name, wikidata: 'Q1' })).values.name
      )
      expect(names).toEqual(['León', 'Regnum Legionense'])
    })

    it('answers from the map as it was when made: a new one is made at each version', () => {
      const document = documentWithEmpire()
      const before = holderDotsOf(document, COLOURS)
      before(city('metz', EMPIRE))
      for (const polity of document.polities) if (polity.id === 'hre') polity.wikidata = null
      const after = holderDotsOf(document, COLOURS)
      expect([before(city('metz', EMPIRE)).key, after(city('metz', EMPIRE)).key]).toEqual([
        'dotHolder',
        'dotOffMap',
      ])
    })
  })
})
