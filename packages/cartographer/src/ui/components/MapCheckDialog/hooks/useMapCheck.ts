import { alignMap } from '@europe-historical-atlas/core/data/cmsAlignment'

import { useTranslation } from '../../../hooks/useTranslation'
import { MAP_CHECK_MESSAGES } from '../i18n'
import { alignRows } from '../utils/alignRows'

import { useCmsReading } from './useCmsReading'

import type { CartographerStoreHook } from '../../../../state/store'
import type { CmsChannel } from '../../../utils/cmsChannel'
import type { MapCheckPhase } from '../mapCheckPhase'
import type { MapAlignment, TiedPolity } from '@europe-historical-atlas/core/data/cmsAlignment'

/** What [Check this year] hands its dialogue and its button. */
export interface MapCheck {
  /** Where it stands. */
  phase: MapCheckPhase
  /** The map against the CMS, once read; `null` before. */
  alignment: MapAlignment | null
  /** Press [Check this year]: read the CMS, then show the groups. */
  start: () => void
  /** Close the dialogue. */
  close: () => void
  /** Align every polity tied by number and apart from the CMS, as one step. */
  alignAll: () => void
  /**
   * Align one polity tied by its Wikidata item only — the author's confirmation.
   * @param id - the polity's id
   */
  alignOne: (id: string) => void
  /**
   * Close the dialogue and open a polity's form.
   * @param id - the polity's id
   */
  openPolity: (id: string) => void
}

/**
 * [Check this year] against the CMS (CARTO-568, `s10`): the binding — the reading (`useCmsReading`), the groups worked
 * out at each render from the document and the territories, and the alignments. An alignment the document refuses is a
 * `console.error` and the alarm dialogue (`rules/error-handling.md`).
 * @param store - the store the document and the territories are read from, and the alignment written to
 * @param channel - how the chrome reaches the CMS — online, the button is not offered and a press is declined
 * @returns the check
 */
export function useMapCheck(store: CartographerStoreHook, channel: CmsChannel): MapCheck {
  // Store
  store((state) => state.version)
  const territories = store((state) => state.territories)

  // Context
  const t = useTranslation(MAP_CHECK_MESSAGES)

  // State
  const { phase, start, close } = useCmsReading(store, channel)

  // Derived
  const alignment =
    phase === 'read' ? alignMap(store.getState().document.polities, territories) : null

  // Handlers
  const align = (rows: readonly TiedPolity[]): void => {
    const label = (count: number, name: string) => t('alignStep', { count, name })
    if (alignRows(store.getState(), rows, label)) return
    console.error(`[Cartographer] the document refused to align ${String(rows.length)} polities`)
    // Online the dialogue never opens (`start`), so the alarm has the offline channel's report to go through
    if (channel.mode === 'offline')
      channel.report({ tone: 'alarm', topic: 'cms', text: t('alignRefused') })
  }
  const alignAll = (): void => {
    align(alignment?.toAlign ?? [])
  }
  const alignOne = (id: string): void => {
    align(alignment?.toConfirm.filter((row) => row.id === id) ?? [])
  }
  const openPolity = (id: string): void => {
    close()
    store.getState().openPolityForm(id)
  }

  // Return
  return { phase, alignment, start, close, alignAll, alignOne, openPolity }
}
