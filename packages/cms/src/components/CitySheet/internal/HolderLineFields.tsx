import { ByDistrictField } from './ByDistrictField'
import { TextField } from './TextField'

import type { Say } from '../utils/say'

/**
 * The value of a line about the holder (CMS-335): the polity the source names, its Wikidata id when it has one, and
 * the name as the source writes it (CMS-422 — the identity is a claim, kept beside the reading).
 * @param props - the line's path and the translator
 * @param props.path - the line's path in the form's values, `testimonies.0`
 * @param props.say - the translator
 * @returns the three fields
 */
export function HolderLineFields({ path, say }: { path: string; say: Say }) {
  return (
    <>
      <TextField
        name={`${path}.holderName`}
        label={say('lineHolder')}
        help={say('lineHolderHelp')}
      />
      <TextField
        name={`${path}.holderQid`}
        label={say('holderQid')}
        help={say('lineHolderQidHelp')}
      />
      <TextField
        name={`${path}.holderAsWritten`}
        label={say('lineHolderAsWritten')}
        help={say('lineHolderAsWrittenHelp')}
      />
      <ByDistrictField name={`${path}.byDistrict`} say={say} />
    </>
  )
}
