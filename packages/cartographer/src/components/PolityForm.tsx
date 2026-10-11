import { Button } from '@fubaritico/react/Button'
import { Card } from '@fubaritico/react/Card'
import { ColorField } from '@fubaritico/react/ColorField'
import { Dropdown } from '@fubaritico/react/Dropdown'
import { IconButton } from '@fubaritico/react/IconButton'
import { Input } from '@fubaritico/react/Input'

import { RANKS, STATUSES } from './polityDraft'

import type { DraftField, DraftOption, PolityDraft } from './polityDraft'
import type { HsvaColor } from '@fubaritico/behaviors'

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

/**
 * Marks the first field with the native `autofocus` attribute, which `showModal()` honours: the dialogue
 * opens with the cursor in Name, ready to type, rather than on the close cross that comes first in it.
 *
 * **Not React's `autoFocus` prop**, which writes no attribute — it calls `focus()` when the element
 * mounts, and the form mounts while the dialogue is still closed, so that call is lost. A ref runs at
 * commit, before the Modal's effect opens the dialogue, so the attribute is there when it looks.
 */
function autofocusOnOpen(node: HTMLInputElement | null): void {
  node?.setAttribute('autofocus', '')
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
  return (
    <div className="ui-field">
      {/* Visual only: the trigger carries the same name as its `aria-label`. */}
      <span className="ui-field__label" aria-hidden="true">
        {label}
      </span>
      <Dropdown
        aria-label={label}
        selectedValue={value ?? NONE}
        onSelect={(selected) => {
          onSelect(selected === NONE ? null : selected)
        }}
        options={[{ value: NONE, label: 'none' }, ...options]}
      />
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
  return <ColorField label="Colour" value={value} onChange={onChange} nullable density="compact" />
}

/** The form's fields, in `s02`'s order, with the id after the name it is proposed from. */
function PolityFields(props: PolityFormProps) {
  const { draft, errors, suzerains, onField, onColour } = props
  const choose = (field: PolityFormField) => (value: string | null) => {
    onField(field, value)
  }
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
      <ChoiceField label="Rank" options={RANKS} value={draft.rank} onSelect={choose('rank')} />
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
      <ChoiceField
        label="Suzerain"
        options={suzerains}
        value={draft.suzerain}
        onSelect={choose('suzerain')}
      />
      <ColourField value={draft.colour} onChange={onColour} />
      <Input label="Wikidata id" placeholder="Q…" {...textField('wikidata', props)} />
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
  const { title, onSubmit, onCancel } = props
  return (
    <form
      className="polity-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
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
