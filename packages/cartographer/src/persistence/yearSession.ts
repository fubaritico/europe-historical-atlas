import { reasonOf } from './errorReason'

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
 * The status-bar line for a year's contents — *"52 polities · 17 104 vertices"* (`s04`).
 * @param summary - the counts
 * @returns the line, without the verb
 */
export function describeYearContents(
  summary: Pick<SavedYearSummary, 'polities' | 'vertices'>
): string {
  const polities = `${summary.polities.toLocaleString('en-US')} ${summary.polities === 1 ? 'polity' : 'polities'}`
  const vertices = `${summary.vertices.toLocaleString('en-US')} ${summary.vertices === 1 ? 'vertex' : 'vertices'}`
  return `${polities} · ${vertices}`
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
  if (opened.year !== deps.year) {
    console.error(`${LOG_TAG} the folder ${yearName} holds year ${String(opened.year)}`)
    return `the folder ${yearName} holds year ${String(opened.year)}, so it was not opened and saving is blocked`
  }
  if (deps.store.getState().version !== versionAtStart) {
    console.warn(`${LOG_TAG} ${yearName} arrived after editing began, and was not opened`)
    return `${yearName} was read after you started drawing, so it was not opened and saving is blocked — reload to open it`
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
    block(deps, cell, `${yearName} could not be read, so saving is blocked: ${reasonOf(error)}`)
    return
  }

  if (opened === null) {
    cell.phase = 'ready'
    deps.report(`${yearName} has never been saved — starting from an empty map`)
    return
  }
  const refusal = whyNotOpen(deps, opened, versionAtStart)
  if (refusal !== null) {
    block(deps, cell, refusal)
    return
  }
  deps.store.getState().open(opened)
  cell.phase = 'ready'
  deps.report(`opened ${yearName} · ${describeYearContents(contentsOf(opened))}`)
}

/**
 * Why a save must not start now — or `null` when it may.
 * @param deps - the year
 * @param cell - the session's memory
 * @returns the sentence for the author, or `null`
 */
function whySaveRefused(deps: YearSessionDeps, cell: SessionCell): string | null {
  if (cell.phase === 'opening')
    return `still reading ${String(deps.year)} from disk — save again in a moment`
  if (cell.phase === 'blocked') return cell.blockedBecause
  if (cell.saving) return 'the previous save is still running'
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
    const summary = await deps.archive.save(deps.store.getState().document)
    deps.report(`saved ${String(summary.year)} · ${describeYearContents(summary)}`)
    return true
  } catch (error: unknown) {
    console.error(`${LOG_TAG} ${String(deps.year)} was not saved`, error)
    deps.report(`not saved: ${reasonOf(error)}`)
    return false
  } finally {
    cell.saving = false
  }
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
