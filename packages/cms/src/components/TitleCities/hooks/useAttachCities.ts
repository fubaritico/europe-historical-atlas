import { toast } from '@payloadcms/ui'
import { useRef, useState } from 'react'

import { attachClient } from '../utils/attachClient'
import { resultsSummary } from '../utils/resultSentence'

import type { AttachResult } from '../../../titles/attachCities'
import type { ValueWithRelation } from 'payload'

/** What the block holds and does. */
export interface AttachCitiesState {
  /** The cities chosen, as Payload's field holds them. */
  readonly places: ValueWithRelation[]
  /** Choose the cities. */
  readonly setPlaces: (places: ValueWithRelation[]) => void
  /** What became of each city at the last attachment. */
  readonly results: AttachResult[]
  /** Whether an attachment runs. */
  readonly running: boolean
  /** Attach the cities chosen at a year. */
  readonly attach: (year: number) => Promise<void>
}

/**
 * The state of a title's block of cities, and its one gesture (CMS-507): attach the cities chosen at a year. A second
 * click before the screen greys the button is held by a ref and said on the console; the answer clears the choice,
 * lists each city's result and says the whole in a toast — or says the refusal.
 * @param title - the title, by id
 * @returns the state and the gesture
 */
export function useAttachCities(title: number | string): AttachCitiesState {
  const [places, setPlaces] = useState<ValueWithRelation[]>([])
  const [results, setResults] = useState<AttachResult[]>([])
  const [running, setRunning] = useState(false)
  const inFlight = useRef(false)

  const attach = async (year: number) => {
    if (inFlight.current) {
      console.warn('[CMS] « Rattacher » clicked while an attachment runs: ignored')
      return
    }
    inFlight.current = true
    setRunning(true)
    try {
      const answer = await attachClient(
        title,
        year,
        places.map((place) => place.value)
      )
      if (!answer.ok) {
        toast.error(answer.message)
        return
      }
      setResults(answer.results)
      setPlaces([])
      toast.success(resultsSummary(answer.results))
    } finally {
      inFlight.current = false
      setRunning(false)
    }
  }

  return { places, setPlaces, results, running, attach }
}
