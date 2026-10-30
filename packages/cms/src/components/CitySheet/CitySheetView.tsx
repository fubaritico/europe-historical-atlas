import { pickLocale } from '@europe-historical-atlas/core/i18n/locale'

import { relationId } from '../../fields/relationId'

import { CitySheetForm } from './CitySheetForm'
import { sheetValues } from './utils/sheetValues'

import type { SheetDocument } from './utils/sheetValues'
import type { DocumentViewServerProps, PayloadRequest } from 'payload'

/**
 * The server half of the « Ville à une date » screen, in place of Payload's form
 * (`admin.components.views.edit.default`): Payload keeps the document's header and its tabs around it. It reads the
 * sheet's place name, in the content language, the reasons' list and the titles of the sources its lines cite, and
 * hands the client form its values, its id, the reasons and its routes. Every read runs as the contributor
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
  const reasons = await req.payload.find({
    collection: 'importance-reasons',
    depth: 0,
    pagination: false,
    sort: 'name',
    locale: contentLocale,
    fallbackLocale: 'fr',
    overrideAccess: false,
    user: req.user,
    req,
  })
  const sourceNames = await citedSourceNames(req, sheet)
  const id = relationId(sheet.id)
  const { api, admin } = req.payload.config.routes
  return (
    // Keyed by the sheet: Formik reads its initial values once, so another sheet in the same view gets a new form
    <CitySheetForm
      key={id === null ? 'new' : String(id)}
      initialValues={sheetValues(sheet, place?.name ?? null, sourceNames)}
      reasons={reasons.docs.map((reason) => ({ id: reason.id, name: reason.name }))}
      {...(id === null ? {} : { id })}
      locale={pickLocale([req.i18n.language])}
      contentLocale={contentLocale}
      api={api}
      admin={admin}
    />
  )
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
