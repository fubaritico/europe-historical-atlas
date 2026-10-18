import { Button } from '@fubaritico/react/Button'
import { Card } from '@fubaritico/react/Card'
import { ColorField } from '@fubaritico/react/ColorField'
import { Dropdown } from '@fubaritico/react/Dropdown'
import { IconButton } from '@fubaritico/react/IconButton'
import { Input } from '@fubaritico/react/Input'
import { Typeahead } from '@fubaritico/react/Typeahead'
import { useEffect, useRef, useState } from 'react'

import { autofocusOnOpen } from './autofocusOnOpen'
import { STATUSES } from './polityDraft'
import { MAX_SUGGESTIONS, matchingOptions } from './suzerainSearch'
import { WikidataPanel } from './WikidataPanel'

import type { DraftField, DraftOption, PolityDraft } from './polityDraft'
import type { WikidataView } from './WikidataPanel'
import type { WikidataField } from '../wikidata/wikidataFacts'
import type { HsvaColor } from '@fubaritico/behaviors'
import type { SubmitEvent } from 'react'

/** The fields a form event can name: every text field and every list of the draft — the colour has its own. */
export type PolityFormField = Exclude<keyof PolityDraft, 'idEdited' | 'colour'>

/**
 * What the polity form shows and what it reports. Never the store: the binding,
 * `PolityDialog`, reads the store and hands this view literals.
 */
export interface PolityFormProps {
  /** The dialogue's title. */
  title: string
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
  /** [OK] or ‹enter›: read the form. */
  onSubmit: () => void
  /** [Cancel] or the close cross: leave without creating anything. */
  onCancel: () => void
  /** What Wikidata says about the id typed (CARTO-243). */
  wikidata: WikidataView
  /**
   * Take Wikidata's value for a field — only on the author's click.
   * @param field - the field
   * @param value - Wikidata's value, as the form holds it
   */
  onUseWikidata: (field: WikidataField, value: string) => void
}

/** The value standing for "none" in a list — the design system's Dropdown selects strings only. */
const NONE = ''

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

/** A list laid out like a field: the label left, the choice right, "none" first. */
function ChoiceField({
  label,
  options,
  value,
  onSelect,
}: {
  label: string
  options: readonly DraftOption[]
  value: string | null
  onSelect: (value: string | null) => void
}) {
  // Handlers
  const handleSelect = (selected: string) => {
    onSelect(selected === NONE ? null : selected)
  }

  // Render
  return (
    <div className="ui-field">
      {/* Visual only: the trigger carries the same name as its `aria-label`. */}
      <span className="ui-field__label" aria-hidden="true">
        {label}
      </span>
      <Dropdown
        aria-label={label}
        selectedValue={value ?? NONE}
        onSelect={handleSelect}
        options={[{ value: NONE, label: 'none' }, ...options]}
      />
    </div>
  )
}

/**
 * The suzerain held now — its name, or *none* — and the cross that removes it.
 * @param props - the name held and what removing does
 * @param props.held - the suzerain's name, or `null` when there is none
 * @param props.onRemove - remove the suzerain
 * @returns the line
 */
function HeldSuzerain({ held, onRemove }: { held: string | null; onRemove: () => void }) {
  // Render
  return (
    <p className="suzerain-field__held">
      {/* Announced when the choice changes (A11Y-010); the cross stays out of the announcement. */}
      <span role="status">{held ?? 'none'}</span>
      {held !== null && (
        <IconButton
          type="button"
          icon="XMark"
          aria-label={`Remove the suzerain ${held}`}
          onClick={onRemove}
        />
      )}
    </p>
  )
}

/**
 * The suzerain, chosen by typing (CARTO-241): about 150 polities in 1100 were too many to scroll in a list.
 *
 * The polity held now is shown above the field, with a cross to remove it; the field is the design system's
 * `Typeahead`: it searches from the first letter, offers the matches (prefixes first, accents ignored,
 * `suzerainSearch.ts`) with the typed part in bold, and brings the keyboard and the combobox pattern. The
 * options are the ones the binding already cleared of every polity that would make a loop of homage.
 * @param props - the options, the polity held, and where the choice goes
 * @param props.options - the polities that may be chosen
 * @param props.value - the suzerain held now, or `null`
 * @param props.onSelect - called with the chosen id, or `null` to remove the suzerain
 * @returns the field
 */
function SuzerainField({
  options,
  value,
  onSelect,
}: {
  options: readonly DraftOption[]
  value: string | null
  onSelect: (value: string | null) => void
}) {
  // Refs
  const field = useRef<HTMLDivElement>(null)

  // State
  const [query, setQuery] = useState('')

  // Derived
  const known = options.find((option) => option.value === value)
  // A held id the list does not offer (a loop of homage already in the file) is shown as itself, and said.
  const held = value === null ? null : (known?.label ?? value)
  const matches = matchingOptions(options, query, MAX_SUGGESTIONS)

  // Handlers
  const handleSelect = (selected: string) => {
    onSelect(selected)
    setQuery('')
  }
  const handleRemove = () => {
    onSelect(null)
    // The cross unmounts with the suzerain: the focus goes to the field rather than to the dialogue (A11Y-001).
    field.current?.querySelector('input')?.focus()
  }

  // Effects
  useEffect(() => {
    if (value !== null && known === undefined)
      console.warn(
        `[Cartographer] the suzerain "${value}" is not among the polities offered — shown as its id`
      )
  }, [value, known])

  // Render
  return (
    <div ref={field} className="ui-field suzerain-field">
      {/* Visual only: the field carries the same name as its `aria-label`. */}
      <span className="ui-field__label" aria-hidden="true">
        Suzerain
      </span>
      <HeldSuzerain held={held} onRemove={handleRemove} />
      <Typeahead minChars={1} onSearch={setQuery} onSelect={handleSelect}>
        <Typeahead.Input aria-label="Suzerain" placeholder="Type a name to choose…" />
        <Typeahead.Menu aria-label="Polities">
          {matches.map((option, index) => (
            <Typeahead.Item key={option.value} value={option.value} index={index}>
              <Typeahead.Highlight>{option.label}</Typeahead.Highlight>
            </Typeahead.Item>
          ))}
          {matches.length === 0 && <Typeahead.Empty>No polity matches</Typeahead.Empty>}
        </Typeahead.Menu>
      </Typeahead>
    </div>
  )
}

/**
 * The colour, as the design system's field: a swatch, the hex, and the picker in a popover.
 *
 * `nullable` is "automatic", `s02`'s default. **No `alpha`**: a polity's colour is laid over the relief,
 * so the format has no opacity to give. **The popover stays inside the Modal**, never in a portal —
 * `showModal()` makes everything outside the dialogue inert, so a portalled panel could not be clicked.
 */
function ColourField({
  value,
  onChange,
}: {
  value: HsvaColor | null
  onChange: (colour: HsvaColor | null) => void
}) {
  // Render
  return <ColorField label="Colour" value={value} onChange={onChange} nullable density="compact" />
}

/** The form's fields, in `s02`'s order, with the id after the name it is proposed from. */
function PolityFields(props: PolityFormProps) {
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

/**
 * The polity form: `s02`'s eight fields plus the id, as a dialogue — a `Card` with a title bar, the
 * fields, and Cancel/OK. The view of the shell/view/binding split: literals in, events out.
 *
 * **Every button but OK is `type="button"`**, the close cross included: inside a `<form>` a button
 * submits by default, so a forgotten type would turn "close" into "create".
 * @param props - the values and the callbacks
 * @returns the form
 */
export function PolityForm(props: PolityFormProps) {
  // Derived
  const { title, onSubmit, onCancel } = props

  // Handlers
  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit()
  }

  // Render
  return (
    <form className="polity-form" noValidate onSubmit={handleSubmit}>
      <Card>
        <Card.Header>
          {title}
          <IconButton type="button" icon="XMark" aria-label="Close" onClick={onCancel} />
        </Card.Header>
        <Card.Body>
          <PolityFields {...props} />
        </Card.Body>
        <Card.Footer align="end">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">OK</Button>
        </Card.Footer>
      </Card>
    </form>
  )
}
