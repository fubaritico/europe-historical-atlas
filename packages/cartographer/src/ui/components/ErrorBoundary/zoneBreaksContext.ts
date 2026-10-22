import { createContext } from 'react'

import type { Zone } from './zones'

/**
 * The zones made to fail on purpose — `?break=<zone>` in the address, read at the composition root in
 * development only, so a boundary's fallback can be seen in its real place (the dev, 2026-10-22).
 *
 * **Empty without a provider, by design**: a build never provides it, and no zone breaks. Not a fallback for a
 * value that failed to arrive — no break is the ordinary case.
 */
export const ZoneBreaksContext = createContext<ReadonlySet<Zone>>(new Set())
