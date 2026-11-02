import { Button } from '@fubaritico/react/Button'
import { Card } from '@fubaritico/react/Card'
import { useEffect, useState } from 'react'

import { autofocusOnOpen } from '../../../hooks/autofocusOnOpen'
import { useTranslation } from '../../../hooks/useTranslation'
import { ACTION_MESSAGES } from '../../../i18n/actions'
import { MAP_DIALOG_MESSAGES } from '../i18n'

import { MapList } from './MapList'

import type { MapListing } from './MapList'

/** What the dialogue's content needs. */
export interface MapChooserProps {
  /** Where the maps are listed from — the folders of `years/`. */
  source: { listMaps: () => Promise<readonly string[]> }
  /**
   * The map open, read at each opening — *Save as…* changes it without a reload.
   * @returns its name
   */
  currentMap: () => string
  /**
   * Open the map chosen — ask whether to save the page first, then reload on it (`persistence/mapChange.ts`).
   * @param map - the map chosen
   */
  onOpen: (map: string) => void
  /** Close the dialogue. */
  close: () => void
}

/**
 * The dialogue's content, mounted for one opening: it reads the maps, lets one be selected, and opens it — [Open] or a
 * double click, as in a file dialogue.
 * @param props - the source, the map open, what opening and closing do
 * @param props.source - where the maps are listed from
 * @param props.currentMap - the map open, read at each opening
 * @param props.onOpen - open the map chosen
 * @param props.close - close the dialogue
 * @returns the card
 */
export function MapChooser({ source, currentMap, onOpen, close }: MapChooserProps) {
  // Context
  const t = useTranslation(MAP_DIALOG_MESSAGES)
  const action = useTranslation(ACTION_MESSAGES)

  // State
  const [listing, setListing] = useState<MapListing>({ state: 'reading' })
  const [selected, setSelected] = useState<string | null>(null)

  // Derived
  const map = currentMap()

  // Handlers
  const open = (chosen: string): void => {
    close()
    onOpen(chosen)
  }
  const handleOpen = (): void => {
    if (selected !== null) open(selected)
  }

  // Effects
  useEffect(() => {
    let current = true
    source.listMaps().then(
      (maps) => {
        if (current) setListing({ state: 'read', maps })
      },
      (error: unknown) => {
        console.error('[Cartographer] the maps could not be listed', error)
        if (current) setListing({ state: 'failed' })
      }
    )
    return () => {
      current = false
    }
  }, [source])

  // Render
  return (
    <Card>
      <Card.Header>{t('title')}</Card.Header>
      <Card.Body>
        <p className="short-dialogue__text">{t('warning')}</p>
        <MapList listing={listing} map={map} selected={selected} select={setSelected} open={open} />
      </Card.Body>
      <Card.Footer align="end">
        <Button ref={autofocusOnOpen} type="button" variant="secondary" onClick={close}>
          {action('cancel')}
        </Button>
        <Button type="button" disabled={selected === null} onClick={handleOpen}>
          {t('open')}
        </Button>
      </Card.Footer>
    </Card>
  )
}
