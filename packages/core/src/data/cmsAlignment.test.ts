import { describe, expect, it } from 'vitest'

import { alignMap, alignedPolity, cmsLocks, isCmsLockable } from './cmsAlignment'

import type { ContentTerritory } from './contentFormat'
import type { YearPolity } from './yearFormat'

const polity = (fields: Partial<YearPolity> & Pick<YearPolity, 'id' | 'name'>): YearPolity => ({
  rank: 'kingdom',
  status: null,
  suzerain: null,
  existsFrom: null,
  existsTo: null,
  colour: null,
  wikidata: null,
  ...fields,
})

const LEON: ContentTerritory = {
  id: 15,
  name: 'royaume de León',
  wikidata: 'Q199442',
  existsFrom: 910,
  existsTo: 1230,
}
const CASTILE: ContentTerritory = {
  id: 16,
  name: 'royaume de Castille',
  wikidata: 'Q217196',
  existsFrom: null,
  existsTo: null,
}
const ABBASIDS: ContentTerritory = {
  id: 40,
  name: 'califat abbasside',
  wikidata: 'Q12536',
  existsFrom: 750,
  existsTo: 1258,
}
const TERRITORIES = [LEON, CASTILE, ABBASIDS]

const tied = (fields: Partial<YearPolity> & Pick<YearPolity, 'name'>) =>
  polity({ id: 'x', ...fields })

describe('cmsAlignment', () => {
  describe('alignMap', () => {
    it('lists a polity with neither a number nor an item the CMS knows as tied to nothing', () => {
      const friesland = polity({ id: 'friesland', name: 'Friesland', wikidata: 'Q1' })

      expect(alignMap([friesland], TERRITORIES).untied).toEqual([
        { id: 'friesland', name: 'Friesland', reason: 'none' },
      ])
    })

    it('lists a polity whose number the CMS no longer has as tied to nothing, its number said', () => {
      const gone = polity({ id: 'gone', name: 'Gone', territory: 999 })

      expect(alignMap([gone], TERRITORIES).untied).toEqual([
        { id: 'gone', name: 'Gone', reason: 'missing', territory: 999 },
      ])
    })

    it('puts a polity tied by number whose name differs among those to align', () => {
      const leon = polity({
        id: 'leon',
        name: 'Kingdom of León',
        territory: 15,
        existsFrom: 910,
        existsTo: 1230,
      })

      const { toAlign, toConfirm } = alignMap([leon], TERRITORIES)

      expect(toAlign).toHaveLength(1)
      expect(toAlign[0]).toMatchObject({ tie: 'number', nameDiffers: true, datesDiffer: [] })
      expect(toConfirm).toEqual([])
    })

    it('puts a polity tied by number whose date differs among those to align', () => {
      const leon = polity({ id: 'leon', name: 'royaume de León', territory: 15, existsFrom: 914 })

      expect(alignMap([leon], TERRITORIES).toAlign[0]?.datesDiffer).toEqual([
        'existsFrom',
        'existsTo',
      ])
    })

    it('leaves out a polity tied by number that is the CMS already', () => {
      const leon = polity({
        id: 'leon',
        name: 'royaume de León',
        territory: 15,
        existsFrom: 910,
        existsTo: 1230,
      })

      const alignment = alignMap([leon], TERRITORIES)

      expect(alignment.toAlign).toEqual([])
      expect(alignment.toEnterInCms).toEqual([])
    })

    it('puts a polity tied by its Wikidata item only among those to confirm, even when it agrees', () => {
      const buyids = polity({ id: 'buyids', name: 'Buyid Dynasty', wikidata: 'Q12536' })
      const leon = polity({
        id: 'leon',
        name: 'royaume de León',
        wikidata: 'Q199442',
        existsFrom: 910,
        existsTo: 1230,
      })

      const { toConfirm, toAlign } = alignMap([buyids, leon], TERRITORIES)

      expect(toConfirm.map(({ id, tie }) => [id, tie])).toEqual([
        ['buyids', 'wikidata'],
        ['leon', 'wikidata'],
      ])
      expect(toAlign).toEqual([])
    })

    it('lists a date the map gives and the CMS does not as to enter in the CMS, not as a difference', () => {
      const castile = polity({
        id: 'castile',
        name: 'royaume de Castille',
        territory: 16,
        existsFrom: 1065,
      })

      const alignment = alignMap([castile], TERRITORIES)

      expect(alignment.toAlign).toEqual([])
      expect(alignment.toEnterInCms[0]?.missingInCms).toEqual(['existsFrom'])
    })

    it('says nothing of a date neither gives', () => {
      const castile = polity({ id: 'castile', name: 'royaume de Castille', territory: 16 })

      expect(alignMap([castile], TERRITORIES).toEnterInCms).toEqual([])
    })

    it('reads a territory exported before its dates as giving none', () => {
      const old: ContentTerritory = { id: 7, name: 'Thuringe', wikidata: null }
      const thuringia = polity({ id: 'thuringia', name: 'Thuringe', territory: 7, existsTo: 1247 })

      const alignment = alignMap([thuringia], [old])

      expect(alignment.toAlign).toEqual([])
      expect(alignment.toEnterInCms[0]?.missingInCms).toEqual(['existsTo'])
    })

    it('ties by the number before the Wikidata item, the author having chosen it', () => {
      const leon = polity({
        id: 'leon',
        name: 'Kingdom of León',
        wikidata: 'Q12536',
        territory: 15,
      })

      expect(alignMap([leon], TERRITORIES).toAlign[0]?.cms.id).toBe(15)
    })

    it('puts among those to align a polity tied by number whose Wikidata item is another territory’s', () => {
      // The trap: its name and dates agree, so only the item tells that the atlas, which ties by item first
      // (`sameTerritory`), would name it after the Abbasids
      const leon = polity({
        id: 'leon',
        name: 'royaume de León',
        wikidata: 'Q12536',
        territory: 15,
        existsFrom: 910,
        existsTo: 1230,
      })

      expect(alignMap([leon], TERRITORIES).toAlign[0]).toMatchObject({
        wikidataDiffers: true,
        nameDiffers: false,
        datesDiffer: [],
      })
    })

    it('reads no conflict when either side has no Wikidata item', () => {
      const leon = polity({
        id: 'leon',
        name: 'royaume de León',
        territory: 15,
        existsFrom: 910,
        existsTo: 1230,
      })

      expect(alignMap([leon], TERRITORIES).toAlign).toEqual([])
    })
  })

  describe('alignedPolity', () => {
    it('takes the CMS French name, its number and the dates it gives', () => {
      const leon = polity({
        id: 'leon',
        name: 'Kingdom of León',
        wikidata: 'Q199442',
        existsFrom: 914,
      })

      expect(alignedPolity(leon, LEON)).toEqual({
        ...leon,
        name: 'royaume de León',
        territory: 15,
        existsFrom: 910,
        existsTo: 1230,
      })
    })

    it('keeps a date the CMS does not give', () => {
      const castile = polity({ id: 'castile', name: 'Castile', existsFrom: 1065, existsTo: 1230 })

      expect(alignedPolity(castile, CASTILE)).toMatchObject({ existsFrom: 1065, existsTo: 1230 })
    })

    it('writes the territory’s Wikidata item over another', () => {
      const leon = polity({
        id: 'leon',
        name: 'Kingdom of León',
        wikidata: 'Q12536',
        territory: 15,
      })

      expect(alignedPolity(leon, LEON).wikidata).toBe('Q199442')
    })

    it('keeps the polity’s item when the territory has none', () => {
      const thuringia = polity({ id: 'thuringia', name: 'Thuringia', wikidata: 'Q1205' })

      expect(alignedPolity(thuringia, { id: 7, name: 'Thuringe', wikidata: null }).wikidata).toBe(
        'Q1205'
      )
    })

    it('leaves the polity it is handed untouched', () => {
      const leon = polity({ id: 'leon', name: 'Kingdom of León' })

      alignedPolity(leon, LEON)

      expect(leon.name).toBe('Kingdom of León')
    })
  })

  describe('cmsLocks', () => {
    it('locks the name and the dates that are the CMS own', () => {
      const leon = tied({ name: 'royaume de León', existsFrom: 910, existsTo: 1230, territory: 15 })

      expect(cmsLocks(leon, TERRITORIES)).toEqual({ name: true, existsFrom: true, existsTo: true })
    })

    it('locks nothing on a polity whose Wikidata item is another territory’s', () => {
      const leon = tied({
        name: 'royaume de León',
        existsFrom: 910,
        existsTo: 1230,
        territory: 15,
        wikidata: 'Q12536',
      })

      expect(cmsLocks(leon, TERRITORIES).name).toBe(false)
    })

    it('locks nothing on a polity tied by its Wikidata item only', () => {
      const leon = tied({
        name: 'royaume de León',
        existsFrom: 910,
        existsTo: 1230,
        wikidata: 'Q199442',
      })

      expect(cmsLocks(leon, TERRITORIES)).toEqual({
        name: false,
        existsFrom: false,
        existsTo: false,
      })
    })

    it('leaves a field not yet aligned editable', () => {
      const leon = tied({ name: 'Kingdom of León', existsFrom: 910, existsTo: 1200, territory: 15 })

      expect(cmsLocks(leon, TERRITORIES)).toEqual({
        name: false,
        existsFrom: true,
        existsTo: false,
      })
    })

    it('leaves a date the CMS lacks editable', () => {
      const castile = tied({ name: 'royaume de Castille', existsFrom: 1065, territory: 16 })

      expect(cmsLocks(castile, TERRITORIES)).toEqual({
        name: true,
        existsFrom: false,
        existsTo: false,
      })
    })

    it('locks nothing when the number is no territory of the CMS', () => {
      const gone = tied({ name: 'Gone', territory: 999 })

      expect(cmsLocks(gone, TERRITORIES).name).toBe(false)
    })
  })

  describe('isCmsLockable', () => {
    it('knows the name and the two dates, and nothing else', () => {
      expect(['name', 'existsFrom', 'existsTo', 'id', 'toString'].filter(isCmsLockable)).toEqual([
        'name',
        'existsFrom',
        'existsTo',
      ])
    })
  })
})
