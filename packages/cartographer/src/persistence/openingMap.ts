import { isMapName } from '@europe-historical-atlas/core/data/mapName'

/**
 * Which map the Cartographer opens on, read from the address — `?map=1100-backup-2026-11-02` — so *Open…* reopens it on
 * another map and *Save as…* keeps the address on the map the page has become (`s19`, the dev, 2026-11-02: *"a map
 * exists, there is a folder for that map, I can open that map"*).
 *
 * **No `map` in the address is the ordinary case**, not a failure: the editor opens on its first map. **A `map` that
 * cannot be a map's name is a defect** — only the editor writes the address, so a hand-typed or broken one is refused
 * loudly rather than read as the first map, which would have the author drawing on 1100 while believing it another.
 * A name that is well formed but names no folder is the session's to say, once it has listed the maps.
 */

/** The name of the address's parameter. */
const PARAMETER = 'map'

/**
 * The map the address asks for.
 * @param search - the address's query, `window.location.search` — with or without its `?`
 * @param firstMap - the map to open when the address names none
 * @returns the map's name
 * @throws Error when the address names a `map` that cannot be one, saying what it read
 */
export function openingMapOf(search: string, firstMap: string): string {
  const asked = new URLSearchParams(search).get(PARAMETER)
  if (asked === null) return firstMap
  if (!isMapName(asked)) {
    throw new Error(
      `[Cartographer] the address asks for the map « ${asked} », which cannot be a map's name — open a map with Open…`
    )
  }
  return asked
}

/**
 * The address that opens the Cartographer on a map, the rest of the query kept.
 * @param search - the current query, `window.location.search`
 * @param map - the map to open
 * @returns the query to go to, starting with `?`
 */
export function addressForMap(search: string, map: string): string {
  const parameters = new URLSearchParams(search)
  parameters.set(PARAMETER, map)
  // The address of this morning named a year (`?year=`): a map's address names its map, and only that.
  parameters.delete('year')
  return `?${parameters.toString()}`
}
