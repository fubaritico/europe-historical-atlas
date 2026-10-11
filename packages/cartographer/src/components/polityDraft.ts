import { hexToRgba, hsvaToHex, rgbaToHsva } from '@fubaritico/behaviors'

import { vassalsOf } from '@europe-historical-atlas/core/data/paintOrder'
import { proposePolityId } from '@europe-historical-atlas/core/editor/polityId'

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
  /** One of {@link RANKS}' values, or `null` for none. */
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
 * The ranks the form offers — `design/03`'s list. The format's `rank` is an open vocabulary (OHM's
 * `border_type`), so a value outside this list read from a file stays valid; the form simply offers these.
 */
export const RANKS: readonly DraftOption[] = [
  { value: 'empire', label: 'empire' },
  { value: 'kingdom', label: 'kingdom' },
  { value: 'principality', label: 'principality' },
  { value: 'duchy', label: 'duchy' },
  { value: 'county', label: 'county' },
]

/** The standings the form offers — `design/03`'s list, stored as OHM writes its `place` values. */
export const STATUSES: readonly DraftOption[] = [
  { value: 'country', label: 'country' },
  { value: 'personal_union', label: 'personal union' },
  { value: 'condominium', label: 'condominium' },
]

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
  { ok: true; polity: YearPolity } | { ok: false; errors: Partial<Record<DraftField, string>> }

/** The messages, in one place so a test can name them. */
export const DRAFT_ERRORS = {
  nameMissing: 'A polity needs a name.',
  idMissing: 'An id is needed — none could be made from this name.',
  idTaken: 'This id is already used in this year.',
  notAYear: 'A year, as a whole number.',
} as const

/** `''` → `null`; a whole number, negative for before the era → that number; anything else → `undefined`. */
function readYear(text: string): number | null | undefined {
  const trimmed = text.trim()
  if (trimmed === '') return null
  return /^-?\d+$/.test(trimmed) ? Number(trimmed) : undefined
}

/**
 * The file's `#rrggbb` for a picked colour.
 *
 * **The alpha is set to opaque, and that is the format speaking, not a fallback**: a polity's colour has
 * no alpha channel — the atlas lays it over the relief itself — and the file's schema accepts six digits
 * only. The form never offers alpha, so this changes nothing a picker produced; it stops an eight-digit
 * hex, which the reader would refuse at the next open, from ever being written.
 * @param colour - the picked colour, or `null` for "automatic"
 * @returns the lowercase six-digit hex, or `null` — the file's own "the palette decides"
 */
function toFileColour(colour: HsvaColor | null): string | null {
  return colour === null ? null : hsvaToHex({ ...colour, a: 1 })
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
  const errors: Partial<Record<DraftField, string>> = {}
  const name = draft.name.trim()
  const id = draft.id.trim()
  const existsFrom = readYear(draft.existsFrom)
  const existsTo = readYear(draft.existsTo)

  if (name === '') errors.name = DRAFT_ERRORS.nameMissing
  if (id === '') errors.id = DRAFT_ERRORS.idMissing
  else if (taken.has(id)) errors.id = DRAFT_ERRORS.idTaken
  if (existsFrom === undefined) errors.existsFrom = DRAFT_ERRORS.notAYear
  if (existsTo === undefined) errors.existsTo = DRAFT_ERRORS.notAYear

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
 * A polity's colour as the picker holds it, or `null` for "automatic".
 *
 * **A colour that does not read as hex is said, and opens as automatic.** It cannot come from the
 * readers (the schema takes `#rrggbb` only) nor from the picker; reaching it is a defect. Validating the
 * form then would write the palette's colour in its place — the one cost of not refusing to open.
 * @param polity - the polity
 * @returns the HSVA, or `null`
 */
function pickedColour(polity: YearPolity): HsvaColor | null {
  if (polity.colour === null) return null
  const rgba = hexToRgba(polity.colour)
  if (rgba === null) {
    console.error(
      `[Cartographer] "${polity.id}" has the colour "${polity.colour}", which is no hex.`
    )
    return null
  }
  return rgbaToHsva(rgba)
}

/**
 * The polities a polity may owe homage to — every other one of the year, **less itself and its own
 * vassals at any depth**: choosing one of those would close a loop of homage, which the document refuses
 * (`updatePolity`). Offering it and then refusing it would be a choice the form pretends to give.
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
    .map((polity) => ({ value: polity.id, label: polity.name }))
}
