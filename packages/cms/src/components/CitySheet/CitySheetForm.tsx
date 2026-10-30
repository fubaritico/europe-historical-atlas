'use client'

import '@fubaritico/tokens/css'
import '@fubaritico/styles'
import './citySheet.css'

import { Button } from '@fubaritico/react/Button'
import { Form, Formik } from 'formik'
import { useCallback } from 'react'

import { createTranslator } from '@europe-historical-atlas/core/i18n/catalogue'

import { useOverlapCheck } from './hooks/useOverlapCheck'
import { useSheetSubmit } from './hooks/useSheetSubmit'
import { CITY_SHEET_MESSAGES } from './i18n'
import { ImportanceField } from './internal/ImportanceField'
import { MomentFields } from './internal/MomentFields'
import { PlaceField } from './internal/PlaceField'
import { PlaceSheets } from './internal/PlaceSheets'
import { searchPlaces } from './utils/searchPlaces'
import { validateSheet } from './utils/validateSheet'

import type { SheetValues } from './utils/sheetValues'
import type { Locale } from '@europe-historical-atlas/core/i18n/locale'

/** What the form is handed by its server half. */
export interface CitySheetFormProps {
  /** The sheet's values, empty for a new one. */
  readonly initialValues: SheetValues
  /** The sheet's id; absent for a new one. */
  readonly id?: number | string
  /** The admin's language, for every text. */
  readonly locale: Locale
  /** The content language, for the places' names. */
  readonly contentLocale: string
  /** The API's root: `/api`. */
  readonly api: string
  /** The admin's root: `/admin`. */
  readonly admin: string
}

/**
 * The « Ville à une date » form (ATLAS-295, `files/plans/atlas/city-sheet-screen.md`): Formik for its state, the rules
 * of `core`, the design system's fields. **Valid as it is typed**: an error shows only on a field already touched,
 * and the button stays greyed until every field is valid and something has changed (the dev: *« tant que tous les
 * champs ne sont pas valides, il n'y a pas de bouton ajouter »*). Saved through Payload's API, so the server's own
 * rules — the overlap among them — still hold behind it. A refusal or a silence of the server is said at the top of
 * the form, under the field it names, in a toast and in the console; what was typed is kept (the dev, 2026-10-30).
 * @param props - the values, the id, the languages and the routes
 * @param props.initialValues - the sheet's values
 * @param props.id - the sheet's id, absent for a new one
 * @param props.locale - the admin's language
 * @param props.contentLocale - the content language
 * @param props.api - the API's root
 * @param props.admin - the admin's root
 * @returns the form
 */
export function CitySheetForm({
  initialValues,
  id,
  locale,
  contentLocale,
  api,
  admin,
}: CitySheetFormProps) {
  const say = createTranslator(CITY_SHEET_MESSAGES, locale)
  const handleSubmit = useSheetSubmit(id === undefined ? { api, admin } : { id, api, admin }, say)

  // Handlers
  const search = useCallback(
    (query: string) => searchPlaces(fetch, { api, locale: contentLocale }, query),
    [api, contentLocale]
  )
  const overlap = useOverlapCheck(api, locale, id)
  const validate = (values: SheetValues) =>
    validateSheet(values, say, overlap.current(values.place?.id ?? null))

  // Render
  return (
    <Formik
      initialValues={initialValues}
      validate={validate}
      validateOnMount
      onSubmit={handleSubmit}
    >
      {({ isValid, dirty, isSubmitting, status }) => (
        <Form className="city-sheet" noValidate>
          {typeof status === 'string' && (
            <p className="city-sheet__status" role="alert">
              {status}
            </p>
          )}
          <PlaceField search={search} say={say} />
          <PlaceSheets read={overlap.read} onSheets={overlap.onSheets} say={say} />
          <fieldset className="city-sheet__date">
            <legend className="city-sheet__legend">{say('date')}</legend>
            <p className="city-sheet__help">{say('dateHelp')}</p>
            <MomentFields end="start" title={say('start')} say={say} />
            <MomentFields end="end" title={say('end')} help={say('endHelp')} say={say} />
          </fieldset>
          <ImportanceField say={say} />
          <div className="city-sheet__actions">
            <Button type="submit" disabled={!isValid || !dirty || isSubmitting}>
              {isSubmitting ? say('saving') : id === undefined ? say('create') : say('save')}
            </Button>
          </div>
        </Form>
      )}
    </Formik>
  )
}
