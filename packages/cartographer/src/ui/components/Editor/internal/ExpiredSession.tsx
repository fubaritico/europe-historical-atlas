import { Modal } from '@fubaritico/react/Modal'

import { useTranslation } from '../../../hooks/useTranslation'
import { SignInForm } from '../../SignInForm'
import { EDITOR_MESSAGES } from '../i18n'

import type { SessionKeeper } from '../../../../persistence/sessionKeeper'
import type { SessionState } from '../../../../state/sessionStore'

// Handlers
const handleClose = () => {
  console.warn('[Cartographer] the session dialogue stays until someone signs in again')
}

/**
 * The dialogue over the map when a session expired while drawing (CARTO-535): the editor stays, nothing drawn is lost,
 * and the form asks to sign in again with the same address. **It does not close on Escape nor on the backdrop**: the
 * CMS is not reachable until someone signs in again — the refusal is said on the console.
 * @param props - the expired session and the keeper
 * @param props.session - the expired session
 * @param props.keeper - signs in again, and asks the CMS again
 * @returns the dialogue
 */
export function ExpiredSession({
  session,
  keeper,
}: {
  session: Extract<SessionState, { kind: 'expired' }>
  keeper: SessionKeeper
}) {
  // Context
  const t = useTranslation(EDITOR_MESSAGES)

  // Handlers
  const handleRetry = () => {
    void keeper.check()
  }

  // Render
  return (
    <Modal
      isOpen
      onClose={handleClose}
      onOverlayClick={handleClose}
      aria-label={t('sessionExpired')}
    >
      <SignInForm
        expired
        email={session.user.email}
        checking={false}
        problem={session.problem}
        onSignIn={keeper.signIn}
        onRetry={handleRetry}
      />
    </Modal>
  )
}
