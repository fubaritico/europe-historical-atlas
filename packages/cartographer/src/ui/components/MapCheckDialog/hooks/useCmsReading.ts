import { useRef, useState } from 'react'

import { useTranslation } from '../../../hooks/useTranslation'
import { MAP_CHECK_MESSAGES } from '../i18n'
import { settleReading } from '../utils/settleReading'

import type { CartographerStoreHook } from '../../../../state/store'
import type { CmsChannel } from '../../../utils/cmsChannel'
import type { MapCheckPhase } from '../mapCheckPhase'
import type { ReadingSink } from '../utils/settleReading'

/**
 * [Check this year]'s reading of the CMS (CARTO-568): at the press, never in an effect — one reading a press, whatever
 * StrictMode replays; what is read replaces the store's territories, so the form's « Territoire du CMS » and its locks
 * read the same list as the check. A reading answered after the dialogue was closed, or after a newer press, is dropped
 * (`settleReading`); the dev server gone is a `console.error` and the CMS's refusal on screen.
 * @param store - the store the territories are written to
 * @param channel - how the chrome reaches the CMS — online, a press is declined, said
 * @returns where the check stands, the press and the closing
 */
export function useCmsReading(
  store: CartographerStoreHook,
  channel: CmsChannel
): { phase: MapCheckPhase; start: () => void; close: () => void } {
  // Context
  const t = useTranslation(MAP_CHECK_MESSAGES)

  // Refs
  const press = useRef(0)

  // State
  const [phase, setPhase] = useState<MapCheckPhase>('closed')

  // Handlers
  const close = (): void => {
    press.current += 1
    setPhase('closed')
  }
  const start = (): void => {
    if (channel.mode === 'online') {
      console.warn('[Cartographer] [Check this year] declined: online, the chrome reads no CMS')
      return
    }
    press.current += 1
    const mine = press.current
    const sink: ReadingSink = {
      current: () => mine === press.current,
      read: (territories) => {
        store.getState().setTerritories(territories)
        setPhase('read')
      },
      close,
      sessionLost: channel.sessionLost,
      report: channel.report,
      words: { offline: t('cmsOffline'), refused: (reason) => t('cmsRefused', { reason }) },
    }
    setPhase('reading')
    channel.territories.list().then(
      (read) => {
        settleReading(read, sink)
      },
      (error: unknown) => {
        console.error('[Cartographer] [Check this year]: the dev server failed', error)
        const reason = error instanceof Error ? error.message : String(error)
        settleReading({ kind: 'refused', reason }, sink)
      }
    )
  }

  // Return
  return { phase, start, close }
}
