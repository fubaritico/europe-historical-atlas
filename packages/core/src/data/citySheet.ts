/**
 * A city at a date — « Rome en 1100 » — as the contribution writes it (ATLAS-295, `files/plans/atlas/cities.md`,
 * decisions 5b and 8): the place it is a sheet of, its date, its importance on the map. **Meant as one schema for
 * every reader** (decision 8). Today the CMS's form validates against it while the contributor types; the CMS's
 * server and the export join it with the screen's third step, when it gains the reasons and the sources' lines
 * (`files/plans/atlas/city-sheet-screen.md`).
 */

import { z } from 'zod/mini'

import { historicalDateSchema } from '../time/historicalDate'

import { CITY_IMPORTANCES } from './cityImportance'

import type { CityImportance } from './cityImportance'
import type { HistoricalDate } from '../time/historicalDate'

/** A city at a date, read. */
export interface CitySheet {
  /** The place it is a sheet of, by the CMS's id — a number in SQLite, a string in another base. */
  place: number | string
  /** When: a year alone counts for that year, an interval for every year it covers (decision 7). */
  date: HistoricalDate
  /** When it appears on the map as the zoom closes in. */
  importance: CityImportance
}

/** The fields of a {@link CitySheet}, for a reader to say where an issue is. */
export type CitySheetField = keyof CitySheet

/**
 * {@link CitySheet} with every rule: a place, a date as {@link historicalDateSchema} reads it, one of the three
 * importances. A document's other fields (its id, its timestamps) are ignored, not refused — the CMS hands the whole
 * document to its server-side check.
 */
export const citySheetSchema: z.ZodMiniType<CitySheet> = z.object({
  place: z.union([z.int(), z.string().check(z.minLength(1))]),
  date: historicalDateSchema,
  importance: z.enum(CITY_IMPORTANCES),
})

/** One thing wrong with a sheet, and where. */
export interface CitySheetIssue {
  /** The field it is about. */
  field: CitySheetField
  /** Zod's own wording, in English — for a log; a form says it in its own words, by {@link CitySheetIssue.field}. */
  detail: string
}

/**
 * Check a sheet, every field at once — a form shows each one under its field.
 * @param value - anything; it earns its type here
 * @returns the sheet, or every issue found, by field
 * @throws {Error} when zod reports an issue on no field of the sheet — its defect or ours, said rather than shown
 *   under a field it does not name
 */
export function checkCitySheet(value: unknown): CitySheet | CitySheetIssue[] {
  const parsed = citySheetSchema.safeParse(value)
  if (parsed.success) return parsed.data
  return parsed.error.issues.map((issue) => {
    const field = issue.path[0]
    if (!isSheetField(field)) {
      throw new Error(`[core] a city sheet's issue names no field: ${issue.message}`)
    }
    return { field, detail: issue.message }
  })
}

/** The fields, as a set, to tell one from any other key. */
const FIELDS: ReadonlySet<PropertyKey> = new Set<CitySheetField>(['place', 'date', 'importance'])

/**
 * Whether a path's first key is a field of the sheet.
 * @param key - the key
 * @returns `true` for `place`, `date` or `importance`
 */
function isSheetField(key: PropertyKey | undefined): key is CitySheetField {
  return key !== undefined && FIELDS.has(key)
}

/**
 * Whether {@link checkCitySheet} refused.
 * @param answer - what it answered
 * @returns `true` for the issues
 */
export function isSheetRefused(answer: CitySheet | CitySheetIssue[]): answer is CitySheetIssue[] {
  return Array.isArray(answer)
}
