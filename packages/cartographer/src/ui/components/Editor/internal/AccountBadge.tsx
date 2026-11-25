import { useTranslation } from '../../../hooks/useTranslation'
import { EDITOR_MESSAGES } from '../i18n'

import { BarButton } from './BarButton'

/**
 * Who is signed in, and « Se déconnecter », at the top bar's right end (CARTO-535).
 * @param props - the address and the gesture
 * @param props.email - the address of whoever is signed in
 * @param props.onSignOut - signs out
 * @returns the badge
 */
export function AccountBadge({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  // Context
  const t = useTranslation(EDITOR_MESSAGES)

  // Render
  return (
    <>
      <span className="app-account">{t('signedInAs', { email })}</span>
      <BarButton label={t('signOut')} onPress={onSignOut} />
    </>
  )
}
