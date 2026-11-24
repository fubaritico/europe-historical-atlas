/**
 * What attaching a city to a title at a year does to it (CMS-507, `files/plans/historian/autonomy-and-1200.md` § 2.1 and
 * § 3.5) — decided from the city's sheets alone, with no base, so every case is exercised with literals. The
 * operation (`attachCities`) carries the decision out; the title's page and the historian's script call it alike.
 */

import { dateCoversYear } from '@europe-historical-atlas/core/time/dateOverlap'
import { isDateRefusal } from '@europe-historical-atlas/core/time/historicalDate'

import { toHistoricalDate } from '../fields/dateReading'

import type { EventDateFields } from '../fields/dateReading'

/** One holder line of a sheet, as the decision reads it. */
export interface HolderLine {
  /** What the line speaks about. */
  readonly subject: string | null | undefined
  /** The polity it names. */
  readonly holderName?: string | null
  /** That polity's Wikidata id. */
  readonly holderQid?: string | null
}

/** A sheet of the city, as the decision reads it. */
export interface CitySheetRead {
  /** Its id. */
  readonly id: number | string
  /** Its date. */
  readonly date: EventDateFields
  /** Its holder's title, by id, or none. */
  readonly holderTitle: number | string | null
  /** What its sources say. */
  readonly testimonies: readonly HolderLine[]
}

/** The title the city is attached to, as the decision reads it. */
export interface TitleRead {
  /** Its id. */
  readonly id: number | string
  /** Its territory's name — what a holder line names. */
  readonly territoryName: string
  /** Its territory's Wikidata id, or none. */
  readonly territoryQid: string | null
}

/** What becomes of one city. */
export type AttachDecision =
  /** No sheet covers the year: one is made, held by the title, its holder inferred from the district. */
  | { readonly kind: 'create' }
  /** One sheet covers the year, with no holder and no line naming another: the title is set, the line added. */
  | { readonly kind: 'attach'; readonly sheet: number | string }
  /** The sheet is already held by this title: nothing is written. */
  | { readonly kind: 'unchanged'; readonly sheet: number | string }
  /** The city is held otherwise, or its sheets cannot be told apart: nothing is written, the reason said. */
  | {
      readonly kind: 'conflict'
      readonly sheet: number | string | null
      readonly reason: ConflictReason
    }

/** Why a city is left as it is. */
export type ConflictReason =
  /** Its sheet is held by another title, by id. */
  | { readonly kind: 'otherTitle'; readonly title: number | string }
  /** A line of its sheet names another polity, by its name. */
  | { readonly kind: 'otherLine'; readonly holder: string }
  /** Several of its sheets cover the year — the base refuses it, so this is a defect to mend by hand. */
  | { readonly kind: 'severalSheets'; readonly count: number }

/**
 * Whether a sheet's date covers a year. A date the base could not have saved is a defect, said loudly.
 * @param sheet - the sheet
 * @param year - the year
 * @returns `true` when its date covers the year
 * @throws when its date cannot be read
 */
function covers(sheet: CitySheetRead, year: number): boolean {
  const date = toHistoricalDate(sheet.date)
  if (isDateRefusal(date)) {
    throw new Error(`[CMS] city sheet ${String(sheet.id)} holds an unreadable date (${date.kind})`)
  }
  return dateCoversYear(date, year)
}

/**
 * The polity a holder line names, when it is not the title's territory: by Wikidata id when both have one, by name
 * otherwise.
 * @param line - the line
 * @param title - the title
 * @returns the other polity's name, or `null` when the line names the title's territory or no holder
 */
function otherHolder(line: HolderLine, title: TitleRead): string | null {
  if (line.subject !== 'holder') return null
  const name = line.holderName?.trim() ?? ''
  const qid = line.holderQid?.trim() ?? ''
  const same =
    qid !== '' && title.territoryQid !== null
      ? qid === title.territoryQid
      : name.toLocaleLowerCase('fr') === title.territoryName.trim().toLocaleLowerCase('fr')
  return same ? null : name === '' ? qid : name
}

/**
 * What attaching a city to a title at a year does to it.
 * @param sheets - every sheet of the city
 * @param title - the title
 * @param year - the year — the map's, inside the title's years (checked by the caller)
 * @returns the decision
 */
export function attachDecision(
  sheets: readonly CitySheetRead[],
  title: TitleRead,
  year: number
): AttachDecision {
  const covering = sheets.filter((sheet) => covers(sheet, year))
  const [sheet] = covering
  if (sheet === undefined) return { kind: 'create' }
  if (covering.length > 1) {
    return {
      kind: 'conflict',
      sheet: null,
      reason: { kind: 'severalSheets', count: covering.length },
    }
  }
  if (sheet.holderTitle !== null) {
    return String(sheet.holderTitle) === String(title.id)
      ? { kind: 'unchanged', sheet: sheet.id }
      : {
          kind: 'conflict',
          sheet: sheet.id,
          reason: { kind: 'otherTitle', title: sheet.holderTitle },
        }
  }
  const other = sheet.testimonies
    .map((line) => otherHolder(line, title))
    .find((name): name is string => name !== null)
  if (other !== undefined) {
    return { kind: 'conflict', sheet: sheet.id, reason: { kind: 'otherLine', holder: other } }
  }
  return { kind: 'attach', sheet: sheet.id }
}

/**
 * The years a title holds, as a span: its start, and its end when it has one — a title with no end holds its start
 * year alone (« Raymond IV, 1100 » says nothing of 1200).
 * @param date - the title's date
 * @returns the first and last year, or `null` when the date cannot be read
 */
export function titleYears(date: EventDateFields): { from: number; to: number } | null {
  const read = toHistoricalDate(date)
  if (isDateRefusal(read)) return null
  if (read.kind === 'instant') return { from: read.at.year, to: read.at.year }
  return { from: read.from.year, to: read.to.year }
}
