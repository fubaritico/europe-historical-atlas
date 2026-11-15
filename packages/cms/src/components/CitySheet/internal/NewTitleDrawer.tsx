import { toast, useDocumentDrawer } from '@payloadcms/ui'
import { useFormikContext } from 'formik'

import { sheetYear } from '../utils/sheetYear'

import type { Say } from '../utils/say'
import type { SheetValues } from '../utils/sheetValues'

/** What Payload's drawer hands back once the title is saved — its id and the name the server wrote. */
interface SavedTitle {
  /** Its id. */
  readonly id: number | string
  /** Its name, written by the server at the save (`writeTitleLabel`). */
  readonly label?: unknown
}

/**
 * « Créer un titre » (CMS-422 step 2c, the dev's choice of 2026-11-15: Payload's own drawer, not a form of ours): the
 * collection « Titres »'s creation form slides in over the sheet, its person and its territory each with their own
 * « + » for one not entered yet — the creation page itself, never a copy that would drift from it. The sheet's year
 * comes filled in; once saved, the title is the sheet's holder and its chain reads under it.
 *
 * A title saved without its name — the server writes it at each save, so this is a defect — is said in a toast and
 * the console, and nothing is chosen: an unnamed holder would show empty and be lost at the next save.
 * @param props - the translator
 * @param props.say - the translator
 * @returns the button and its drawer, or nothing while a title is chosen
 */
export function NewTitleDrawer({ say }: { say: Say }) {
  const { values, setFieldValue, setFieldTouched } = useFormikContext<SheetValues>()
  const [Drawer, Toggler, { closeDrawer }] = useDocumentDrawer({ collectionSlug: 'titles' })
  const year = sheetYear(values.date.start.year)

  // Handlers
  const handleSave = ({ doc }: { doc: SavedTitle }) => {
    closeDrawer()
    if (typeof doc.label !== 'string' || doc.label === '') {
      console.error(`[CMS] the title ${String(doc.id)} was saved without its name`)
      toast.error(say('newTitleUnnamed'))
      return
    }
    void setFieldValue('holderTitle', { id: doc.id, name: doc.label })
    void setFieldTouched('holderTitle', true, false)
  }

  // Render
  if (values.holderTitle !== null) return null
  return (
    <div className="city-sheet__new-title">
      {/* Its visible words as its name: Payload's own (« Ajouter Titre ») would hide them from voice control */}
      <Toggler className="city-sheet__link-button" aria-label={say('newTitle')}>
        {say('newTitle')}
      </Toggler>
      <Drawer
        {...(year === null ? {} : { initialData: { date: { start: { year } } } })}
        onSave={handleSave}
      />
    </div>
  )
}
