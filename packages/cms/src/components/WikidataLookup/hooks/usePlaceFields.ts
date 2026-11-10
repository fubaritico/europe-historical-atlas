import { useField, useForm } from '@payloadcms/ui'

import type { WikidataPlace } from '../../../wikidata/wikidataPlace'
import type { HistoricalMoment } from '@europe-historical-atlas/core/time/historicalDate'

/** The form's fields of one end of a date, in the order they are filled. */
const MOMENT_PARTS = ['year', 'month', 'day', 'circa', 'margin', 'calendar'] as const

/**
 * The place form's id, position and dates, filled from the item chosen — what Wikidata does not give is left as it is.
 * @returns how to fill them from a place
 */
export function usePlaceFields(): (place: WikidataPlace) => void {
  const location = useField<[number, number]>({ path: 'location' })
  const wikidata = useField<string>({ path: 'wikidata' })
  const { dispatchFields, setModified } = useForm()

  const fillMoment = (group: string, moment: HistoricalMoment): void => {
    for (const part of MOMENT_PARTS) {
      // The calendar keeps the form's default when Wikidata gives no day: it only matters for one.
      if (part === 'calendar' && moment.calendar === null) continue
      dispatchFields({ type: 'UPDATE', path: `${group}.${part}`, value: moment[part] })
    }
    setModified(true)
  }
  return (place: WikidataPlace): void => {
    wikidata.setValue(place.wikidata)
    if (place.coordinates !== null)
      location.setValue([place.coordinates.lon, place.coordinates.lat])
    if (place.existsFrom !== null) fillMoment('existsFrom', place.existsFrom)
    if (place.existsTo !== null) fillMoment('existsTo', place.existsTo)
  }
}
