import type { SeedPeriodEnd, SeedSiegeEngine } from './siegeEngineData'
import type { SeedActor, SeedEvent, SeedMoment, SeedPlace, SeedSource, SeedType } from './year1100'
import type { MomentFields } from '../fields/historicalDate'
import type { WikidataPlace } from '../wikidata/wikidataPlace'
import type { HistoricalMoment } from '@europe-historical-atlas/core/time/historicalDate'

/** The collections the seed writes. */
export type SeedCollection =
  'event-types' | 'sources' | 'siege-engines' | 'actors' | 'places' | 'events'

/** A record's id, as Payload answers it. */
export type SeedId = number | string

/**
 * The base, as the seed needs it — Payload's Local API in `run.ts`, a map in the tests. Every write goes through
 * Payload, so its validation (the dates, the Wikidata ids) refuses what the form would refuse.
 */
export interface SeedStore {
  /**
   * The first record whose field equals a value, read in French.
   * @param collection - where to look
   * @param field - the field compared
   * @param value - the value it must hold
   * @returns its id, or `null` when there is none
   */
  findId(collection: SeedCollection, field: string, value: string): Promise<SeedId | null>
  /**
   * Create a record, its texts in French.
   * @param collection - where
   * @param data - its fields
   * @returns its id
   */
  create(collection: SeedCollection, data: Record<string, unknown>): Promise<SeedId>
  /**
   * One field of a record.
   * @param collection - where
   * @param id - the record
   * @param field - the field
   * @returns its value
   */
  readField(collection: SeedCollection, id: SeedId, field: string): Promise<unknown>
  /**
   * Change some fields of a record.
   * @param collection - where
   * @param id - the record
   * @param data - the fields to change
   * @returns once written
   */
  update(collection: SeedCollection, id: SeedId, data: Record<string, unknown>): Promise<void>
}

/** Read a place from Wikidata — `readPlaceEntity` over the network in `run.ts`, a literal in the tests. */
export type ReadWikidataPlace = (id: string) => Promise<WikidataPlace>

/** What the seed wants written. */
export interface SeedData {
  /** The event types. */
  types: readonly SeedType[]
  /** The sources. */
  sources: readonly SeedSource[]
  /** The actors. */
  actors: readonly SeedActor[]
  /** The places. */
  places: readonly SeedPlace[]
  /** The events. */
  events: readonly SeedEvent[]
  /** The siege engins and their periods of use. */
  siegeEngines: readonly SeedSiegeEngine[]
}

/** How many records of a collection were found already there, and how many were created. */
export interface SeedCount {
  /** Already in the base — left as they are. */
  found: number
  /** Written by this run. */
  created: number
  /** Already there, and given a value they still held the default of. */
  updated: number
}

/** The run's account, per collection. */
export type SeedReport = Record<SeedCollection, SeedCount>

/**
 * An event's day in the form's fields. Every day of 1100 is Julian.
 * @param date - the seed's date
 * @returns the form's group
 */
export function eventMoment(date: SeedMoment): MomentFields {
  return {
    year: date.year,
    month: date.month ?? null,
    day: date.day ?? null,
    circa: false,
    margin: null,
    calendar: date.day === undefined ? null : 'julian',
  }
}

/**
 * A moment Wikidata gave, in the form's fields.
 * @param moment - what `readPlaceEntity` read
 * @returns the form's group
 */
export function existenceMoment(moment: HistoricalMoment): MomentFields {
  return { ...moment }
}

/**
 * The id a key resolves to — a key the data names but did not declare is a defect of the data file, said loudly.
 * @param ids - what has been found or created
 * @param key - the key
 * @param what - what it names, for the error
 * @returns the id
 */
function idOf(ids: ReadonlyMap<string, SeedId>, key: string, what: string): SeedId {
  const id = ids.get(key)
  if (id === undefined) throw new Error(`[CMS] seed: ${what} « ${key} » is not declared`)
  return id
}

/** One collection's records, each found by its key or created from its fields. */
interface Batch {
  /** The collection. */
  collection: SeedCollection
  /** The field that finds a record again. */
  field: string
  /** Each record: its key, and the fields to create it with. */
  records: readonly { key: string; data: () => Record<string, unknown> }[]
}

/**
 * Find or create every record of one collection.
 * @param store - the base
 * @param batch - the collection and its records
 * @param report - counted into
 * @returns the id of every key
 */
async function settle(
  store: SeedStore,
  batch: Batch,
  report: SeedReport
): Promise<Map<string, SeedId>> {
  const ids = new Map<string, SeedId>()
  for (const record of batch.records) {
    const existing = await store.findId(batch.collection, batch.field, record.key)
    if (existing === null) {
      ids.set(record.key, await store.create(batch.collection, record.data()))
      report[batch.collection].created += 1
    } else {
      ids.set(record.key, existing)
      report[batch.collection].found += 1
    }
  }
  return ids
}

/**
 * Give each type its icon where the base still holds the default pin — a type the dev wrote before the field existed
 * took the pin from the column's default; a shape he chose himself is never replaced.
 * @param store - the base
 * @param types - the seed's types
 * @param ids - their ids
 * @param report - counted into
 * @returns once written
 */
async function giveIcons(
  store: SeedStore,
  types: readonly SeedType[],
  ids: ReadonlyMap<string, SeedId>,
  report: SeedReport
): Promise<void> {
  for (const type of types) {
    if (type.icon === 'pin') continue
    const id = idOf(ids, type.name, 'type')
    if ((await store.readField('event-types', id, 'icon')) !== 'pin') continue
    await store.update('event-types', id, { icon: type.icon })
    report['event-types'].updated += 1
  }
}

/**
 * Read from Wikidata every place the base does not hold yet — all of them before anything is written.
 * @param store - the base
 * @param readPlace - how to read a place from Wikidata
 * @param places - the seed's places
 * @returns what Wikidata gave, by item
 */
async function readMissingPlaces(
  store: SeedStore,
  readPlace: ReadWikidataPlace,
  places: readonly SeedPlace[]
): Promise<Map<string, WikidataPlace>> {
  const read = new Map<string, WikidataPlace>()
  for (const place of places) {
    if ((await store.findId('places', 'wikidata', place.wikidata)) !== null) continue
    const answer = await readPlace(place.wikidata)
    if (answer.coordinates === null) {
      throw new Error(`[CMS] seed: Wikidata gives ${place.wikidata} (${place.name}) no position`)
    }
    read.set(place.wikidata, answer)
  }
  return read
}

/**
 * A place's fields: its name, and its position and existence as Wikidata gave them.
 * @param place - the seed's place
 * @param read - what Wikidata gave
 * @returns the fields to create it with
 */
function placeFields(
  place: SeedPlace,
  read: ReadonlyMap<string, WikidataPlace>
): Record<string, unknown> {
  const answer = read.get(place.wikidata)
  if (answer?.coordinates == null) {
    throw new Error(`[CMS] seed: ${place.wikidata} was not read from Wikidata`)
  }
  return {
    name: place.name,
    wikidata: place.wikidata,
    location: [answer.coordinates.lon, answer.coordinates.lat],
    // Payload's date group reads `null` as a group and fails on it: an end Wikidata did not give is left out.
    ...(answer.existsFrom === null ? {} : { existsFrom: existenceMoment(answer.existsFrom) }),
    ...(answer.existsTo === null ? {} : { existsTo: existenceMoment(answer.existsTo) }),
  }
}

/**
 * One end of a period of use in the form's fields: a year, approximate or not, with the default margin.
 * @param end - the seed's end
 * @returns the form's group
 */
function periodMoment(end: SeedPeriodEnd): MomentFields {
  return { year: end.year, month: null, day: null, circa: end.circa, margin: null, calendar: null }
}

/**
 * A siege engin's fields, its sources as ids.
 * @param engine - the seed's engin
 * @param sources - the sources' ids, by title
 * @returns the fields to create it with
 */
function siegeEngineFields(
  engine: SeedSiegeEngine,
  sources: ReadonlyMap<string, SeedId>
): Record<string, unknown> {
  return {
    name: engine.name,
    engine: engine.engine,
    inUse: {
      start: periodMoment(engine.from),
      ...(engine.to === undefined ? {} : { end: periodMoment(engine.to) }),
    },
    sources: engine.sources.map((title) => idOf(sources, title, 'source')),
  }
}

/** The ids every relation of an event resolves to. */
interface EventLinks {
  /** By type name. */
  types: ReadonlyMap<string, SeedId>
  /** By Wikidata id. */
  places: ReadonlyMap<string, SeedId>
  /** By Wikidata id. */
  actors: ReadonlyMap<string, SeedId>
  /** By title. */
  sources: ReadonlyMap<string, SeedId>
}

/**
 * An event's fields, its relations as ids.
 * @param event - the seed's event
 * @param links - the ids of what it names
 * @returns the fields to create it with
 */
function eventFields(event: SeedEvent, links: EventLinks): Record<string, unknown> {
  return {
    title: event.title,
    type: idOf(links.types, event.type, 'type'),
    date: { start: eventMoment(event.date) },
    ...(event.place === undefined ? {} : { place: idOf(links.places, event.place, 'place') }),
    actors: event.actors.map((actor) => idOf(links.actors, actor, 'actor')),
    sources: event.sources.map((source) => idOf(links.sources, source, 'source')),
    description: event.description,
    ...(event.wikidata === undefined ? {} : { wikidata: event.wikidata }),
  }
}

/**
 * A report with nothing counted yet.
 * @returns every collection at zero
 */
function emptyReport(): SeedReport {
  return {
    'event-types': { found: 0, created: 0, updated: 0 },
    sources: { found: 0, created: 0, updated: 0 },
    'siege-engines': { found: 0, created: 0, updated: 0 },
    actors: { found: 0, created: 0, updated: 0 },
    places: { found: 0, created: 0, updated: 0 },
    events: { found: 0, created: 0, updated: 0 },
  }
}

/**
 * Write the seed into the base. **Idempotent**: a record already there — found by its Wikidata id, its name or its
 * title — is reused and never changed, so the dev's own records stay as he wrote them and a second run creates
 * nothing. Every place missing from the base is read from Wikidata **before anything is written**: Wikidata
 * unreachable, or a place without coordinates, stops the run with the base untouched.
 * @param store - the base
 * @param readPlace - how to read a place from Wikidata
 * @param data - what to write
 * @returns how many records were found and created, per collection
 */
export async function seed(
  store: SeedStore,
  readPlace: ReadWikidataPlace,
  data: SeedData
): Promise<SeedReport> {
  const report = emptyReport()
  const read = await readMissingPlaces(store, readPlace, data.places)
  const batch = (
    collection: SeedCollection,
    field: string,
    records: Batch['records']
  ): Promise<Map<string, SeedId>> => settle(store, { collection, field, records }, report)

  const links: EventLinks = {
    types: await batch(
      'event-types',
      'name',
      data.types.map((type) => ({ key: type.name, data: () => ({ ...type }) }))
    ),
    sources: await batch(
      'sources',
      'title',
      data.sources.map((s) => ({ key: s.title, data: () => ({ ...s }) }))
    ),
    actors: await batch(
      'actors',
      'wikidata',
      data.actors.map((a) => ({ key: a.wikidata, data: () => ({ ...a }) }))
    ),
    places: await batch(
      'places',
      'wikidata',
      data.places.map((place) => ({ key: place.wikidata, data: () => placeFields(place, read) }))
    ),
  }
  await batch(
    'siege-engines',
    'name',
    data.siegeEngines.map((engine) => ({
      key: engine.name,
      data: () => siegeEngineFields(engine, links.sources),
    }))
  )
  await giveIcons(store, data.types, links.types, report)
  await batch(
    'events',
    'title',
    data.events.map((event) => ({ key: event.title, data: () => eventFields(event, links) }))
  )
  return report
}
