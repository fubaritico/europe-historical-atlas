import { Button } from '@fubaritico/react/Button'
import { Card } from '@fubaritico/react/Card'
import { useState } from 'react'

import { useTranslation } from '../../hooks/useTranslation'

import { SIGN_IN_MESSAGES } from './i18n'
import { SignInFields } from './internal/SignInFields'
import { SignInNotice } from './internal/SignInNotice'

import type { SignInProblem } from '../../../state/sessionStore'
import type { SubmitEvent } from 'react'

/** What the form needs. */
export interface SignInFormProps {
  /** Whether a session expired while drawing — the form says nothing is lost, and keeps the address. */
  expired: boolean
  /** The address to start from — the expired session's, or nothing. */
  email: string
  /** Whether the CMS is still being asked who is signed in, at the opening. */
  checking: boolean
  /** What went wrong last, or `null`. */
  problem: SignInProblem | null
  /**
   * Sign in.
   * @param email - the address
   * @param password - the password
   * @returns once the CMS has answered — **never rejects**: the session's client reads every failure, a request with no
   * answer included, as an outcome (`persistence/sessionClient.ts`), and the keeper settles it
   */
  onSignIn: (email: string, password: string) => Promise<void>
  /** Ask the CMS again, once it is started. */
  onRetry: () => void
}

/**
 * The sign-in form of the Cartographer, with the CMS's account (CARTO-535): on the start screen when nobody is signed
 * in, in a dialogue over the map when a session expired. The password lives in this form's state only until it is
 * sent, and is cleared whatever the answer.
 * @param props - the session's state and the gestures
 * @param props.expired - whether a session expired while drawing
 * @param props.email - the address to start from
 * @param props.checking - whether the CMS is still asked who is signed in
 * @param props.problem - what went wrong last
 * @param props.onSignIn - signs in
 * @param props.onRetry - asks the CMS again
 * @returns the form
 */
export function SignInForm({
  expired,
  email,
  checking,
  problem,
  onSignIn,
  onRetry,
}: SignInFormProps) {
  // Context
  const t = useTranslation(SIGN_IN_MESSAGES)

  // State
  const [address, setAddress] = useState(email)
  const [password, setPassword] = useState('')
  const [sending, setSending] = useState(false)

  // Derived
  const ready = !checking && !sending && address.trim() !== '' && password !== ''

  // Handlers
  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!ready) {
      console.warn('[Cartographer] signing in declined: an address and a password are needed')
      return
    }
    setSending(true)
    void onSignIn(address.trim(), password).finally(() => {
      setSending(false)
      setPassword('')
    })
  }

  // Render
  return (
    <form className="sign-in-form" noValidate onSubmit={handleSubmit}>
      <Card>
        <Card.Header>{t('title')}</Card.Header>
        <Card.Body>
          <p>{expired ? t('expired') : t('lead')}</p>
          <SignInFields
            address={address}
            password={password}
            onAddress={setAddress}
            onPassword={setPassword}
          />
          <SignInNotice checking={checking} problem={problem} onRetry={onRetry} />
        </Card.Body>
        <Card.Footer align="end">
          <Button type="submit" disabled={!ready}>
            {sending ? t('signingIn') : t('signIn')}
          </Button>
        </Card.Footer>
      </Card>
    </form>
  )
}
