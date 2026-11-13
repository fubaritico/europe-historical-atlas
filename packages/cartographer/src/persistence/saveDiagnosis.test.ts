import { describe, expect, it } from 'vitest'

import { persistenceWords } from './persistenceWords'
import { notSavedSentence } from './saveDiagnosis'

/** The French sentences, as the page says them. */
const FR = persistenceWords('fr')

/** Three polities, Elsass third, with a Wikidata id mistyped as the dev did on 2026-11-13. */
const DOCUMENT = {
  polities: [
    { id: 'carinthia', name: 'Duchy of Carinthia', wikidata: 'Q702224' },
    { id: 'verona', name: 'March of Verona', wikidata: 'Q701920' },
    { id: 'elsass', name: 'Elsass', wikidata: 'Q 1196' },
  ],
} as unknown as Parameters<typeof notSavedSentence>[2]

/** The server's refusal, word for word, as it reached the page that evening. */
const refusal = (field: string) =>
  new Error(
    `yearRegistry (schema) years/1100/registry.json: polities[2].${field}: should be a Wikidata id like Q70972`
  )

describe('notSavedSentence', () => {
  describe('happy path', () => {
    it('names the polity, its mistyped Wikidata id, and what to do', () => {
      expect(notSavedSentence('1100', refusal('wikidata'), DOCUMENT, FR)).toBe(
        '1100 non enregistré : l’identifiant Wikidata du pays « Elsass » est « Q 1196 », qui n’est pas un identifiant — il s’écrit Q suivi de chiffres, par exemple Q70972. Corrigez-le ou videz-le dans le formulaire du pays, puis enregistrez.'
      )
    })
  })

  describe('variants', () => {
    it('names the polity and the field for any other field of a polity', () => {
      expect(notSavedSentence('1100', refusal('colour'), DOCUMENT, FR)).toContain(
        'le champ « colour » du pays « Elsass »'
      )
    })
  })

  describe('managed errors', () => {
    it('keeps the plain sentence for a refusal that names no polity', () => {
      expect(notSavedSentence('1100', new Error('HTTP 500'), DOCUMENT, FR)).toBe(FR.t('notSaved'))
    })
  })

  describe('unmanaged errors', () => {
    it('keeps the plain sentence for a polity rank the document does not hold', () => {
      const beyond = new Error(
        'yearRegistry (schema) x: polities[9].wikidata: should be a Wikidata id'
      )
      expect(notSavedSentence('1100', beyond, DOCUMENT, FR)).toBe(FR.t('notSaved'))
    })
  })

  describe('edge cases', () => {
    it('reads a thrown value that is not an Error', () => {
      expect(notSavedSentence('1100', 'polities[0].wikidata: bad', DOCUMENT, FR)).toContain(
        'Duchy of Carinthia'
      )
    })
  })
})
