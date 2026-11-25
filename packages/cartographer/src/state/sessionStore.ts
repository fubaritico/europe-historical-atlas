import { createStore } from 'zustand/vanilla'

/**
 * Who is signed in to the Cartographer, with the CMS's account (CARTO-535) — the whole application is behind it: the
 * editor shows only once someone is. A store of its own, outside the document's: the session is not the map, and an
 * undo never touches it.
 */

/** A user of the CMS, as the Cartographer knows them. */
export interface SignedInUser {
  /** Their number in the CMS. */
  id: number
  /** Their address — the CMS's users have no other name. */
  email: string
}

/** Why the last attempt to sign in, or to find who is signed in, came to nothing. */
export type SignInProblem =
  /** The CMS does not answer: nobody can sign in until it is started. */
  | { kind: 'offline' }
  /** The CMS refused the address and the password, in its words. */
  | { kind: 'refused'; reason: string }
  /** The Cartographer's dev server answered with nothing readable: a defect, said in the error dialogue too. */
  | { kind: 'broken' }

/** Where the session stands. */
export type SessionState =
  /** At the opening, before the CMS has said. */
  | { kind: 'checking' }
  /** Nobody: the sign-in form, with what went wrong last, if anything. */
  | { kind: 'signedOut'; problem: SignInProblem | null }
  /** Someone: the editor. */
  | { kind: 'signedIn'; user: SignedInUser }
  /** Someone whose session the CMS no longer knows, while drawing: the editor stays, a dialogue asks to sign in again. */
  | { kind: 'expired'; user: SignedInUser; problem: SignInProblem | null }

/** The session's store. */
export interface SessionStoreState {
  /** Where the session stands. */
  session: SessionState
  /**
   * Say where it stands now.
   * @param session - the new state
   */
  setSession: (session: SessionState) => void
}

/**
 * Build the session's store, at the opening: checking.
 * @returns the store
 */
export function createSessionStore() {
  return createStore<SessionStoreState>()((set) => ({
    session: { kind: 'checking' },
    setSession: (session) => {
      set({ session })
    },
  }))
}

/** The store {@link createSessionStore} returns. */
export type SessionStore = ReturnType<typeof createSessionStore>

/**
 * Whether the editor's gestures may act: someone is signed in, or was and is only asked to sign in again — what they
 * draw meanwhile is kept.
 * @param session - where the session stands
 * @returns `true` when they may — someone is named
 */
export function mayEdit(
  session: SessionState
): session is Extract<SessionState, { kind: 'signedIn' | 'expired' }> {
  return session.kind === 'signedIn' || session.kind === 'expired'
}
