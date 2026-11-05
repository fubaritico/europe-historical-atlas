import type { SheetPasteMessageKey } from '../i18n'
import type { SheetValue } from '@europe-historical-atlas/core/editor/pasteSheet'
import type { Translate } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * A sheet's value as the dialogue writes it: an empty one as a dash, a pin as yes or no, a number or a text as it is.
 * @param value - the value
 * @param t - the dialogue's words
 * @returns the text
 */
export function sheetValueText(value: SheetValue, t: Translate<SheetPasteMessageKey>): string {
  if (value === null) return t('none')
  if (typeof value === 'boolean') return t(value ? 'yes' : 'no')
  return String(value)
}
