/**
 * Reading Wikidata for a place: the items a French name may mean, then the chosen item's position.
 *
 * Pure — URLs out, answers in — so it is exercised with literals; the endpoints (`placeEndpoints.ts`) do the fetching.
 * Shapes read on the live API on 2026-10-25 (`wbsearchentities`, `Special:EntityData`).
 */

import { z } from 'zod/mini'

import type { HistoricalMoment } from '@europe-historical-atlas/core/time/historicalDate'

/** How this tool introduces itself to Wikimedia, which asks every client to say who it is. */
export const WIKIDATA_USER_AGENT =
  'europe-historical-atlas/1.0 (https://github.com/fubaritico/europe-historical-atlas)'

/** How many items a search offers — enough to find Paris among the Texan ones, short enough to read. */
export const SEARCH_LIMIT = 7

/** One item a name may mean. */
export interface WikidataCandidate {
  /** Its id, `Q90`. */
  id: string
  /** Its French label. */
  label: string
  /** What it is, in a few words — the only way to tell Paris from Paris, Texas. `null` when it has none. */
  description: string | null
}

/** A place read from its item. */
export interface WikidataPlace {
  /** Its id. */
  wikidata: string
  /** Its French label, or `null` when it has none. */
  name: string | null
  /** Its position, or `null` when the item carries no coordinates (a person, a family name…). */
  coordinates: { lon: number; lat: number } | null
  /** Its inception (P571, « date de fondation ou de création »), or `null` when absent or too vague. */
  existsFrom: HistoricalMoment | null
  /** Its dissolution (P576), or `null` — absent for a place that exists today. */
  existsTo: HistoricalMoment | null
}

/**
 * The search for items whose French label matches a name.
 * @param name - what the contributor typed
 * @returns the API's URL
 */
export function searchUrl(name: string): string {
  const query = new URLSearchParams({
    action: 'wbsearchentities',
    search: name,
    language: 'fr',
    uselang: 'fr',
    type: 'item',
    limit: String(SEARCH_LIMIT),
    format: 'json',
  })
  return `https://www.wikidata.org/w/api.php?${query.toString()}`
}

/**
 * The whole item.
 * @param id - its id
 * @returns the URL of its JSON
 */
export function entityUrl(id: string): string {
  return `https://www.wikidata.org/wiki/Special:EntityData/${encodeURIComponent(id)}.json`
}

/** A Wikidata item id. */
export const WIKIDATA_ID = /^Q\d+$/

/** What the search answers — only the fields read. */
const searchAnswer = z.object({
  search: z.array(
    z.object({
      id: z.string(),
      label: z.optional(z.string()),
      description: z.optional(z.string()),
    })
  ),
})

/**
 * The candidates of a search.
 * @param value - the API's JSON
 * @returns the items, in Wikidata's order; an item with no label is left out — there is nothing to show for it
 */
export function readSearchAnswer(value: unknown): WikidataCandidate[] {
  const answer = searchAnswer.parse(value)
  return answer.search.flatMap((item) =>
    item.label === undefined
      ? []
      : [{ id: item.id, label: item.label, description: item.description ?? null }]
  )
}

/** A statement's rank and main value — only the fields read; the value is read by kind below. */
const claimShape = z.object({
  rank: z.string(),
  mainsnak: z.object({ datavalue: z.optional(z.object({ value: z.unknown() })) }),
})

/** A coordinate value. */
const coordinateValue = z.object({ latitude: z.number(), longitude: z.number() })

/** A time value: a signed timestamp, its precision, its calendar. */
const timeValue = z.object({
  time: z.string(),
  precision: z.int(),
  calendarmodel: z.string(),
})

/** What an item's JSON holds — only the fields read. */
const entityAnswer = z.object({
  entities: z.record(
    z.string(),
    z.object({
      id: z.string(),
      labels: z.optional(z.record(z.string(), z.object({ value: z.string() }))),
      claims: z.optional(z.record(z.string(), z.array(z.unknown()))),
    })
  ),
})

/** The Julian calendar's item, as a time value names it; Gregorian is Q1985727. */
const JULIAN = 'http://www.wikidata.org/entity/Q1985786'

/**
 * The value of an item's best statement for a property: the preferred one, else the first normal one — Wikidata's
 * own way of choosing; a deprecated one never.
 * @param claims - the item's statements
 * @param property - `P625`, `P571`…
 * @returns the main value, or `undefined` when there is none
 */
function bestValue(claims: Record<string, unknown[]> | undefined, property: string): unknown {
  const values = (claims?.[property] ?? []).flatMap((claim) => {
    const read = claimShape.safeParse(claim)
    return read.success &&
      read.data.mainsnak.datavalue !== undefined &&
      read.data.rank !== 'deprecated'
      ? [{ rank: read.data.rank, value: read.data.mainsnak.datavalue.value }]
      : []
  })
  return (values.find((value) => value.rank === 'preferred') ?? values[0])?.value
}

/** How many years a unit of a vague precision spans: 6 is a millennium, 7 a century, 8 a decade. */
const SPAN: Readonly<Record<number, number>> = { 6: 1000, 7: 100, 8: 10 }

/**
 * The middle year of a decade, century or millennium, as Wikidata aligns them: a decade on its digits (the 1980s are
 * 1980–1989), a century or a millennium from year 1 (the 18th century is 1701–1800, the 3rd century BC is 300–201
 * BC). Read in the Wikibase data model, 2026-10-25.
 * @param year - the timestamp's year, historical numbering
 * @param span - the unit, in years
 * @returns the middle year, rounded so that ± half the unit covers the whole unit; never 0
 */
function middleYear(year: number, span: number): number {
  const sign = year < 0 ? -1 : 1
  const size = Math.abs(year)
  const first = span === 10 ? Math.floor(size / 10) * 10 : (Math.ceil(size / span) - 1) * span + 1
  return sign * (first + span / 2 - 1)
}

/** The year, month and day a Wikidata timestamp writes — zeros where unknown. */
interface Stamp {
  /** Historical numbering: negative before Christ, no year 0. */
  year: number
  /** 1–12, or 0. */
  month: number
  /** 1–31, or 0. */
  day: number
}

/**
 * Read a signed timestamp: `-0300-00-00T00:00:00Z`.
 * @param time - the timestamp
 * @returns its parts, or `null` when it is not one
 */
function readStamp(time: string): Stamp | null {
  const parts = /^([+-])(\d+)-(\d{2})-(\d{2})T/.exec(time)
  if (parts === null) return null
  const [, sign, digits, month, day] = parts
  return {
    year: Number(digits) * (sign === '-' ? -1 : 1),
    month: Number(month),
    day: Number(day),
  }
}

/**
 * A time at year, month or day precision: exact, the calendar kept for a day.
 * @param stamp - the timestamp's parts
 * @param precision - 9 year, 10 month, 11 day
 * @param calendarModel - the calendar's item
 * @returns the moment
 */
function exactMoment(stamp: Stamp, precision: number, calendarModel: string): HistoricalMoment {
  const hasDay = precision === 11
  return {
    year: stamp.year,
    month: precision >= 10 ? stamp.month : null,
    day: hasDay ? stamp.day : null,
    calendar: hasDay ? (calendarModel === JULIAN ? 'julian' : 'gregorian') : null,
    circa: false,
    margin: null,
  }
}

/**
 * A Wikidata time as one end of a date.
 *
 * **Its precision becomes our « vers » and its margin**: a year, a month or a day are exact; a decade, a century or a
 * millennium become the middle year, *circa*, give or take half the unit — the 3rd century BC is « vers 250 av.
 * J.-C., ±50 », the 11th century « vers 1050, ±50 ». Vaguer than a millennium is not proposed. The timestamp's year
 * uses historical numbering, with no year 0 (Wikibase data model).
 * @param value - the statement's value
 * @returns the moment, or `null` when it is not a time or too vague to propose
 */
export function momentFromWikidataTime(value: unknown): HistoricalMoment | null {
  const read = timeValue.safeParse(value)
  if (!read.success) return null
  const stamp = readStamp(read.data.time)
  if (stamp === null) return null
  const { precision, calendarmodel } = read.data
  const span = SPAN[precision]
  if (span !== undefined) {
    const year = middleYear(stamp.year, span)
    return { year, month: null, day: null, calendar: null, circa: true, margin: span / 2 }
  }
  return precision >= 9 && precision <= 11 ? exactMoment(stamp, precision, calendarmodel) : null
}

/**
 * The place an item describes: its French name, its position, its inception and dissolution.
 *
 * The item comes back under its own key, which differs from the id asked for when that id was merged into another —
 * so the first entity is read, whatever its key.
 * @param value - the item's JSON
 * @returns the place
 */
export function readPlaceEntity(value: unknown): WikidataPlace {
  const [entity] = Object.values(entityAnswer.parse(value).entities)
  if (entity === undefined) throw new Error('[CMS] Wikidata answered no item')
  const position = coordinateValue.safeParse(bestValue(entity.claims, 'P625'))
  return {
    wikidata: entity.id,
    name: entity.labels?.fr?.value ?? null,
    coordinates: position.success
      ? { lon: position.data.longitude, lat: position.data.latitude }
      : null,
    existsFrom: momentFromWikidataTime(bestValue(entity.claims, 'P571')),
    existsTo: momentFromWikidataTime(bestValue(entity.claims, 'P576')),
  }
}
