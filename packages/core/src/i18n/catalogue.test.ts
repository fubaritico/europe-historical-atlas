import { describe, expect, it } from 'vitest'

import { catalogueMismatches, createTranslator } from './catalogue'
import { MessageFormatError } from './messageFormat'

import type { Catalogue } from './catalogue'

type Key = 'loading' | 'failed'

const CATALOGUE: Catalogue<Key> = {
  fr: { loading: 'Chargement du relief', failed: '{layer} a échoué' },
  en: { loading: 'Loading the relief', failed: '{layer} failed' },
}

describe('catalogue', () => {
  describe('happy path', () => {
    it('builds a message by its key in French', () => {
      expect(createTranslator(CATALOGUE, 'fr')('failed', { layer: 'Le relief' })).toBe(
        'Le relief a échoué'
      )
    })

    it('builds the same message in English', () => {
      expect(createTranslator(CATALOGUE, 'en')('failed', { layer: 'The relief' })).toBe(
        'The relief failed'
      )
    })

    it('finds nothing to report in a coherent catalogue', () => {
      expect(catalogueMismatches(CATALOGUE)).toEqual([])
    })
  })

  describe('variants', () => {
    it('builds a message that takes no value without any', () => {
      expect(createTranslator(CATALOGUE, 'fr')('loading')).toBe('Chargement du relief')
    })

    // A component asks at every render: the catalogue is read once per language, then kept.
    it('hands back the same translator for the same catalogue and language', () => {
      expect(createTranslator(CATALOGUE, 'fr')).toBe(createTranslator(CATALOGUE, 'fr'))
      expect(createTranslator(CATALOGUE, 'fr')).not.toBe(createTranslator(CATALOGUE, 'en'))
    })
  })

  describe('managed errors', () => {
    it('throws when a message is built without the value it names', () => {
      expect(() => createTranslator(CATALOGUE, 'fr')('failed')).toThrow(MessageFormatError)
    })

    // Read when the translator is made, so a broken message cannot wait to be shown to fail.
    it('throws when the translator is made over a malformed message', () => {
      const broken: Catalogue<'x'> = { fr: { x: '{oops' }, en: { x: 'fine' } }
      expect(() => createTranslator(broken, 'fr')).toThrow(MessageFormatError)
    })

    it('reports a key whose languages take different values', () => {
      const drifted: Catalogue<'failed'> = {
        fr: { failed: '{layer} a échoué' },
        en: { failed: '{name} failed' },
      }
      expect(catalogueMismatches(drifted)).toEqual(['failed: fr takes [layer], en takes [name]'])
    })
  })

  describe('unmanaged errors', () => {
    it('throws on a key the catalogue does not hold, should one arrive past the types', () => {
      const translate = createTranslator(CATALOGUE, 'fr') as (key: string) => string
      expect(() => translate('nowhere')).toThrow('no message "nowhere" in fr')
    })
  })

  describe('edge cases', () => {
    it('reports a value missing from one plural branch only', () => {
      const drifted: Catalogue<'n'> = {
        fr: { n: '{n, plural, one {# pays de {who}} other {# pays}}' },
        en: { n: '{n, plural, one {# country} other {# countries}}' },
      }
      expect(catalogueMismatches(drifted)).toEqual(['n: fr takes [n, who], en takes [n]'])
    })
  })
})
