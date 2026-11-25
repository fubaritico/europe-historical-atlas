import type { Report } from './notice'
import type { PersistenceWords } from './persistenceWords'
import type { YearSession } from './yearSession'

/**
 * Leave the map open for another, or for the start screen — *Open…* (`s19`, the dev, 2026-11-02), « Fermer la carte »
 * and « Nouvelle carte » (CARTO-536).
 *
 * **When the page holds changes, one question first**: *"You are about to open this map. Save the current map?"* — or
 * about closing it. [Yes] saves it as ‹ctrl+S› does, then goes; [No] goes without saving; dismissing the question goes
 * nowhere. A failed save goes nowhere either: its own alarm says why, and the page stays. A gesture drawn while the save
 * ran is in no file, so it refuses the leaving too.
 *
 * **Then the view is carried** and the editor reloads on the map — or on the start screen — so every part of it, the
 * session and the automatic save, starts as at startup. The map is kept in the tab, never in the address (CARTO-536).
 */

/** The author's answer to the question: save first, do not, or go nowhere. */
export type SaveFirstAnswer = 'yes' | 'no' | 'cancel'

/**
 * Why « save first? » is asked: a map about to be opened (`s19`, and a new map, CARTO-536), the map closed (CARTO-536),
 * or signing out (CARTO-535).
 */
export type SaveFirstReason =
  { kind: 'open'; map: string } | { kind: 'close' } | { kind: 'signOut' }

/** What leaving the map open needs. */
export interface MapChangeDeps {
  /** The page's session: what it is, whether it changed, and how it saves. */
  session: Pick<YearSession, 'map' | 'isModified' | 'save'>
  /** The store's version — how a gesture drawn meanwhile is seen. */
  version: () => number
  /**
   * Ask whether to save the current map before leaving it — the question dialogue, through a relay.
   * @param reason - the map about to be opened, or the map closed
   * @returns the answer
   */
  askSaveFirst: (reason: SaveFirstReason) => Promise<SaveFirstAnswer>
  /** Keep the view now on screen for the next page. */
  carryView: () => void
  /**
   * Reload the page on a map, or on the start screen — the map kept in the tab, then a reload; a spy in a test.
   * @param map - the map to open, or `null` for the start screen
   */
  go: (map: string | null) => void
  /** Where a notice for the author goes. */
  report: Report
  /** What it says. */
  words: () => PersistenceWords
}

/** The console tag this module's lines start with. */
const LOG_TAG = '[Cartographer]'

/**
 * Ask, and save if asked to — whether the page may leave the map open, or must stay.
 * @param deps - the session, the question, where to report
 * @param reason - why the page would leave it
 * @returns `true` when the page may leave it
 */
export async function leaveMap(deps: MapChangeDeps, reason: SaveFirstReason): Promise<boolean> {
  if (!deps.session.isModified()) return true
  const where =
    reason.kind === 'open' ? `${reason.map} not opened` : `${deps.session.map()} not closed`
  let answer: SaveFirstAnswer
  try {
    answer = await deps.askSaveFirst(reason)
  } catch (error: unknown) {
    // A question already up (the relay busy) — a wiring fault, said loudly; the page stays.
    console.error(`${LOG_TAG} ${where}: the question before leaving could not be asked`, error)
    deps.report({ tone: 'alarm', topic: 'year', text: deps.words().t('openAskFailed') })
    return false
  }
  if (answer === 'cancel') {
    console.warn(`${LOG_TAG} ${where}: cancelled at the question`)
    return false
  }
  if (answer === 'no') return true
  const versionSaved = deps.version()
  // A failed save is said by its own alarm; the page stays.
  if (!(await deps.session.save())) return false
  if (deps.version() !== versionSaved) {
    console.warn(`${LOG_TAG} ${where}: the page changed while it was being saved`)
    deps.report({ tone: 'warning', topic: 'year', text: deps.words().t('mapPageChanged') })
    return false
  }
  return true
}

/**
 * Ask, save if asked to, then reload the editor on the map chosen — or say why it stays where it is.
 * @param deps - the session, the question, the view, the reload, where to report
 * @param map - the map to open
 * @returns `true` when the editor is on its way to the map
 */
export async function changeMap(deps: MapChangeDeps, map: string): Promise<boolean> {
  if (map === deps.session.map()) {
    // The list writes the open map as open, never as a choice; reaching here is a wiring fault.
    console.warn(`${LOG_TAG} ${map} is already open — nothing to change`)
    return false
  }
  if (!(await leaveMap(deps, { kind: 'open', map }))) return false
  deps.carryView()
  deps.go(map)
  return true
}

/**
 * « Fermer la carte »: ask, save if asked to, then reload on the start screen — or say why the map stays open.
 * @param deps - the session, the question, the view, the reload, where to report
 * @returns `true` when the editor is on its way to the start screen
 */
export async function closeMap(deps: MapChangeDeps): Promise<boolean> {
  if (!(await leaveMap(deps, { kind: 'close' }))) return false
  // Kept for the next map opened in this tab, as Open… carries it.
  deps.carryView()
  deps.go(null)
  return true
}
