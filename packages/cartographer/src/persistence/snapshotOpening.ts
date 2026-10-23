import { saveYearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

import { timeWords } from './timeWords'
import { documentFromFiles } from './yearArchive'

import type { SnapshotSink, SnapshotSource } from './draft/draftStore'
import type { Report } from './notice'
import type { PersistenceWords } from './persistenceWords'
import type { YearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

/**
 * Open a kept snapshot in place of the page (CARTO-238, rung 2b, the dev's *"Open snapshot"*).
 *
 * **The page is kept first, or nothing opens.** Opening starts a fresh undo line, so ‹ctrl+Z› cannot bring the
 * page back — and the next draft would replace the one that held it. So the page as it is goes into the
 * snapshots before anything else; if it cannot, the opening is refused and said (*« il faut communiquer »*,
 * the dev, 2026-10-18). The snapshot chosen goes through the same readers as a year off disk.
 *
 * **What the author is told says what happened and what is possible, never where a file lies** (the dev,
 * 2026-10-18): the page was kept, and can be found in the list.
 */

/** The console tag this module's lines start with. */
const LOG_TAG = '[Cartographer]'

/** The store, reduced to what opening a snapshot reads and does. Structural, so a test hands in a literal. */
export interface SnapshotOpeningStore {
  /** The edition's current state. */
  getState: () => {
    /** The working document. */
    document: YearDocument
    /** Bumped by every action — how a change during the opening is seen. */
    version: number
    /** Open a document, starting a fresh undo line on it. */
    open: (document: YearDocument) => void
  }
}

/** What opening a snapshot needs. */
export interface SnapshotOpeningDeps {
  /** The store whose page is kept, then replaced. */
  store: SnapshotOpeningStore
  /** Where the page is kept and the snapshot read from. */
  snapshots: SnapshotSink & SnapshotSource
  /** The year being edited. */
  year: number
  /** The clock: for the page's snapshot, and to word the time of the one opened. */
  now: () => Date
  /** Where a notice for the author goes — a toast, or the alarm dialogue. */
  report: Report
  /** What it says — asked at each sentence, so it follows a change of language. */
  words: () => PersistenceWords
}

/**
 * Keep the page as a snapshot before it is replaced — or say it could not be, an alarm: nothing is opened.
 * @param deps - the store, the snapshots, the year, the clock, where to report
 * @returns `true` when the page is kept
 */
async function keepThePage(deps: SnapshotOpeningDeps): Promise<boolean> {
  try {
    await deps.snapshots.snapshot({
      year: deps.year,
      savedAt: deps.now().toISOString(),
      files: saveYearDocument(deps.store.getState().document),
    })
    return true
  } catch (error: unknown) {
    console.error(
      `${LOG_TAG} the page of ${String(deps.year)} could not be kept before opening a snapshot`,
      error
    )
    deps.report({ tone: 'alarm', topic: 'snapshot', text: deps.words().t('snapshotPageNotKept') })
    return false
  }
}

/**
 * Keep the page as a snapshot, then open the one chosen — or say why nothing was opened.
 * @param deps - the store, the snapshots, the year, the clock, where to report
 * @param chosen - the snapshot to open, as the list gave it
 * @param chosen.name - its name
 * @param chosen.takenAt - when it was taken, as an ISO string
 * @returns `true` when the snapshot is open
 */
export async function openSnapshot(
  deps: SnapshotOpeningDeps,
  chosen: { name: string; takenAt: string }
): Promise<boolean> {
  const versionKept = deps.store.getState().version
  if (!(await keepThePage(deps))) return false
  const when = timeWords(chosen.takenAt, deps.now(), deps.words(), { seconds: true })
  try {
    const snapshot = await deps.snapshots.readSnapshot(deps.year, chosen.name)
    const document = documentFromFiles(snapshot.files, `the snapshot ${chosen.name}`)
    // Drawn while the page was being kept: that gesture is in no copy, so the page must not be replaced.
    if (deps.store.getState().version !== versionKept) {
      console.warn(
        `${LOG_TAG} the snapshot ${chosen.name} was not opened: the page changed meanwhile`
      )
      // Nothing lost: the author opens the snapshot again.
      deps.report({
        tone: 'warning',
        topic: 'snapshot',
        text: deps.words().t('snapshotPageChanged'),
      })
      return false
    }
    deps.store.getState().open(document)
  } catch (error: unknown) {
    // The page is untouched, and kept as a snapshot besides — harmless, and said.
    console.error(`${LOG_TAG} the snapshot ${chosen.name} could not be opened`, error)
    deps.report({
      tone: 'alarm',
      topic: 'snapshot',
      text: deps.words().t('snapshotNotOpened', { when }),
    })
    return false
  }
  deps.report({
    tone: 'success',
    topic: 'snapshot',
    text: deps.words().t('snapshotOpened', { when }),
  })
  return true
}
