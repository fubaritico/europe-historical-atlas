import { reasonOf } from '../errorReason'

import type { DraftKeeper } from './draftKeeper'
import type { RecoveryOutcome } from './draftRecovery'

/**
 * The draft's two moments in the session, out of the composition root so they can be tested with literals
 * (CARTO-238): the opening — open the year, offer the previous draft, *then* start drafting — and the save —
 * which removes the draft only if nothing was drawn while it ran.
 */

/** The console tag this module's lines start with. */
const LOG_TAG = '[Cartographer]'

/** What the opening needs. */
export interface DraftOpeningDeps {
  /** Open the year — the session's start-up read. */
  openYear: () => Promise<void>
  /** Offer the previous draft — `offerDraft`. */
  offerDraft: () => Promise<RecoveryOutcome>
  /** The keeper, started once the way is clear. */
  keeper: Pick<DraftKeeper, 'start'>
  /** Where a message for the author goes. */
  report: (message: string) => void
}

/**
 * Open the year, offer the previous draft, then start drafting — in that order, always.
 *
 * **Drafting starts only when the way is clear.** If a draft could not be set aside, the first draft
 * written would replace it, so drafting stays off and the author is told: losing the protection, said, is
 * better than overwriting work in silence (the dev's call to confirm, 2026-10-17). Any unexpected failure of
 * the offer is treated the same way — logged, said, drafting off. It never rejects.
 * @param deps - the two steps, the keeper, where to report
 * @returns once the keeper is started, or drafting is known to be off
 */
export async function openWithDraft(deps: DraftOpeningDeps): Promise<void> {
  let outcome: RecoveryOutcome
  try {
    await deps.openYear()
    outcome = await deps.offerDraft()
  } catch (error: unknown) {
    console.error(`${LOG_TAG} the opening failed before drafts could start`, error)
    deps.report(
      `automatic drafts are off: the opening failed (${reasonOf(error)}) — save with ‹ctrl+S›`
    )
    return
  }
  if (outcome === 'draft-left') {
    console.error(`${LOG_TAG} automatic drafts are off: an old draft is still in the way`)
    return
  }
  try {
    deps.keeper.start()
  } catch (error: unknown) {
    console.error(`${LOG_TAG} the draft keeper could not start`, error)
    deps.report(
      `automatic drafts are off: they could not start (${reasonOf(error)}) — save with ‹ctrl+S›`
    )
  }
}

/** What the save needs. */
export interface DraftSaveDeps {
  /** The store's version now — read *before* the save takes the document. */
  version: () => number
  /** Save the year — resolves `true` when it was written. */
  save: () => Promise<boolean>
  /** The keeper, told what the save wrote. */
  keeper: Pick<DraftKeeper, 'saved'>
}

/**
 * Save the year; when it was written, tell the keeper which version it took.
 *
 * **The version is read before the save starts**, at the instant the save takes the document — read after
 * it resolves, the *"drawn since"* check would always pass and remove a draft holding newer work.
 * @param deps - the version, the save, the keeper
 * @returns once the save — and the draft's removal, if any — is done
 */
export async function saveAndClearDraft(deps: DraftSaveDeps): Promise<void> {
  const version = deps.version()
  if (await deps.save()) await deps.keeper.saved(version)
}
