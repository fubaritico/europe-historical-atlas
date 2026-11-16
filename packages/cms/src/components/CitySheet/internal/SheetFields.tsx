import { placeTexts } from '../utils/recordFieldTexts'

import { CommunitiesField } from './CommunitiesField'
import { HolderFields } from './HolderFields'
import { ImportanceField } from './ImportanceField'
import { MomentFields } from './MomentFields'
import { PlaceSheets } from './PlaceSheets'
import { ReasonsField } from './ReasonsField'
import { RecordField } from './RecordField'
import { ShowInAtlasField } from './ShowInAtlasField'
import { TestimoniesField } from './TestimoniesField'

import type { OverlapWiring } from '../hooks/useOverlapCheck'
import type { RecordSearches } from '../hooks/useRecordSearches'
import type { ChainReading } from '../utils/readVassalChain'
import type { LinkAnswer, NewVassalLink } from '../utils/saveVassalLink'
import type { Say } from '../utils/say'
import type { SheetLists } from '../utils/sheetValues'

/**
 * Every field of the sheet, in the order it is entered — **first whether the atlas shows it** (the dev, 2026-11-08:
 * *"it should be at the very top, here it is drowned in the form"*), then the place, the date, the importance, the
 * reasons, who held it and the chain above them, its religious communities (CMS-433), the lines of the sources.
 * @param props - the searches, the chain's reader and the link's writer, the overlap's wiring, the CMS's lists and the translator
 * @param props.searches - the searches of the places and the sources
 * @param props.readChain - the chain of vassalage of a title at a year, from the base
 * @param props.saveLink - saves a link of vassalage
 * @param props.overlap - the overlap rule's wiring, fed the chosen place's sheets
 * @param props.lists - every reason and every confession of the CMS
 * @param props.say - the translator
 * @returns the fields
 */
export function SheetFields({
  searches,
  readChain,
  saveLink,
  overlap,
  lists,
  say,
}: {
  searches: RecordSearches
  readChain: (title: number | string, year: number) => Promise<ChainReading[]>
  saveLink: (link: NewVassalLink) => Promise<LinkAnswer>
  overlap: OverlapWiring
  lists: SheetLists
  say: Say
}) {
  return (
    <>
      <ShowInAtlasField say={say} />
      <RecordField name="place" texts={placeTexts(say)} search={searches.places} />
      <PlaceSheets read={overlap.read} onSheets={overlap.onSheets} say={say} />
      <fieldset className="city-sheet__date">
        <legend className="city-sheet__legend">{say('date')}</legend>
        <p className="city-sheet__help">{say('dateHelp')}</p>
        <MomentFields end="start" title={say('start')} say={say} />
        <MomentFields end="end" title={say('end')} help={say('endHelp')} say={say} />
      </fieldset>
      <ImportanceField say={say} />
      <ReasonsField reasons={lists.reasons} say={say} />
      <HolderFields readChain={readChain} saveLink={saveLink} say={say} />
      <CommunitiesField confessions={lists.confessions} say={say} />
      <TestimoniesField lists={lists} say={say} />
    </>
  )
}
