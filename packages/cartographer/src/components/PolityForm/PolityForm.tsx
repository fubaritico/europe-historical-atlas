import { Button } from '@fubaritico/react/Button'
import { Card } from '@fubaritico/react/Card'
import { IconButton } from '@fubaritico/react/IconButton'

import { PolityFields } from './internal/PolityFields'

import type { WikidataField } from '../../wikidata/wikidataFacts'
import type { DraftField, DraftOption, PolityDraft } from '../shared/polityDraft'
import type { WikidataView } from '../shared/wikidataView'
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
