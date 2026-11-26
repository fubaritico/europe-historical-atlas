import type { TerritoryAdded } from '../../../../persistence/cmsTerritory'
import type { PolityFormMessageKey } from '../i18n'
import type { Translate } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * The sentence a creation in the CMS is said in (CARTO-498), and whether it is an alarm — nothing written.
 * @param outcome - how the creation ended
 * @param t - the form's messages
 * @returns the sentence and its weight
 */
export function cmsSentence(
  outcome: TerritoryAdded,
  t: Translate<PolityFormMessageKey>
): { text: string; alarm: boolean } {
  switch (outcome.kind) {
    case 'linked':
      return {
        text: t(outcome.created ? 'cmsCreated' : 'cmsFound', { id: String(outcome.id) }),
        alarm: false,
      }
    case 'offline':
      return { text: t('cmsOffline'), alarm: true }
    case 'signedOut':
      return { text: t('cmsSignedOut'), alarm: true }
    case 'refused':
      return { text: t('cmsRefused', { reason: outcome.reason }), alarm: true }
  }
}
