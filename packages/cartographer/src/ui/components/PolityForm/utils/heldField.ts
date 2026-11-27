import { errorOf } from './errorOf'

import type { DraftError, DraftField } from '../../../utils/polityDraft'
import type { PolityFormMessageKey } from '../i18n'
import type { CmsHeld } from '../polityFieldsProps'
import type { DateField } from '@europe-historical-atlas/core/data/cmsAlignment'
import type { Translate } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * A field the CMS may hold — the name or a date (CARTO-568): read-only, and saying so where its error would be, when
 * the CMS holds it; its error otherwise. A field held is never typed in, so it is never refused.
 * @param t - the form's messages
 * @param field - the field
 * @param cmsHeld - what the CMS holds, absent when nothing
 * @param errors - the form's errors
 * @returns the props the field takes
 */
export function heldField(
  t: Translate<PolityFormMessageKey>,
  field: 'name' | DateField,
  cmsHeld: CmsHeld | undefined,
  errors: Partial<Record<DraftField, DraftError>>
) {
  return cmsHeld?.locks[field] === true
    ? { readOnly: true, message: t('heldByCms') }
    : errorOf(t, errors[field])
}
