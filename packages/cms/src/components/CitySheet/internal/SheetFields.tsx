import { placeTexts } from '../utils/recordFieldTexts'

import { ImportanceField } from './ImportanceField'
import { MomentFields } from './MomentFields'
import { PlaceSheets } from './PlaceSheets'
import { ReasonsField } from './ReasonsField'
import { RecordField } from './RecordField'
import { TestimoniesField } from './TestimoniesField'

import type { OverlapWiring } from '../hooks/useOverlapCheck'
import type { RecordSearches } from '../hooks/useRecordSearches'
import type { Say } from '../utils/say'
import type { RecordChoice } from '../utils/sheetValues'

/**
 * Every field of the sheet, in the order it is entered: the place, the date, the importance, the reasons, the lines
 * of the sources.
 * @param props - the searches, the overlap's wiring, the reasons and the translator
 * @param props.searches - the searches of the places and the sources
 * @param props.overlap - the overlap rule's wiring, fed the chosen place's sheets
 * @param props.reasons - every reason of the CMS's list
 * @param props.say - the translator
 * @returns the fields
 */
export function SheetFields({
  searches,
  overlap,
  reasons,
  say,
}: {
  searches: RecordSearches
  overlap: OverlapWiring
  reasons: readonly RecordChoice[]
  say: Say
}) {
  return (
    <>
      <RecordField name="place" texts={placeTexts(say)} search={searches.places} />
      <PlaceSheets read={overlap.read} onSheets={overlap.onSheets} say={say} />
      <fieldset className="city-sheet__date">
        <legend className="city-sheet__legend">{say('date')}</legend>
        <p className="city-sheet__help">{say('dateHelp')}</p>
        <MomentFields end="start" title={say('start')} say={say} />
        <MomentFields end="end" title={say('end')} help={say('endHelp')} say={say} />
      </fieldset>
      <ImportanceField say={say} />
      <ReasonsField reasons={reasons} say={say} />
      <TestimoniesField reasons={reasons} searchSources={searches.sources} say={say} />
    </>
  )
}
