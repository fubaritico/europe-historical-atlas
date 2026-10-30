import { isMomentRefusal, orderRefusal, toHistoricalMoment } from './dateReading'

import type { MomentFields } from './dateReading'
import type { DateRefusal } from '@europe-historical-atlas/core/time/historicalDate'
import type { Field, GroupField } from 'payload'

export { isMomentRefusal, orderRefusal, toHistoricalDate, toHistoricalMoment } from './dateReading'
export type { EventDateFields, MomentFields } from './dateReading'

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

/** What a date field is called and how the form introduces it. */
export interface DateFieldOptions {
  /** The field's name in the document. */
  name: string
  /** Its label in the form. */
  label: string
  /** The sentence under it. */
  description: string
}

/**
 * A date as the form holds it: a beginning, required, and an end that may not come before it — read by the export
 * as an instant when the end is empty, an interval otherwise.
 * @param options - its name, label and description
 * @returns the group field
 */
export function historicalDateField(options: DateFieldOptions): GroupField {
  return {
    name: options.name,
    type: 'group',
    label: options.label,
    admin: { description: options.description },
    fields: [
      momentGroup({ name: 'start', label: 'Début', required: true }),
      momentGroup({
        name: 'end',
        label: 'Fin',
        earlier: (data) => groupAt(data, `${options.name}.start`),
      }),
    ],
  }
}

/** An event's date: a beginning, required, and an end for what lasted. */
export const eventDateField: GroupField = historicalDateField({
  name: 'date',
  label: 'Date',
  description:
    'Une année suffit. Pour une durée (une guerre, un long siège), remplir aussi la fin.',
})
