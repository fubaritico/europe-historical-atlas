import { useEffect, useRef, useState } from 'react'

import { failAddition, settleAddition } from '../utils/settleAddition'

import type { TerritoryAdded } from '../../../../persistence/cmsTerritory'
import type { AddToCmsOffer } from '../../../utils/addToCmsOffer'
import type { CmsChannel } from '../../../utils/cmsChannel'
import type { AddToCmsProps, PolityFormField } from '../../PolityForm'
import type { AdditionSink } from '../utils/settleAddition'

/**
 * « Ajouter au CMS » from the polity's dialogue (CARTO-498, the flow offline) — the binding: it sends the territory
 * through the channel, waits, and writes the number the CMS answered into the form's « Territoire du CMS », as a
 * choice in the list would (saved with the polity at OK, like every field of the dialogue).
 *
 * **What the author is told**: the outcome under the button — created, found, or why nothing was written; a session the
 * CMS refused also opens the session's dialogue, to sign in again (`channel.sessionLost`). A failure
 * of the dev server itself (the network, a throw) is a `console.error` and the same refusal on screen
 * (`rules/error-handling.md`).
 * @param channel - how the chrome reaches the CMS
 * @param offer - what the form offers, `addToCmsOffer`'s
 * @param onField - writes a field of the form
 * @returns what the form shows, or `null` online, where the chrome writes no CMS
 */
export function useAddToCms(
  channel: CmsChannel,
  offer: AddToCmsOffer,
  onField: (field: PolityFormField, value: string | null) => void
): AddToCmsProps | null {
  // Refs
  // Set again at each setup: StrictMode runs setup → cleanup → setup, and a flag only cleared would stay cleared
  const open = useRef(true)
  // The Wikidata item the form offers now: an answer for another item is not written on the polity (review QUAL-001)
  const offeredNow = useRef<string | null>(null)

  // State
  const [sending, setSending] = useState(false)
  const [outcome, setOutcome] = useState<TerritoryAdded | null>(null)

  // Derived
  const offered = offer.kind === 'ready' ? offer.territory.wikidata : null

  // Effects
  useEffect(() => {
    open.current = true
    return () => {
      open.current = false
    }
  }, [])
  useEffect(() => {
    offeredNow.current = offered
  }, [offered])

  // Return
  if (channel.mode === 'online') return null

  // Handlers
  const onAdd = () => {
    if (offer.kind !== 'ready' || sending) {
      console.warn(
        '[Cartographer] « Ajouter au CMS » declined: nothing ready to add, or a creation is on its way'
      )
      return
    }
    setSending(true)
    setOutcome(null)
    const sent = offer.territory.wikidata
    const sink: AdditionSink = {
      open: () => open.current,
      offeredNow: () => offeredNow.current,
      sessionLost: channel.sessionLost,
      onField,
      setSending,
      setOutcome,
    }
    channel.territories.add(offer.territory).then(
      (result) => {
        settleAddition(result, sent, sink)
      },
      (error: unknown) => {
        failAddition(error, sink)
      }
    )
  }

  // Return
  return { offer, sending, outcome, pageOf: channel.pageOf, onAdd }
}
