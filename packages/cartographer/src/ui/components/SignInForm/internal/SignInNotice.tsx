import { Button } from '@fubaritico/react/Button'

import { useTranslation } from '../../../hooks/useTranslation'
import { SIGN_IN_MESSAGES } from '../i18n'

import type { SignInProblem } from '../../../../state/sessionStore'

/**
 * What the form says under its fields (CARTO-535): the CMS being asked, the CMS not started or the Cartographer's own
 * server answering with nothing readable — both with « Réessayer » — or the CMS's refusal in its words.
 * @param props - where the asking stands and what went wrong
 * @param props.checking - whether the CMS is still being asked who is signed in
 * @param props.problem - what went wrong last, or `null`
 * @param props.onRetry - asks the CMS again
 * @returns the line, or nothing
 */
export function SignInNotice({
  checking,
  problem,
  onRetry,
}: {
  checking: boolean
  problem: SignInProblem | null
  onRetry: () => void
}) {
  // Context
  const t = useTranslation(SIGN_IN_MESSAGES)

  // Render
  if (checking) return <p role="status">{t('checking')}</p>
  if (problem === null) return null
  if (problem.kind === 'refused')
    return <p role="alert">{t('refused', { reason: problem.reason })}</p>
  return (
    <p role="alert">
      {problem.kind === 'broken' ? t('broken') : t('offline')}{' '}
      <Button type="button" variant="secondary" onClick={onRetry}>
        {t('retry')}
      </Button>
    </p>
  )
}
