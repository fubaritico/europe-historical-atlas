import { POLITY_RANKS } from '@europe-historical-atlas/core/data/ranks'

import type { PolityDraft } from './polityDraft'
import type { ContentTerritory } from '@europe-historical-atlas/core/data/contentFormat'

/** The fields of the form a territory of the CMS can fill. */
export type TerritoryProposalField = 'name' | 'rank' | 'existsFrom' | 'existsTo'

/**
 * What the CMS's territory proposes for one field of the polity's form (CARTO-488, the dev, 2026-11-20: choosing
 * « Jablé — CMS ID 372 » filled nothing). **It proposes, it never writes**, as Wikidata does: the field changes on
 * the author's click of « Use » or « Replace » alone.
 */
export interface TerritoryProposal {
  /** The field. */
  field: TerritoryProposalField
  /** The value to write into the form, as the form holds it: a name, a rank as stored, a year as text. */
  value: string
  /** `empty` — the field is blank, take it; `differs` — the author wrote something else; `same` — agreed. */
  state: 'empty' | 'differs' | 'same'
}

/** The ranks the form offers, for a kind to be looked up among them. */
const RANKS: ReadonlySet<string> = new Set(POLITY_RANKS)

/**
 * Compare a field of the form with what the territory holds.
 * @param field - the field
 * @param held - what the form holds, `null` or blank for nothing
 * @param value - the territory's value, as the form would hold it
 * @returns the proposal
 */
function compare(
  field: TerritoryProposalField,
  held: string | null,
  value: string
): TerritoryProposal {
  const state =
    held === null || held.trim() === '' ? 'empty' : held.trim() === value ? 'same' : 'differs'
  return { field, value, state }
}

/**
 * What the territory chosen in « Territoire du CMS » proposes for the form: its name, its kind when it is a rank the form
 * offers — a city, an abbey or an office is no rank of a polity — and the years it exists between, each when the CMS
 * gives it.
 * @param draft - the form's values
 * @param territory - the territory chosen, `undefined` when none is, or when the export no longer lists its number
 * @returns one proposal per field the territory has something for; none without a territory
 */
export function territoryProposals(
  draft: Pick<PolityDraft, TerritoryProposalField>,
  territory: ContentTerritory | undefined
): TerritoryProposal[] {
  if (territory === undefined) return []
  const out = [compare('name', draft.name, territory.name)]
  if (territory.kind !== undefined && RANKS.has(territory.kind))
    out.push(compare('rank', draft.rank, territory.kind))
  if (typeof territory.existsFrom === 'number')
    out.push(compare('existsFrom', draft.existsFrom, String(territory.existsFrom)))
  if (typeof territory.existsTo === 'number')
    out.push(compare('existsTo', draft.existsTo, String(territory.existsTo)))
  return out
}
