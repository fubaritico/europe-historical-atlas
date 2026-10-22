import type { DraftError, DraftField, DraftOption, PolityDraft } from '../../utils/polityDraft'
import type { WikidataView } from '../../utils/wikidataView'
import type { WikidataField } from '../../wikidata/wikidataFacts'
import type { HsvaColor } from '@fubaritico/behaviors'

/** The fields a form event can name: every text field and every list of the draft — the colour has its own. */
export type PolityFormField = Exclude<keyof PolityDraft, 'idEdited' | 'colour'>

/** What the form's fields show and what they report — the form's own props extend these. */
export interface PolityFieldsProps {
  /** The form's values. */
  draft: PolityDraft
  /** Why which field is refused, after a reading refused the form — worded here, in the page's language. */
  errors: Partial<Record<DraftField, DraftError>>
  /** The polities of the year it may owe homage to, as value (id) and label (name). */
  suzerains: readonly DraftOption[]
  /** The ranks it may take, as stored — the usual ones and every one the year already uses (`rankChoices`). */
  ranks: readonly string[]
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
