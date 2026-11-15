import { pickLocale } from '@europe-historical-atlas/core/i18n/locale'

import { relationId } from '../../fields/relationId'

import { CitySheetForm } from './CitySheetForm'
import { sheetValues } from './utils/sheetValues'

import type { RecordChoice, SheetDocument } from './utils/sheetValues'
import type { DocumentViewServerProps, PayloadRequest } from 'payload'

/**
 * The server half of the « Ville à une date » screen, in place of Payload's form
 * (`admin.components.views.edit.default`): Payload keeps the document's header and its tabs around it. It reads the
 * sheet's place name, in the content language, the reasons' and the confessions' lists, the titles of the sources
 * its lines cite and the name of its holder's title, and hands the client form its values, its id, the two lists and its routes. Every read runs as the contributor
 * (`overrideAccess: false`): the form shows nothing he could not read through the API.
 * @param props - Payload's document view props
 * @param props.doc - the sheet, `null` for a new one
 * @param props.initPageResult - the request: its Payload, its languages
 * @returns the form
 */
export async function CitySheetView({ doc, initPageResult }: DocumentViewServerProps) {
  const { req, locale } = initPageResult
  // A new sheet comes as `null`, whatever the type says (`@payloadcms/next` 3.92.0, `views/Document/index.js`:
  // `initialData || null` when there is no id) — so it is a new sheet's empty document, not a missing value.
  const sheet = (doc as SheetDocument | null) ?? {}
  // The config declares two locales, so Payload always hands one; none would be a config without localization.
  if (locale === undefined) throw new Error('[CMS] the city sheet view was given no content locale')
  const contentLocale = pickLocale([locale.code])
  const placeId = relationId(sheet.place)
  const place =
    placeId === null
      ? null
      : await req.payload.findByID({
          collection: 'places',
          id: placeId,
          depth: 0,
          locale: contentLocale,
          fallbackLocale: 'fr',
          overrideAccess: false,
          user: req.user,
          req,
        })
  const lists = {
    reasons: await choiceList(req, 'importance-reasons', contentLocale),
    confessions: await choiceList(req, 'confessions', contentLocale),
  }
  const sourceNames = await citedSourceNames(req, sheet)
  const holderTitle = await holderTitleName(req, sheet)
  const id = relationId(sheet.id)
  const { api, admin } = req.payload.config.routes
  return (
    // Keyed by the sheet: Formik reads its initial values once, so another sheet in the same view gets a new form
    <CitySheetForm
      key={id === null ? 'new' : String(id)}
      initialValues={sheetValues(sheet, place?.name ?? null, sourceNames, holderTitle)}
      lists={lists}
      {...(id === null ? {} : { id })}
      locale={pickLocale([req.i18n.language])}
      contentLocale={contentLocale}
      api={api}
      admin={admin}
    />
  )
}

/**
 * A list of the CMS a sheet chooses from — the importance reasons, the confessions — by name, in the content language.
 * @param req - the request, whose Payload reads it as the contributor
 * @param collection - the list
 * @param locale - the content language
 * @returns every entry, its id and its name
 */
async function choiceList(
  req: PayloadRequest,
  collection: 'importance-reasons' | 'confessions',
  locale: 'fr' | 'en'
): Promise<RecordChoice[]> {
  const { docs } = await req.payload.find({
    collection,
    depth: 0,
    pagination: false,
    sort: 'name',
    locale,
    fallbackLocale: 'fr',
    overrideAccess: false,
    user: req.user,
    req,
  })
  return docs.map((entry) => ({ id: entry.id, name: entry.name }))
}

/**
 * The titles of the sources a sheet's lines cite, by id — for the form to show each line's source by name.
 * @param req - the request, whose Payload reads them
 * @param sheet - the sheet
 * @returns the titles, by id as text
 */
async function citedSourceNames(
  req: PayloadRequest,
  sheet: SheetDocument
): Promise<ReadonlyMap<string, string>> {
  const rows = Array.isArray(sheet.testimonies)
    ? (sheet.testimonies as Record<string, unknown>[])
    : []
  const ids = rows
    .map((row) => relationId(row.source))
    .filter((one): one is number | string => one !== null)
  if (ids.length === 0) return new Map()
  const { docs } = await req.payload.find({
    collection: 'sources',
    where: { id: { in: ids } },
    depth: 0,
    pagination: false,
    overrideAccess: false,
    user: req.user,
    req,
  })
  return new Map(docs.map((source) => [String(source.id), source.title]))
}

/**
 * The name of the title a sheet names as its holder (CMS-422 step 2c) — written by the server at each save of the
 * title, so always there. A title without one is refused here, loudly: shown empty, the field would be saved empty and
 * the sheet would lose its holder with no one seeing it.
 * @param req - the request, whose Payload reads it as the contributor
 * @param sheet - the sheet
 * @returns the title's name, or `null` when the sheet names no title
 * @throws {Error} when the title has no name
 */
async function holderTitleName(req: PayloadRequest, sheet: SheetDocument): Promise<string | null> {
  const id = relationId(sheet.holderTitle)
  if (id === null) return null
  const title = await req.payload.findByID({
    collection: 'titles',
    id,
    depth: 0,
    overrideAccess: false,
    user: req.user,
    req,
  })
  if (typeof title.label !== 'string' || title.label === '') {
    throw new Error(`[CMS] the title ${String(id)} a city sheet names as its holder has no name`)
  }
  return title.label
}
