import { useTranslation } from '../../../hooks/useTranslation'
import { MapTileIcon } from '../../../icons/mapTileIcon'
import { START_SCREEN_MESSAGES } from '../i18n'

/** One of the last maps. */
export interface RecentMapRowProps {
  /** The map's name. */
  map: string
  /** When it was last written, worded — « aujourd’hui à 20:41 ». */
  when: string
  /**
   * Open it.
   * @param map - the map's name
   */
  onOpenMap: (map: string) => void
}

/**
 * A tile of the start screen's last maps (CARTO-536), as Illustrator's: a button, the map's large glyph, its name and
 * when it was last written under it.
 * @param props - the map, when, and what a click does
 * @param props.map - the map's name
 * @param props.when - when it was last written, worded
 * @param props.onOpenMap - open it
 * @returns the row
 */
export function RecentMapRow({ map, when, onOpenMap }: RecentMapRowProps) {
  // Context
  const t = useTranslation(START_SCREEN_MESSAGES)

  // Handlers
  const handleClick = (): void => {
    onOpenMap(map)
  }

  // Render
  return (
    <li>
      <button type="button" className="start-screen__tile" onClick={handleClick}>
        <MapTileIcon />
        <span className="start-screen__name">{map}</span>
        <span className="start-screen__date">{t('changed', { when })}</span>
      </button>
    </li>
  )
}
