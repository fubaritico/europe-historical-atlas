/**
 * Attach cities to a title at a year (CMS-507): the operation the title's page and the historian's script call alike
 * (`files/plans/historian/autonomy-and-1200.md` § 3.5). Each city is decided alone (`attachDecision`) and carried out
 * through Payload's Local API, so the sheet's own rules and hooks hold — its title written, two sheets of one year
 * refused. A sheet created takes the year given, the importance « Ville », and one holder line inferred from the
 * district: the title's first source line, its territory named (the historian's calls of 2026-11-24).
 */

import { APIError } from 'payload'

import { relationId } from '../fields/relationId'

import { attachDecision, titleYears } from './attachDecision'

import type { AttachDecision, CitySheetRead, ConflictReason, TitleRead } from './attachDecision'
import type { EventDateFields } from '../fields/dateReading'
import type { Payload } from 'payload'

/** What the operation asks of Payload. */
export type AttachPort = Pick<Payload, 'find' | 'findByID' | 'create' | 'update'>

/** What became of one city, for the screen and the script. */
export interface AttachResult {
  /** The place, by id. */
  readonly place: number | string
  /** Its name, to say it. */
  readonly name: string
  /** What was done. */
  readonly result: 'created' | 'attached' | 'unchanged' | 'conflict' | 'failed'
  /** The sheet written or found, when there is one. */
  readonly sheet: number | string | null
  /** Why a conflict was left as it is. */
  readonly reason?: ConflictReason
  /** The other title's name, for a city held by another title. */
  readonly holder?: string
  /** What failed, for a city the base refused. */
  readonly error?: string
}

/** A refusal of the whole operation — the year outside the title's years, a title without a source — said as is. */
export class AttachRefusal extends Error {}

/** One source line of a title, as stored. */
interface TitleLine {
  /** The source, bare or resolved. */
  readonly source?: unknown
  /** Where in it. */
  readonly where?: string | null
  /** Its words. */
  readonly quotation?: string | null
}

/** What is read of the title once: its decision's part, its date and its first source line. */
interface TitleOnce extends TitleRead {
  /** Its date. */
  readonly date: EventDateFields
  /** Its first source line. */
  readonly line: TitleLine
}

/**
 * The title, read once.
 * @param payload - Payload
 * @param id - the title
 * @returns what the operation needs of it
 * @throws {AttachRefusal} when it has no source line to infer from
 */
async function readTitle(payload: AttachPort, id: number | string): Promise<TitleOnce> {
  const title = await payload.findByID({ collection: 'titles', id, depth: 1 })
  // Read at depth 1, the territory comes resolved; a bare id here would be the read failing
  const territory = typeof title.territory === 'object' ? title.territory : null
  if (territory === null) throw new Error(`[CMS] title ${String(id)} names no territory`)
  const [line] = title.lines ?? []
  if (line === undefined) {
    throw new AttachRefusal(
      `Le titre « ${String(title.label)} » n’a aucune ligne de source : il ne peut rien prouver pour les villes de son district.`
    )
  }
  return {
    id: title.id,
    territoryName: territory.name,
    territoryQid: territory.wikidata ?? null,
    date: title.date,
    line,
  }
}

/**
 * Every sheet of a place, as the decision reads them.
 * @param payload - Payload
 * @param place - the place
 * @returns its sheets
 */
async function sheetsOf(payload: AttachPort, place: number | string): Promise<CitySheetRead[]> {
  const { docs } = await payload.find({
    collection: 'place-periods',
    where: { place: { equals: place } },
    depth: 0,
    pagination: false,
  })
  return docs.map((doc) => ({
    id: doc.id,
    date: doc.date,
    holderTitle: relationId(doc.holderTitle),
    testimonies: doc.testimonies ?? [],
  }))
}

/**
 * The holder line a city inferred from its district receives: the title's first source line, its territory named.
 * @param title - the title
 * @returns the line
 */
function inferredLine(title: TitleOnce) {
  return {
    source: relationId(title.line.source),
    subject: 'holder' as const,
    holderName: title.territoryName,
    holderQid: title.territoryQid,
    byDistrict: true,
    where: title.line.where ?? null,
    quotation: title.line.quotation ?? null,
  }
}

/**
 * A city left as it is, with the other title's name when another title holds it.
 * @param payload - Payload
 * @param decision - the conflict
 * @param decision.sheet - its sheet
 * @param decision.reason - why it is left
 * @returns what is said of it
 */
async function conflictResult(
  payload: AttachPort,
  decision: { sheet: number | string | null; reason: ConflictReason }
): Promise<Pick<AttachResult, 'result' | 'sheet' | 'reason' | 'holder'>> {
  const { sheet, reason } = decision
  if (reason.kind !== 'otherTitle') return { result: 'conflict', sheet, reason }
  const other = await payload.findByID({ collection: 'titles', id: reason.title, depth: 0 })
  return { result: 'conflict', sheet, reason, holder: String(other.label) }
}

/**
 * Carry one decision out.
 * @param payload - Payload
 * @param decision - what to do
 * @param place - the place
 * @param title - the title
 * @param year - the year
 * @returns what was done, and the sheet
 */
async function carryOut(
  payload: AttachPort,
  decision: AttachDecision,
  place: number | string,
  title: TitleOnce,
  year: number
): Promise<Pick<AttachResult, 'result' | 'sheet' | 'reason' | 'holder'>> {
  switch (decision.kind) {
    case 'create': {
      const sheet = await payload.create({
        collection: 'place-periods',
        data: {
          place: Number(place),
          date: { start: { year } },
          importance: 'city',
          showInAtlas: false,
          holderTitle: Number(title.id),
          testimonies: [inferredLine(title)],
        } as never,
      })
      return { result: 'created', sheet: sheet.id }
    }
    case 'attach': {
      const saved = await payload.findByID({
        collection: 'place-periods',
        id: decision.sheet,
        depth: 0,
      })
      await payload.update({
        collection: 'place-periods',
        id: decision.sheet,
        // Every line sent back with its own: an update that carries the lines replaces them all
        data: {
          holderTitle: Number(title.id),
          // A line attesting the territory already: no inferred one beside it
          testimonies: decision.attested
            ? (saved.testimonies ?? [])
            : [...(saved.testimonies ?? []), inferredLine(title)],
        } as never,
      })
      return { result: 'attached', sheet: decision.sheet }
    }
    case 'unchanged':
      return { result: 'unchanged', sheet: decision.sheet }
    case 'conflict':
      return conflictResult(payload, decision)
  }
}

/**
 * Attach cities to a title at a year. A city the base refuses is said with its error and the others go on — each city
 * is its own write, and the answer lists every one (logged on the server's console too).
 * @param payload - Payload
 * @param titleId - the title
 * @param year - the year — the map's, inside the title's years
 * @param places - the cities' places, by id
 * @returns what became of each city, in the order given
 * @throws {AttachRefusal} when the year lies outside the title's years, or the title has no source line
 */
export async function attachCities(
  payload: AttachPort,
  titleId: number | string,
  year: number,
  places: readonly (number | string)[]
): Promise<AttachResult[]> {
  const title = await readTitle(payload, titleId)
  const years = titleYears(title.date)
  if (years === null) throw new Error(`[CMS] title ${String(titleId)} holds an unreadable date`)
  if (year < years.from || year > years.to) {
    const span =
      years.from === years.to ? String(years.from) : `${String(years.from)}–${String(years.to)}`
    throw new AttachRefusal(`L’année ${String(year)} sort des années du titre (${span}).`)
  }
  const results: AttachResult[] = []
  for (const place of places) {
    // Until its record is read, a place is said by its number — a place that does not exist is said so
    let name = `lieu ${String(place)}`
    try {
      name = (await payload.findByID({ collection: 'places', id: place, depth: 0 })).name
      const decision = attachDecision(await sheetsOf(payload, place), title, year)
      results.push({ place, name, ...(await carryOut(payload, decision, place, title, year)) })
    } catch (error: unknown) {
      // Payload's own refusals are meant to be read; anything else stays in the server's log (review SEC-002)
      const message =
        error instanceof APIError
          ? error.message
          : 'erreur interne, le détail est dans la console du serveur'
      console.error(`[CMS] attaching ${name} to title ${String(titleId)} failed`, error)
      results.push({ place, name, result: 'failed', sheet: null, error: message })
    }
  }
  return results
}
