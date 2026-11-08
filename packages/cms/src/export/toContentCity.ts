import { checkCitySheet, isSheetRefused } from '@europe-historical-atlas/core/data/citySheet'

import { citySheetCandidate } from '../fields/citySheetCandidate'

import { localized, present, resolved, toPlace, toSource } from './docRecords'

import type { DocId, DocLocalized, DocPlace, DocSource } from './docRecords'
import type {
  CityImportance,
  TestimonySubject,
} from '@europe-historical-atlas/core/data/cityImportance'
import type { CitySheet } from '@europe-historical-atlas/core/data/citySheet'
import type {
  ContentCity,
  ContentHolder,
  ContentTestimony,
} from '@europe-historical-atlas/core/data/contentFormat'

/** A reason of importance. */
export interface DocReason {
  /** Its id. */
  id: DocId
  /** Its name, every locale. */
  name: DocLocalized
}

/** One line of what the sources say, its relations resolved. */
export interface DocTestimony {
  /** Payload's row id. */
  id?: string | null
  /** The source. */
  source: DocSource | DocId | null | undefined
  /** What it speaks about. */
  subject: TestimonySubject | null | undefined
  /** The population, for a line about it. */
  population?: number | null
  /** The importance, for a line about it. */
  importance?: CityImportance | null
  /** The reason, for a line about one. */
  reason?: DocReason | DocId | null
  /** Where in the source. */
  where?: string | null
  /** The polity's name, for a line about the holder. */
  holderName?: string | null
  /** The polity's Wikidata id, for a line about the holder. */
  holderQid?: string | null
  /** The source's own words. */
  quotation?: string | null
}

/** A city at a date, its relations resolved. */
export interface DocCitySheet {
  /** Its id. */
  id: DocId
  /** Its place. */
  place: DocPlace | DocId | null | undefined
  /** Its date, as the form holds it. */
  date: unknown
  /** Its importance. */
  importance: CityImportance | null | undefined
  /** Its reasons. */
  reasons?: (DocReason | DocId)[] | null
  /** What the sources say. */
  testimonies?: DocTestimony[] | null
  /** The polity that held it, by its name. */
  holderName?: string | null
  /** That polity's Wikidata id. */
  holderQid?: string | null
  /** Whether the atlas shows it (CMS-391). */
  showInAtlas?: boolean | null
}

/**
 * The sheet, checked by the one schema the form and the server check it by (`core/data/citySheet.ts`): a sheet the
 * base holds but the schema refuses stops the export and is named — nothing half-right reaches the atlas.
 * @param sheet - the record
 * @param where - what it is, for the error
 * @returns the sheet, read
 */
function checked(sheet: DocCitySheet, where: string): CitySheet {
  const candidate = citySheetCandidate(sheet as unknown as Record<string, unknown>)
  if (candidate === null) throw new Error(`[CMS] ${where}: its date does not read`)
  const answer = checkCitySheet(candidate)
  if (isSheetRefused(answer)) {
    const issues = answer.map((issue) => `${issue.path.join('.')} — ${issue.detail}`).join('; ')
    throw new Error(`[CMS] ${where}: refused by the schema: ${issues}`)
  }
  return answer
}

/**
 * A reason, named.
 * @param value - the relation
 * @param where - what it is, for the error
 * @returns its name in both languages
 */
function reasonName(value: DocReason | DocId | null | undefined, where: string) {
  // Unreachable while the schema refuses a reason line without its reason first: a null here is a defect, said.
  if (value === null || value === undefined) throw new Error(`[CMS] ${where}: no reason`)
  const reason = resolved<DocReason>(value, where)
  return localized(reason.name, `reason ${String(reason.id)}`)
}

/**
 * One line, written in: the value its subject names, as the schema read it.
 * @param row - the record's line
 * @param line - the line as the schema read it
 * @param where - what it is, for the error
 * @returns it, as the atlas reads it
 */
function toTestimony(
  row: DocTestimony,
  line: CitySheet['testimonies'][number],
  where: string
): ContentTestimony {
  // The schema refused a line without its source before this runs; a null here is the two readings disagreeing.
  if (row.source === null || row.source === undefined) throw new Error(`[CMS] ${where}: no source`)
  const base = {
    source: toSource(row.source, `${where}, source`),
    where: present(row.where),
    quotation: present(row.quotation),
  }
  switch (line.subject) {
    case 'population':
      return { ...base, subject: 'population', population: line.population }
    case 'importance':
      return { ...base, subject: 'importance', importance: line.importance }
    case 'reason':
      return { ...base, subject: 'reason', reason: reasonName(row.reason, `${where}, reason`) }
    case 'holder':
      return { ...base, subject: 'holder', holder: toHolder(line.holderName, line.holderQid) }
  }
}

/**
 * A holder as the atlas reads it, from what the schema read.
 * @param name - the polity's name
 * @param qid - its Wikidata id, when it has one
 * @returns the holder
 */
function toHolder(name: string, qid: string | null | undefined): ContentHolder {
  return { name, wikidata: qid ?? null }
}

/**
 * One city at a date, everything it points to written in, after the schema's check.
 * @param sheet - the record, relations resolved
 * @returns it, as the atlas reads it
 * @throws {Error} when the schema refuses it, or a relation is not resolved — the export stops, naming it
 */
export function toContentCity(sheet: DocCitySheet): ContentCity {
  const where = `city sheet ${String(sheet.id)}`
  const read = checked(sheet, where)
  // The three guards below are unreachable while the schema refuses such a sheet first (`checked`): each is the
  // schema and this reading disagreeing — a defect, said loudly rather than written as a hole in the file.
  if (sheet.place === null || sheet.place === undefined) throw new Error(`[CMS] ${where}: no place`)
  // The box has a default, so every sheet carries it once the column exists; none here is a base the server has not
  // brought up to date yet — the export stops, rather than hiding every city from the atlas.
  if (typeof sheet.showInAtlas !== 'boolean') {
    throw new Error(
      `[CMS] ${where}: no « show in the atlas » box — start the CMS once so the base gains its column`
    )
  }
  const rows = sheet.testimonies ?? []
  return {
    id: String(sheet.id),
    place: toPlace(resolved<DocPlace>(sheet.place, `${where}, place`)),
    date: read.date,
    importance: read.importance,
    reasons: (sheet.reasons ?? []).map((reason) => reasonName(reason, `${where}, reason`)),
    testimonies: read.testimonies.map((line, index) => {
      const row = rows[index]
      if (row === undefined) throw new Error(`[CMS] ${where}: line ${String(index + 1)} vanished`)
      return toTestimony(row, line, `${where}, line ${String(index + 1)}`)
    }),
    holder:
      read.holderName === null || read.holderName === undefined
        ? null
        : toHolder(read.holderName, read.holderQid),
    showInAtlas: sheet.showInAtlas,
  }
}
