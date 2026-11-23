import { describe, expect, it } from 'vitest'

import { labelsUrl, readLabelsAnswer } from './wikidataLabels'

describe('wikidataLabels', () => {
  describe('happy path', () => {
    it('asks wbgetentities for the labels and aliases in French and English of every item of the lot', () => {
      const url = new URL(labelsUrl(['Q3640', 'Q43']))
      expect(url.origin + url.pathname).toBe('https://www.wikidata.org/w/api.php')
      expect(Object.fromEntries(url.searchParams)).toEqual({
        action: 'wbgetentities',
        format: 'json',
        props: 'labels|aliases',
        languages: 'fr|en|mul',
        ids: 'Q3640|Q43',
      })
    })

    it('reads each item’s French and English labels and its French aliases', () => {
      const names = readLabelsAnswer({
        entities: {
          Q3640: {
            labels: { fr: { value: 'Ankara' }, en: { value: 'Ankara' } },
            aliases: { fr: [{ value: 'Ancyre' }, { value: 'Angora' }], en: [{ value: 'Ancyra' }] },
          },
        },
      })
      expect(names.get('Q3640')).toEqual({
        fr: 'Ankara',
        en: 'Ankara',
        mul: null,
        aliasesFr: ['Ancyre', 'Angora'],
      })
    })
  })

  describe('variants', () => {
    it('reads an item with an English label only, and no aliases', () => {
      const names = readLabelsAnswer({
        entities: { Q1: { labels: { en: { value: 'Castillo de Onda' } } } },
      })
      expect(names.get('Q1')).toEqual({
        fr: null,
        en: 'Castillo de Onda',
        mul: null,
        aliasesFr: [],
      })
    })

    it('reads an item named in the multilingual label only', () => {
      const names = readLabelsAnswer({
        entities: { Q2: { labels: { mul: { value: 'Mazgirt' } } } },
      })
      expect(names.get('Q2')).toEqual({ fr: null, en: null, mul: 'Mazgirt', aliasesFr: [] })
    })
  })

  describe('managed errors', () => {
    it('leaves out an item Wikidata does not know, so the control lists it as unknown', () => {
      const names = readLabelsAnswer({
        entities: { Q999999999: { id: 'Q999999999', missing: '' } },
      })
      expect(names.has('Q999999999')).toBe(false)
    })
  })

  describe('unmanaged errors', () => {
    it('throws on an answer that is not the API’s — an error page read as JSON', () => {
      expect(() => readLabelsAnswer({ error: { code: 'maxlag' } })).toThrow()
    })
  })

  describe('edge cases', () => {
    it('reads an answer with no items', () => {
      expect(readLabelsAnswer({ entities: {} }).size).toBe(0)
    })
  })
})
