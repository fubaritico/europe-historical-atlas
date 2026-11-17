/**
 * The cathedral's candidates on the icons' bench, `/icons.html?cathedral` (ATLAS-288, ATLAS-434): one today, the model
 * the map's preview stands (`scene/events/icons/meshes/cathedral`).
 */

import { cathedralParts } from '../scene/events/icons/meshes/cathedral'

import type { Part } from '../scene/events/icons/meshes/parts'

/** One candidate: its letter, what it tries, and its parts. */
export interface CathedralCandidate {
  /** The letter he names it by. */
  readonly letter: string
  /** Its one idea, in his language. */
  readonly idea: string
  /** Its parts, built as the map builds a kind's. */
  readonly parts: () => Part[]
}

/** The candidates tried for the councils' icon. */
export const CATHEDRAL_CANDIDATES: readonly CathedralCandidate[] = [
  {
    letter: 'A',
    idea: 'nef et bas-côtés, transept à tourelles, chœur à chapelles, deux tours, flèche, rosaces',
    parts: cathedralParts,
  },
]
