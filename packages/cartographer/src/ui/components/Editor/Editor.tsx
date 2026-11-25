import { useStore } from 'zustand'

import { mayEdit } from '../../../state/sessionStore'

import { AppBarPanel } from './internal/AppBarPanel'
import { SignedIn } from './internal/SignedIn'
import { SignedOutShell } from './internal/SignedOutShell'
import { barGestures } from './utils/barGestures'

import type { EditorProps } from './editorProps'

/**
 * Render the editor — once someone is signed in (CARTO-535); before, the chrome greyed and the sign-in form where the
 * map would be. **Signed in with no map open, the start screen** (CARTO-536): a new map, *Open…*, the last maps. **An
 * expired session keeps the screen mounted** under its dialogue, nothing drawn lost; **signing out unmounts the map** and
 * signing in again mounts it anew — the canvas rebuilt, the view not kept, but the backdrop found already baked
 * (`loaders/preparedBackdrop`) and the document kept in the store.
 * @param props - the store, how to load, the names, the relay for messages from outside React, and the session
 * @param props.session - who is signed in, and the keeper that signs in and out
 * @param props.start - what the start screen reads, and a map opened from its list
 * @returns the editor, the start screen, or the sign-in screen
 */
export function Editor({ session: handle, start, ...editor }: EditorProps) {
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
  return <SignedIn session={session} keeper={handle.keeper} start={start} editor={editor} />
}
