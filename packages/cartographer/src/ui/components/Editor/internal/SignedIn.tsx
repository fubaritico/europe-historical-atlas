import { useSyncExternalStore } from 'react'

import { barGestures } from '../utils/barGestures'

import { AccountBadge } from './AccountBadge'
import { AppBarPanel } from './AppBarPanel'
import { ExpiredSession } from './ExpiredSession'
import { SignedInEditor } from './SignedInEditor'
import { StartShell } from './StartShell'

import type { SessionKeeper } from '../../../../persistence/sessionKeeper'
import type { SessionState } from '../../../../state/sessionStore'
import type { EditorProps } from '../editorProps'

/** What the Cartographer needs once someone is signed in. */
export interface SignedInProps {
  /** Signed in, or signed in until the session expired. */
  session: Extract<SessionState, { kind: 'signedIn' | 'expired' }>
  /** Signs in again, out, and asks the CMS again. */
  keeper: SessionKeeper
  /** What the start screen reads, and a map opened from its list. */
  start: EditorProps['start']
  /** Everything else the editor was given. */
  editor: Omit<EditorProps, 'session' | 'start'>
}

/**
 * The Cartographer signed in: **the start screen while no map is open** (CARTO-536), the editor once one is — who is
 * signed in at the top bar's right, with « Se déconnecter » while the session holds. **An expired session keeps the
 * screen mounted** under its dialogue, nothing drawn lost (CARTO-535).
 * @param props - the session, its keeper, the start screen's props and the editor's
 * @param props.session - signed in, or expired
 * @param props.keeper - signs in again and out
 * @param props.start - what the start screen reads
 * @param props.editor - the editor's props
 * @returns the start screen or the editor, and the expired dialogue over it
 */
export function SignedIn({ session, keeper, start, editor }: SignedInProps) {
  // State
  const map = useSyncExternalStore(editor.mapName.subscribe, editor.mapName.get)

  // Derived
  const account = (
    <AccountBadge
      email={session.user.email}
      {...(session.kind === 'signedIn' ? { onSignOut: editor.onSignOut } : {})}
    />
  )

  // Render
  return (
    <>
      {map === null ? (
        <StartShell
          heading={editor.heading}
          appbar={
            <AppBarPanel
              {...barGestures(editor)}
              store={editor.store}
              history={editor.history}
              account={account}
            />
          }
          start={{ ...start, onNewMap: editor.onNewMap, onOpen: editor.onOpen }}
        />
      ) : (
        <SignedInEditor {...editor} account={account} />
      )}
      {session.kind === 'expired' && <ExpiredSession session={session} keeper={keeper} />}
    </>
  )
}
