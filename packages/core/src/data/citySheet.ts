/**
 * A city at a date — « Rome en 1100 » — as the contribution writes it (ATLAS-295, `files/plans/atlas/cities.md`,
 * decisions 5 to 8): the place it is a sheet of, its date, its importance on the map, the reasons for it, and one line
 * a source of what that source says. **One schema for every reader** (decision 8): the CMS's form validates against it
 * while the contributor types, the CMS's server before it saves; the export is to join it
 * (`files/plans/atlas/city-sheet-screen.md`).
 */

import { z } from 'zod/mini'

import { historicalDateSchema } from '../time/historicalDate'

import { CITY_IMPORTANCES } from './cityImportance'
import { WIKIDATA_ID } from './wikidataId'

import type { CityImportance, TestimonySubject } from './cityImportance'
import type { HistoricalDate } from '../time/historicalDate'

/** A record of the CMS, by its id — a number in SQLite, a string in another base. */
export type RecordId = number | string

/** What a source says, by what it speaks about: the one value its subject names. */
export type TestimonyValue =
  /** How many people lived there. */
  | { subject: Extract<TestimonySubject, 'population'>; population: number }
  /** Which order of city it was. */
  | { subject: Extract<TestimonySubject, 'importance'>; importance: CityImportance }
  /** One reason for its importance. */
  | { subject: Extract<TestimonySubject, 'reason'>; reason: RecordId }
  /** Which polity held the city at that date (CMS-335): its name, and its Wikidata id when it has one. */
  | {
      subject: Extract<TestimonySubject, 'holder'>
      holderName: string
      holderQid?: string | null | undefined
    }

/** One line of the sources: which source, what it says, where it says it, and its own words. */
export type CityTestimony = TestimonyValue & {
  /** The source, from the CMS's register. */
  source: RecordId
  /** Where in it: a page, a line, a column — when given. */
  where?: string | null | undefined
  /** The source's own words, quoted — when given; what lets a reader check the line without the book. */
  quotation?: string | null | undefined
}

/** A city at a date, read. */
export interface CitySheet {
  /** The place it is a sheet of, by the CMS's id — a number in SQLite, a string in another base. */
  place: number | string
  /** When: a year alone counts for that year, an interval for every year it covers (decision 7). */
  date: HistoricalDate
  /** When it appears on the map as the zoom closes in. */
  importance: CityImportance
  /** Why it has that importance, from the CMS's list; none is a sheet with no reason given. */
  reasons: RecordId[]
  /** What the sources say of it, one line a thing said. */
  testimonies: CityTestimony[]
  /**
   * The polity that held it at that date — « tenue par » (CMS-335) — by its name, as the dev arbitrated it from the
   * lines; none before it is entered. What the Cartographer's cities layer checks a border against (CARTO-193).
   */
  holderName?: string | null | undefined
  /**
   * That polity's Wikidata id, when it has one: the key the cities layer compares with the polity drawn under the city,
   * the same in every map whatever the polity's id there. A polity with none is entered by its name alone.
   */
  holderQid?: string | null | undefined
}

/** The fields of a {@link CitySheet}, for a reader to say where an issue is. */
export type CitySheetField = keyof CitySheet

/** A record's id: a whole number, or a text that is not empty. */
const recordId = z.union([z.int(), z.string().check(z.minLength(1))])

/** A Wikidata id, or none. */
const optionalQid = z.optional(z.nullable(z.string().check(z.regex(WIKIDATA_ID))))

/** A polity's name: a text with something in it besides blanks. */
const polityName = z.string().check(z.regex(/\S/, 'should name the polity'))

/** What a line has whatever its subject. */
const lineBase = {
  source: recordId,
  where: z.optional(z.nullable(z.string())),
  quotation: z.optional(z.nullable(z.string())),
}

/** One line of the sources: its value is the one its subject names — a population needs its figure. */
const testimonySchema: z.ZodMiniType<CityTestimony> = z.discriminatedUnion('subject', [
  z.object({ ...lineBase, subject: z.literal('population'), population: z.int().check(z.gte(0)) }),
  z.object({ ...lineBase, subject: z.literal('importance'), importance: z.enum(CITY_IMPORTANCES) }),
  z.object({ ...lineBase, subject: z.literal('reason'), reason: recordId }),
  z.object({
    ...lineBase,
    subject: z.literal('holder'),
    holderName: polityName,
    holderQid: optionalQid,
  }),
])

/**
 * {@link CitySheet} with every rule: a place, a date as {@link historicalDateSchema} reads it, one of the three
 * importances, the reasons, the lines — each with its source and the value its subject names — and the holder, whose
 * Wikidata id is never entered without its name. A document's other
 * fields (its id, its timestamps, a line's row id) are ignored, not refused: the CMS hands whole documents to it.
 */
export const citySheetSchema: z.ZodMiniType<CitySheet> = z
  .object({
    place: recordId,
    date: historicalDateSchema,
    importance: z.enum(CITY_IMPORTANCES),
    reasons: z.array(recordId),
    testimonies: z.array(testimonySchema),
    holderName: z.optional(z.nullable(polityName)),
    holderQid: optionalQid,
  })
  .check(
    // A Wikidata id with no name would be a holder nobody reading the sheet can name: the name comes first. A blank
    // name is the name's own rule to refuse, so this one asks only that a name be there.
    z.refine((sheet) => !hasText(sheet.holderQid) || typeof sheet.holderName === 'string', {
      message: 'a holder’s Wikidata id needs its name',
      path: ['holderName'],
    })
  )

/**
 * Whether a field holds a text.
 * @param value - the field
 * @returns `true` for a string that is not empty
 */
function hasText(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim() !== ''
}

/** One thing wrong with a sheet, and where. */
export interface CitySheetIssue {
  /** The field it is about. */
  field: CitySheetField
  /** Where exactly, from the field down: `['testimonies', 0, 'population']`. */
  path: (string | number)[]
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
    return {
      field,
      path: issue.path.map((key) => (typeof key === 'number' ? key : String(key))),
      detail: issue.message,
    }
  })
}

/** The fields, as a set, to tell one from any other key. */
const FIELDS: ReadonlySet<PropertyKey> = new Set<CitySheetField>([
  'place',
  'date',
  'importance',
  'reasons',
  'testimonies',
  'holderName',
  'holderQid',
])

/**
 * Whether a path's first key is a field of the sheet.
 * @param key - the key
 * @returns `true` for a field of {@link CitySheet}
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
