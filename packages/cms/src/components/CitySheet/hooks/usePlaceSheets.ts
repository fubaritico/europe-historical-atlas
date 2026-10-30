import { useEffect, useState } from 'react'

import type { SavedSheet } from '../../../fields/sheetOverlap'

/** What the form knows of the chosen place's saved sheets. */
export type PlaceSheetsState =
  /** No place chosen, or its sheets not read yet. */
  | { kind: 'none' }
  /** Read. */
  | { kind: 'read'; place: number | string; sheets: SavedSheet[] }
  /** The read failed: the overlap is checked at save only, and the form says so. */
  | { kind: 'failed' }

/**
 * The chosen place's saved sheets, read again whenever the place changes — the newest place only: a read for a place
 * left behind is dropped. A failed read is said in the console and handed back as such, for the form to say it.
 * @param place - the chosen place's id, `null` when none
 * @param read - reads a place's sheets from the base
 * @returns what is known of them
 */
export function usePlaceSheets(
  place: number | string | null,
  read: (place: number | string) => Promise<SavedSheet[]>
): PlaceSheetsState {
  const [known, setKnown] = useState<PlaceSheetsState>({ kind: 'none' })

  useEffect(() => {
    let current = true
    setKnown({ kind: 'none' })
    if (place === null) return undefined
    read(place).then(
      (sheets) => {
        if (current) setKnown({ kind: 'read', place, sheets })
      },
      (error: unknown) => {
        if (!current) return
        console.error(
          "[CMS] the place's sheets could not be read; the overlap is checked at save",
          error
        )
        setKnown({ kind: 'failed' })
      }
    )
    return () => {
      current = false
    }
  }, [place, read])

  return known
}
