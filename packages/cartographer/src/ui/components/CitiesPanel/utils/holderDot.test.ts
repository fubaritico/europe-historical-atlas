import { describe, expect, it } from 'vitest'

import {
  AQUITAINE_IDENTITY,
  sharedBorderDocument,
} from '@europe-historical-atlas/core/editor/documentFixtures'

import { holderDot } from './holderDot'

import type { YearDocument } from '@europe-historical-atlas/core/data/yearDocument'

/** France and the Empire with their Wikidata ids, and Aquitaine, France's vassal, with its own. */
function document1100(): YearDocument {
  const document = sharedBorderDocument()
  for (const polity of document.polities)
    polity.wikidata = polity.id === 'hre' ? 'Q12548' : 'Q70972'
  document.polities.push({ ...AQUITAINE_IDENTITY, wikidata: 'Q1033' })
  return document
}

const COLOURS = new Map([
  ['fr-couronne', '#3355aa'],
  ['hre', '#aa8833'],
  ['aquitaine', '#55aa33'],
])

describe('holderDot', () => {
  describe('happy path', () => {
    it('colours Metz in the Empire, a sovereign, and names it alone', () => {
      expect(holderDot(document1100(), COLOURS, { name: 'Empire', wikidata: 'Q12548' })).toEqual({
        colour: '#aa8833',
        key: 'dotHolder',
        values: { name: 'Sacrum Imperium' },
      })
    })
  })

  describe('variants', () => {
    it('names Aquitaine with its direct suzerain, France, read in the registry', () => {
      expect(holderDot(document1100(), COLOURS, { name: 'Aquitaine', wikidata: 'Q1033' })).toEqual({
        colour: '#55aa33',
        key: 'dotVassal',
        values: { name: 'Duché d’Aquitaine', suzerain: 'Reaume de France' },
      })
    })

    it('rings hollow a holder no polity of the map carries, and says it is not on the map yet', () => {
      expect(
        holderDot(document1100(), COLOURS, { name: 'Comté de Barcelone', wikidata: 'Q1360966' })
      ).toEqual({ colour: null, key: 'dotOffMap', values: { name: 'Comté de Barcelone' } })
    })

    it('rings hollow a holder with no Wikidata id, and says so', () => {
      expect(holderDot(document1100(), COLOURS, { name: 'Taifa', wikidata: null })).toEqual({
        colour: null,
        key: 'noWikidata',
        values: { name: 'Taifa' },
      })
    })

    it('rings hollow a city whose holder is not entered', () => {
      expect(holderDot(document1100(), COLOURS, null)).toEqual({
        colour: null,
        key: 'dotNotEntered',
        values: {},
      })
    })
  })

  describe('managed errors', () => {
    // A registry fault `documentFaults` reports: the id stands in, never a plausible name.
    it('names the suzerain by its id when the registry lacks it', () => {
      const document = document1100()
      const aquitaine = document.polities.find(({ id }) => id === 'aquitaine')
      if (aquitaine === undefined) throw new Error('the fixture lost Aquitaine')
      aquitaine.suzerain = 'gone'
      expect(holderDot(document, COLOURS, { name: 'Aquitaine', wikidata: 'Q1033' }).values).toEqual(
        {
          name: 'Duché d’Aquitaine',
          suzerain: 'gone',
        }
      )
    })
  })

  describe('edge cases', () => {
    it('names the holder as the map writes it, not as the sources do', () => {
      expect(
        holderDot(document1100(), COLOURS, { name: 'Royaume de France', wikidata: 'Q70972' }).values
      ).toEqual({ name: 'Reaume de France' })
    })

    it('rings hollow a holder on the map whose colour the source lacks, still naming it', () => {
      expect(holderDot(document1100(), new Map(), { name: 'Empire', wikidata: 'Q12548' })).toEqual({
        colour: null,
        key: 'dotHolder',
        values: { name: 'Sacrum Imperium' },
      })
    })
  })

  // L4: N/A — a pure lookup over values already validated by the year's reader.
})
