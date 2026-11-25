import type { SaveFirstReason } from '../../../../persistence/mapChange'
import type { SaveFirstMessageKey } from '../i18n'
import type { Translate } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * The dialogue's title and question for why it is asked — a map about to be opened (`s19`), the map closed (CARTO-536),
 * or signing out (CARTO-535).
 * @param reason - why « save first? » is asked, or `null` while nothing asks
 * @param t - the dialogue's words
 * @returns its title, and its question — empty while nothing asks
 */
export function questionWords(
  reason: SaveFirstReason | null,
  t: Translate<SaveFirstMessageKey>
): { title: string; question: string } {
  if (reason === null) return { title: t('title'), question: '' }
  switch (reason.kind) {
    case 'open':
      return { title: t('title'), question: t('question', { map: reason.map }) }
    case 'close':
      return { title: t('closeTitle'), question: t('closeQuestion') }
    case 'signOut':
      return { title: t('signOutTitle'), question: t('signOutQuestion') }
  }
}
