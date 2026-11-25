import { useTranslation } from '../../hooks/useTranslation'
import { DocTab } from '../DocTab'

import { DOC_TABS_MESSAGES } from './i18n'

import type { DocTabEntry } from '../DocTab'
import type { Ref } from 'react'

/** What the list of tabs shows and does. */
export interface DocTabsProps {
  /** The maps open, each its tab — one today, the map shown; several maps open at once is to be built. */
  tabs: readonly DocTabEntry[]
  /** Where the zoom is written, outside React — on the active tab. */
  zoomRef: Ref<HTMLSpanElement>
  /**
   * Show a map — a click on its tab.
   * @param id - the map
   */
  onActivate: (id: string) => void
  /**
   * Close a map — its tab's cross.
   * @param id - the map
   */
  onClose: (id: string) => void
}

/**
 * The tabs of the maps open, at the left of the document bar (CARTO-556), as Illustrator lines its documents up: a
 * `role="tablist"`, one {@link DocTab} per map, the zoom written on the active one.
 * @param props - the tabs, where the zoom goes, and the two gestures
 * @param props.tabs - the maps open
 * @param props.zoomRef - where the zoom is written
 * @param props.onActivate - show a map
 * @param props.onClose - close a map
 * @returns the list
 */
export function DocTabs({ tabs, zoomRef, onActivate, onClose }: DocTabsProps) {
  // Context
  const t = useTranslation(DOC_TABS_MESSAGES)

  // Render
  return (
    <div className="doc-tabs" role="tablist" aria-label={t('tabs')}>
      {tabs.map((tab) => (
        <DocTab
          key={tab.id}
          {...tab}
          {...(tab.active ? { zoomRef } : {})}
          onActivate={onActivate}
          onClose={onClose}
        />
      ))}
    </div>
  )
}
