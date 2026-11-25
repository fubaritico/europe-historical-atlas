import type { SaveFirstAnswer, SaveFirstReason } from './mapChange'
import type { Report } from './notice'
import type { PersistenceWords } from './persistenceWords'

/**
 * « Se déconnecter » (CARTO-535, the dev's table of 2026-11-25): a change not yet saved goes through the question that
 * exists — « save first? » — then the session is closed. [Yes] saves first, and a failed save keeps the author signed
 * in (its own alarm says it); [No] signs out, the change unsaved; ‹escape› signs nothing out.
 */

/** What signing out needs. */
export interface SignOutDeps {
  /** Whether the map holds a change not saved yet. */
  isModified: () => boolean
  /** Save the map, as ‹ctrl+S› does — `false` when it was not saved, said by its own alarm. */
  save: () => Promise<boolean>
  /**
   * Ask « save first? » — the question dialogue, through its relay.
   * @param reason - signing out
   * @returns the answer
   */
  askSaveFirst: (reason: SaveFirstReason) => Promise<SaveFirstAnswer>
  /** Close the session. */
  signOut: () => Promise<void>
  /** Where an alarm goes. */
  report: Report
  /** What it says. */
  words: () => PersistenceWords
}

/**
 * Sign out, the map saved first when the author says so.
 * @param deps - the map's session, the question, the CMS's session
 * @returns `true` when signed out
 */
export async function signOutAfterSaving(deps: SignOutDeps): Promise<boolean> {
  if (deps.isModified()) {
    let answer: SaveFirstAnswer
    try {
      answer = await deps.askSaveFirst({ kind: 'signOut' })
    } catch (error: unknown) {
      // A question already up (the relay busy) — a wiring fault, said loudly; the author stays signed in
      console.error('[Cartographer] not signed out: the question before could not be asked', error)
      deps.report({ tone: 'alarm', topic: 'session', text: deps.words().t('signOutAskFailed') })
      return false
    }
    if (answer === 'cancel') {
      console.warn('[Cartographer] signing out cancelled at the question')
      return false
    }
    if (answer === 'yes' && !(await deps.save())) return false
  }
  await deps.signOut()
  return true
}

/**
 * « Se déconnecter » one at a time (review QUAL-002 of 2026-11-25): a second press while the first runs — its question
 * up, its save running — is declined and said, never a second question nor a second save.
 * @param deps - what signing out needs
 * @returns the gesture
 */
export function createSignOut(deps: SignOutDeps): () => Promise<boolean> {
  let running = false
  return async () => {
    if (running) {
      console.warn('[Cartographer] signing out declined: one is already under way')
      return false
    }
    running = true
    try {
      return await signOutAfterSaving(deps)
    } finally {
      running = false
    }
  }
}
