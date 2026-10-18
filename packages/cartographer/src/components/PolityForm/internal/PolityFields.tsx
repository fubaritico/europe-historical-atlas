import { Input } from '@fubaritico/react/Input'

import { autofocusOnOpen } from '../../shared/hooks/autofocusOnOpen'
import { STATUSES } from '../../shared/polityDraft'
import { WikidataPanel } from '../../WikidataPanel'

import { ChoiceField } from './ChoiceField'
import { ColourField } from './ColourField'
import { SuzerainField } from './SuzerainField'

import type { WikidataField } from '../../../wikidata/wikidataFacts'
import type { DraftField, DraftOption, PolityDraft } from '../../shared/polityDraft'
import type { WikidataView } from '../../shared/wikidataView'
import type { HsvaColor } from '@fubaritico/behaviors'

/** The fields a form event can name: every text field and every list of the draft — the colour has its own. */
export type PolityFormField = Exclude<keyof PolityDraft, 'idEdited' | 'colour'>

/** What the form's fields show and what they report — the form's own props extend these. */
export interface PolityFieldsProps {
  /** The form's values. */
  draft: PolityDraft
  /** What to say beside which field, after a reading refused the form. */
  errors: Partial<Record<DraftField, string>>
  /** The polities of the year it may owe homage to, as value (id) and label (name). */
  suzerains: readonly DraftOption[]
  /** The ranks it may take — the usual ones and every one the year already uses (`rankChoices`). */
  ranks: readonly DraftOption[]
  /** Whether the id is shown but not editable — an existing polity's id never changes (`s07`). */
  idLocked?: boolean
  /**
   * A field changed. Lists report `null` for "none".
   * @param field - which one
   * @param value - its new value
   */
  onField: (field: PolityFormField, value: string | null) => void
  /**
   * The colour changed — continuously while a thumb is dragged, which is cheap: the draft is the
   * dialogue's own state, and nothing is written to the document before OK.
   * @param colour - the picked colour, or `null` for "automatic"
   */
  onColour: (colour: HsvaColor | null) => void
  /** What Wikidata says about the id typed (CARTO-243). */
  wikidata: WikidataView
  /**
   * Take Wikidata's value for a field — only on the author's click.
   * @param field - the field
   * @param value - Wikidata's value, as the form holds it
   */
  onUseWikidata: (field: WikidataField, value: string) => void
}

/**
 * The props that show an error under a field, or none at all — `exactOptionalPropertyTypes` forbids `undefined`.
 * @param message - what to say under the field, or `undefined` when the field is fine
 * @returns the message and its error type, or an empty object
 */
function errorOf(message: string | undefined) {
  return message === undefined ? {} : { message, messageType: 'error' as const }
}

/**
 * The props of a controlled text field reporting to {@link PolityFieldsProps.onField}.
 * @param field - the draft field the input shows and reports
 * @param props - the form's props: the draft read and the `onField` called on a change
 * @returns the input's value and its change handler
 */
function textField(field: PolityFormField, props: PolityFieldsProps) {
  return {
    value: props.draft[field] ?? '',
    onChange: (event: { target: { value: string } }) => {
      props.onField(field, event.target.value)
    },
  }
}

/**
 * The form's fields, in `s02`'s order, with the id after the name it is proposed from.
 * @param props - the draft, its errors, the choices offered, Wikidata's view and the callbacks
 * @returns the fields, as a fragment
 */
export function PolityFields(props: PolityFieldsProps) {
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
