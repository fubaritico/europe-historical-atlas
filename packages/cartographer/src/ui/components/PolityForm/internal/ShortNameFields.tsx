import { Checkbox } from '@fubaritico/react/Checkbox'
import { Input } from '@fubaritico/react/Input'

import { shortNameOf } from '@europe-historical-atlas/core/data/shortName'

import { useTranslation } from '../../../hooks/useTranslation'
import { POLITY_FORM_MESSAGES } from '../i18n'
import { textField } from '../utils/textField'

import type { PolityFieldsProps } from '../polityFieldsProps'
import type { ChangeEvent } from 'react'

/**
 * The name the map writes (CARTO-307), and the box that writes it everywhere, even where the full one fits (the dev,
 * 2026-10-29: *« je veux pouvoir, dans certains cas, forcer le nom court »*).
 * @param props - the form's props: the draft read, `onField` and `onForceShortName` called
 * @returns the field and its box, as a fragment
 */
export function ShortNameFields(props: PolityFieldsProps) {
  // Context
  const t = useTranslation(POLITY_FORM_MESSAGES)

  // Handlers
  const handleForce = (event: ChangeEvent<HTMLInputElement>) => {
    props.onForceShortName(event.target.checked)
  }

  // Render
  return (
    <>
      {/* Left empty, it shows greyed what the atlas writes instead — the rule's fallback, never the typed text. */}
      <Input
        label={t('shortName')}
        placeholder={shortNameOf({ name: props.draft.name })}
        message={t('shortNameHint')}
        {...textField('shortName', props)}
      />
      <Checkbox
        size="sm"
        label={t('forceShortName')}
        checked={props.draft.forceShortName}
        onChange={handleForce}
      />
    </>
  )
}
