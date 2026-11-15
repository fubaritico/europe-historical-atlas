import { useFormikContext } from 'formik'

import { HolderChain } from './HolderChain'
import { RelationField } from './RelationField'

import type { ChainReading } from '../utils/readVassalChain'
import type { LinkAnswer, NewVassalLink } from '../utils/saveVassalLink'
import type { Say } from '../utils/say'
import type { SheetValues } from '../utils/sheetValues'

/**
 * « Tenue par » (CMS-422, the dev's mock-up of 2026-11-15 and his words of 2026-11-16): **one** field, the holder of
 * the city at the sheet's date — a title, shown by its name « Mathias II, comte de Nantes », chosen with Payload's own
 * relationship field, or created by its « + » in a drawer whose person and territory have their own « + ». Under it,
 * the chain of vassalage, one line « Vassal de » per link, built by « ⊕ ».
 *
 * The polity typed by name and its Wikidata id (CMS-335) are off the screen and kept in the base: the export reads
 * them for a city with no title yet, until 1100 is taken over into the titles (step 3).
 * @param props - the chain's reader, the link's writer and the translator
 * @param props.readChain - the chain of a title at a year, from the base
 * @param props.saveLink - saves a link of vassalage
 * @param props.say - the translator
 * @returns the fields
 */
export function HolderFields({
  readChain,
  saveLink,
  say,
}: {
  readChain: (title: number | string, year: number) => Promise<ChainReading[]>
  saveLink: (link: NewVassalLink) => Promise<LinkAnswer>
  say: Say
}) {
  const { values, setFieldValue, setFieldTouched } = useFormikContext<SheetValues>()

  // Handlers
  const handleChange = (id: number | string | null) => {
    void setFieldValue('holderTitle', id)
    void setFieldTouched('holderTitle', true, false)
  }

  // Render
  return (
    <fieldset className="city-sheet__group">
      <legend className="city-sheet__legend">{say('holder')}</legend>
      <RelationField
        path="holderTitle"
        collection="titles"
        label={say('holderTitle')}
        description={say('holderTitleHelp')}
        value={values.holderTitle}
        onChange={handleChange}
      />
      <HolderChain read={readChain} saveLink={saveLink} say={say} />
    </fieldset>
  )
}
