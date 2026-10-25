import {
  isDateRefusal,
  readHistoricalDate,
} from '@europe-historical-atlas/core/time/historicalDate'

import type { Calendar } from '@europe-historical-atlas/core/time/calendar'
import type {
  DateRefusal,
  HistoricalDate,
  HistoricalMoment,
} from '@europe-historical-atlas/core/time/historicalDate'
import type { Field, GroupField } from 'payload'

/**
 * One end of a date as the form holds it — the same group for an event's beginning and end and for a place's
 * existence, so every date of the tool is entered and checked one way.
 */
export interface MomentFields {
  /** The year. Negative before Christ. Empty when the end is not given. */
  year?: number | null
  /** Its month, 1 to 12, when known. */
  month?: number | null
  /** Its day, when known. */
  day?: number | null
  /** The year is an estimate: "vers 1100". */
  circa?: boolean | null
  /** How many years either side the estimate may be; empty takes the default of ±10. */
  margin?: number | null
  /** The calendar of the day: Julian for the Middle Ages. Only read when a day is given. */
  calendar?: Calendar | null
}

/** An event's date: a beginning, and an end for something that lasted. */
export interface EventDateFields {
  /** When it happened, or began. */
  start?: MomentFields | null
  /** When it ended — empty for a single moment. */
  end?: MomentFields | null
}

/**
 * Whether an end of a date was given at all.
 * @param fields - the group
 * @returns `true` when it has a year
 */
function given(fields: MomentFields | null | undefined): fields is MomentFields & { year: number } {
  return fields?.year !== null && fields?.year !== undefined
}

/**
 * One end, as `core` holds it.
 * @param fields - the group, with its year
 * @returns the moment
 */
function moment(fields: MomentFields & { year: number }): HistoricalMoment {
  const day = fields.day ?? null
  return {
    year: fields.year,
    month: fields.month ?? null,
    day,
    calendar: day === null ? null : (fields.calendar ?? null),
    circa: fields.circa === true,
    margin: fields.margin ?? null,
  }
}

/**
 * Read a date through `core` — so the year 0, a 30 February, a margin on an exact year or an end before the
 * beginning are refused here exactly as everywhere else. Silent: the form shows the refusal, the export throws it.
 * @param value - the date to check
 * @returns the date, or why it is refused
 */
function check(value: HistoricalDate): HistoricalDate | DateRefusal {
  return readHistoricalDate(value, () => undefined)
}

/**
 * Whether one end was refused. Not `core`'s `isDateRefusal`, which tells a refusal from a *date* by its `kind` — a
 * moment has none, so every valid end would read as refused.
 * @param answer - what {@link toHistoricalMoment} answered, not `null`
 * @returns `true` for a refusal
 */
export function isMomentRefusal(answer: HistoricalMoment | DateRefusal): answer is DateRefusal {
  return 'kind' in answer
}

/**
 * One end of a date, or nothing when it was not given.
 * @param fields - the group
 * @returns the moment, `null` when there is no year, or why it is refused
 */
export function toHistoricalMoment(
  fields: MomentFields | null | undefined
): HistoricalMoment | DateRefusal | null {
  if (!given(fields)) return null
  const answer = check({ kind: 'instant', at: moment(fields) })
  return isDateRefusal(answer) ? answer : moment(fields)
}

/**
 * An event's date: an instant, or an interval when it has an end.
 * @param fields - the event's date group
 * @returns the date, or why it is refused
 */
export function toHistoricalDate(fields: EventDateFields): HistoricalDate | DateRefusal {
  if (!given(fields.start)) return { kind: 'shape', detail: 'start.year' }
  const start = moment(fields.start)
  if (!given(fields.end)) return check({ kind: 'instant', at: start })
  return check({ kind: 'interval', from: start, to: moment(fields.end) })
}

/**
 * Whether two ends are in order: the later one not before the earlier.
 * @param earlier - the beginning
 * @param later - the end
 * @returns the refusal when they are reversed or one is wrong, else `null`
 */
export function orderRefusal(
  earlier: MomentFields | null | undefined,
  later: MomentFields | null | undefined
): DateRefusal | null {
  if (!given(earlier) || !given(later)) return null
  const answer = check({ kind: 'interval', from: moment(earlier), to: moment(later) })
  return isDateRefusal(answer) ? answer : null
}

/**
 * A refusal in the form's language. Shown under the year of the end it is about, so it need not name the end.
 * @param refusal - why the date was refused
 * @returns one French sentence
 */
export function describeDateRefusalFr(refusal: DateRefusal): string {
  switch (refusal.kind) {
    case 'shape':
      return 'Il faut au moins une année.'
    case 'year-zero':
      return 'L’an 0 n’existe pas : 1 av. J.-C. est suivi de 1 apr. J.-C.'
    case 'day-without-month':
      return 'Un jour demande son mois.'
    case 'day-without-calendar':
      return 'Un jour demande son calendrier, julien ou grégorien.'
    case 'calendar-without-day':
      return 'Le calendrier ne compte que pour un jour.'
    case 'no-such-day':
      return 'Ce mois n’a pas ce jour cette année-là.'
    case 'margin-without-circa':
      return 'Une marge ne va qu’avec « vers » : une année exacte n’en a pas.'
    case 'reversed':
      return 'La fin vient avant le début.'
  }
}

/** Where the beginning sits, for an end to be checked against it. */
type EarlierOf = (data: Record<string, unknown>) => MomentFields | null | undefined

/** What a group of one end of a date needs. */
export interface MomentGroupOptions {
  /** The field's name. */
  name: string
  /** What the form shows. */
  label: string
  /** The line under the label. */
  description?: string
  /** Whether the year must be given. */
  required?: boolean
  /** For an end: where its beginning is, so an end before it is refused under the end. */
  earlier?: EarlierOf
}

/**
 * A number field of the group: month 1–12, day 1–31, margin from 1.
 * @param name - the field's name
 * @param label - what the form shows
 * @param min - the lowest value
 * @param max - the highest value, if any
 * @returns the field
 */
function part(name: string, label: string, min: number, max?: number): Field {
  return {
    name,
    type: 'number',
    label,
    min,
    ...(max === undefined ? {} : { max }),
    admin: { width: '33%' },
  }
}

/**
 * The validation of one end, run from its year field, which sees its siblings — Payload validates a field, not a
 * group.
 * @param earlier - where its beginning is, for an end
 * @returns the validate function
 */
export function validateMoment(earlier: EarlierOf | undefined) {
  return (
    _value: unknown,
    { siblingData, data }: { siblingData: MomentFields; data: Record<string, unknown> }
  ): true | string => {
    const own = toHistoricalMoment(siblingData)
    if (own !== null && isMomentRefusal(own)) return describeDateRefusalFr(own)
    const reversed = earlier === undefined ? null : orderRefusal(earlier(data), siblingData)
    return reversed === null ? true : describeDateRefusalFr(reversed)
  }
}

/** The second row of an end: « vers », its margin, the calendar of a day. */
const ESTIMATE_ROW: Field = {
  type: 'row',
  fields: [
    {
      name: 'circa',
      type: 'checkbox',
      label: 'Vers (année estimée)',
      admin: { width: '33%' },
    },
    {
      ...part('margin', 'Marge (± ans)', 1),
      admin: {
        width: '33%',
        description: 'Avec « vers » seulement. Vide : ±10 ans.',
      },
    } as Field,
    {
      name: 'calendar',
      type: 'select',
      label: 'Calendrier du jour',
      defaultValue: 'julian',
      admin: { width: '33%' },
      options: [
        { label: 'Julien', value: 'julian' },
        { label: 'Grégorien', value: 'gregorian' },
      ],
    },
  ],
}

/**
 * One end of a date as a form group: year, month, day; « vers », its margin, the calendar.
 * @param options - its name, label, whether it is required, and its beginning if it is an end
 * @returns the group field
 */
export function momentGroup(options: MomentGroupOptions): GroupField {
  return {
    name: options.name,
    type: 'group',
    label: options.label,
    ...(options.description === undefined ? {} : { admin: { description: options.description } }),
    fields: [
      {
        type: 'row',
        fields: [
          {
            name: 'year',
            type: 'number',
            label: 'Année',
            required: options.required === true,
            admin: { width: '33%' },
            validate: validateMoment(options.earlier),
          },
          part('month', 'Mois', 1, 12),
          part('day', 'Jour', 1, 31),
        ],
      },
      ESTIMATE_ROW,
    ],
  }
}

/**
 * The group a field sits in, read from the whole document.
 * @param data - the document
 * @param path - the group's path, dot-separated
 * @returns the group, or `undefined` when absent
 */
export function groupAt(data: Record<string, unknown>, path: string): MomentFields | undefined {
  let at: unknown = data
  for (const key of path.split('.')) {
    if (typeof at !== 'object' || at === null) return undefined
    at = (at as Record<string, unknown>)[key]
  }
  return typeof at === 'object' && at !== null ? at : undefined
}

/** An event's date: a beginning, required, and an end for what lasted. */
export const eventDateField: GroupField = {
  name: 'date',
  type: 'group',
  label: 'Date',
  admin: {
    description:
      'Une année suffit. Pour une durée (une guerre, un long siège), remplir aussi la fin.',
  },
  fields: [
    momentGroup({ name: 'start', label: 'Début', required: true }),
    momentGroup({
      name: 'end',
      label: 'Fin',
      earlier: (data) => groupAt(data, 'date.start'),
    }),
  ],
}
