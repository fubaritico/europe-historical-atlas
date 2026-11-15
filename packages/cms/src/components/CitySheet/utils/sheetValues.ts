import { relationId, relationIds } from '../../../fields/relationId'

import type { EventDateFields, MomentFields } from '../../../fields/dateReading'
import type { CommunityWeight } from '@europe-historical-atlas/core/data/cityCommunity'
import type {
  CityImportance,
  TestimonySubject,
} from '@europe-historical-atlas/core/data/cityImportance'
import type { Calendar } from '@europe-historical-atlas/core/time/calendar'

/** One end of the date as the form holds it: the inputs' text, as typed. */
export interface MomentValues {
  /** The year, as typed; empty when not given. */
  year: string
  /** The month, as typed. */
  month: string
  /** The day, as typed. */
  day: string
  /** « Vers ». */
  circa: boolean
  /** The margin of a circa year, as typed. */
  margin: string
  /** The calendar of the day — kept whatever the day, read only when one is given. */
  calendar: Calendar
}

/** A record chosen — a place, a source: its id for the save, its name for the form to show. */
export interface RecordChoice {
  /** Its id in the CMS. */
  id: number | string
  /** Its name, in the admin's content language: a place's name, a source's title. */
  name: string
}

/** The CMS's lists a sheet chooses from, read when the page opens, in the admin's language. */
export interface SheetLists {
  /** Every importance reason. */
  reasons: readonly RecordChoice[]
  /** Every confession a community may have (CMS-433). */
  confessions: readonly RecordChoice[]
}

/** One line of the sources as the form holds it. */
export interface TestimonyValues {
  /** The line's key in the form, stable while it is edited: Payload's row id, or one made for a new line. */
  key: string
  /** Payload's row id, kept so a saved line is updated rather than replaced; absent for a new line. */
  rowId?: string
  /** The source, or `null` before one is chosen. */
  source: RecordChoice | null
  /** What it speaks about, or `''` before it is chosen. */
  subject: TestimonySubject | ''
  /** The population it gives, as typed — read when the subject is the population. */
  population: string
  /** The importance it gives — read when the subject is the importance. */
  importance: CityImportance | ''
  /** The reason it gives, by its id — read when the subject is a reason; `null` before one is chosen. */
  reason: number | string | null
  /** The community's confession, by its id — read when the subject is a community; `null` before one is chosen. */
  confession: number | string | null
  /** The polity it names, as typed — read when the subject is the holder. */
  holderName: string
  /** That polity's Wikidata id, as typed — read when the subject is the holder. */
  holderQid: string
  /** The holder's name as the source writes it, as typed — read when the subject is the holder (CMS-422). */
  holderAsWritten: string
  /** Where in the source, as typed. */
  where: string
  /** The source's own words, as typed. */
  quotation: string
}

/** One religious community as the form holds it (CMS-433). */
export interface CommunityValues {
  /** Its key in the form, stable while it is edited: Payload's row id, or one made for a new community. */
  key: string
  /** Payload's row id, kept so a saved community is updated rather than replaced; absent for a new one. */
  rowId?: string
  /** Its confession, by its id, or `null` before one is chosen. */
  confession: number | string | null
  /** Its weight, or `''` before one is chosen. */
  weight: CommunityWeight | ''
  /** Whether a source says that weight — unticked for a new community: supposed until said otherwise. */
  weightAttested: boolean
}

/** The form's values. */
export interface SheetValues {
  /** The place, or `null` before one is chosen. */
  place: RecordChoice | null
  /** The date: a start, and an end for a span. */
  date: { start: MomentValues; end: MomentValues }
  /** The importance, or `''` before one is chosen. */
  importance: CityImportance | ''
  /** The reasons for it, by their ids. */
  reasons: (number | string)[]
  /** The lines of the sources. */
  testimonies: TestimonyValues[]
  /** The religious communities attested there (CMS-433). */
  communities: CommunityValues[]
  /** The holder as a title — a person for a territory — or `null` before one is chosen (CMS-422 step 2c). */
  holderTitle: RecordChoice | null
  /** The polity that held it, by its name, as typed — « tenue par ». */
  holderName: string
  /** That polity's Wikidata id, as typed. */
  holderQid: string
  /** Whether the atlas shows it (CMS-391) — unticked for a new sheet, as the collection's default. */
  showInAtlas: boolean
}

/** One line as the collection stores it. */
export interface TestimonyBody {
  /** Payload's row id, for a saved line. */
  id?: string
  /** The source's id. */
  source: number | string | null
  /** What it speaks about. */
  subject: TestimonySubject | null
  /** The population, for a line about it. */
  population: number | null
  /** The importance, for a line about it. */
  importance: CityImportance | null
  /** The reason, for a line about one. */
  reason: number | string | null
  /** The confession, for a line about a community. */
  confession: number | string | null
  /** The polity, for a line about the holder. */
  holderName: string | null
  /** Its Wikidata id, for a line about the holder. */
  holderQid: string | null
  /** The holder's name as the source writes it, for a line about the holder. */
  holderAsWritten: string | null
  /** Where in the source. */
  where: string | null
  /** The source's own words. */
  quotation: string | null
}

/** One community as the collection stores it. */
export interface CommunityBody {
  /** Payload's row id, for a saved community. */
  id?: string
  /** The confession's id. */
  confession: number | string | null
  /** The weight, `null` when none is chosen. */
  weight: CommunityWeight | null
  /** Whether a source says that weight. */
  weightAttested: boolean
}

/** What the form sends to Payload's API. */
export interface SheetBody {
  /** The place's id. */
  place: number | string | null
  /** The date, in the collection's groups. */
  date: EventDateFields
  /** The importance, `null` when none is chosen. */
  importance: CityImportance | null
  /** The reasons' ids. */
  reasons: (number | string)[]
  /** The lines; each keeps only the value its subject names, the others `null` as the collection holds them. */
  testimonies: TestimonyBody[]
  /** The religious communities. */
  communities: CommunityBody[]
  /** The holder's title's id, `null` when none is chosen. */
  holderTitle: number | string | null
  /** The holder's name, `null` when none is typed. */
  holderName: string | null
  /** The holder's Wikidata id, `null` when none is typed. */
  holderQid: string | null
  /** Whether the atlas shows it (CMS-391). */
  showInAtlas: boolean
}

/** A sheet as Payload hands it to the view — whatever it holds, read field by field. */
export type SheetDocument = Record<string, unknown>

/** An end not given — the calendar the collection's field defaults to. */
export const EMPTY_MOMENT: MomentValues = {
  year: '',
  month: '',
  day: '',
  circa: false,
  margin: '',
  calendar: 'julian',
}

/**
 * A number of the collection as the input's text.
 * @param value - the stored number, or nothing
 * @returns its text, `''` for nothing
 */
function asText(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value)
}

/**
 * One end as the form holds it.
 * @param fields - the stored group, or nothing for an end not given
 * @returns the values
 */
export function momentValues(fields: MomentFields | null | undefined): MomentValues {
  if (fields === null || fields === undefined) return EMPTY_MOMENT
  return {
    year: asText(fields.year),
    month: asText(fields.month),
    day: asText(fields.day),
    circa: fields.circa === true,
    margin: asText(fields.margin),
    calendar: fields.calendar ?? 'julian',
  }
}

/**
 * A new line, empty, with its own key.
 * @returns the line
 */
export function emptyTestimony(): TestimonyValues {
  return {
    key: crypto.randomUUID(),
    source: null,
    subject: '',
    population: '',
    importance: '',
    reason: null,
    confession: null,
    holderName: '',
    holderQid: '',
    holderAsWritten: '',
    where: '',
    quotation: '',
  }
}

/**
 * A new community, empty, with its own key: its weight supposed until the contributor ticks it attested.
 * @returns the community
 */
export function emptyCommunity(): CommunityValues {
  return { key: crypto.randomUUID(), confession: null, weight: '', weightAttested: false }
}

/**
 * One saved community as the form holds it.
 * @param row - the community as Payload stores it
 * @returns the community
 */
function communityValues(row: Record<string, unknown>): CommunityValues {
  const rowId = typeof row.id === 'string' ? row.id : undefined
  return {
    key: rowId ?? crypto.randomUUID(),
    ...(rowId === undefined ? {} : { rowId }),
    confession: relationId(row.confession),
    weight: (row.weight as CommunityWeight | null | undefined) ?? '',
    weightAttested: row.weightAttested === true,
  }
}

/**
 * One saved line as the form holds it.
 * @param row - the line as Payload stores it
 * @param sourceNames - the sources' titles, by id, read by the server
 * @returns the line
 */
function testimonyValues(
  row: Record<string, unknown>,
  sourceNames: ReadonlyMap<string, string>
): TestimonyValues {
  const source = relationId(row.source)
  const name = source === null ? undefined : sourceNames.get(String(source))
  const rowId = typeof row.id === 'string' ? row.id : undefined
  return {
    key: rowId ?? crypto.randomUUID(),
    ...(rowId === undefined ? {} : { rowId }),
    source: source === null || name === undefined ? null : { id: source, name },
    subject: (row.subject as TestimonySubject | null | undefined) ?? '',
    population: asText(row.population as number | null | undefined),
    importance: (row.importance as CityImportance | null | undefined) ?? '',
    reason: relationId(row.reason),
    confession: relationId(row.confession),
    holderName: textOf(row.holderName),
    holderQid: textOf(row.holderQid),
    holderAsWritten: textOf(row.holderAsWritten),
    where: textOf(row.where),
    quotation: textOf(row.quotation),
  }
}

/**
 * A stored text as the input's text.
 * @param value - the stored field
 * @returns it, or `''` when the field holds no text
 */
function textOf(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/**
 * The form's values for a saved sheet, or a new one.
 * @param doc - the sheet as Payload hands it; `{}` for a new one
 * @param placeName - the name of its place, read by the server; `null` for a new sheet
 * @param sourceNames - the titles of the sources its lines cite, by id, read by the server
 * @param holderTitleName - the name of its holder's title, read by the server; `null` when it names none
 * @returns the values
 */
export function sheetValues(
  doc: SheetDocument,
  placeName: string | null,
  sourceNames: ReadonlyMap<string, string>,
  holderTitleName: string | null
): SheetValues {
  const id = relationId(doc.place)
  const holderTitle = relationId(doc.holderTitle)
  const date = (doc.date ?? {}) as EventDateFields
  const importance = doc.importance as CityImportance | null | undefined
  const rows = Array.isArray(doc.testimonies) ? (doc.testimonies as Record<string, unknown>[]) : []
  const communities = Array.isArray(doc.communities)
    ? (doc.communities as Record<string, unknown>[])
    : []
  return {
    place: id === null || placeName === null ? null : { id, name: placeName },
    date: { start: momentValues(date.start), end: momentValues(date.end) },
    importance: importance ?? '',
    reasons: relationIds(doc.reasons),
    testimonies: rows.map((row) => testimonyValues(row, sourceNames)),
    communities: communities.map(communityValues),
    holderTitle:
      holderTitle === null || holderTitleName === null
        ? null
        : { id: holderTitle, name: holderTitleName },
    holderName: textOf(doc.holderName),
    holderQid: textOf(doc.holderQid),
    // Ticked only when the base says so: a new sheet starts unticked, the collection's default (CMS-391).
    showInAtlas: doc.showInAtlas === true,
  }
}

/**
 * A typed number, read: `''` is no value, anything else its number — `1.5` stays `1.5`, for the date's rules to
 * refuse rather than this to round.
 * @param text - the input's text
 * @returns the number, or `null`
 */
export function readNumber(text: string): number | null {
  return text.trim() === '' ? null : Number(text)
}

/**
 * One end as the collection stores it.
 * @param values - the form's end
 * @returns the group
 */
export function momentFields(values: MomentValues): MomentFields {
  return {
    year: readNumber(values.year),
    month: readNumber(values.month),
    day: readNumber(values.day),
    circa: values.circa,
    margin: readNumber(values.margin),
    calendar: values.calendar,
  }
}

/**
 * What the form sends to the API.
 * @param values - the form's values
 * @returns the body
 */
export function sheetBody(values: SheetValues): SheetBody {
  return {
    place: values.place?.id ?? null,
    date: { start: momentFields(values.date.start), end: momentFields(values.date.end) },
    importance: values.importance === '' ? null : values.importance,
    reasons: values.reasons,
    testimonies: values.testimonies.map(testimonyBody),
    communities: values.communities.map(communityBody),
    holderTitle: values.holderTitle?.id ?? null,
    holderName: trimmed(values.holderName),
    holderQid: trimmed(values.holderQid),
    showInAtlas: values.showInAtlas,
  }
}

/**
 * A typed text as the collection stores it.
 * @param text - the input's text
 * @returns it, or `null` for an input left blank
 */
function typed(text: string): string | null {
  return text.trim() === '' ? null : text
}

/**
 * A typed name or id as the collection stores it, its blanks around cut — a Wikidata id pasted with a space would be
 * refused although nothing looks wrong, and a name compared by the cities layer must not carry them. Never for a
 * quotation, which is kept as written.
 * @param text - the input's text
 * @returns it trimmed, or `null` for an input left blank
 */
function trimmed(text: string): string | null {
  return typed(text.trim())
}

/**
 * One line as the collection stores it: the value its subject names, the others `null`.
 * @param line - the form's line
 * @returns the line to send
 */
export function testimonyBody(line: TestimonyValues): TestimonyBody {
  return {
    ...(line.rowId === undefined ? {} : { id: line.rowId }),
    source: line.source?.id ?? null,
    subject: line.subject === '' ? null : line.subject,
    population: line.subject === 'population' ? readNumber(line.population) : null,
    importance: line.subject === 'importance' && line.importance !== '' ? line.importance : null,
    reason: line.subject === 'reason' ? line.reason : null,
    confession: line.subject === 'community' ? line.confession : null,
    ...lineHolder(line),
    where: typed(line.where),
    quotation: typed(line.quotation),
  }
}

/**
 * One community as the collection stores it.
 * @param community - the form's community
 * @returns the community to send
 */
export function communityBody(community: CommunityValues): CommunityBody {
  return {
    ...(community.rowId === undefined ? {} : { id: community.rowId }),
    confession: community.confession,
    weight: community.weight === '' ? null : community.weight,
    weightAttested: community.weightAttested,
  }
}

/**
 * A line's holder as the collection stores it: the polity and its id for a line about the holder, `null` otherwise.
 * @param line - the form's line
 * @returns the two fields
 */
function lineHolder(
  line: TestimonyValues
): Pick<TestimonyBody, 'holderName' | 'holderQid' | 'holderAsWritten'> {
  if (line.subject !== 'holder') return { holderName: null, holderQid: null, holderAsWritten: null }
  return {
    holderName: trimmed(line.holderName),
    holderQid: trimmed(line.holderQid),
    holderAsWritten: trimmed(line.holderAsWritten),
  }
}
