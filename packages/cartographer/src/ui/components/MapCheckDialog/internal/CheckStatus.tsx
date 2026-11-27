import { useTranslation } from '../../../hooks/useTranslation'
import { MAP_CHECK_MESSAGES } from '../i18n'

import type { MapCheckPhase } from '../mapCheckPhase'
import type { MapAlignment } from '@europe-historical-atlas/core/data/cmsAlignment'

/**
 * The line [Check this year] says when it lists nothing: the CMS being read, or the map aligned on it.
 * @param props - where the check stands, and what it found
 * @param props.phase - where it stands
 * @param props.alignment - what it found, `null` before the reading
 * @returns the line, or nothing while a group has a row
 */
export function CheckStatus({
  phase,
  alignment,
}: {
  phase: MapCheckPhase
  alignment: MapAlignment | null
}) {
  // Context
  const t = useTranslation(MAP_CHECK_MESSAGES)

  // Derived
  const aligned =
    alignment !== null &&
    alignment.toAlign.length +
      alignment.toConfirm.length +
      alignment.toEnterInCms.length +
      alignment.untied.length ===
      0

  // Render
  if (phase !== 'reading' && !aligned) return null

  return (
    <p role="status" className="short-dialogue__text">
      {phase === 'reading' ? t('reading') : t('nothing')}
    </p>
  )
}
