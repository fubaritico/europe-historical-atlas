import { isAutosaveName } from '@europe-historical-atlas/core/data/mapName'

import type { DatedMap } from '../../../../persistence/yearArchive'

/** How many maps the start screen lists — Illustrator's own count of recent files is of that order. */
export const RECENT_COUNT = 12

/**
 * The last maps, as the start screen lists them (CARTO-536): the most recently written first, the automatic saves left
 * to *Open…* — one folder per opening, they would bury the maps (the coder's call, said to the dev on 2026-11-25). A
 * copy (`.copy.`) is a map its author made, and stays.
 * @param maps - every map, with its date
 * @returns at most {@link RECENT_COUNT} maps, newest first, names breaking a tie
 */
export function recentMaps(maps: readonly DatedMap[]): DatedMap[] {
  return maps
    .filter((map) => !isAutosaveName(map.name))
    .sort(
      (a, b) => b.changedAt - a.changedAt || a.name.localeCompare(b.name, 'en', { numeric: true })
    )
    .slice(0, RECENT_COUNT)
}
