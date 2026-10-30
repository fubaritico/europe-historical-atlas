import { isMomentRefusal, orderRefusal, toHistoricalMoment } from '../fields/dateReading'
import { describeDateRefusalFr } from '../fields/historicalDate'

import type { MomentFields } from '../fields/dateReading'
import type {
  ContentPlace,
  ContentSource,
  EventIcon,
  LocalizedText,
} from '@europe-historical-atlas/core/data/contentFormat'
import type { HistoricalMoment } from '@europe-historical-atlas/core/time/historicalDate'

/*
 * What Payload answers for the records the content file is made of, and how each is read — shared by the events'
 * export and the cities' (`toContent.ts`, `toContentCity.ts`), declared structurally so both are exercised with
 * literals and never need a database.
 */

/** A localized field with every locale: `{ fr, en }`, either possibly missing. */
export type DocLocalized = Partial<Record<'fr' | 'en', string | null>> | null | undefined

/** A record's id: a number in SQLite. */
export type DocId = number | string

/** An event type. */
export interface DocEventType {
  /** Its id. */
  id: DocId
  /** Its name, every locale. */
  name: DocLocalized
  /** The shape its events stand on the map as. */
  icon?: EventIcon | null
  /** The colour its pins wear. */
  colour?: string | null
}

/** A place; Payload stores a point as `[longitude, latitude]`. */
export interface DocPlace {
  /** Its id. */
  id: DocId
  /** Its name, every locale. */
  name: DocLocalized
  /** `[lon, lat]`. */
  location: [number, number] | null | undefined
  /** Its Wikidata id. */
  wikidata?: string | null
  /** When it began to exist. */
  existsFrom?: MomentFields | null
  /** When it ceased to; empty while it exists. */
  existsTo?: MomentFields | null
}

/** A source. */
export interface DocSource {
  /** Its id. */
  id: DocId
  /** Its title. */
  title: string
  /** Its author. */
  author?: string | null
  /** Its address. */
  url?: string | null
}

/**
 * An empty string is no text.
 * @param text - a field's value
 * @returns the text, or `null`
 */
export function present(text: string | null | undefined): string | null {
  return text === null || text === undefined || text.trim() === '' ? null : text
}

/**
 * A text the format requires, French at least.
 * @param value - the field, every locale
 * @param where - what it is, for the error
 * @returns the text in both languages
 */
export function localized(value: DocLocalized, where: string): LocalizedText {
  const fr = present(value?.fr)
  if (fr === null) throw new Error(`[CMS] ${where}: no French text`)
  return { fr, en: present(value?.en) }
}

/**
 * A text the format allows to be absent.
 * @param value - the field, every locale
 * @param where - what it is, for the error
 * @returns the text, or `null` when neither language is written
 */
export function optionalLocalized(value: DocLocalized, where: string): LocalizedText | null {
  if (present(value?.fr) === null && present(value?.en) === null) return null
  return localized(value, where)
}

/**
 * A relation the export needs resolved. A bare id means the query's depth did not reach it — a defect of the export,
 * said loudly rather than written as a hole in the file.
 * @param value - the relation
 * @param where - what it is, for the error
 * @returns the record
 */
export function resolved<T extends object>(value: T | DocId, where: string): T {
  if (typeof value !== 'object') throw new Error(`[CMS] ${where}: not resolved (${String(value)})`)
  return value
}

/**
 * One end of a place's existence.
 * @param fields - the group
 * @param where - what it is, for the error
 * @returns the moment, or `null` when not given
 */
function existence(
  fields: MomentFields | null | undefined,
  where: string
): HistoricalMoment | null {
  const moment = toHistoricalMoment(fields)
  if (moment !== null && isMomentRefusal(moment)) {
    throw new Error(`[CMS] ${where}: ${describeDateRefusalFr(moment)}`)
  }
  return moment
}

/**
 * One place.
 * @param place - the record
 * @returns it, as the atlas reads it
 */
export function toPlace(place: DocPlace): ContentPlace {
  const where = `place ${String(place.id)}`
  if (place.location === null || place.location === undefined) {
    throw new Error(`[CMS] ${where}: no position`)
  }
  const [lon, lat] = place.location
  const reversed = orderRefusal(place.existsFrom, place.existsTo)
  if (reversed !== null) throw new Error(`[CMS] ${where}: ${describeDateRefusalFr(reversed)}`)
  return {
    id: String(place.id),
    name: localized(place.name, where),
    lon,
    lat,
    wikidata: present(place.wikidata),
    existsFrom: existence(place.existsFrom, `${where}, beginning`),
    existsTo: existence(place.existsTo, `${where}, end`),
  }
}

/**
 * A source, written in.
 * @param value - the relation, resolved or not
 * @param where - what it is, for the error
 * @returns it, as the atlas reads it
 */
export function toSource(value: DocSource | DocId, where: string): ContentSource {
  const source = resolved<DocSource>(value, where)
  return {
    id: String(source.id),
    title: source.title,
    author: present(source.author),
    url: present(source.url),
  }
}
