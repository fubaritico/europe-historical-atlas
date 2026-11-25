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
 * The Cartographer while nobody is signed in (CARTO-535): the chrome — the top bar and its menus, greyed — and the
 * sign-in form where the map would be; no tools, no panels, no status bar.
 *
 * **While the CMS is still asked, an empty screen, never the form** (the dev, 2026-11-25): opening a map reloads the page,
 * and the session is asked again — the form flashed, its fields empty, between the start screen and the map's loading,
 * for someone signed in all along. It shows once the CMS has answered that nobody is.
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
      bare
      docbar={<></>}
      rail={<></>}
      canvas={
        session.kind === 'checking' ? (
          <div className="sign-in-screen" aria-busy="true" />
        ) : (
          <div className="sign-in-screen">
            <SignInForm
              expired={false}
              email=""
              checking={false}
              problem={session.problem}
              onSignIn={keeper.signIn}
              onRetry={handleRetry}
            />
          </div>
        )
      }
      status={<></>}
      dockWidth={null}
    />
  )
}
