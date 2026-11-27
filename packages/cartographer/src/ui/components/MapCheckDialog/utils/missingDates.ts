import type { MapCheckMessageKey } from '../i18n'
import type { TiedPolity } from '@europe-historical-atlas/core/data/cmsAlignment'
import type { Translate } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * The dates a polity gives and the CMS lacks, in words: « début », « fin », « début et fin » (CARTO-568). A row of « to
 * enter in the CMS » lacks one at least; an empty list is a defect, and the message's `other` echoes it visibly.
 * @param row - the polity and its territory
 * @param t - the dialogue's messages
 * @returns the words
 */
export function missingDates(row: TiedPolity, t: Translate<MapCheckMessageKey>): string {
  const fields = row.missingInCms.length === 2 ? 'both' : row.missingInCms.join('')
  return t('dateFields', { fields })
}
