import { TextField } from './TextField'

import type { Say } from '../utils/say'

/**
 * « Tenue par » (CMS-335): the polity that held the city at the sheet's date, by its name and its Wikidata id — what
 * the Cartographer's cities layer compares with the polity drawn under the city. Both optional; an id needs its name.
 * @param props - the translator
 * @param props.say - the translator
 * @returns the two fields
 */
export function HolderFields({ say }: { say: Say }) {
  return (
    <fieldset className="city-sheet__group">
      <legend className="city-sheet__legend">{say('holder')}</legend>
      <TextField name="holderName" label={say('lineHolder')} help={say('holderHelp')} />
      <TextField name="holderQid" label={say('holderQid')} help={say('holderQidHelp')} />
    </fieldset>
  )
}
