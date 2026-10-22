import type { DraftError } from '../../../utils/polityDraft'
import type { PolityFormMessageKey } from '../i18n'
import type { Translate } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * The props that show an error under a field, or none at all — `exactOptionalPropertyTypes` forbids `undefined`.
 * @param t - the form's messages
 * @param error - why the field is refused, or `undefined` when the field is fine
 * @returns the message and its error type, or an empty object
 */
export function errorOf(t: Translate<PolityFormMessageKey>, error: DraftError | undefined) {
  return error === undefined ? {} : { message: t(error), messageType: 'error' as const }
}
