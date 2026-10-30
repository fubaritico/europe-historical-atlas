import { pickLocale } from '@europe-historical-atlas/core/i18n/locale'

import { relationId } from '../../fields/relationId'

import { CitySheetForm } from './CitySheetForm'
import { sheetValues } from './utils/sheetValues'

import type { SheetDocument } from './utils/sheetValues'
import type { DocumentViewServerProps } from 'payload'

/**
 * The server half of the « Ville à une date » screen, in place of Payload's form
 * (`admin.components.views.edit.default`): Payload keeps the document's header and its tabs around it. It reads the
 * sheet's place name, in the content language, and hands the client form its values, its id and its routes.
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
          req,
        })
  const id = relationId(sheet.id)
  const { api, admin } = req.payload.config.routes
  return (
    // Keyed by the sheet: Formik reads its initial values once, so another sheet in the same view gets a new form
    <CitySheetForm
      key={id === null ? 'new' : String(id)}
      initialValues={sheetValues(sheet, place?.name ?? null)}
      {...(id === null ? {} : { id })}
      locale={pickLocale([req.i18n.language])}
      contentLocale={contentLocale}
      api={api}
      admin={admin}
    />
  )
}
