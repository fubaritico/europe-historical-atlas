import { ZONES } from '../zones'

import type { Zone } from '../zones'

/**
 * Whether a name is one of the zones.
 * @param name - a name read from the address
 * @returns `true` when it names a zone
 */
const isZone = (name: string): name is Zone => (ZONES as readonly string[]).includes(name)

/**
 * The zones the address asks to fail: `?break=polities-panel`, several by commas or by repeating the parameter.
 * A name that is no zone is said to the console and left out — a typo in an address the dev typed himself.
 * @param search - the address's query, `location.search`
 * @returns the zones to break, none when the address names none
 */
export function readZoneBreaks(search: string): ReadonlySet<Zone> {
  const breaks = new Set<Zone>()
  const named = new URLSearchParams(search)
    .getAll('break')
    .flatMap((value) => value.split(','))
    .map((name) => name.trim())
    .filter((name) => name !== '')
  for (const name of named) {
    if (isZone(name)) breaks.add(name)
    else console.warn(`[Cartographer] ?break=${name} names no zone — one of: ${ZONES.join(', ')}`)
  }
  return breaks
}
