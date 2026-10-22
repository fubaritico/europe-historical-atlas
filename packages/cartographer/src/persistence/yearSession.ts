import { timeWords } from './timeWords'
import { YearChangedOnDisk } from './yearArchive'

import type { PersistenceWords } from './persistenceWords'
import type { SavedYearSummary, YearArchive } from './yearArchive'
import type { YearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

/**
 * The editor's relation to its year on disk: open it when the editor starts, save it on ‹ctrl+s›.
 *
 * **One rule carries this module: never let a save write over a year it could not read.** If the year is
 * listed in the manifest and fails to open, the editor starts on an empty map — and an empty map saved with
 * ‹ctrl+s› would replace good-but-unreadable files with nothing. So a failed open **blocks saving**, and says
 * why, until the page is reloaded with the files mended. A decision taken under the dev's go on 2026-10-12
 * (`files/plans/cartographer/save-open-plan.md`, D5), and the question of it is on his list.
 *
 * **The same rule, met from the other side**: the start-up read is asynchronous, so the author may begin to
 * draw before it lands. Opening the file then would throw that drawing away without a word; keeping the
 * drawing and allowing a save would overwrite the year on disk with a map that never saw it. Neither is
 * acceptable, so the read is **not applied** and saving is blocked — the newest action wins, and the older
 * one is said out loud (D6).
 *
 * Every message goes to `report`, which the editor shows in the status bar's result zone, and every refusal
 * also goes to the console (`rules/error-handling.md`, *no refusal is silent*).
 */

/** The console tag this module's lines start with. */
const LOG_TAG = '[Cartographer]'

/** The store, reduced to what the session reads and does. Structural, so a test hands in a literal. */
export interface SessionStore {
  /** The edition's current state. */
  getState: () => {
    /** The working document. */
    document: YearDocument
    /** Bumped by every action — the way to tell whether the author did anything meanwhile. */
    version: number
    /** Open a document, starting a fresh undo line on it. */
    open: (document: YearDocument) => void
  }
}

/** What the author is asked when a save would write over a year changed on disk (CARTO-238, rung 3). */
export interface OverwriteQuestion {
  /** The year. */
  year: number
  /** When its files changed, as an ISO time — the dialogue words it — or `null` when they are gone from disk. */
  changedAt: string | null
}

/** What the session needs. */
export interface YearSessionDeps {
  /** The store whose document is opened and saved. */
  store: SessionStore
  /** Where the years are kept. */
  archive: YearArchive
  /** The year this editor works on. */
  year: number
  /** Where a message for the author goes — the status bar's result zone. */
  report: (message: string) => void
  /**
   * Ask whether to write over a year changed on disk — the dialogue, through a question relay.
   * @returns `true` for [Overwrite], `false` for [Cancel]
   */
  confirmOverwrite: (question: OverwriteQuestion) => Promise<boolean>
  /** The clock, to word when the year changed. */
  now: () => Date
  /** What it says — asked at each sentence, so it follows a change of language. */
  words: () => PersistenceWords
}

/**
 * Where the session stands.
 *
 * `opening` — the start-up read is in flight. `ready` — saving is allowed. `blocked` — a save would risk
 * the year on disk, for the reason kept beside it.
 */
export type SessionPhase = 'opening' | 'ready' | 'blocked'

/** The session: two gestures, and a way to ask where it stands. */
export interface YearSession {
  /**
   * Open the year if the manifest lists it; otherwise leave the empty map as it is.
   * Resolves either way: every failure is reported, none is thrown.
   */
  openOnStartup: () => Promise<void>
  /**
   * Save the working document as its year.
   * Resolves either way: a refused or failed save is reported, never thrown.
   * @returns `true` when the year was written — what tells the draft keeper it may remove the draft
   */
  save: () => Promise<boolean>
  /** Where the session stands now. */
  phase: () => SessionPhase
}

/**
 * The status-bar line for a year's contents — *"52 polities · 17,104 vertices"* (`s04`), the numbers written
 * the page's way.
 * @param summary - the counts
 * @param words - the sentences
 * @returns the line, without the verb
 */
export function describeYearContents(
  summary: Pick<SavedYearSummary, 'polities' | 'vertices'>,
  words: PersistenceWords
): string {
  return words.t('contents', { polities: summary.polities, vertices: summary.vertices })
}

/**
 * Count what a document holds, the way a save will write it.
 * @param document - the opened document
 * @returns its polity and anchor counts
 */
function contentsOf(document: YearDocument): Pick<SavedYearSummary, 'polities' | 'vertices'> {
  return { polities: document.polities.length, vertices: document.anchors.length }
}

/** What the session remembers between two gestures. One object, so the gestures can live outside it. */
interface SessionCell {
  /** Where the session stands. */
  phase: SessionPhase
  /** Why saving is blocked, repeated at every ‹ctrl+s›; empty unless {@link SessionCell.phase} is `blocked`. */
  blockedBecause: string
  /** A save is in flight — a second one waits for nothing and is refused. */
  saving: boolean
}

/**
 * Stop all saving, keeping the reason to repeat at every ‹ctrl+s›.
 * @param deps - where to report
 * @param cell - the session's memory
 * @param reason - the sentence the author reads
 */
function block(deps: YearSessionDeps, cell: SessionCell, reason: string): void {
  cell.phase = 'blocked'
  cell.blockedBecause = reason
  deps.report(reason)
}

/**
 * Why a year read off disk must not be opened, now that it has arrived — or `null` when it may be.
 *
 * Two reasons, each logged: the folder holds another year (the next save would write elsewhere), or the
 * author has edited since the read began (opening would throw that work away).
 * @param deps - the store and the year
 * @param opened - what was read
 * @param versionAtStart - the store's version when the read began
 * @returns the sentence that blocks saving, or `null`
 */
function whyNotOpen(
  deps: YearSessionDeps,
  opened: YearDocument,
  versionAtStart: number
): string | null {
  const yearName = String(deps.year)
  const { t } = deps.words()
  if (opened.year !== deps.year) {
    console.error(`${LOG_TAG} the folder ${yearName} holds year ${String(opened.year)}`)
    return t('folderHoldsOther', { year: yearName, held: String(opened.year) })
  }
  if (deps.store.getState().version !== versionAtStart) {
    console.warn(`${LOG_TAG} ${yearName} arrived after editing began, and was not opened`)
    return t('readAfterDrawing', { year: yearName })
  }
  return null
}

/**
 * Open the year if the manifest lists it; report what happened, whatever it was.
 * @param deps - the store, the archive, the year, where to report
 * @param cell - the session's memory
 */
async function openOnStartup(deps: YearSessionDeps, cell: SessionCell): Promise<void> {
  const yearName = String(deps.year)
  const versionAtStart = deps.store.getState().version
  let opened: YearDocument | null = null
  try {
    const listed = await deps.archive.listedYears()
    if (listed.includes(deps.year)) opened = await deps.archive.open(deps.year)
  } catch (error: unknown) {
    console.error(`${LOG_TAG} ${yearName} could not be read from disk`, error)
    block(deps, cell, deps.words().t('unreadable', { year: yearName }))
    return
  }

  if (opened === null) {
    cell.phase = 'ready'
    deps.report(deps.words().t('neverSaved', { year: yearName }))
    return
  }
  const refusal = whyNotOpen(deps, opened, versionAtStart)
  if (refusal !== null) {
    block(deps, cell, refusal)
    return
  }
  deps.store.getState().open(opened)
  cell.phase = 'ready'
  deps.report(
    deps.words().t('opened', {
      year: yearName,
      contents: describeYearContents(contentsOf(opened), deps.words()),
    })
  )
}

/**
 * Why a save must not start now — or `null` when it may.
 * @param deps - the year
 * @param cell - the session's memory
 * @returns the sentence for the author, or `null`
 */
function whySaveRefused(deps: YearSessionDeps, cell: SessionCell): string | null {
  const { t } = deps.words()
  if (cell.phase === 'opening') return t('stillReading', { year: String(deps.year) })
  if (cell.phase === 'blocked') return cell.blockedBecause
  if (cell.saving) return t('saveRunning')
  return null
}

/**
 * Save the working document, or say why not.
 * @param deps - the store, the archive, where to report
 * @param cell - the session's memory
 * @returns `true` when the year was written
 */
async function saveYear(deps: YearSessionDeps, cell: SessionCell): Promise<boolean> {
  const refusal = whySaveRefused(deps, cell)
  if (refusal !== null) {
    console.warn(`${LOG_TAG} save refused: ${refusal}`)
    deps.report(refusal)
    return false
  }
  cell.saving = true
  try {
    return await writeYear(deps, false)
  } catch (error: unknown) {
    // The question itself failed — the relay busy, a time out of range. `save` resolves either way, as
    // its contract says: reported like any other failed save, never thrown.
    console.error(`${LOG_TAG} ${String(deps.year)} was not saved`, error)
    deps.report(deps.words().t('notSaved'))
    return false
  } finally {
    cell.saving = false
  }
}

/**
 * Write the working document — and, when the year changed on disk since it was opened, ask before writing
 * over it (CARTO-238, rung 3). Every outcome is reported; none is thrown.
 * @param deps - the store, the archive, where to report and whom to ask
 * @param overwrite - write even over a year changed on disk
 * @returns `true` when the year was written
 */
async function writeYear(deps: YearSessionDeps, overwrite: boolean): Promise<boolean> {
  try {
    // The document is taken now, not when ‹ctrl+S› was pressed: after [Overwrite] it is the page as it is.
    const summary = await deps.archive.save(deps.store.getState().document, { overwrite })
    deps.report(
      deps.words().t('saved', {
        year: String(summary.year),
        contents: describeYearContents(summary, deps.words()),
      })
    )
    return true
  } catch (error: unknown) {
    if (error instanceof YearChangedOnDisk && !overwrite) return askBeforeOverwriting(deps, error)
    console.error(`${LOG_TAG} ${String(deps.year)} was not saved`, error)
    deps.report(deps.words().t('notSaved'))
    return false
  }
}

/**
 * The year changed on disk under the page: ask, then overwrite or leave everything as it is.
 * @param deps - the archive, where to report and whom to ask
 * @param refusal - what the server answered
 * @returns `true` when the author chose to overwrite and the year was written
 */
async function askBeforeOverwriting(
  deps: YearSessionDeps,
  refusal: YearChangedOnDisk
): Promise<boolean> {
  const changedAt = refusal.changedAt === null ? null : new Date(refusal.changedAt).toISOString()
  if (await deps.confirmOverwrite({ year: refusal.year, changedAt })) return writeYear(deps, true)
  console.warn(
    `${LOG_TAG} save cancelled: ${String(refusal.year)} was changed on disk${changedAt === null ? '' : ` at ${changedAt}`}.`
  )
  deps.report(
    deps.words().t('notSavedChanged', {
      known: changedAt === null ? 'no' : 'yes',
      year: String(refusal.year),
      when: changedAt === null ? '' : timeWords(changedAt, deps.now(), deps.words()),
    })
  )
  return false
}

/**
 * Build the session.
 * @param deps - the store, the archive, the year and where to report
 * @returns the session
 */
export function createYearSession(deps: YearSessionDeps): YearSession {
  const cell: SessionCell = { phase: 'opening', blockedBecause: '', saving: false }
  return {
    openOnStartup: () => openOnStartup(deps, cell),
    save: () => saveYear(deps, cell),
    phase: () => cell.phase,
  }
}
