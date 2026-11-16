import { FormRelationField } from './FormRelationField'
import { HolderChain } from './HolderChain'

import type { ChainWriters } from './HolderChain'
import type { ChainReading } from '../utils/readVassalChain'
import type { Say } from '../utils/say'

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
 * @param props.writers - what the chain writes to the base
 * @param props.say - the translator
 * @returns the fields
 */
export function HolderFields({
  readChain,
  writers,
  say,
}: {
  readChain: (title: number | string, year: number) => Promise<ChainReading[]>
  writers: ChainWriters
  say: Say
}) {
  // Render
  return (
    <fieldset className="city-sheet__group">
      <legend className="city-sheet__legend">{say('holder')}</legend>
      <FormRelationField
        name="holderTitle"
        collection="titles"
        label={say('holderTitle')}
        description={say('holderTitleHelp')}
      />
      <HolderChain read={readChain} writers={writers} say={say} />
    </fieldset>
  )
}
