import { describe, expect, it, vi } from 'vitest'

import { createTranslator } from '@europe-historical-atlas/core/i18n/catalogue'

import { CITY_SHEET_MESSAGES } from '../i18n'

import { removalSentence } from './removalSentence'

const say = createTranslator(CITY_SHEET_MESSAGES, 'fr')
const NAMES = { vassal: 'Mathias II — comté de Nantes', suzerain: 'Alain IV — duché de Bretagne' }

describe('removalSentence', () => {
  describe('happy path', () => {
    it('names the link kept, the server’s sentence, and that it is still in the base', () => {
      expect(removalSentence(NAMES, 'Accès refusé.', say)).toBe(
        'Le maillon « Mathias II — comté de Nantes, vassal de Alain IV — duché de Bretagne » n’a pas été retiré : le serveur a refusé — « Accès refusé. ». Il est toujours dans la base ; la suite de la chaîne et la fiche ne sont pas enregistrées.'
      )
    })
  })

  describe('variants', () => {
    it('says the server did not answer, and to try again', () => {
      const sentence = removalSentence(NAMES, null, say)
      expect(sentence).toContain(
        'Mathias II — comté de Nantes, vassal de Alain IV — duché de Bretagne'
      )
      expect(sentence).toContain('le serveur ne répond pas')
      expect(sentence).toContain('Réessayez dans un instant.')
    })
  })

  describe('managed errors', () => {
    it('says a link the chain does not name without names, and says why in the console', () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      expect(removalSentence(null, 'Accès refusé.', say)).toContain(
        'Un maillon fermé par ✕ n’a pas été retiré : le serveur a refusé — « Accès refusé. »'
      )
      expect(error).toHaveBeenCalledOnce()
    })
  })

  // L4: N/A — pure, over typed values

  describe('edge cases', () => {
    it('says an unnamed link the server did not answer for', () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      expect(removalSentence(null, null, say)).toContain('le serveur ne répond pas')
    })
  })
})
