import { useTranslation } from '../../../hooks/useTranslation'
import { EDITOR_MESSAGES } from '../i18n'

/** The zones of the shell that can stand empty. */
export type PlaceholderZone = 'appBar' | 'docBar' | 'tools' | 'panels'

/**
 * A zone with nothing in it yet, carrying its own name so the layout reads.
 * @param props - the zone
 * @param props.zone - which zone it is; its name, in the page's language, is written inside it
 * @returns the empty zone, showing its name
 */
export function Placeholder({ zone }: { zone: PlaceholderZone }) {
  // Context
  const t = useTranslation(EDITOR_MESSAGES)

  // Render
  return <div className="empty-zone">{t('placeholder', { zone })}</div>
}
