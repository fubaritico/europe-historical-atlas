import { POLITY_RANKS } from '@europe-historical-atlas/core/data/ranks'

import type { PolityDraft } from './polityDraft'
import type { WikidataView } from './wikidataView'
import type { TerritoryToAdd } from '../../persistence/cmsTerritory'
import type { WikidataFacts } from '../../wikidata/wikidataFacts'

/**
 * What the polity's form offers about the CMS (CARTO-498, the flow offline): the page of the territory it is tied to,
 * the territory ready to be added, or why it cannot be yet. Pure, so the dialogue's binding stays a few lines.
 */
export type AddToCmsOffer =
  /** Tied to a territory: its page, to complete it. */
  | { kind: 'linked'; id: number }
  /** Ready: « Ajouter au CMS » creates this. */
  | { kind: 'ready'; territory: TerritoryToAdd }
  /** Not yet, and why — the form says it under the field. */
  | { kind: 'blocked'; reason: AddToCmsBlock }

/** Why a polity cannot be added to the CMS yet. */
export type AddToCmsBlock =
  /** No Wikidata item read: the CMS's names and the search for a twin come from it. */
  | 'noWikidata'
  /** The item is a person or a page about Wikipedia, not a polity. */
  | 'notAPolity'
  /** No rank chosen: it is the territory's kind, required by the CMS. */
  | 'noRank'
  /** Wikidata has no French name: the CMS's « Nom » is required. */
  | 'noFrenchName'
  /** Wikidata has no English name: required in the CMS too (CMS-495). */
  | 'noEnglishName'
  /** A year of the form is not a whole year. */
  | 'badYear'

/** The ranks, for the draft's rank to be checked among them. */
const RANKS: ReadonlySet<string> = new Set(POLITY_RANKS)

/**
 * A year of the form, else Wikidata's when the field is empty.
 * @param typed - the field, as typed
 * @param wikidata - Wikidata's year, or `null`
 * @returns the year, `null` for none, or `undefined` when the field holds something that is not a whole year
 */
function yearOf(typed: string, wikidata: number | null): number | null | undefined {
  if (typed.trim() === '') return wikidata
  const year = Number(typed.trim())
  return Number.isInteger(year) && year !== 0 ? year : undefined
}

/**
 * The names and the kind of the territory, from Wikidata's item and the form's rank — or why they are missing.
 * @param rank - the form's rank
 * @param facts - what Wikidata says
 * @returns the names and the kind, or the reason the polity cannot go to the CMS yet
 */
function namesOf(
  rank: string | null,
  facts: WikidataFacts
): Pick<TerritoryToAdd, 'name' | 'nameEn' | 'kind'> | AddToCmsBlock {
  if (facts.notASubject !== null) return 'notAPolity'
  if (rank === null || !RANKS.has(rank)) return 'noRank'
  if (facts.labels.fr === null) return 'noFrenchName'
  if (facts.labels.en === null) return 'noEnglishName'
  return { name: facts.labels.fr, nameEn: facts.labels.en, kind: rank }
}

/**
 * What the form offers about the CMS.
 * @param draft - the form's values
 * @param view - what Wikidata says about the item typed
 * @returns the offer
 */
export function addToCmsOffer(
  draft: Pick<PolityDraft, 'territory' | 'rank' | 'existsFrom' | 'existsTo'>,
  view: WikidataView
): AddToCmsOffer {
  const linked = draft.territory === null ? NaN : Number(draft.territory)
  if (Number.isInteger(linked)) return { kind: 'linked', id: linked }
  if (view.kind !== 'found') return { kind: 'blocked', reason: 'noWikidata' }
  const { facts } = view
  const names = namesOf(draft.rank, facts)
  if (typeof names === 'string') return { kind: 'blocked', reason: names }
  const existsFrom = yearOf(draft.existsFrom, facts.inception)
  const existsTo = yearOf(draft.existsTo, facts.dissolved)
  if (existsFrom === undefined || existsTo === undefined)
    return { kind: 'blocked', reason: 'badYear' }
  return {
    kind: 'ready',
    territory: {
      ...names,
      wikidata: facts.id,
      existsFrom,
      existsTo,
    },
  }
}
