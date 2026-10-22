import type { WikidataView } from '../../../utils/wikidataView'
import type { WikidataPanelMessageKey } from '../i18n'
import type { Translate } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * The short message the live region holds for a view, or `''`.
 * @param view - where the reading stands
 * @param t - the panel's messages, in the page's language
 * @returns the sentence to announce
 */
export function statusOf(view: WikidataView, t: Translate<WikidataPanelMessageKey>): string {
  if (view.kind === 'reading') return t('reading', { id: view.id })
  if (view.kind === 'failed') return t('failed')
  if (view.kind === 'unknown') return t('unknown', { id: view.id })
  if (view.kind === 'found' && view.facts.notASubject !== null)
    return t('notASubject', { id: view.facts.id, kind: view.facts.notASubject })
  if (view.kind === 'found' && view.warning !== null) {
    const { when, name, span, year } = view.warning
    return t('anachronism', { when, name, span, year: String(year) })
  }
  return ''
}
