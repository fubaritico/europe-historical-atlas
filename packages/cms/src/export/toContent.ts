import { CONTENT_FORMAT_VERSION } from '@europe-historical-atlas/core/data/contentFormat'
import { siegeEngineAt } from '@europe-historical-atlas/core/data/siegeEngines'
import { formatHistoricalDate } from '@europe-historical-atlas/core/time/formatHistoricalDate'
import { isDateRefusal } from '@europe-historical-atlas/core/time/historicalDate'

import {
  describeDateRefusalFr,
  isMomentRefusal,
  orderRefusal,
  toHistoricalDate,
  toHistoricalMoment,
} from '../fields/historicalDate'

import type { EventDateFields, MomentFields } from '../fields/historicalDate'
import type {
  ContentActor,
  ContentEvent,
  ContentEventType,
  ContentFile,
  ContentPlace,
  ContentSource,
  EventIcon,
  LocalizedText,
} from '@europe-historical-atlas/core/data/contentFormat'
import type {
  SiegeEngine,
  SiegeEnginePeriod,
} from '@europe-historical-atlas/core/data/siegeEngines'
import type {
  HistoricalDate,
  HistoricalMoment,
} from '@europe-historical-atlas/core/time/historicalDate'

/**
 * What Payload answers for these records with `locale: 'all'` and a depth that resolves every relation — declared
 * here, structurally, so the export is exercised with literals and never needs a database.
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

/** An actor. */
export interface DocActor {
  /** Its id. */
  id: DocId
  /** Its name, every locale. */
  name: DocLocalized
  /** Person or house. */
  kind: 'person' | 'house'
  /** Its Wikidata id. */
  wikidata?: string | null
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

/** An event, its relations resolved — or left as bare ids when the depth did not reach them. */
export interface DocEvent {
  /** Its id. */
  id: DocId
  /** Its title, every locale. */
  title: DocLocalized
  /** Its type. */
  type: DocEventType | DocId | null | undefined
  /** Its date, as the form holds it. */
  date: EventDateFields | null | undefined
  /** Its place. */
  place?: DocPlace | DocId | null
  /** Its actors. */
  actors?: (DocActor | DocId)[] | null
  /** Its description, every locale. */
  description?: DocLocalized
  /** Its sources. */
  sources?: (DocSource | DocId)[] | null
  /** Its Wikidata id. */
  wikidata?: string | null
}

/** A siege engin and when it was in use. */
export interface DocSiegeEngine {
  /** Its id. */
  id: DocId
  /** The drawing the atlas shows. */
  engine: SiegeEngine
  /** Its period of use, as the form holds it. */
  inUse: EventDateFields | null | undefined
}

/** What every event is exported with: the engins' periods, and where a warning is said. */
export interface ExportContext {
  /** Every engin's period of use (`toSiegeEnginePeriods`). */
  periods: readonly SiegeEnginePeriod[]
  /**
   * Say something the export goes on past — a siege no period covers.
   * @param message - what to say
   * @returns nothing
   */
  warn: (message: string) => void
}

/**
 * An empty string is no text.
 * @param text - a field's value
 * @returns the text, or `null`
 */
function present(text: string | null | undefined): string | null {
  return text === null || text === undefined || text.trim() === '' ? null : text
}

/**
 * A text the format requires, French at least.
 * @param value - the field, every locale
 * @param where - what it is, for the error
 * @returns the text in both languages
 */
function localized(value: DocLocalized, where: string): LocalizedText {
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
function optionalLocalized(value: DocLocalized, where: string): LocalizedText | null {
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
function resolved<T extends object>(value: T | DocId, where: string): T {
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
function toPlace(place: DocPlace): ContentPlace {
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
 * An event's type, with its icon. The column defaults to `pin`, so a type without one is a defect of the base, said
 * loudly — never drawn as a pin.
 * @param type - the type, resolved
 * @param where - the event, for the error
 * @returns it, as the atlas reads it
 */
function toContentType(type: DocEventType, where: string): ContentEventType {
  if (type.icon === null || type.icon === undefined) {
    throw new Error(`[CMS] ${where}, type: no icon`)
  }
  return { id: String(type.id), name: localized(type.name, `${where}, type`), icon: type.icon }
}

/**
 * One event, everything it points to written in — and, when its type draws a tower, its siege engin.
 * @param event - the record, relations resolved
 * @param context - the engins' periods, and where a warning goes
 * @returns it, as the atlas reads it
 */
export function toContentEvent(event: DocEvent, context: ExportContext): ContentEvent {
  const where = `event ${String(event.id)}`
  if (event.type === null || event.type === undefined) throw new Error(`[CMS] ${where}: no type`)
  const type = resolved<DocEventType>(event.type, `${where}, type`)
  const date = toHistoricalDate(event.date ?? {})
  if (isDateRefusal(date)) throw new Error(`[CMS] ${where}: ${describeDateRefusalFr(date)}`)
  const contentType = toContentType(type, where)
  const actors = (event.actors ?? []).map((value): ContentActor => {
    const actor = resolved<DocActor>(value, `${where}, actor`)
    return {
      id: String(actor.id),
      name: localized(actor.name, `actor ${String(actor.id)}`),
      kind: actor.kind,
      wikidata: present(actor.wikidata),
    }
  })
  const sources = (event.sources ?? []).map((value): ContentSource => {
    const source = resolved<DocSource>(value, `${where}, source`)
    return {
      id: String(source.id),
      title: source.title,
      author: present(source.author),
      url: present(source.url),
    }
  })
  // A siege's tower comes with the engin of its period.
  const engine = contentType.icon === 'tower' ? siegeEngine(date, where, context) : null
  return {
    id: String(event.id),
    title: localized(event.title, where),
    type: contentType,
    date,
    place:
      event.place === null || event.place === undefined
        ? null
        : toPlace(resolved<DocPlace>(event.place, `${where}, place`)),
    actors,
    description: optionalLocalized(event.description, `${where}, description`),
    sources,
    wikidata: present(event.wikidata),
    engine,
  }
}

/**
 * Every event, as the file the atlas reads.
 * @param events - the records, relations resolved
 * @param context - the engins' periods, and where a warning goes
 * @returns the content file
 */
export function toContent(events: readonly DocEvent[], context: ExportContext): ContentFile {
  return {
    version: CONTENT_FORMAT_VERSION,
    events: events.map((event) => toContentEvent(event, context)),
  }
}

/**
 * Every engin's period, as `core` reads it. A period the form let through but that is no date stops the export and
 * names the engin, as a refused event date does.
 * @param engines - the records
 * @returns the periods
 */
export function toSiegeEnginePeriods(engines: readonly DocSiegeEngine[]): SiegeEnginePeriod[] {
  return engines.map((record) => {
    const inUse = toHistoricalDate(record.inUse ?? {})
    if (isDateRefusal(inUse)) {
      throw new Error(`[CMS] siege engine ${String(record.id)}: ${describeDateRefusalFr(inUse)}`)
    }
    return { engine: record.engine, inUse }
  })
}

/**
 * The engin a siege is drawn with: the newest in use at its date. None in use: said, naming the siege and its date,
 * and the map shows the tower alone (the dev, 2026-10-27).
 * @param date - the siege's date
 * @param where - the event, for the warning
 * @param context - the periods, and where the warning goes
 * @returns the engin, or `null`
 */
function siegeEngine(
  date: HistoricalDate,
  where: string,
  context: ExportContext
): SiegeEngine | null {
  const engine = siegeEngineAt(context.periods, date)
  if (engine === null) {
    context.warn(
      `[CMS] ${where}: no siege engine in use in ${formatHistoricalDate(date, 'fr')} — the map shows the tower alone`
    )
  }
  return engine
}
