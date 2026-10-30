import { toast } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'

import { saveSheet } from '../utils/saveSheet'
import { sheetBody } from '../utils/sheetValues'

import type { Say } from '../utils/say'
import type { SheetValues } from '../utils/sheetValues'
import type { FormikHelpers } from 'formik'

/** Where the sheet is saved, and where the admin goes after. */
export interface SubmitTarget {
  /** The sheet's id; absent for a new one. */
  id?: number | string
  /** The API's root: `/api`. */
  api: string
  /** The admin's root: `/admin`. */
  admin: string
}

/**
 * The form's submission, as the dev decided it (2026-10-30): saved → a toast, and a new sheet opens at its own
 * address; refused by the server → its sentence at the top of the form, under the field it names, in a toast and in
 * the console; the server silent, or answering what is not Payload's → the same, in our words. What was typed is kept
 * either way.
 * @param target - the sheet's id and the routes
 * @param say - the translator
 * @returns Formik's `onSubmit`
 */
export function useSheetSubmit(target: SubmitTarget, say: Say) {
  const router = useRouter()
  const { id, api, admin } = target

  return async (values: SheetValues, helpers: FormikHelpers<SheetValues>) => {
    helpers.setStatus(undefined)
    try {
      const answer = await saveSheet(
        fetch,
        id === undefined ? { api } : { api, id },
        sheetBody(values)
      )
      if (answer.kind === 'saved') {
        toast.success(say('saved'))
        helpers.resetForm({ values })
        if (id === undefined) router.push(`${admin}/collections/place-periods/${String(answer.id)}`)
        else router.refresh()
        return
      }
      console.error(`[CMS] the city sheet was refused: ${answer.message}`)
      toast.error(answer.message)
      helpers.setStatus(answer.message)
      for (const field of answer.fields) {
        helpers.setFieldError(field.path, field.message)
        void helpers.setFieldTouched(field.path, true, false)
      }
    } catch (error) {
      // `fetch` rejects with a TypeError when nothing answered; anything else is an answer that was not Payload's
      const sentence = error instanceof TypeError ? say('unreachable') : say('serverFault')
      console.error('[CMS] the city sheet could not be saved', error)
      toast.error(sentence)
      helpers.setStatus(sentence)
    }
  }
}
