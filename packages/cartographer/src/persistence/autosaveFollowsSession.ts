import { mayEdit } from '../state/sessionStore'

import type { AutosaveKeeper } from './autosaveKeeper'
import type { SessionState } from '../state/sessionStore'

/**
 * The automatic save follows the session (CARTO-535, the dev's table of 2026-11-25): it runs while the map is open and
 * someone is signed in — **and while a session expired in the middle of a drawing**, so nothing is lost — and stops
 * while nobody is.
 */

/** The session, as the follower reads it — structural, so a test hands a literal store. */
export interface FollowedSession {
  /** @returns where the session stands */
  getState: () => { session: SessionState }
  /**
   * Listen to its changes.
   * @param listener - called at each change
   * @returns how to stop listening
   */
  subscribe: (listener: () => void) => () => void
}

/**
 * Make the automatic save follow the session.
 * @param keeper - the automatic save
 * @param session - the session's store
 * @param mapReady - whether the map is open and may be saved
 * @returns `follow`, to call once the map is open, and `stop`, which stops following and the automatic save with it
 */
export function autosaveFollowsSession(
  keeper: Pick<AutosaveKeeper, 'start' | 'stop'>,
  session: FollowedSession,
  mapReady: () => boolean
): { follow: () => void; stop: () => void } {
  const follow = () => {
    if (mapReady() && mayEdit(session.getState().session)) keeper.start()
    else keeper.stop()
  }
  const unsubscribe = session.subscribe(follow)
  // Review ARCH-001 of 2026-11-25: stopping to follow never leaves a keeper running that nothing watches any more
  const stop = () => {
    unsubscribe()
    keeper.stop()
  }
  return { follow, stop }
}
