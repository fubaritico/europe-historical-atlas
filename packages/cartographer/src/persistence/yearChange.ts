import { addressForYear } from './openingYear'
import { keepThePage, pageChangedSince } from './snapshotOpening'

import type { SnapshotOpeningDeps } from './snapshotOpening'

/**
 * Open another year in place of the page — *Open…* (the dev, 2026-11-02: « on fait Open, 1100, 1200 »).
 *
 * **The page is kept first, or nothing changes**, as for a snapshot (`snapshotOpening.ts`): reloading on another year
 * throws the page away, so it goes into its year's snapshots before anything else; if it cannot, the change is refused
 * and said — `keepThePage` raises the alarm. A gesture drawn while the page was on its way refuses the change too
 * (`pageChangedSince`): it is in no copy. Then the editor reloads on the year asked, the address carrying it
 * (`openingYear.ts`), so every part of it — the session, the drafts, the snapshots — starts on that year, as at startup.
 */

/** What changing the year needs: what keeping the page needs, the current query, and how to go to an address. */
export interface YearChangeDeps extends SnapshotOpeningDeps {
  /** The current query, `window.location.search`. */
  search: string
  /**
   * Go to an address — `window.location.assign` in the page, a spy in a test.
   * @param address - the query to go to
   */
  go: (address: string) => void
}

/**
 * Keep the page, then reload the editor on the year chosen — or say why it stays where it is.
 * @param deps - the store, the snapshots, the year open, the clock, where to report, the query, how to go
 * @param year - the year to open
 * @returns `true` when the editor is on its way to the year
 */
export async function changeYear(deps: YearChangeDeps, year: number): Promise<boolean> {
  if (year === deps.year) {
    // The list offers the open year as already open, never as a choice; reaching here is a wiring fault.
    console.warn(`[Cartographer] ${String(year)} is already open — nothing to change`)
    return false
  }
  const versionKept = deps.store.getState().version
  if (!(await keepThePage(deps))) return false
  // Drawn while the page was being kept: that gesture is in no copy, and the reload would throw it away.
  if (pageChangedSince(deps, versionKept, `the year ${String(year)}`, 'yearPageChanged'))
    return false
  deps.go(addressForYear(deps.search, year))
  return true
}
