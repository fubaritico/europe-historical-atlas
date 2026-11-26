import { fetchWithin } from '@europe-historical-atlas/core/utils/fetchWithin'

import { createGestureWatch } from '../../persistence/gestureWatch'
import { createSessionClient } from '../../persistence/sessionClient'
import { PROLONG_EVERY_MS, createSessionKeeper } from '../../persistence/sessionKeeper'
import { createSessionStore, mayEdit } from '../../state/sessionStore'

import { cmsChannelOf } from './cmsChannel'

import type { CmsChannel } from './cmsChannel'
import type { Report } from '../../persistence/notice'
import type { SessionHandle } from '../components/Editor'

/**
 * The page's session (CARTO-535): its store, its keeper on the dev server's routes, prolonged every ten minutes by
 * the window's timers when the author made a gesture since (CARTO-567) — and the CMS asked at once who is signed in. Called once, by the composition root.
 * @param route - the dev server's session routes, `CMS_SESSION_ROUTE` — named by the composition root, the one place
 * that names `devServer/`
 * @param defect - shows on screen an answer of the dev server the page cannot read (the error dialogue)
 * @returns the session, for the editor and the commands' gate
 */
export function startSession(route: string, defect: (detail: string) => void): SessionHandle {
  const store = createSessionStore()
  const keeper = createSessionKeeper({
    port: createSessionClient(route, (input, init) => fetchWithin(input, init)),
    store,
    timers: {
      every: (run, everyMs) => window.setInterval(run, everyMs),
      stop: (handle) => {
        window.clearInterval(handle as number)
      },
    },
    everyMs: PROLONG_EVERY_MS,
    gestured: createGestureWatch(window).gestured,
    defect,
  })
  void keeper.check()
  return { store, keeper }
}

/**
 * The page's channel to the CMS (CARTO-498), tied to its session: decided from the page's address, and a session the
 * CMS refuses to « Ajouter au CMS » opens the session's dialogue (`SessionKeeper.lost`). Called once, by the composition
 * root.
 * @param session - the page's session
 * @param route - the dev server's « Ajouter au CMS » route, `CMS_TERRITORY_ROUTE` — named by the composition root
 * @param report - routes a notice: the CMS not started opens the alarm dialogue
 * @returns the channel
 */
export function pageCms(session: SessionHandle, route: string, report: Report): CmsChannel {
  return cmsChannelOf(window.location.hostname, { route, sessionLost: session.keeper.lost, report })
}

/**
 * A command that acts only once someone is signed in (CARTO-535): with nobody, it is declined and said on the console —
 * the menus show it greyed.
 * @param session - the session
 * @param command - the command's name, for the console
 * @param run - what the command does
 * @returns the command, gated
 */
export function whenSignedIn(session: SessionHandle, command: string, run: () => void): () => void {
  return () => {
    if (mayEdit(session.store.getState().session)) {
      run()
      return
    }
    console.warn(`[Cartographer] ${command} declined: nobody is signed in`)
  }
}
