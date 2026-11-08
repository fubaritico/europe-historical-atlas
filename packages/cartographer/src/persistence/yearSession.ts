import { copyName, isNewMapName, yearNamed } from '@europe-historical-atlas/core/data/mapName'
import { ANSWER_TIMEOUT_MS } from '@europe-historical-atlas/core/utils/fetchWithin'

import { awaitConfirmation } from './awaitConfirmation'
import { timeWords } from './timeWords'
import { YearChangedOnDisk } from './yearArchive'

import type { ConfirmationTimers } from './awaitConfirmation'
import type { Notice, Report } from './notice'
import type { PersistenceWords } from './persistenceWords'
import type { SavedYearSummary, YearArchive } from './yearArchive'
import type { YearDocument } from '@europe-historical-atlas/core/data/yearDocument'

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
 * Every message goes to `report` as a notice — a toast, or a dialogue when the year is at risk (`notice.ts`) —
 * and every refusal also goes to the console (`rules/error-handling.md`, *no refusal is silent*).
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

/** What the author is asked when a save would write over a map changed on disk (CARTO-238, rung 3). */
export interface OverwriteQuestion {
  /** The map. */
  map: string
  /** When its files changed, as an ISO time — the dialogue words it — or `null` when they are gone from disk. */
  changedAt: string | null
}

/** What the session needs. */
export interface YearSessionDeps {
  /** The store whose document is opened and saved. */
  store: SessionStore
  /** Where the years are kept. */
  archive: YearArchive
  /** The map this page opens on — the address's (`s19`); *Save as…* changes it afterwards. */
  map: string
  /**
   * Told when *Save as…* has made the page another map — the address follows it.
   * @param map - the map the page now is
   */
  onMapChanged: (map: string) => void
  /** Where a notice for the author goes — a toast, or the alarm dialogue. */
  report: Report
  /**
   * Ask whether to write over a year changed on disk — the dialogue, through a question relay.
   * @returns `true` for [Overwrite], `false` for [Cancel]
   */
  confirmOverwrite: (question: OverwriteQuestion) => Promise<boolean>
  /** The clock, to word when the year changed. */
  now: () => Date
  /** What it says — asked at each sentence, so it follows a change of language. */
  words: () => PersistenceWords
  /** The timer that says a save the server has not confirmed in time (REPO-275). */
  timers: ConfirmationTimers
}

/**
 * Where the session stands.
 *
 * `opening` — the start-up read is in flight. `ready` — saving is allowed. `blocked` — a save would risk
 * the year on disk, for the reason kept beside it.
 */
export type SessionPhase = 'opening' | 'ready' | 'blocked'

/** What *Save as…* answers: done, or why the name was refused — said under the field (`s19`). */
export type SaveAsOutcome = { done: true } | { done: false; refusal: string | null }

/** The session: the gestures on the map on disk, and a way to ask where it stands. */
export interface YearSession {
  /**
   * Open the map if it is on disk; otherwise leave the empty map as it is, saving blocked, and say so.
   * Resolves either way: every failure is reported, none is thrown.
   */
  openOnStartup: () => Promise<void>
  /**
   * Save the working document as its map.
   * Resolves either way: a refused or failed save is reported, never thrown.
   * @returns `true` when the map was written — what *Open…* reads before opening another
   */
  save: () => Promise<boolean>
  /**
   * *Save as…* (`s19`): save the map the page is, then write the page as a new map and go on working on it.
   * @param name - the new map's name, as typed
   * @returns done; or the refusal to show under the field — `null` when the failure was said elsewhere (the save
   *   of the current map failed, and its alarm is up)
   */
  saveAs: (name: string) => Promise<SaveAsOutcome>
  /**
   * *Save a copy* (`s19`): write the page as `<map>.copy.<date and time>`, the page staying the map it is.
   * @returns `true` when the copy was written
   */
  saveCopy: () => Promise<boolean>
  /**
   * Save the map the page is, saying nothing when it works — the automatic save's second write (the dev, 2026-11-02:
   * *"like in any software, like in IntelliJ, as you go, it saves"*). A save already running is left to finish, said
   * in the console only.
   * @returns once written, or skipped
   * @throws what the write throws, a map changed on disk included — the automatic save reports it, once
   */
  saveSilently: () => Promise<void>
  /** The map the page is now. */
  map: () => string
  /**
   * Whether the page holds changes since it was opened or last saved — what asks before opening another map. Never
   * while saving is blocked: there is nothing it could save.
   */
  isModified: () => boolean
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
  /** The map the page is. */
  map: string
  /** The store's version when the page was last opened or saved as its map — `null` before either. */
  savedVersion: number | null
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
  deps.report({ tone: 'alarm', topic: 'year', text: reason })
}

/**
 * Why a year read off disk must not be opened, now that it has arrived — or `null` when it may be.
 *
 * Two reasons, each logged: the folder holds another year (the next save would write elsewhere), or the
 * author has edited since the read began (opening would throw that work away).
 * @param deps - the store and the year
 * @param cell
 * @param opened - what was read
 * @param versionAtStart - the store's version when the read began
 * @returns the sentence that blocks saving, or `null`
 */
function whyNotOpen(
  deps: YearSessionDeps,
  cell: SessionCell,
  opened: YearDocument,
  versionAtStart: number
): string | null {
  const yearName = cell.map
  const { t } = deps.words()
  // Only a map named as a year must hold it: a working map holds whatever year it was copied from (`s19`).
  const named = yearNamed(cell.map)
  if (named !== null && opened.year !== named) {
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
  const yearName = cell.map
  const versionAtStart = deps.store.getState().version
  let opened: YearDocument | null = null
  try {
    const listed = await deps.archive.listMaps()
    if (listed.includes(cell.map)) opened = await deps.archive.open(cell.map)
  } catch (error: unknown) {
    console.error(`${LOG_TAG} ${yearName} could not be read from disk`, error)
    block(deps, cell, deps.words().t('unreadable', { year: yearName }))
    return
  }

  if (opened === null) {
    // A map is a folder of `years/` (`s19`): an address naming none opens nothing, rather than an empty map a save
    // would then write under a name nobody chose.
    console.warn(`${LOG_TAG} no map named ${yearName} in years/`)
    block(deps, cell, deps.words().t('noSuchMap', { map: yearName }))
    return
  }
  const refusal = whyNotOpen(deps, cell, opened, versionAtStart)
  if (refusal !== null) {
    block(deps, cell, refusal)
    return
  }
  deps.store.getState().open(opened)
  cell.phase = 'ready'
  cell.savedVersion = deps.store.getState().version
  deps.report({
    tone: 'success',
    topic: 'year',
    text: deps.words().t('opened', {
      year: yearName,
      contents: describeYearContents(contentsOf(opened), deps.words()),
    }),
  })
}

/**
 * Why a save must not start now — or `null` when it may. A wait is a warning, a block stays an alarm.
 * @param deps - the year
 * @param cell - the session's memory
 * @returns the notice for the author, or `null`
 */
function whySaveRefused(deps: YearSessionDeps, cell: SessionCell): Notice | null {
  const { t } = deps.words()
  if (cell.phase === 'opening')
    return { tone: 'warning', topic: 'year', text: t('stillReading', { year: cell.map }) }
  if (cell.phase === 'blocked') return { tone: 'alarm', topic: 'year', text: cell.blockedBecause }
  if (cell.saving) return { tone: 'warning', topic: 'year', text: t('saveRunning') }
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
    console.warn(`${LOG_TAG} save refused: ${refusal.text}`)
    deps.report(refusal)
    return false
  }
  cell.saving = true
  try {
    const version = deps.store.getState().version
    const written = await writeYear(deps, cell.map, false)
    if (written) cell.savedVersion = version
    return written
  } catch (error: unknown) {
    // The question itself failed — the relay busy, a time out of range. `save` resolves either way, as
    // its contract says: reported like any other failed save, never thrown.
    console.error(`${LOG_TAG} ${cell.map} was not saved`, error)
    deps.report({ tone: 'alarm', topic: 'year', text: deps.words().t('notSaved') })
    return false
  } finally {
    cell.saving = false
  }
}

/**
 * Save the working document over its map, with no word on success; see {@link YearSession.saveSilently}.
 * @param deps - the store and the archive
 * @param cell - the session's memory
 * @returns once written, or skipped
 */
async function saveSilently(deps: YearSessionDeps, cell: SessionCell): Promise<void> {
  if (cell.phase !== 'ready' || cell.saving) {
    console.warn(
      `${LOG_TAG} automatic save of ${cell.map} skipped: ${cell.saving ? 'a save is running' : cell.phase}`
    )
    return
  }
  cell.saving = true
  try {
    const version = deps.store.getState().version
    await deps.archive.save(deps.store.getState().document, cell.map)
    cell.savedVersion = version
  } finally {
    cell.saving = false
  }
}

/**
 * Write the working document — and, when the year changed on disk since it was opened, ask before writing
 * over it (CARTO-238, rung 3). Every outcome is reported; none is thrown.
 * @param deps - the store, the archive, where to report and whom to ask
 * @param map - the map to write
 * @param overwrite - write even over a map changed on disk
 * @returns `true` when the map was written
 */
async function writeYear(deps: YearSessionDeps, map: string, overwrite: boolean): Promise<boolean> {
  try {
    // The document is taken now, not when ‹ctrl+S› was pressed: after [Overwrite] it is the page as it is.
    // Never cut, since it may land; said when the server has not confirmed it in time (the dev, REPO-275).
    const summary = await awaitConfirmation(
      deps.archive.save(deps.store.getState().document, map, { overwrite }),
      {
        timers: deps.timers,
        delayMs: ANSWER_TIMEOUT_MS,
        late: () => {
          console.error(`${LOG_TAG} ${map}: no confirmation of the save yet`)
          deps.report({
            tone: 'alarm',
            topic: 'year',
            text: deps.words().t('saveUnconfirmed', { year: map }),
          })
        },
      }
    )
    deps.report({
      tone: 'success',
      topic: 'year',
      text: deps.words().t('saved', {
        year: summary.map,
        contents: describeYearContents(summary, deps.words()),
      }),
    })
    return true
  } catch (error: unknown) {
    if (error instanceof YearChangedOnDisk && !overwrite) return askBeforeOverwriting(deps, error)
    console.error(`${LOG_TAG} ${map} was not saved`, error)
    deps.report({ tone: 'alarm', topic: 'year', text: deps.words().t('notSaved') })
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
  if (await deps.confirmOverwrite({ map: refusal.map, changedAt }))
    return writeYear(deps, refusal.map, true)
  console.warn(
    `${LOG_TAG} save cancelled: ${refusal.map} was changed on disk${changedAt === null ? '' : ` at ${changedAt}`}.`
  )
  // The author's own answer: nothing is lost, ‹ctrl+S› asks again.
  deps.report({
    tone: 'warning',
    topic: 'year',
    text: deps.words().t('notSavedChanged', {
      known: changedAt === null ? 'no' : 'yes',
      year: refusal.map,
      when: changedAt === null ? '' : timeWords(changedAt, deps.now(), deps.words()),
    }),
  })
  return false
}

/**
 * Why a name cannot be what *Save as…* writes, said under the field — or `null` when it can (`s19`).
 * @param deps - the store and the words
 * @param cell - the session's memory
 * @param name - the name typed
 * @returns the sentence, or `null`
 */
function whyNotSaveAs(deps: YearSessionDeps, cell: SessionCell, name: string): string | null {
  const { t } = deps.words()
  if (name === cell.map) return t('saveAsSameName')
  if (!isNewMapName(name)) return t('saveAsBadName')
  // A map named as a year is the atlas's map of that year: it must hold it (the dev's « non », 2026-11-02).
  const named = yearNamed(name)
  const held = deps.store.getState().document.year
  if (named !== null && named !== held) return t('saveAsOtherYear', { name, held: String(held) })
  return null
}

/**
 * Write the page as a map it is not — *Save as…*'s new map, *Save a copy*'s copy — said like a save when the server has
 * not confirmed it in time (REPO-275). A refusal is thrown on, `YearChangedOnDisk` included: the caller words it.
 * @param deps - the store, the archive, the timers, where to report
 * @param map - the map to write
 * @returns what was written
 */
function writeNewMap(deps: YearSessionDeps, map: string): Promise<SavedYearSummary> {
  return awaitConfirmation(deps.archive.save(deps.store.getState().document, map), {
    timers: deps.timers,
    delayMs: ANSWER_TIMEOUT_MS,
    late: () => {
      console.error(`${LOG_TAG} ${map}: no confirmation of the save yet`)
      deps.report({
        tone: 'alarm',
        topic: 'year',
        text: deps.words().t('saveUnconfirmed', { year: map }),
      })
    },
  })
}

/**
 * *Save as…*: the current map saved first, then the page written as a new map that must not exist yet, and the page
 * made that map.
 * @param deps - the store, the archive, where to report, whom to tell of the new map
 * @param cell - the session's memory
 * @param name - the new map's name
 * @returns done, or the refusal
 */
async function saveAs(
  deps: YearSessionDeps,
  cell: SessionCell,
  name: string
): Promise<SaveAsOutcome> {
  const refusal = whyNotSaveAs(deps, cell, name)
  if (refusal !== null) {
    console.warn(`${LOG_TAG} save as refused: ${refusal}`)
    return { done: false, refusal }
  }
  // The map it starts from is saved first (the dev: « ça déclenche l'enregistrement de la carte à partir de laquelle
  // on a fait Save as »); a failed save is said by its own alarm, and nothing else happens.
  if (!(await saveYear(deps, cell))) return { done: false, refusal: null }
  // Held across the second write too: a ‹ctrl+S› meanwhile would save under the name the page is leaving.
  cell.saving = true
  try {
    const version = deps.store.getState().version
    const summary = await writeNewMap(deps, name)
    cell.map = name
    cell.savedVersion = version
    deps.onMapChanged(name)
    deps.report({
      tone: 'success',
      topic: 'year',
      text: deps
        .words()
        .t('saved', { year: summary.map, contents: describeYearContents(summary, deps.words()) }),
    })
    return { done: true }
  } catch (error: unknown) {
    // A map of that name is already there: Save as never writes over another map.
    if (error instanceof YearChangedOnDisk) {
      console.warn(`${LOG_TAG} save as refused: a map named ${name} exists`)
      return { done: false, refusal: deps.words().t('saveAsTaken', { name }) }
    }
    console.error(`${LOG_TAG} ${name} was not written`, error)
    const reason = error instanceof Error ? error.message : String(error)
    return { done: false, refusal: deps.words().t('saveAsFailed', { reason }) }
  } finally {
    cell.saving = false
  }
}

/**
 * *Save a copy*: the page written as `<map>.copy.<date and time>`; the page stays its map, still modified.
 * @param deps - the store, the archive, the clock, where to report
 * @param cell - the session's memory
 * @returns `true` when the copy was written
 */
async function saveCopy(deps: YearSessionDeps, cell: SessionCell): Promise<boolean> {
  const refusal = whySaveRefused(deps, cell)
  if (refusal !== null) {
    console.warn(`${LOG_TAG} copy refused: ${refusal.text}`)
    deps.report(refusal)
    return false
  }
  const name = copyName(cell.map, deps.now())
  try {
    await writeNewMap(deps, name)
    deps.report({ tone: 'success', topic: 'year', text: deps.words().t('copySaved', { name }) })
    return true
  } catch (error: unknown) {
    console.error(`${LOG_TAG} the copy ${name} was not written`, error)
    deps.report({ tone: 'alarm', topic: 'year', text: deps.words().t('copyNotSaved') })
    return false
  }
}

/**
 * Build the session.
 * @param deps - the store, the archive, the map and where to report
 * @returns the session
 */
export function createYearSession(deps: YearSessionDeps): YearSession {
  const cell: SessionCell = {
    phase: 'opening',
    blockedBecause: '',
    saving: false,
    map: deps.map,
    savedVersion: null,
  }
  return {
    openOnStartup: () => openOnStartup(deps, cell),
    save: () => saveYear(deps, cell),
    saveAs: (name) => saveAs(deps, cell, name),
    saveCopy: () => saveCopy(deps, cell),
    saveSilently: () => saveSilently(deps, cell),
    map: () => cell.map,
    // A blocked page can save nothing: asking « save first? » would only offer a [Yes] that fails (review QUAL-002).
    isModified: () =>
      cell.phase !== 'blocked' && cell.savedVersion !== deps.store.getState().version,
    phase: () => cell.phase,
  }
}
