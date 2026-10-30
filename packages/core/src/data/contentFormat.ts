/**
 * The content the atlas shows on the map — events, where they happened, who took part, and where it is
 * written; cities at a date, their importance and what the sources say of them — as the contribution tool exports it
 * (CORE-252, CMS-223, ATLAS-295).
 *
 * **The export prepares the file, the joins done** (the dev, 2026-10-30: *« les données, elles arrivent préparées,
 * comme en GraphQL »*). The contribution keeps sources, places, actors, reasons and event types as records of their
 * own, entered once and pointed to by id; the export joins them once, when it writes, so each event and each city
 * arrives with what it points to written in, and the atlas reads it as it is. The split into an index and bodies per century (`plan.md` P7)
 * waits for the day there are thousands.
 *
 * **Two languages per text, French always there**: French is the contribution's default language, so an entry
 * always has it; English is `null` until someone writes it. What the atlas shows in its place is CMS-227's
 * decision, not this format's.
 *
 * Same shape of schema as `yearFormat.ts`, for the same reasons: `zod/mini`, every object strict, types declared
 * and each schema annotated with its type so the two cannot drift.
 */

import { z } from 'zod/mini'

import { historicalDateSchema, historicalMomentSchema } from '../time/historicalDate'

import { CITY_IMPORTANCES } from './cityImportance'
import { SIEGE_ENGINES } from './siegeEngines'

import type { CityImportance } from './cityImportance'
import type { SiegeEngine } from './siegeEngines'
import type { HistoricalDate, HistoricalMoment } from '../time/historicalDate'

/** A text in the two languages of the project. */
export interface LocalizedText {
  /** French — the contribution's default language, always written. */
  fr: string
  /** English, or `null` while nobody has written it. */
  en: string | null
}

/** {@link LocalizedText}. */
const localizedText: z.ZodMiniType<LocalizedText> = z.strictObject({
  fr: z.string().check(z.minLength(1)),
  en: z.nullable(z.string().check(z.minLength(1))),
})

/** A Wikidata entity id, checked in shape only. */
const wikidataId = z.nullable(
  z.string().check(z.regex(/^Q\d+$/, 'should be a Wikidata id like Q1218'))
)

/** A record's id, as the contribution tool gave it. */
const recordId = z.string().check(z.minLength(1))

/**
 * The shapes an event stands on the map as, chosen once per type in the contribution (ATLAS-156): `pin` until a
 * shape is chosen for it, `swords` the crossed swords of a battle, `tower` a siege or a taking, `crown` an accession.
 */
export const EVENT_ICONS = ['pin', 'swords', 'tower', 'crown'] as const

/** One of {@link EVENT_ICONS}. */
export type EventIcon = (typeof EVENT_ICONS)[number]

/** What kind of event it is — a siege, a battle, a treaty. */
export interface ContentEventType {
  /** The record's id in the contribution. */
  id: string
  /** Its name. */
  name: LocalizedText
  /** The shape its events stand on the map as. */
  icon: EventIcon
  /**
   * The colour its events' pins wear, as `#rrggbb` — one per type, so a pin says what kind of event it marks (the dev,
   * 2026-10-27: « une épingle avec une couleur dédiée », ATLAS-298).
   */
  colour: string
}

/** {@link ContentEventType}. */
const eventTypeSchema: z.ZodMiniType<ContentEventType> = z.strictObject({
  id: recordId,
  name: localizedText,
  icon: z.enum(EVENT_ICONS),
  colour: z.string().check(z.regex(/^#[0-9a-f]{6}$/, 'should be a colour like #e3170a')),
})

/** A named point on the map: a city, an abbey, a battlefield. */
export interface ContentPlace {
  /** The record's id in the contribution. */
  id: string
  /** Its name. */
  name: LocalizedText
  /** Longitude, WGS84 degrees. */
  lon: number
  /** Latitude, WGS84 degrees. */
  lat: number
  /** Its Wikidata item, or `null`. */
  wikidata: string | null
  /** When it began to exist, or `null` while nobody has said. */
  existsFrom: HistoricalMoment | null
  /** When it ceased to exist, or `null`: it exists today — a place does not vanish unnoticed (the dev, 2026-10-25). */
  existsTo: HistoricalMoment | null
}

/** {@link ContentPlace}. */
const placeSchema: z.ZodMiniType<ContentPlace> = z.strictObject({
  id: recordId,
  name: localizedText,
  lon: z.number().check(z.gte(-180), z.lte(180)),
  lat: z.number().check(z.gte(-90), z.lte(90)),
  wikidata: wikidataId,
  existsFrom: z.nullable(historicalMomentSchema),
  existsTo: z.nullable(historicalMomentSchema),
})

/** Who took part: a person or a house. */
export interface ContentActor {
  /** The record's id in the contribution. */
  id: string
  /** The name, as it is usually written. */
  name: LocalizedText
  /** A person, or a house — the sources say one or the other. */
  kind: 'person' | 'house'
  /** Its Wikidata item, or `null`. */
  wikidata: string | null
}

/** {@link ContentActor}. */
const actorSchema: z.ZodMiniType<ContentActor> = z.strictObject({
  id: recordId,
  name: localizedText,
  kind: z.enum(['person', 'house']),
  wikidata: wikidataId,
})

/** Where something is written — a chronicle, an atlas, an encyclopaedia article. */
export interface ContentSource {
  /** The record's id in the contribution. */
  id: string
  /** Its title. */
  title: string
  /** Its author, or `null` when it has none (an anonymous chronicle, a crowd database). */
  author: string | null
  /** Where it can be read online, or `null` — a printed book has no address. */
  url: string | null
}

/** {@link ContentSource}. */
const sourceSchema: z.ZodMiniType<ContentSource> = z.strictObject({
  id: recordId,
  title: z.string().check(z.minLength(1)),
  author: z.nullable(z.string().check(z.minLength(1))),
  url: z.nullable(z.url()),
})

/** Something that happened at a date and a place. */
export interface ContentEvent {
  /** The record's id in the contribution. */
  id: string
  /** Its title. */
  title: LocalizedText
  /** What kind of event it is. */
  type: ContentEventType
  /** When — an instant or an interval, each end as precise as it is known. */
  date: HistoricalDate
  /** Where, or `null` while no place is set — such an event is listed, not pinned. */
  place: ContentPlace | null
  /** Who took part. */
  actors: ContentActor[]
  /** What happened, in a few sentences; `null` while nothing is written. */
  description: LocalizedText | null
  /** Where it is written. */
  sources: ContentSource[]
  /** Its Wikidata item, or `null`. */
  wikidata: string | null
  /**
   * The artillery in front of its tower, chosen by its date (`siegeEngines`); `null` when its type draws no tower, or
   * when no period of use covers its date — the map then shows the tower alone (the dev, 2026-10-27).
   */
  engine: SiegeEngine | null
}

/** {@link ContentEvent}. */
const eventSchema: z.ZodMiniType<ContentEvent> = z.strictObject({
  id: recordId,
  title: localizedText,
  type: eventTypeSchema,
  date: historicalDateSchema,
  place: z.nullable(placeSchema),
  actors: z.array(actorSchema),
  description: z.nullable(localizedText),
  sources: z.array(sourceSchema),
  wikidata: wikidataId,
  engine: z.nullable(z.enum(SIEGE_ENGINES)),
})

/** What a source says of a city, by what it speaks about: the one value its subject names. */
export type ContentTestimonyValue =
  /** How many people lived there. */
  | { subject: 'population'; population: number }
  /** Which order of city it was. */
  | { subject: 'importance'; importance: CityImportance }
  /** One reason for its importance, named. */
  | { subject: 'reason'; reason: LocalizedText }

/** One line of what the sources say of a city: the source written in, what it says, where it says it. */
export type ContentTestimony = ContentTestimonyValue & {
  /** The source. */
  source: ContentSource
  /** Where in it — a page, a line, a column — or `null`. */
  where: string | null
}

/** {@link ContentTestimony}. */
const testimonySchema: z.ZodMiniType<ContentTestimony> = z.discriminatedUnion('subject', [
  z.strictObject({
    source: sourceSchema,
    where: z.nullable(z.string()),
    subject: z.literal('population'),
    population: z.int().check(z.gte(0)),
  }),
  z.strictObject({
    source: sourceSchema,
    where: z.nullable(z.string()),
    subject: z.literal('importance'),
    importance: z.enum(CITY_IMPORTANCES),
  }),
  z.strictObject({
    source: sourceSchema,
    where: z.nullable(z.string()),
    subject: z.literal('reason'),
    reason: localizedText,
  }),
])

/**
 * A city at a date — « Rome en 1100 » — as the atlas will draw it (ATLAS-295): the point and the name together, by
 * order of importance as the zoom closes in. The atlas reads it already; it draws no city yet.
 */
export interface ContentCity {
  /** The sheet's id in the contribution. */
  id: string
  /** The place, written in: its name, its position. */
  place: ContentPlace
  /** When the sheet holds: a year alone counts for that year, an interval for every year it covers. */
  date: HistoricalDate
  /** Its order on the map: a capital from afar, a large city as the zoom closes in, a city close up. */
  importance: CityImportance
  /** Why it has that importance, named. */
  reasons: LocalizedText[]
  /** What the sources say of it — the « why » the atlas can show on a click. */
  testimonies: ContentTestimony[]
}

/** {@link ContentCity}. */
const citySchema: z.ZodMiniType<ContentCity> = z.strictObject({
  id: recordId,
  place: placeSchema,
  date: historicalDateSchema,
  importance: z.enum(CITY_IMPORTANCES),
  reasons: z.array(localizedText),
  testimonies: z.array(testimonySchema),
})

/** `content/events.json` — every event and every city at a date the atlas can show. */
export interface ContentFile {
  /** Format version, so a reader can refuse a shape it does not know. */
  version: number
  /** Every event, in the order the export wrote them. */
  events: ContentEvent[]
  /** Every city at a date, in the order the export wrote them. */
  cities: ContentCity[]
}

/**
 * The version this code writes and reads — 2 since the event type carries its icon (2026-10-26), 3 since an event
 * carries its siege engine (2026-10-27, ATLAS-286), 4 since the event type carries its pins' colour (2026-10-27,
 * ATLAS-298), 5 since the file carries the cities at a date (2026-10-30, ATLAS-295).
 */
export const CONTENT_FORMAT_VERSION = 5

/** {@link ContentFile}. The writer's version and the reader's are one constant, so a bump cannot split them. */
export const contentFileSchema: z.ZodMiniType<ContentFile> = z.strictObject({
  version: z.literal(CONTENT_FORMAT_VERSION),
  events: z.array(eventSchema),
  cities: z.array(citySchema),
})
