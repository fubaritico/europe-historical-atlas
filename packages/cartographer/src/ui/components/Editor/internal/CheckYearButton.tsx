import { useTranslation } from '../../../hooks/useTranslation'
import { EDITOR_MESSAGES } from '../i18n'

import { BarButton } from './BarButton'

/**
 * [Check this year], at the right end of the document bar (`s10`) — the map against the CMS (CARTO-568), the first check
 * built behind it. Unavailable online, where the chrome reads no CMS, and saying so.
 * @param props - what a press does
 * @param props.onCheck - check the year, or `null` when it cannot be
 * @returns the button
 */
export function CheckYearButton({ onCheck }: { onCheck: (() => void) | null }) {
  // Context
  const t = useTranslation(EDITOR_MESSAGES)

  // Render
  return (
    <BarButton
      label={t('checkYear')}
      variant="primary"
      {...(onCheck === null ? { unavailable: t('checkOnline') } : { onPress: onCheck })}
    />
  )
}
