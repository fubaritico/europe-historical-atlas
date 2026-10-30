import { CONTENT_FORMAT_VERSION } from '@europe-historical-atlas/core/data/contentFormat'
import { siegeEngineAt } from '@europe-historical-atlas/core/data/siegeEngines'
import { formatHistoricalDate } from '@europe-historical-atlas/core/time/formatHistoricalDate'
import { isDateRefusal } from '@europe-historical-atlas/core/time/historicalDate'

import { describeDateRefusalFr, toHistoricalDate } from '../fields/historicalDate'

import { localized, optionalLocalized, present, resolved, toPlace, toSource } from './docRecords'
import { toContentCity } from './toContentCity'

import type { DocEventType, DocId, DocLocalized, DocPlace, DocSource } from './docRecords'
import type { DocCitySheet } from './toContentCity'
import type { EventDateFields } from '../fields/historicalDate'
import type {
  ContentActor,
  ContentEvent,
  ContentEventType,
  ContentFile,
} from '@europe-historical-atlas/core/data/contentFormat'
import type {
  SiegeEngine,
  SiegeEnginePeriod,
} from '@europe-historical-atlas/core/data/siegeEngines'
import type { HistoricalDate } from '@europe-historical-atlas/core/time/historicalDate'

/*
 * The records only the events' export reads — the shapes the events and the cities share are in `docRecords.ts`.
 */

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
 * An event's type, with its icon and its pins' colour. Both columns have a default, so a type without one is a defect
 * of the base, said loudly — never drawn as a pin, never given a colour here.
 * @param type - the type, resolved
 * @param where - the event, for the error
 * @returns it, as the atlas reads it
 */
function toContentType(type: DocEventType, where: string): ContentEventType {
  if (type.icon === null || type.icon === undefined) {
    throw new Error(`[CMS] ${where}, type: no icon`)
  }
  if (type.colour === null || type.colour === undefined) {
    throw new Error(`[CMS] ${where}, type: no colour`)
  }
  return {
    id: String(type.id),
    name: localized(type.name, `${where}, type`),
    icon: type.icon,
    colour: type.colour,
  }
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
  const sources = (event.sources ?? []).map((value) => toSource(value, `${where}, source`))
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

/** Every record the content file is made of, relations resolved. */
export interface ContentRecords {
  /** The events. */
  events: readonly DocEvent[]
  /** The cities at a date. */
  cities: readonly DocCitySheet[]
}

/**
 * Every event and every city at a date, as the file the atlas reads.
 * @param records - the events and the city sheets, relations resolved
 * @param context - the engins' periods, and where a warning goes
 * @returns the content file
 */
export function toContent(records: ContentRecords, context: ExportContext): ContentFile {
  return {
    version: CONTENT_FORMAT_VERSION,
    events: records.events.map((event) => toContentEvent(event, context)),
    cities: records.cities.map(toContentCity),
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
