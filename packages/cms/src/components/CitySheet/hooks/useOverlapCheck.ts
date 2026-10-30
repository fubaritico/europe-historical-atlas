import { useCallback, useRef } from 'react'

import { createTranslator } from '@europe-historical-atlas/core/i18n/catalogue'
import { formatHistoricalDate } from '@europe-historical-atlas/core/time/formatHistoricalDate'

import { COLLECTION_MESSAGES } from '../../../collections/i18n'
import { fetchPlaceSheets } from '../utils/fetchPlaceSheets'

import type { PlaceSheetsState } from './usePlaceSheets'
import type { SavedSheet } from '../../../fields/sheetOverlap'
import type { OverlapCheck } from '../utils/validateSheet'
import type { Locale } from '@europe-historical-atlas/core/i18n/locale'

/** What the form needs to play the overlap rule while typing. */
export interface OverlapWiring {
  /** Reads a place's saved sheets from the base. */
  read: (place: number | string) => Promise<SavedSheet[]>
  /** Keeps what is known of the chosen place's sheets, for the next validation. */
  onSheets: (known: PlaceSheetsState) => void
  /**
   * The overlap check for the place chosen now: absent until its sheets are read — never the sheets of a place just
   * left, read for another one.
   */
  current: (place: number | string | null) => OverlapCheck | undefined
}

/**
 * The overlap rule's wiring: the read, where its answer is kept, and the check the validation plays — in the
 * server's own words (`collections/i18n`, `overlap`), so the sentence while typing is the sentence at save.
 * @param api - the API's root
 * @param locale - the admin's language
 * @param ownId - this sheet's id, absent for a new one
 * @returns the read, the keeper and the check
 */
export function useOverlapCheck(
  api: string,
  locale: Locale,
  ownId: number | string | undefined
): OverlapWiring {
  const known = useRef<PlaceSheetsState>({ kind: 'none' })
  const read = useCallback((place: number | string) => fetchPlaceSheets(fetch, api, place), [api])
  const onSheets = useCallback((sheets: PlaceSheetsState) => {
    known.current = sheets
  }, [])
  const current = (place: number | string | null): OverlapCheck | undefined => {
    const sheets = known.current
    if (sheets.kind !== 'read' || place === null || String(sheets.place) !== String(place))
      return undefined
    const say = createTranslator(COLLECTION_MESSAGES, locale)
    return {
      saved: sheets.sheets,
      ...(ownId === undefined ? {} : { ownId }),
      refusal: (place, date) => say('overlap', { place, date: formatHistoricalDate(date, locale) }),
    }
  }
  return { read, onSheets, current }
}
