import { useTranslation } from '../../../hooks/useTranslation'
import { EDITOR_MESSAGES } from '../i18n'

import { BarButton } from './BarButton'

/**
 * Who is signed in, and « Se déconnecter », at the top bar's right end (CARTO-535). While a session expired mid-drawing,
 * the name alone — the dev's table of 2026-11-25: the dialogue over the map asks to sign in again.
 * @param props - the address and the gesture
 * @param props.email - the address of whoever is signed in
 * @param props.onSignOut - signs out; absent while the session expired
 * @returns the badge
 */
export function AccountBadge({ email, onSignOut }: { email: string; onSignOut?: () => void }) {
  // Context
  const t = useTranslation(EDITOR_MESSAGES)

  // Render
  return (
    <>
      <span className="app-account">{t('signedInAs', { email })}</span>
      {onSignOut !== undefined && <BarButton label={t('signOut')} onPress={onSignOut} />}
    </>
  )
}
