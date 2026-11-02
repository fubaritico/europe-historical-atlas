import { setIn } from 'formik'

import { checkCitySheet, isSheetRefused } from '@europe-historical-atlas/core/data/citySheet'
import { isDateRefusal } from '@europe-historical-atlas/core/time/historicalDate'

import { toHistoricalDate } from '../../../fields/dateReading'
import { OVERLAP_PATH, overlappingSheet } from '../../../fields/sheetOverlap'

import { momentFields, readNumber, sheetBody, testimonyBody } from './sheetValues'

import type { CitySheetMessageKey } from '../i18n'
import type { Say } from './say'
import type { MomentValues, SheetValues } from './sheetValues'
import type { SavedSheet } from '../../../fields/sheetOverlap'
import type { CitySheetIssue } from '@europe-historical-atlas/core/data/citySheet'
import type { DateRefusal, HistoricalDate } from '@europe-historical-atlas/core/time/historicalDate'
import type { FormikErrors } from 'formik'

/** Which end of the date, by the form's name for it. */
type EndName = 'start' | 'end'

/** A number field of an end: whole always, and within bounds with their sentence when it has any. */
const NUMBER_BOUNDS: readonly {
  field: 'year' | 'month' | 'day' | 'margin'
  min?: number
  max?: number
  out?: CitySheetMessageKey
}[] = [
  { field: 'year' },
  { field: 'month', min: 1, max: 12, out: 'monthRange' },
  { field: 'day', min: 1, max: 31, out: 'dayRange' },
  { field: 'margin', min: 1, max: Infinity, out: 'marginRange' },
]

/**
 * What the typed numbers of one end get wrong, field by field — a fraction, a month of 13. The date's own rules
 * would refuse them too, but as a shape with no field to put the sentence under.
 * @param values - the end
 * @param end - its name
 * @param say - the translator
 * @returns one `[path, sentence]` per refused field
 */
function numberErrors(values: MomentValues, end: EndName, say: Say): [string, string][] {
  const errors: [string, string][] = []
  for (const { field, min, max, out } of NUMBER_BOUNDS) {
    const value = readNumber(values[field])
    if (value === null) continue
    if (!Number.isInteger(value)) errors.push([`date.${end}.${field}`, say('wholeNumber')])
    else if (out !== undefined && (value < (min ?? -Infinity) || value > (max ?? Infinity))) {
      errors.push([`date.${end}.${field}`, say(out)])
    }
  }
  return errors
}

/**
 * Where a refusal of the date is shown, and what it says: under the field that would change it.
 * @param refusal - why the date was refused
 * @param say - the translator
 * @returns the path and the sentence
 */
function dateRefusalError(refusal: DateRefusal, say: Say): [string, string] {
  if (refusal.kind === 'shape') return ['date.start.year', say('yearMissing')]
  if (refusal.kind === 'reversed') return ['date.end.year', say('reversed')]
  const end: EndName = refusal.end === 'to' ? 'end' : 'start'
  switch (refusal.kind) {
    case 'year-zero':
      return [`date.${end}.year`, say('yearZero')]
    case 'day-without-month':
      return [`date.${end}.month`, say('dayWithoutMonth')]
    case 'day-without-calendar':
      return [`date.${end}.calendar`, say('dayWithoutCalendar')]
    case 'calendar-without-day':
      return [`date.${end}.calendar`, say('calendarWithoutDay')]
    case 'no-such-day':
      return [`date.${end}.day`, say('noSuchDay')]
    case 'margin-without-circa':
      return [`date.${end}.margin`, say('marginWithoutCirca')]
  }
}

/**
 * The date the form holds, or the errors that keep it from being one.
 * @param values - the form's values
 * @param say - the translator
 * @returns the date, or `[path, sentence]` pairs
 */
function readDate(values: SheetValues, say: Say): HistoricalDate | [string, string][] {
  const typed = [
    ...numberErrors(values.date.start, 'start', say),
    ...numberErrors(values.date.end, 'end', say),
  ]
  if (typed.length > 0) return typed
  const answer = toHistoricalDate({
    start: momentFields(values.date.start),
    end: momentFields(values.date.end),
  })
  return isDateRefusal(answer) ? [dateRefusalError(answer, say)] : answer
}

/** The errors so far: Formik's own shape, which its `setIn` hands back untyped. */
type Errors = FormikErrors<SheetValues>

/**
 * One more error, at its path.
 * @param errors - the errors so far
 * @param path - where, dot-separated
 * @param sentence - what it says
 * @returns the errors with this one
 */
function withError(errors: Errors, path: string, sentence: string): Errors {
  return setIn(errors, path, sentence) as Errors
}

/**
 * The schema's issues, each under its field, in the form's words.
 * @param errors - the errors so far
 * @param issues - what the schema found
 * @param dateRefused - whether the date already has its error, which the schema's would only repeat
 * @param say - the translator
 * @returns the errors with the issues'
 */
function withIssues(
  errors: Errors,
  issues: CitySheetIssue[],
  dateRefused: boolean,
  say: Say
): Errors {
  let all = errors
  for (const issue of issues) {
    if (issue.field === 'place') all = withError(all, 'place', say('placeMissing'))
    else if (issue.field === 'importance')
      all = withError(all, 'importance', say('importanceMissing'))
    else if (issue.field === 'testimonies') all = withLineIssue(all, issue, say)
    else if (issue.field === 'holderName')
      all = withError(all, 'holderName', say('holderNameMissing'))
    else if (issue.field === 'holderQid') all = withError(all, 'holderQid', say('qidInvalid'))
    else if (issue.field !== 'date' || !dateRefused) all = withUnexpected(all, issue, say)
  }
  return all
}

/** What a line's field says when the schema refuses it, by the field. */
const LINE_SENTENCES: Readonly<Record<string, CitySheetMessageKey>> = {
  source: 'sourceMissing',
  subject: 'subjectMissing',
  population: 'populationInvalid',
  importance: 'lineImportanceMissing',
  reason: 'reasonMissing',
  holderName: 'lineHolderMissing',
  holderQid: 'qidInvalid',
}

/**
 * A line's issue, under its field: `testimonies.0.population`.
 * @param errors - the errors so far
 * @param issue - the schema's issue, its path from `testimonies` down
 * @param say - the translator
 * @returns the errors with it
 */
function withLineIssue(errors: Errors, issue: CitySheetIssue, say: Say): Errors {
  const [, index, key] = issue.path
  const sentence = typeof key === 'string' ? LINE_SENTENCES[key] : undefined
  if (typeof index !== 'number' || sentence === undefined) return withUnexpected(errors, issue, say)
  return withError(errors, `testimonies.${String(index)}.${key as string}`, say(sentence))
}

/**
 * An issue the form has no sentence for — the schema and the form disagree, which is a defect: shown where the schema
 * puts it, in its own words, and said in the console.
 * @param errors - the errors so far
 * @param issue - the schema's issue
 * @param say - the translator
 * @returns the errors with it
 */
function withUnexpected(errors: Errors, issue: CitySheetIssue, say: Say): Errors {
  console.error(
    `[CMS] the city sheet failed the schema where the form has no sentence: ${issue.path.join('.')} — ${issue.detail}`
  )
  const path = issue.field === 'date' ? 'date.start.year' : issue.path.join('.')
  return withError(errors, path, say('unexpected', { detail: issue.detail }))
}

/** What the overlap rule needs while typing: the place's saved sheets, this sheet's id, and the refusal's words. */
export interface OverlapCheck {
  /** The chosen place's saved sheets, as the base answered. */
  saved: readonly SavedSheet[]
  /** This sheet's id, so it is not compared with itself; absent for a new one. */
  ownId?: number | string
  /**
   * The refusal, in the server's own words.
   * @param placeName - the place's name
   * @param date - the saved sheet's date
   * @returns the sentence
   */
  refusal: (placeName: string, date: HistoricalDate) => string
}

/**
 * The overlap rule of decision 7, played while typing against the place's saved sheets — `overlappingSheet`, the
 * very function the server plays at save, so the two cannot disagree. Its sentence goes under the year, where the
 * server puts it.
 * @param errors - the errors so far
 * @param values - the form's values, with a place chosen
 * @param overlap - the saved sheets, the id and the words
 * @returns the errors, with the overlap's when there is one
 */
function withOverlap(errors: Errors, values: SheetValues, overlap: OverlapCheck): Errors {
  if (values.place === null) return errors
  const date = { start: momentFields(values.date.start), end: momentFields(values.date.end) }
  const hit = overlappingSheet(date, overlap.saved, overlap.ownId)
  return hit === null
    ? errors
    : withError(errors, OVERLAP_PATH, overlap.refusal(values.place.name, hit.date))
}

/**
 * Every error of the form, each under its field — what Formik shows once a field is touched, and what keeps the
 * button greyed. The rules are `core`'s (`checkCitySheet`, the date's own) and the overlap's, when the place's saved
 * sheets are known; this only says where, and in which words.
 * @param values - the form's values
 * @param say - the translator, in the admin's language
 * @param overlap - the place's saved sheets and the refusal's words; absent until they are read
 * @returns the errors, `{}` when the sheet is valid
 */
export function validateSheet(values: SheetValues, say: Say, overlap?: OverlapCheck): Errors {
  let errors: Errors = {}
  const date = readDate(values, say)
  const dateRefused = Array.isArray(date)
  if (dateRefused) for (const [path, sentence] of date) errors = withError(errors, path, sentence)
  else if (overlap !== undefined) errors = withOverlap(errors, values, overlap)
  const body = sheetBody(values)
  const answer = checkCitySheet({
    place: values.place?.id,
    date: dateRefused ? undefined : date,
    importance: values.importance === '' ? undefined : values.importance,
    reasons: values.reasons,
    testimonies: values.testimonies.map(testimonyBody),
    holderName: body.holderName,
    holderQid: body.holderQid,
  })
  return isSheetRefused(answer) ? withIssues(errors, answer, dateRefused, say) : errors
}
