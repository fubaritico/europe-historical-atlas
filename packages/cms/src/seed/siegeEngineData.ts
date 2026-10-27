/**
 * The siege engins and when each was in use — the table the export draws every siege's artillery from (ATLAS-286,
 * `files/plans/contribution/siege-engines.md`). Not of one year: it holds for every century the atlas will show.
 *
 * **The dates are the cautious ones** (the dev, 2026-10-27, « soyons prudents »): an engin begins where the sources
 * call it common, not at its first trace — the counterweight trebuchet at the 1230s rather than 1217, the cannon at
 * its first breach of a wall rather than its first picture (1326). Found through Wikipedia's citations (*Trebuchet*,
 * *Mangonel*, *Cannon*, read 2026-10-27); the books themselves are not read yet, and Chase's title is from memory.
 */

import type { SeedSource } from './year1100'
import type { SiegeEngine } from '@europe-historical-atlas/core/data/siegeEngines'

/** One end of a period of use: a year, and whether it is approximate. */
export interface SeedPeriodEnd {
  /** The year. */
  year: number
  /** « vers » — the year is an estimate, with the contributor's default margin. */
  circa: boolean
}

/** A siege engin, found again by its French name. */
export interface SeedSiegeEngine {
  /** Its French name — also what finds it again. */
  name: string
  /** What the atlas draws. */
  engine: SiegeEngine
  /** When its use began. */
  from: SeedPeriodEnd
  /** When it ended; absent while it is still in use. */
  to?: SeedPeriodEnd
  /** The titles of the sources the period rests on. */
  sources: string[]
}

/** The works the periods rest on. */
export const ENGINE_SOURCES: readonly SeedSource[] = [
  {
    title: 'A History of the Early Medieval Siege, c. 450–1220',
    author: 'Peter Purton',
    publisher: 'Boydell Press',
    editionYear: 2009,
    kind: 'scholarly',
  },
  {
    title: 'A History of the Late Medieval Siege, 1200–1500',
    author: 'Peter Purton',
    publisher: 'Boydell Press',
    editionYear: 2010,
    kind: 'scholarly',
  },
  {
    title: 'Firearms: A Global History to 1700',
    author: 'Kenneth Chase',
    publisher: 'Cambridge University Press',
    editionYear: 2003,
    kind: 'scholarly',
  },
]

/** The engins, oldest first. */
export const SIEGE_ENGINES: readonly SeedSiegeEngine[] = [
  {
    // Adopted by the Franks in the 8th c., first named in the west at Tortosa, 808–809 (Purton 2009, p. 367); the
    // main engine until the 12th c. (p. 29); phased out with the other around the mid-15th c. (Purton 2010, p. 269).
    name: 'Trébuchet à traction (mangonneau)',
    engine: 'traction-trebuchet',
    from: { year: 808, circa: true },
    to: { year: 1450, circa: true },
    sources: [
      'A History of the Early Medieval Siege, c. 450–1220',
      'A History of the Late Medieval Siege, 1200–1500',
    ],
  },
  {
    // In England by 1217, « a common item in siege warfare » by the 1230s (Purton 2009, p. 387); phased out around the
    // mid-15th c. (Purton 2010, p. 269).
    name: 'Trébuchet à contrepoids',
    engine: 'counterweight-trebuchet',
    from: { year: 1230, circa: true },
    to: { year: 1450, circa: true },
    sources: [
      'A History of the Early Medieval Siege, c. 450–1220',
      'A History of the Late Medieval Siege, 1200–1500',
    ],
  },
  {
    // Anti-infantry weapons until around 1374, « when large cannons were recorded to have breached walls for the
    // first time in Europe » (Chase 2003, p. 59). Still in use: no end.
    name: 'Canon',
    engine: 'cannon',
    from: { year: 1374, circa: true },
    sources: ['Firearms: A Global History to 1700'],
  },
]
