import { useEffect } from 'react'

import { writeResult } from '../../../utils/statusBar'

import type { ResultRelay } from '../../../../persistence/resultRelay'
import type { RefObject } from 'react'

/**
 * Put what the relay says into the status bar's result zone, for as long as the component is mounted.
 *
 * The result zone is a node what is built at the composition root cannot reach — it exists before any
 * component — so that code says into a relay and this attaches the writer (`persistence/resultRelay.ts`).
 * The writer reads the ref at each message rather than capturing the node, so a message arriving before
 * the node is attached is not written into nothing.
 * @param results - the relay
 * @param resultZone - the ref holding the result zone's node
 */
export function useRelayedResults(
  results: ResultRelay,
  resultZone: RefObject<HTMLElement | null>
): void {
  // Effects
  useEffect(
    () =>
      results.attach((message) => {
        writeResult(resultZone.current, message)
      }),
    [results, resultZone]
  )
}
