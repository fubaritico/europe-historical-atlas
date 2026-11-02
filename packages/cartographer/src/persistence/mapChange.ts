import { addressForMap } from './openingMap'

import type { Report } from './notice'
import type { PersistenceWords } from './persistenceWords'
import type { YearSession } from './yearSession'

/**
 * Open another map in place of the page — *Open…* (`s19`, the dev, 2026-11-02).
 *
 * **When the page holds changes, one question first**: *"You are about to open this map. Save the current map?"* —
 * [Yes] saves it as ‹ctrl+S› does, then opens; [No] opens without saving; dismissing the question opens nothing. A
 * failed save opens nothing either: its own alarm says why, and the page stays. A gesture drawn while the save ran is
 * in no file, so it refuses the opening too.
 *
 * **Then the view is carried** and the editor reloads on the map's address, so every part of it — the session, the
 * automatic save — starts on that map, as at startup.
 */

/** The author's answer to the question: save first, do not, or open nothing. */
export type SaveFirstAnswer = 'yes' | 'no' | 'cancel'

/** What changing the map needs. */
export interface MapChangeDeps {
  /** The page's session: what it is, whether it changed, and how it saves. */
  session: Pick<YearSession, 'map' | 'isModified' | 'save'>
  /** The store's version — how a gesture drawn meanwhile is seen. */
  version: () => number
  /**
   * Ask whether to save the current map before opening another — the question dialogue, through a relay.
   * @param map - the map about to be opened
   * @returns the answer
   */
  askSaveFirst: (map: string) => Promise<SaveFirstAnswer>
  /** Keep the view now on screen for the next page. */
  carryView: () => void
  /** The current query, `window.location.search`. */
  search: string
  /**
   * Go to an address — `window.location.assign` in the page, a spy in a test.
   * @param address - the query to go to
   */
  go: (address: string) => void
  /** Where a notice for the author goes. */
  report: Report
  /** What it says. */
  words: () => PersistenceWords
}

/** The console tag this module's lines start with. */
const LOG_TAG = '[Cartographer]'

/**
 * Ask, save if asked to, then reload the editor on the map chosen — or say why it stays where it is.
 * @param deps - the session, the question, the view, the address, where to report
 * @param map - the map to open
 * @returns `true` when the editor is on its way to the map
 */
export async function changeMap(deps: MapChangeDeps, map: string): Promise<boolean> {
  if (map === deps.session.map()) {
    // The list writes the open map as open, never as a choice; reaching here is a wiring fault.
    console.warn(`${LOG_TAG} ${map} is already open — nothing to change`)
    return false
  }
  if (deps.session.isModified()) {
    let answer: SaveFirstAnswer
    try {
      answer = await deps.askSaveFirst(map)
    } catch (error: unknown) {
      // A question already up (the relay busy) — a wiring fault, said loudly; the page stays.
      console.error(
        `${LOG_TAG} ${map} not opened: the question before opening could not be asked`,
        error
      )
      deps.report({ tone: 'alarm', topic: 'year', text: deps.words().t('openAskFailed') })
      return false
    }
    if (answer === 'cancel') {
      console.warn(`${LOG_TAG} opening ${map} cancelled at the question`)
      return false
    }
    if (answer === 'yes') {
      const versionSaved = deps.version()
      // A failed save is said by its own alarm; the page stays.
      if (!(await deps.session.save())) return false
      if (deps.version() !== versionSaved) {
        console.warn(`${LOG_TAG} ${map} not opened: the page changed while it was being saved`)
        deps.report({ tone: 'warning', topic: 'year', text: deps.words().t('mapPageChanged') })
        return false
      }
    }
  }
  deps.carryView()
  deps.go(addressForMap(deps.search, map))
  return true
}
