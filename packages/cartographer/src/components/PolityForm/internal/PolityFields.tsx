import { Input } from '@fubaritico/react/Input'

import { autofocusOnOpen } from '../../shared/hooks/autofocusOnOpen'
import { STATUSES } from '../../shared/polityDraft'
import { WikidataPanel } from '../../WikidataPanel'

import { ChoiceField } from './ChoiceField'
import { ColourField } from './ColourField'
import { SuzerainField } from './SuzerainField'

import type { PolityFormField, PolityFormProps } from '../PolityForm'

/** The props that show an error under a field, or none at all — `exactOptionalPropertyTypes` forbids `undefined`. */
function errorOf(message: string | undefined) {
  return message === undefined ? {} : { message, messageType: 'error' as const }
}

/** The props of a controlled text field reporting to {@link PolityFormProps.onField}. */
function textField(field: PolityFormField, props: PolityFormProps) {
  return {
    value: props.draft[field] ?? '',
    onChange: (event: { target: { value: string } }) => {
      props.onField(field, event.target.value)
    },
  }
}

/** The form's fields, in `s02`'s order, with the id after the name it is proposed from. */
export function PolityFields(props: PolityFormProps) {
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
        label="Name"
        ref={autofocusOnOpen}
        {...textField('name', props)}
        {...errorOf(errors.name)}
      />
      <Input
        label="Id"
        readOnly={props.idLocked === true}
        {...textField('id', props)}
        {...errorOf(errors.id)}
      />
      <ChoiceField label="Rank" options={ranks} value={draft.rank} onSelect={choose('rank')} />
      <ChoiceField
        label="Status"
        options={STATUSES}
        value={draft.status}
        onSelect={choose('status')}
      />
      <Input
        label="Exists from"
        inputMode="numeric"
        {...textField('existsFrom', props)}
        {...errorOf(errors.existsFrom)}
      />
      <Input
        label="Exists to"
        inputMode="numeric"
        placeholder="still exists"
        {...textField('existsTo', props)}
        {...errorOf(errors.existsTo)}
      />
      <SuzerainField options={suzerains} value={draft.suzerain} onSelect={choose('suzerain')} />
      <ColourField value={draft.colour} onChange={onColour} />
      <Input label="Wikidata id" placeholder="Q…" {...textField('wikidata', props)} />
      <WikidataPanel view={props.wikidata} onUse={props.onUseWikidata} />
    </>
  )
}
