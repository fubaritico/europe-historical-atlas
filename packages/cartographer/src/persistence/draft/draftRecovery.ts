import { timeWords } from '../timeWords'
import { documentFromFiles } from '../yearArchive'

import type { Report } from '../notice'
import type { PersistenceWords } from '../persistenceWords'
import type { DraftOffer } from './draftOffers'
import type { Draft, DraftStore } from './draftStore'
import type { YearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

/**
 * At the opening, offer the draft the previous session left — the work it never saved (CARTO-238).
 *
 * Runs **after** the year has been opened and **before** the draft keeper starts: a draft written first
 * would overwrite the very work this offers back. It answers whether the way is clear (`RecoveryOutcome`):
 * drafting starts only then, so a draft that could not be set aside is never written over.
 *
 * **Nothing it does loses the draft.** Resuming opens it as the working document — the disk is not touched
 * until ‹ctrl+S›. Declining *sets it aside* under a dated name rather than deleting it. A draft that cannot
 * be read is set aside too, and said: left where it is, the first gesture would write over it.
 */

/** The console tag this module's lines start with. */
const LOG_TAG = '[Cartographer]'

/**
 * How the offer ended: `clear` — no draft is left unresolved on disk, drafting may start; `draft-left` — one
 * could not be set aside, and the first draft written would replace it.
 */
export type RecoveryOutcome = 'clear' | 'draft-left'

/** The store, reduced to what the offer reads and does. */
export interface RecoveryStore {
  /** The edition's current state. */
  getState: () => {
    /** Bumped by every action. */
    version: number
    /** Open a document, starting a fresh undo line on it. */
    open: (document: YearDocument) => void
  }
}

/** What the offer needs. */
export interface DraftRecoveryDeps {
  /** Where drafts are kept. */
  drafts: DraftStore
  /** The year being edited. */
  year: number
  /** The store the draft is opened in. */
  store: RecoveryStore
  /** Ask the author — the dialogue, through `draftOffers.ts`. */
  ask: (offer: DraftOffer) => Promise<boolean>
  /** The clock, to word the draft's time. */
  now: () => Date
  /** Where a notice for the author goes — a toast, or the alarm dialogue. */
  report: Report
  /** What it says — asked at each sentence, so it follows a change of language. */
  words: () => PersistenceWords
  /**
   * Where a set-aside draft can be found, as the author reads it — `DRAFTS_FOLDER`, handed in by the
   * composition root: `persistence/` does not import `devServer/`.
   */
  draftsFolder: string
}

/**
 * Set the draft aside, reporting either outcome.
 * @param deps - the drafts, the year, where to report
 * @param because - the sentence that says why, before where it went
 * @param logged - whether a failure's own words went to the console, which the sentence then says
 * @returns `clear` once it is set aside; `draft-left` when it could not be
 */
async function setAside(
  deps: DraftRecoveryDeps,
  because: string,
  logged: boolean
): Promise<RecoveryOutcome> {
  const yearName = String(deps.year)
  try {
    await deps.drafts.setAside(deps.year)
    // Set aside, not lost: it waits in the folder the sentence names.
    deps.report({
      tone: 'warning',
      topic: 'draft',
      text: deps.words().t('draftSetAside', {
        because,
        folder: deps.draftsFolder,
        logged: logged ? 'yes' : 'no',
      }),
    })
    return 'clear'
  } catch (error: unknown) {
    console.error(`${LOG_TAG} the draft of ${yearName} could not be set aside`, error)
    deps.report({
      tone: 'alarm',
      topic: 'draft',
      text: deps.words().t('draftSetAsideFailed', { because, folder: deps.draftsFolder }),
    })
    return 'draft-left'
  }
}

/**
 * Read the kept draft and open it as a document, or set it aside when either step fails.
 * @param deps - the drafts, the year, the clock, where to report
 * @returns the document and its time, `null` when there is no draft, or the outcome of setting it aside
 */
async function readDraft(
  deps: DraftRecoveryDeps
): Promise<{ document: YearDocument; savedAt: string } | null | RecoveryOutcome> {
  const yearName = String(deps.year)
  let draft: Draft | null
  try {
    draft = await deps.drafts.read(deps.year)
  } catch (error: unknown) {
    console.error(`${LOG_TAG} the draft of ${yearName} could not be read`, error)
    return setAside(deps, deps.words().t('draftUnreadable', { year: yearName }), true)
  }
  if (draft === null) return null
  const { savedAt } = draft
  try {
    return { document: documentFromFiles(draft.files, `the draft of ${yearName}`), savedAt }
  } catch (error: unknown) {
    console.error(`${LOG_TAG} the draft of ${yearName} cannot be opened`, error)
    const when = timeWords(savedAt, deps.now(), deps.words())
    return setAside(deps, deps.words().t('draftCannotOpen', { year: yearName, when }), true)
  }
}

/**
 * Ask the author, then resume or set aside. A question or an opening that throws sets the draft aside,
 * like a refusal: the draft is never left where the first gesture would write over it.
 * @param deps - the store, the question, where to report
 * @param document - the draft, opened
 * @param savedAt - its time, as an ISO time
 * @returns the outcome
 */
async function askAndApply(
  deps: DraftRecoveryDeps,
  document: YearDocument,
  savedAt: string
): Promise<RecoveryOutcome> {
  const yearName = String(deps.year)
  const { t } = deps.words()
  const when = timeWords(savedAt, deps.now(), deps.words())
  try {
    const versionAsked = deps.store.getState().version
    const resume = await deps.ask({ year: deps.year, savedAt })
    if (!resume) return await setAside(deps, t('draftNotResumed', { year: yearName, when }), false)
    // Drawn while the question was open (a key the dialogue did not catch): opening the draft would throw
    // that away. The draft is kept aside instead, and said.
    if (deps.store.getState().version !== versionAsked) {
      console.warn(`${LOG_TAG} the draft of ${yearName} was not resumed: the map changed meanwhile`)
      return await setAside(deps, t('draftChangedWhileOffered', { year: yearName }), false)
    }
    deps.store.getState().open(document)
    deps.report({
      tone: 'success',
      topic: 'draft',
      text: t('draftResumed', { year: yearName, when }),
    })
    return 'clear'
  } catch (error: unknown) {
    console.error(`${LOG_TAG} the draft of ${yearName} could not be offered`, error)
    return setAside(deps, t('draftNotOffered', { year: yearName, when }), true)
  }
}

/**
 * Offer the previous session's draft, if there is one; report what happened, whatever it was.
 * @param deps - the drafts, the year, the store, the question, the clock, where to report
 * @returns `clear` when no draft is left on disk unresolved — drafting may start; `draft-left` when one
 *   could not be set aside, and the next draft written would replace it
 */
export async function offerDraft(deps: DraftRecoveryDeps): Promise<RecoveryOutcome> {
  const read = await readDraft(deps)
  if (read === null) return 'clear'
  if (typeof read === 'string') return read
  return askAndApply(deps, read.document, read.savedAt)
}
