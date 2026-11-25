import { SignInForm } from '../../SignInForm'

import { Shell } from './Shell'

import type { SessionKeeper } from '../../../../persistence/sessionKeeper'
import type { SessionState } from '../../../../state/sessionStore'
import type { ReactNode } from 'react'

/** What the shell needs while nobody is signed in. */
export interface SignedOutShellProps {
  /** The page's `<h1>`. */
  heading: ReactNode
  /** The top bar, every gesture greyed. */
  appbar: ReactNode
  /** Where the session stands — checking, or nobody signed in. */
  session: Extract<SessionState, { kind: 'checking' | 'signedOut' }>
  /** Signs in, and asks the CMS again. */
  keeper: SessionKeeper
}

/**
 * The Cartographer while nobody is signed in (CARTO-535): the chrome — the top bar and its menus, every command greyed —
 * and the sign-in form where the map would be; no tools, no panels, no status bar.
 * @param props - the heading, the greyed bar, the session and its keeper
 * @param props.heading - the page's `<h1>`
 * @param props.appbar - the top bar, greyed
 * @param props.session - checking, or nobody signed in
 * @param props.keeper - signs in, and asks again
 * @returns the shell
 */
export function SignedOutShell({ heading, appbar, session, keeper }: SignedOutShellProps) {
  // Handlers
  const handleRetry = () => {
    void keeper.check()
  }

  // Render
  return (
    <Shell
      heading={heading}
      appbar={appbar}
      docbar={<></>}
      rail={<></>}
      canvas={
        <div className="sign-in-screen">
          <SignInForm
            expired={false}
            email=""
            checking={session.kind === 'checking'}
            problem={session.kind === 'signedOut' ? session.problem : null}
            onSignIn={keeper.signIn}
            onRetry={handleRetry}
          />
        </div>
      }
      status={<></>}
      dockWidth={null}
    />
  )
}
