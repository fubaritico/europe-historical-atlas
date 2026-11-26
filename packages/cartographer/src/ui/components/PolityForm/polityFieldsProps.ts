import type { TerritoryAdded } from '../../../persistence/cmsTerritory'
import type { WikidataField } from '../../../wikidata/wikidataFacts'
import type { AddToCmsOffer } from '../../utils/addToCmsOffer'
import type { DraftError, DraftField, DraftOption, PolityDraft } from '../../utils/polityDraft'
import type { RankWarning } from '../../utils/rankWarnings'
import type { TerritoryProposal } from '../../utils/territoryProposals'
import type { WikidataView } from '../../utils/wikidataView'
import type { ColorValue } from '@fubaritico/behaviors'

/** « Ajouter au CMS », as the form shows it (CARTO-498, the flow offline). */
export interface AddToCmsProps {
  /** What is offered: the territory's page, the territory ready to add, or why not yet. */
  offer: AddToCmsOffer
  /** Whether a creation is on its way — the button waits. */
  sending: boolean
  /** How the last creation ended, or `null` before any. */
  outcome: TerritoryAdded | null
  /**
   * The address of a territory's page in the CMS.
   * @param id - its number
   * @returns the address
   */
  pageOf: (id: number) => string
  /** The author clicked « Ajouter au CMS ». */
  onAdd: () => void
}

/** The fields a form event can name: every text field and every list of the draft — the colour and the box their own. */
export type PolityFormField = Exclude<keyof PolityDraft, 'idEdited' | 'colour' | 'forceShortName'>

/** What the form's fields show and what they report — the form's own props extend these. */
export interface PolityFieldsProps {
  /** The form's values. */
  draft: PolityDraft
  /** Why which field is refused, after a reading refused the form — worded here, in the page's language. */
  errors: Partial<Record<DraftField, DraftError>>
  /** The polities of the year it may owe homage to, as value (id) and label (name). */
  suzerains: readonly DraftOption[]
  /** The CMS's territories it may be tied to, as value (number) and label (CARTO-450). */
  territories: readonly DraftOption[]
  /** The ranks it may take, as stored — the usual ones and every one the year already uses (`rankChoices`). */
  ranks: readonly string[]
  /**
   * The steps of vassalage the ranks contradict — a vassal scoring higher than its suzerain (CORE-489): said under the
   * suzerain, never refused.
   */
  rankWarnings: readonly RankWarning[]
  /** What the CMS's territory chosen proposes for the form's fields — taken on the author's click alone (CARTO-488). */
  territoryProposals: readonly TerritoryProposal[]
  /** « Ajouter au CMS » under « Territoire du CMS » (CARTO-498) — `null` online, where the chrome writes no CMS. */
  addToCms: AddToCmsProps | null
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
   * @param colour - the picked colour, `null` for "automatic", or « no colour » (CARTO-484)
   */
  onColour: (colour: ColorValue) => void
  /**
   * The box « force the short name » ticked or unticked.
   * @param force - whether the short name is written everywhere
   */
  onForceShortName: (force: boolean) => void
  /** What Wikidata says about the id typed (CARTO-243). */
  wikidata: WikidataView
  /**
   * Take Wikidata's value for a field — only on the author's click.
   * @param field - the field
   * @param value - Wikidata's value, as the form holds it
   */
  onUseWikidata: (field: WikidataField, value: string) => void
}
