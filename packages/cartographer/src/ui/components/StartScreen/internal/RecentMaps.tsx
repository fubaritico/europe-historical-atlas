import { Button } from '@fubaritico/react/Button'

import { persistenceWords } from '../../../../persistence/persistenceWords'
import { timeWords } from '../../../../persistence/timeWords'
import { useLocale } from '../../../hooks/useLocale'
import { useTranslation } from '../../../hooks/useTranslation'
import { START_SCREEN_MESSAGES } from '../i18n'
import { recentMaps } from '../utils/recentMaps'

import { RecentMapRow } from './RecentMapRow'

import type { DatedMap } from '../../../../persistence/yearArchive'

/** The maps, as they are being read. */
export type RecentListing =
  { state: 'reading' } | { state: 'failed' } | { state: 'read'; maps: readonly DatedMap[] }

/** What the list shows and does. */
export interface RecentMapsProps {
  /** The maps, or where their reading stands. */
  listing: RecentListing
  /** The clock the dates are worded against — « aujourd’hui à 20:41 ». */
  now: () => Date
  /**
   * Open a map — a click on its row.
   * @param map - the map's name
   */
  onOpenMap: (map: string) => void
  /** Read the maps again, after a failure. */
  onRetry: () => void
}

/**
 * The last maps of the start screen (CARTO-536): one button per map, its name and when it was last written, the newest
 * first — or why there is none.
 * @param props - the listing, the clock, and what a row and « Réessayer » do
 * @param props.listing - the maps, or where their reading stands
 * @param props.now - the clock
 * @param props.onOpenMap - open a map
 * @param props.onRetry - read again
 * @returns the list, or its note
 */
export function RecentMaps({ listing, now, onOpenMap, onRetry }: RecentMapsProps) {
  // Context
  const t = useTranslation(START_SCREEN_MESSAGES)
  const locale = useLocale()

  // Derived
  const maps = listing.state === 'read' ? recentMaps(listing.maps) : []
  const words = persistenceWords(locale)

  // Render
  if (listing.state === 'reading')
    return (
      <p className="start-screen__note" role="status">
        {t('reading')}
      </p>
    )
  if (listing.state === 'failed')
    return (
      <div className="start-screen__note" role="alert">
        <p>{t('failed')}</p>
        <Button type="button" variant="secondary" onClick={onRetry}>
          {t('retry')}
        </Button>
      </div>
    )
  if (maps.length === 0)
    return (
      <p className="start-screen__note" role="status">
        {t('empty')}
      </p>
    )
  return (
    <ul className="start-screen__recent" aria-label={t('recent')}>
      {maps.map((map) => (
        <RecentMapRow
          key={map.name}
          map={map.name}
          when={timeWords(new Date(map.changedAt).toISOString(), now(), words)}
          onOpenMap={onOpenMap}
        />
      ))}
    </ul>
  )
}
