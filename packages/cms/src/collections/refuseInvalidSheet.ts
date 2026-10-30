import { APIError } from 'payload'

import { checkCitySheet, isSheetRefused } from '@europe-historical-atlas/core/data/citySheet'
import { createTranslator } from '@europe-historical-atlas/core/i18n/catalogue'
import { pickLocale } from '@europe-historical-atlas/core/i18n/locale'

import { citySheetCandidate } from '../fields/citySheetCandidate'

import { COLLECTION_MESSAGES } from './i18n'

import type { CollectionBeforeChangeHook } from 'payload'

/** The HTTP status of a refused save: the request is wrong, not the server. */
const BAD_REQUEST = 400

/**
 * The server's half of the one schema for the form, the server and the export: a city sheet is checked by the same schema as the form (`core/data/citySheet.ts`)
 * before it is saved, whatever reaches the API — every issue named under its path. A collection's `beforeChange` runs
 * **before** the fields' own rules (Payload 3.92.0, `collections/operations/utilities/update.ts`: collection, then
 * fields), on the whole sheet (the fields' `beforeValidate` has filled what an update left out). So a date that does
 * not read is left to the date field's rule, which says it in its own words under the right end; the form never sends
 * one, having checked it the same way.
 * @param args - Payload's hook arguments
 * @param args.data - the sheet as it will be saved
 * @param args.req - the request, for the admin's language
 * @returns the data, unchanged
 * @throws {APIError} with every issue, when the schema refuses the sheet
 */
export const refuseInvalidSheet: CollectionBeforeChangeHook = ({ data, req }) => {
  const sheet = citySheetCandidate(data)
  if (sheet === null) return data
  const answer = checkCitySheet(sheet)
  if (!isSheetRefused(answer)) return data
  const say = createTranslator(COLLECTION_MESSAGES, pickLocale([req.i18n.language]))
  const errors = answer.map((issue) => {
    const path = issue.path.join('.')
    return { path, message: say('invalid', { detail: `${path} — ${issue.detail}` }) }
  })
  const [first] = errors
  // The schema never refuses without an issue; if it ever does, that is its defect, said rather than worded over.
  if (first === undefined) throw new Error('[CMS] the city sheet was refused without an issue')
  throw new APIError(first.message, BAD_REQUEST, { errors }, true)
}
