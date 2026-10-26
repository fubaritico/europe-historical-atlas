/**
 * The content the atlas shows on the map — events, where they happened, who took part, and where it is
 * written — as the contribution tool exports it (CORE-252, CMS-223).
 *
 * **One file, every record inlined.** The contribution keeps sources, places, actors and event types as records of
 * their own, entered once and pointed to; the export writes each event with what it points to already resolved,
 * so the atlas reads one file and joins nothing. The split into an index and bodies per century (`plan.md` P7)
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
}

/** {@link ContentEventType}. */
const eventTypeSchema: z.ZodMiniType<ContentEventType> = z.strictObject({
  id: recordId,
  name: localizedText,
  icon: z.enum(EVENT_ICONS),
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
})

/** `content/events.json` — every event the atlas can show. */
export interface ContentFile {
  /** Format version, so a reader can refuse a shape it does not know. */
  version: number
  /** Every event, in the order the export wrote them. */
  events: ContentEvent[]
}

/** The version this code writes and reads — 2 since the event type carries its icon (2026-10-26). */
export const CONTENT_FORMAT_VERSION = 2

/** {@link ContentFile}. The writer's version and the reader's are one constant, so a bump cannot split them. */
export const contentFileSchema: z.ZodMiniType<ContentFile> = z.strictObject({
  version: z.literal(CONTENT_FORMAT_VERSION),
  events: z.array(eventSchema),
})
