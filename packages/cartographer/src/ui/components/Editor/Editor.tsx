import { useStore } from 'zustand'

import { mayEdit } from '../../../state/sessionStore'

import { AccountBadge } from './internal/AccountBadge'
import { AppBarPanel } from './internal/AppBarPanel'
import { ExpiredSession } from './internal/ExpiredSession'
import { SignedInEditor } from './internal/SignedInEditor'
import { SignedOutShell } from './internal/SignedOutShell'
import { barGestures } from './utils/barGestures'

import type { EditorProps } from './editorProps'

/**
 * Render the editor — once someone is signed in (CARTO-535); before, the chrome greyed and the sign-in form where the
 * map would be. **An expired session keeps the editor mounted** under its dialogue, nothing drawn lost; **signing out
 * unmounts the map** and signing in again mounts it anew — the canvas rebuilt, the view not kept, but the backdrop found
 * already baked (`loaders/preparedBackdrop`) and the document kept in the store.
 * @param props - the store, how to load, the names, the relay for messages from outside React, and the session
 * @param props.session - who is signed in, and the keeper that signs in and out
 * @returns the editor, or the sign-in screen
 */
export function Editor({ session: handle, ...editor }: EditorProps) {
  // Store
  const session = useStore(handle.store, (state) => state.session)

  // Render
  if (!mayEdit(session))
    return (
      <SignedOutShell
        heading={editor.heading}
        appbar={
          <AppBarPanel
            {...barGestures(editor)}
            store={editor.store}
            history={editor.history}
            signedOut
          />
        }
        session={session}
        keeper={handle.keeper}
      />
    )
  return (
    <>
      <SignedInEditor
        {...editor}
        account={
          <AccountBadge
            email={session.user.email}
            {...(session.kind === 'signedIn' ? { onSignOut: editor.onSignOut } : {})}
          />
        }
      />
      {session.kind === 'expired' && <ExpiredSession session={session} keeper={handle.keeper} />}
    </>
  )
}
