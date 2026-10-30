import { relationId } from '../../../fields/relationId'

import type { EventDateFields, MomentFields } from '../../../fields/dateReading'
import type { CityImportance } from '@europe-historical-atlas/core/data/cityImportance'
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

/** The place chosen: its id for the save, its name for the form to show. */
export interface PlaceChoice {
  /** Its id in the CMS. */
  id: number | string
  /** Its name, in the admin's content language. */
  name: string
}

/** The form's values. */
export interface SheetValues {
  /** The place, or `null` before one is chosen. */
  place: PlaceChoice | null
  /** The date: a start, and an end for a span. */
  date: { start: MomentValues; end: MomentValues }
  /** The importance, or `''` before one is chosen. */
  importance: CityImportance | ''
}

/** What the form sends to Payload's API. */
export interface SheetBody {
  /** The place's id. */
  place: number | string | null
  /** The date, in the collection's groups. */
  date: EventDateFields
  /** The importance, `null` when none is chosen. */
  importance: CityImportance | null
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
 * The form's values for a saved sheet, or a new one.
 * @param doc - the sheet as Payload hands it; `{}` for a new one
 * @param placeName - the name of its place, read by the server; `null` for a new sheet
 * @returns the values
 */
export function sheetValues(doc: SheetDocument, placeName: string | null): SheetValues {
  const id = relationId(doc.place)
  const date = (doc.date ?? {}) as EventDateFields
  const importance = doc.importance as CityImportance | null | undefined
  return {
    place: id === null || placeName === null ? null : { id, name: placeName },
    date: { start: momentValues(date.start), end: momentValues(date.end) },
    importance: importance ?? '',
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
  }
}
