import { holderTitleTexts } from '../utils/recordFieldTexts'

import { HolderChain } from './HolderChain'
import { RecordField } from './RecordField'
import { TextField } from './TextField'

import type { ChainReading } from '../utils/readVassalChain'
import type { Say } from '../utils/say'
import type { RecordChoice } from '../utils/sheetValues'

/**
 * « Tenue par »: the holder of the city at the sheet's date — **a title**, chosen among « Titres » by typing, its chain
 * of vassalage read under it (CMS-422 step 2c) — then the polity's name and Wikidata id as typed (CMS-335), what the
 * Cartographer's cities layer compares with the polity drawn under the city until 1100 is taken over into the titles
 * (step 3). All optional; an id needs its name.
 * @param props - the titles' search, the chain's reader and the translator
 * @param props.searchTitles - the titles matching what was typed, from the base
 * @param props.readChain - the chain of a title at a year, from the base
 * @param props.say - the translator
 * @returns the fields
 */
export function HolderFields({
  searchTitles,
  readChain,
  say,
}: {
  searchTitles: (query: string) => Promise<RecordChoice[]>
  readChain: (title: number | string, year: number) => Promise<ChainReading[]>
  say: Say
}) {
  return (
    <fieldset className="city-sheet__group">
      <legend className="city-sheet__legend">{say('holder')}</legend>
      <RecordField name="holderTitle" texts={holderTitleTexts(say)} search={searchTitles} />
      <HolderChain read={readChain} say={say} />
      <TextField name="holderName" label={say('lineHolder')} help={say('holderHelp')} />
      <TextField name="holderQid" label={say('holderQid')} help={say('holderQidHelp')} />
    </fieldset>
  )
}
