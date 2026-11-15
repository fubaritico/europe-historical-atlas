import { useDocumentDrawer } from '@payloadcms/ui'

import type { Say } from '../utils/say'
import type { RecordChoice } from '../utils/sheetValues'

/**
 * « Ajouter son suzerain » (CMS-422 step 2c; the dev's mock-up, « Vassal de ⊕ »): at the top of a reading that stops
 * for want of a link, the collection « Maillons »'s creation form slides in over the sheet, in Payload's own drawer —
 * its vassal the title the chain stopped at, its year the sheet's; the suzerain chosen there, or created with its own
 * « + ». The link is entered once and serves every place under that title (`vassal-chain.md`, rule 2); once saved,
 * the chain is read again.
 * @param props - the title the chain stopped at, the sheet's year, what to do once saved, the translator
 * @param props.vassal - the title at the top of the reading
 * @param props.year - the sheet's year
 * @param props.onAdded - called once the link is saved, for the chain to be read again
 * @param props.say - the translator
 * @returns the button and its drawer
 */
export function AddLinkDrawer({
  vassal,
  year,
  onAdded,
  say,
}: {
  vassal: RecordChoice
  year: number
  onAdded: () => void
  say: Say
}) {
  const [Drawer, Toggler, { closeDrawer }] = useDocumentDrawer({ collectionSlug: 'vassal-links' })

  // Handlers
  const handleSave = () => {
    closeDrawer()
    onAdded()
  }

  // Render
  return (
    <>
      {/* Its visible words inside its name, with the title it is for: several readings may each have one */}
      <Toggler
        className="city-sheet__link-button"
        aria-label={say('addSuzerainOf', { name: vassal.name })}
      >
        {say('addSuzerain')}
      </Toggler>
      <Drawer
        initialData={{ vassal: vassal.id, answersTo: 'suzerain', date: { start: { year } } }}
        onSave={handleSave}
      />
    </>
  )
}
