import { Input } from '@fubaritico/react/Input'

import { useTranslation } from '../../../hooks/useTranslation'
import { POLITY_FORM_MESSAGES } from '../i18n'
import { heldField } from '../utils/heldField'
import { textField } from '../utils/textField'

import { CmsHeldLink } from './CmsHeldLink'

import type { PolityFieldsProps } from '../polityFieldsProps'

/**
 * The polity's two dates, and « Modifier dans le CMS » under them when the CMS holds a field (CARTO-568) — a date the
 * CMS holds read-only, one it lacks editable.
 * @param props - the form's props
 * @returns the dates, as a fragment
 */
export function ExistenceFields(props: PolityFieldsProps) {
  // Context
  const t = useTranslation(POLITY_FORM_MESSAGES)

  // Derived
  const { errors, cmsHeld } = props

  // Render
  return (
    <>
      <Input
        label={t('existsFrom')}
        inputMode="numeric"
        {...textField('existsFrom', props)}
        {...heldField(t, 'existsFrom', cmsHeld, errors)}
      />
      <Input
        label={t('existsTo')}
        inputMode="numeric"
        placeholder={t('stillExists')}
        {...textField('existsTo', props)}
        {...heldField(t, 'existsTo', cmsHeld, errors)}
      />
      <CmsHeldLink cmsHeld={cmsHeld} />
    </>
  )
}
