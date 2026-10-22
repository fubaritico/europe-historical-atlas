import { Input } from '@fubaritico/react/Input'

import { autofocusOnOpen } from '../../../hooks/autofocusOnOpen'
import { useTranslation } from '../../../hooks/useTranslation'
import { WikidataPanel } from '../../WikidataPanel'
import { POLITY_FORM_MESSAGES } from '../i18n'
import { errorOf } from '../utils/errorOf'
import { textField } from '../utils/textField'

import { ColourField } from './ColourField'
import { StandingFields } from './StandingFields'
import { SuzerainField } from './SuzerainField'

import type { PolityFieldsProps, PolityFormField } from '../polityFieldsProps'

/**
 * The form's fields, in `s02`'s order, with the id after the name it is proposed from.
 * @param props - the draft, its errors, the choices offered, Wikidata's view and the callbacks
 * @returns the fields, as a fragment
 */
export function PolityFields(props: PolityFieldsProps) {
  // Context
  const t = useTranslation(POLITY_FORM_MESSAGES)

  // Derived
  const { draft, errors, suzerains, ranks, onField, onColour } = props

  // Handlers
  const choose = (field: PolityFormField) => (value: string | null) => {
    onField(field, value)
  }

  // Render
  return (
    <>
      <Input
        label={t('name')}
        ref={autofocusOnOpen}
        {...textField('name', props)}
        {...errorOf(t, errors.name)}
      />
      <Input
        label={t('id')}
        readOnly={props.idLocked === true}
        {...textField('id', props)}
        {...errorOf(t, errors.id)}
      />
      <StandingFields ranks={ranks} rank={draft.rank} status={draft.status} onField={onField} />
      <Input
        label={t('existsFrom')}
        inputMode="numeric"
        {...textField('existsFrom', props)}
        {...errorOf(t, errors.existsFrom)}
      />
      <Input
        label={t('existsTo')}
        inputMode="numeric"
        placeholder={t('stillExists')}
        {...textField('existsTo', props)}
        {...errorOf(t, errors.existsTo)}
      />
      <SuzerainField options={suzerains} value={draft.suzerain} onSelect={choose('suzerain')} />
      <ColourField value={draft.colour} onChange={onColour} />
      <Input label={t('wikidata')} placeholder="Q…" {...textField('wikidata', props)} />
      <WikidataPanel view={props.wikidata} onUse={props.onUseWikidata} />
    </>
  )
}
