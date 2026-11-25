import { describe, expect, it } from 'vitest'

import { createTranslator } from '@europe-historical-atlas/core/i18n/catalogue'

import { SAVE_FIRST_MESSAGES } from '../i18n'

import { questionWords } from './questionWords'

const t = createTranslator(SAVE_FIRST_MESSAGES, 'fr')

describe('questionWords', () => {
  describe('happy path', () => {
    it('names the map about to be opened', () => {
      expect(questionWords({ kind: 'open', map: '1200' }, t)).toEqual({
        title: 'Ouvrir une carte',
        question: 'Vous allez ouvrir 1200. Voulez-vous enregistrer la carte en cours ?',
      })
    })
  })

  describe('variants', () => {
    it('asks before closing the map (CARTO-536)', () => {
      expect(questionWords({ kind: 'close' }, t)).toEqual({
        title: 'Fermer la carte',
        question: 'Vous allez fermer la carte. Voulez-vous enregistrer la carte en cours ?',
      })
    })

    it('asks before signing out (CARTO-535)', () => {
      expect(questionWords({ kind: 'signOut' }, t).title).toBe('Se déconnecter')
    })
  })

  // L3, L4: N/A — words chosen from a closed union.

  describe('edge cases', () => {
    it('asks nothing while no question is up', () => {
      expect(questionWords(null, t).question).toBe('')
    })
  })
})
