import { yearNamed } from '@europe-historical-atlas/core/data/mapName'

import { whyNotMapName } from './mapNaming'
import { YearChangedOnDisk } from './yearArchive'

import type { PersistenceWords } from './persistenceWords'
import type { YearArchive } from './yearArchive'
import type { YearDocument } from '@europe-historical-atlas/core/data/yearDocument'

/**
 * « Nouvelle carte » (CARTO-536, the dev, 2026-11-25): a year and a name, then an empty map of that year written as a new
 * folder of `years/`, and the Cartographer reloaded on it — a map on the bare relief.
 *
 * **Refused under the field, nothing written**: a year that is not one, a name that cannot be a folder's, a name that is
 * another year (the atlas would publish it as that year — the guard *Save as…* keeps, `s19`), a map that exists already
 * (never written over). **The map open is left first**, through the same « save first? » as *Open…*: dismissing it, or a
 * save that fails, creates nothing.
 */

/** What the author typed. */
export interface NewMapRequest {
  /** The year, as typed. */
  year: string
  /** The map's name, as typed. */
  name: string
}

/** A refusal, and the field it is said under. */
export interface NewMapRefusal {
  /** The field it concerns. */
  field: 'year' | 'name'
  /** The sentence. */
  text: string
}

/** Done, or the refusal the form shows under its field — `null` when it was said elsewhere, the form closing. */
export type NewMapOutcome = { done: true } | { done: false; refusal: NewMapRefusal | null }

/** What creating a map needs. */
export interface NewMapDeps {
  /** Where the map is written — never over one that exists. */
  archive: Pick<YearArchive, 'save'>
  /**
   * The map open, never written over by a new one.
   * @returns its name, or `null` on the start screen
   */
  current: () => string | null
  /**
   * The empty document of a year.
   * @param year - the year
   * @returns the document
   */
  emptyYear: (year: number) => YearDocument
  /**
   * Leave the map open, if any — « save first? » when it changed.
   * @param map - the map about to be opened
   * @returns `true` when the page may leave it
   */
  leave: (map: string) => Promise<boolean>
  /**
   * Reload on the new map, the view carried.
   * @param map - the map written
   */
  open: (map: string) => void
  /** What it says. */
  words: () => PersistenceWords
}

/** The console tag this module's lines start with. */
const LOG_TAG = '[Cartographer]'

/**
 * Why a year and a name cannot make a new map — or `null` when they can.
 * @param request - the year and the name, trimmed
 * @param current - the map open, or `null` on the start screen
 * @param words - the words
 * @returns the refusal, or `null`
 */
export function whyNotNewMap(
  request: NewMapRequest,
  current: string | null,
  words: PersistenceWords
): NewMapRefusal | null {
  const year = yearNamed(request.year)
  if (year === null) return { field: 'year', text: words.t('newMapBadYear') }
  // The map open is on disk, under a fingerprint this page holds: its write would pass, the map replaced by an empty
  // year (review QUAL-001, 2026-11-25). Refused as any map that exists.
  if (request.name === current)
    return { field: 'name', text: words.t('saveAsTaken', { name: request.name }) }
  const refused = whyNotMapName(request.name, year, words)
  return refused === null ? null : { field: 'name', text: refused }
}

/**
 * Create the map, then open it — or say why not.
 * @param deps - the archive, the empty year, the leaving, the opening, the words
 * @param typed - the year and the name as typed
 * @returns done, or the refusal
 */
export async function createNewMap(deps: NewMapDeps, typed: NewMapRequest): Promise<NewMapOutcome> {
  const request = { year: typed.year.trim(), name: typed.name.trim() }
  const refusal = whyNotNewMap(request, deps.current(), deps.words())
  if (refusal !== null) {
    console.warn(`${LOG_TAG} new map refused: ${refusal.text}`)
    return { done: false, refusal }
  }
  // `whyNotNewMap` has read it as a year.
  const year = Number(request.year)
  try {
    // Said by « save first? » or by the save's own alarm: the form closes, nothing created.
    if (!(await deps.leave(request.name))) return { done: false, refusal: null }
    await deps.archive.save(deps.emptyYear(year), request.name)
  } catch (error: unknown) {
    // A map of that name is already there: a new map never writes over another.
    if (error instanceof YearChangedOnDisk) {
      console.warn(`${LOG_TAG} new map refused: a map named ${request.name} exists`)
      return {
        done: false,
        refusal: { field: 'name', text: deps.words().t('saveAsTaken', { name: request.name }) },
      }
    }
    // The server's refusal, or a defect of the leaving — said under the field, never a form stuck on « Création… ».
    console.error(`${LOG_TAG} the new map ${request.name} was not written`, error)
    const reason = error instanceof Error ? error.message : String(error)
    return {
      done: false,
      refusal: { field: 'name', text: deps.words().t('saveAsFailed', { reason }) },
    }
  }
  deps.open(request.name)
  return { done: true }
}
