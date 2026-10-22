import { use } from 'react'

import { ZoneBreaksContext } from '../zoneBreaksContext'

import type { Zone } from '../zones'
import type { ReactNode } from 'react'

/** What the tripwire guards. */
interface TripwireProps {
  /** The zone it stands in. */
  zone: Zone
  /** The zone's content. */
  children: ReactNode
}

/**
 * The zone's content — unless the address asked for this zone to fail, in which case its render throws, inside
 * its boundary, as a real failure would.
 * @param props - the zone and its content
 * @param props.zone - the zone it stands in
 * @param props.children - the zone's content
 * @returns the content
 */
export function Tripwire({ zone, children }: TripwireProps): ReactNode {
  // Context
  const breaks = use(ZoneBreaksContext)

  // Guards — `DEV` first, so a build drops the throw along with the reading of the address in `main.tsx`.
  if (import.meta.env.DEV && breaks.has(zone))
    throw new Error(`broken on purpose by ?break=${zone} in the address`)

  // Render
  return children
}
