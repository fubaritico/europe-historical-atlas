import { useEffect, useState } from 'react'

import { useTranslation } from '../../hooks/useTranslation'

import { START_SCREEN_MESSAGES } from './i18n'
import { RecentMaps } from './internal/RecentMaps'
import { StartSide } from './internal/StartSide'

import type { RecentListing } from './internal/RecentMaps'
import type { DatedMapList } from '../../../persistence/yearArchive'

/** What the start screen needs. */
export interface StartScreenProps {
  /** Where the maps and their dates are read — the folders of `years/`. */
  maps: DatedMapList
  /** The clock the dates are worded against. */
  now: () => Date
  /** « Nouvelle carte… »: a year and a name, then an empty map. */
  onNewMap: () => void
  /** « Ouvrir… »: the dialogue of every map, the automatic saves included. */
  onOpen: () => void
  /**
   * Open one of the last maps.
   * @param map - the map's name
   */
  onOpenMap: (map: string) => void
}

/**
 * The start screen (CARTO-536), Illustrator's — the dev's capture of 2026-11-25, and his word: *« comme Illustrator »*.
 * What the Cartographer shows once someone is signed in and no map is open, over the whole window. On the left
 * « Nouvelle carte… », the main gesture, « Ouvrir… », a hairline and « Accueil », the page shown; in the middle the
 * welcome at the top, then a panel of the last maps as tiles, centred, each a click from being opened. **No map opens by itself** (the dev: « je veux pas
 * de fichier par défaut »).
 *
 * A failed reading is said in place, with « Réessayer », and in the console — as *Open…* says it in its list.
 * @param props - the maps, the clock and the three gestures
 * @param props.maps - where the maps are read
 * @param props.now - the clock
 * @param props.onNewMap - « Nouvelle carte… »
 * @param props.onOpen - « Ouvrir… »
 * @param props.onOpenMap - open one of the last maps
 * @returns the screen
 */
export function StartScreen({ maps, now, onNewMap, onOpen, onOpenMap }: StartScreenProps) {
  // Context
  const t = useTranslation(START_SCREEN_MESSAGES)

  // State
  const [listing, setListing] = useState<RecentListing>({ state: 'reading' })
  // Each « Réessayer » reads the maps again.
  const [reading, setReading] = useState(0)

  // Handlers
  const handleRetry = (): void => {
    setListing({ state: 'reading' })
    setReading((count) => count + 1)
  }

  // Effects
  useEffect(() => {
    let current = true
    maps.listDatedMaps().then(
      (read) => {
        if (current) setListing({ state: 'read', maps: read })
      },
      (error: unknown) => {
        console.error('[Cartographer] the start screen could not list the maps', error)
        if (current) setListing({ state: 'failed' })
      }
    )
    return () => {
      current = false
    }
  }, [maps, reading])

  // Render
  return (
    <div className="start-screen">
      <StartSide onNewMap={onNewMap} onOpen={onOpen} />
      <section className="start-screen__main" aria-labelledby="start-screen-welcome">
        <h2 id="start-screen-welcome" className="start-screen__welcome">
          {t('welcome')}
        </h2>
        <div className="start-screen__panel">
          <h3 className="start-screen__heading">{t('recent')}</h3>
          <RecentMaps listing={listing} now={now} onOpenMap={onOpenMap} onRetry={handleRetry} />
        </div>
      </section>
    </div>
  )
}
