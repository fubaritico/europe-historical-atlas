import { vassalsOf, wouldExceedHomageDepth } from '@europe-historical-atlas/core/data/paintOrder'
import { proposePolityId } from '@europe-historical-atlas/core/editor/polityId'
import { TRIBE_RANK } from '@europe-historical-atlas/core/editor/tribes'

import { pickedColour, toFileColour } from './polityColourValue'

import type { YearPolity } from '@europe-historical-atlas/core/data/yearFormat'
import type { HsvaColor } from '@fubaritico/behaviors'

/**
 * What the polity form holds while the author types — strings where the author types, the raw choice
 * where they pick, and nothing decided yet.
 *
 * **Strings for the years, not numbers**, because a half-typed `-` or `98` is a legitimate state of a
 * field and only becomes a year (or an error) when the form is read.
 */
export interface PolityDraft {
  /** As typed. */
  name: string
  /** As typed, or as proposed from the name while {@link PolityDraft.idEdited} is false. */
  id: string
  /** Whether the author has written the id themselves — from then on the name no longer proposes one. */
  idEdited: boolean
  /** A rank — an open vocabulary, offered by {@link rankChoices} — or `null` for none. */
  rank: string | null
  /** One of {@link STATUSES}' values, or `null` for none. */
  status: string | null
  /** As typed: empty, or a whole year. */
  existsFrom: string
  /** As typed: empty, or a whole year. */
  existsTo: string
  /** The id of a polity of the same year, or `null` when it owes nobody. */
  suzerain: string | null
  /** As typed: empty, or a Wikidata id. */
  wikidata: string
  /**
   * As picked, or `null` for "automatic" — *"the palette decides"* (`s02`).
   *
   * **Held as the picker's HSVA, not as the file's hex**: the design system keeps HSVA as the source of
   * truth because a grey carries no hue in RGB, so a draft round-tripped through hex would jump the hue
   * thumb back to red. The hex is made once, when the form is read.
   */
  colour: HsvaColor | null
}

/** A blank form — what `[+ New polity]` opens. */
export const EMPTY_DRAFT: PolityDraft = {
  name: '',
  id: '',
  idEdited: false,
  rank: null,
  status: null,
  existsFrom: '',
  existsTo: '',
  suzerain: null,
  wikidata: '',
  colour: null,
}

/** One choice of a list: the value stored in the file, and what the list shows. */
export interface DraftOption {
  /** Written to the file as is. */
  value: string
  /** What the author reads. */
  label: string
}

/**
 * The ranks the form offers — `design/03`'s list, as stored in the file. The format's `rank` is an open
 * vocabulary (OHM's `border_type`), so a value outside this list read from a file stays valid; the form simply
 * offers these, and names each in the page's language (`PolityForm`'s catalogue).
 */
export const RANKS: readonly string[] = [
  'empire',
  'kingdom',
  'principality',
  'duchy',
  'county',
  // The rank that makes a polity a tribe, drawn with no fill — core's, never a copy (review ARCH-001).
  TRIBE_RANK,
]

/** The standings the form offers — `design/03`'s list, stored as OHM writes its `place` values. */
export const STATUSES: readonly string[] = ['country', 'personal_union', 'condominium']

/**
 * Take a new name, and propose an id from it while the author has not written one.
 * @param draft - the form as it was
 * @param name - the name as now typed
 * @param taken - the ids already in the year, which a proposal steps past
 * @returns the form with the name, and the proposal unless the id is the author's
 */
export function withName(draft: PolityDraft, name: string, taken: Iterable<string>): PolityDraft {
  return draft.idEdited ? { ...draft, name } : { ...draft, name, id: proposePolityId(name, taken) }
}

/**
 * Take an id the author typed. Emptying the field hands it back to the name's proposals, so a cleared id
 * is not left blank for ever by a single keystroke.
 * @param draft - the form as it was
 * @param id - the id as now typed
 * @returns the form with the id
 */
export function withId(draft: PolityDraft, id: string): PolityDraft {
  return { ...draft, id, idEdited: id !== '' }
}

/** The fields a reading can refuse. */
export type DraftField = 'name' | 'id' | 'existsFrom' | 'existsTo'

/** What reading the form gives: the polity to create, or what to say beside which field. */
export type DraftReading =
  { ok: true; polity: YearPolity } | { ok: false; errors: Partial<Record<DraftField, DraftError>> }

/**
 * Why a field is refused — a key of `PolityForm`'s catalogue, which words it in the page's language. The
 * reading stays out of React and out of any language.
 */
export type DraftError = 'nameMissing' | 'idMissing' | 'idTaken' | 'notAYear'

/**
 * `''` → `null`; a whole number, negative for before the era → that number; anything else → `undefined`.
 * @param text - the year as typed
 * @returns the year, `null` when the field is empty, `undefined` when it is not a whole number
 */
function readYear(text: string): number | null | undefined {
  const trimmed = text.trim()
  if (trimmed === '') return null
  return /^-?\d+$/.test(trimmed) ? Number(trimmed) : undefined
}

/**
 * Read the form into a polity, or say what stops it.
 *
 * **Only what would break the file is refused** — an empty name or id, an id the year already holds, a
 * year that is not a number. Everything else is the author's to decide, `s00`'s rule: an end before the
 * beginning is odd and not refused, a Wikidata id is not checked for shape. A colour cannot be refused:
 * the picker only ever produces one.
 * @param draft - the form
 * @param taken - the ids already in the year
 * @returns the polity, or the errors by field
 */
export function readDraft(draft: PolityDraft, taken: ReadonlySet<string>): DraftReading {
  const errors: Partial<Record<DraftField, DraftError>> = {}
  const name = draft.name.trim()
  const id = draft.id.trim()
  const existsFrom = readYear(draft.existsFrom)
  const existsTo = readYear(draft.existsTo)

  if (name === '') errors.name = 'nameMissing'
  if (id === '') errors.id = 'idMissing'
  else if (taken.has(id)) errors.id = 'idTaken'
  if (existsFrom === undefined) errors.existsFrom = 'notAYear'
  if (existsTo === undefined) errors.existsTo = 'notAYear'

  if (Object.keys(errors).length > 0 || existsFrom === undefined || existsTo === undefined) {
    return { ok: false, errors }
  }

  const wikidata = draft.wikidata.trim()
  return {
    ok: true,
    polity: {
      id,
      name,
      rank: draft.rank,
      status: draft.status,
      suzerain: draft.suzerain,
      existsFrom,
      existsTo,
      colour: toFileColour(draft.colour),
      wikidata: wikidata === '' ? null : wikidata,
    },
  }
}

/**
 * The form filled with a polity of the year — what *[Edit properties…]* opens (`s07`): *"the same form
 * as creation opens, filled with its current values"*. The id is marked as the author's, so the name no
 * longer proposes one: an existing polity's id never changes.
 * @param polity - the polity, as the document holds it
 * @returns the draft
 */
export function draftOf(polity: YearPolity): PolityDraft {
  return {
    name: polity.name,
    id: polity.id,
    idEdited: true,
    rank: polity.rank,
    status: polity.status,
    existsFrom: polity.existsFrom === null ? '' : String(polity.existsFrom),
    existsTo: polity.existsTo === null ? '' : String(polity.existsTo),
    suzerain: polity.suzerain,
    wikidata: polity.wikidata ?? '',
    colour: pickedColour(polity),
  }
}

/**
 * The ranks the form offers for a year: {@link RANKS}, then **every other rank the year already uses**, in
 * alphabetical order. The rank is an open vocabulary, so a value read from a file — `lordship`, `emirate` —
 * must be choosable for another polity and shown as the current one, never hidden behind "none" (the dev,
 * 2026-10-16: *« qu'est-ce qui empêche les choses ? »*).
 * @param polities - the year's polities
 * @returns the choices, in list order
 */
export function rankChoices(polities: readonly Pick<YearPolity, 'rank'>[]): string[] {
  const offered = new Set(RANKS)
  const used = [...new Set(polities.map((polity) => polity.rank))]
    .filter((rank): rank is string => rank !== null && rank !== '' && !offered.has(rank))
    .sort((a, b) => a.localeCompare(b))
  return [...RANKS, ...used]
}

/**
 * The polities a polity may owe homage to — every other one of the year, **less itself and its own
 * vassals at any depth**: choosing one of those would close a loop of homage, which the document refuses
 * (`updatePolity`). Offering it and then refusing it would be a choice the form pretends to give. **Nor
 * one that would seat the polity, or a vassal below it, deeper than `MAX_HOMAGE_DEPTH`**
 * (`wouldExceedHomageDepth`), which the document refuses as well (`addPolity`, `updatePolity`).
 * @param polities - the year's polities
 * @param editing - the polity being edited, or `null` when creating one
 * @returns the choices, in list order
 */
export function suzerainChoices(
  polities: readonly YearPolity[],
  editing: string | null
): DraftOption[] {
  const below = editing === null ? new Set<string>() : vassalsOf(polities, editing)
  if (editing !== null) below.add(editing)
  return polities
    .filter((polity) => !below.has(polity.id))
    .filter((polity) => !wouldExceedHomageDepth(polities, editing, polity.id))
    .map((polity) => ({ value: polity.id, label: polity.name }))
}
