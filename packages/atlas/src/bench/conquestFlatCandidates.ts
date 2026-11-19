/**
 * The conquest's flat drawing, candidates for the legibility bench (ATLAS-477, the dev, 2026-11-19: *"ce serait bien
 * d'utiliser une oriflamme"*) — a banner, a pennant or a flag, each a dark silhouette in the swords' 44 frame, a
 * light band set on its cloth where one helps it read. Tried on `/svg-icons.html`; the one he names moves to
 * `scene/events/icons/flat/`, the others go.
 */

import type { Drawing, FlatShape } from '../scene/events/icons/flat/drawing'

/** A staff standing on the left of the frame, a ball on its tip — what a cloth flies from. */
const SIDE_STAFF: FlatShape[] = [
  { element: '<path d="M5 6 L9 6 L9 43 L5 43 Z"/>', colour: 'silhouette' },
  { element: '<circle cx="7" cy="4" r="3"/>', colour: 'silhouette' },
]

/** A staff in the middle of the frame with its crossbar, a ball on its tip — what a banner hangs from. */
const CROSS_STAFF: FlatShape[] = [
  { element: '<path d="M20 4 L24 4 L24 43 L20 43 Z"/>', colour: 'silhouette' },
  { element: '<circle cx="22" cy="3.2" r="3"/>', colour: 'silhouette' },
  { element: '<path d="M5 7 L39 7 L39 11 L5 11 Z"/>', colour: 'silhouette' },
]

/**
 * A drawing in the swords' frame, flat colours, no outline.
 * @param shapes - its shapes, back to front
 * @returns the drawing
 */
function inFrame(shapes: FlatShape[]): Drawing {
  return { viewBox: [0, 0, 44, 44], outlined: false, groups: [{ transform: '', shapes }] }
}

/** The candidates, each with its letter and a few words — what the bench lists under the map's own drawings. */
export const CONQUEST_FLAT_CANDIDATES: [string, Drawing][] = [
  [
    'Conquête A — oriflamme sur sa hampe, deux pointes (queue d’aronde)',
    inFrame([
      ...SIDE_STAFF,
      { element: '<path d="M9 7 L43 7 L34 15.5 L43 24 L9 24 Z"/>', colour: 'silhouette' },
    ]),
  ],
  [
    'Conquête B — oriflamme sur sa hampe, deux pointes, une bande claire',
    inFrame([
      ...SIDE_STAFF,
      { element: '<path d="M9 7 L43 7 L34 15.5 L43 24 L9 24 Z"/>', colour: 'silhouette' },
      { element: '<path d="M12 13.5 L33 13.5 L31 15.5 L33 17.5 L12 17.5 Z"/>', colour: 'rim' },
    ]),
  ],
  [
    'Conquête C — bannière pendue à sa traverse, queue d’aronde',
    inFrame([
      ...CROSS_STAFF,
      { element: '<path d="M8 11 L36 11 L36 40 L22 30 L8 40 Z"/>', colour: 'silhouette' },
    ]),
  ],
  [
    'Conquête D — bannière pendue à sa traverse, trois langues',
    inFrame([
      ...CROSS_STAFF,
      {
        element:
          '<path d="M8 11 L36 11 L36 40 L28.5 40 L28.5 31 L25.5 31 L25.5 40 L18.5 40 L18.5 31 L15.5 31 L15.5 40 L8 40 Z"/>',
        colour: 'silhouette',
      },
      { element: '<path d="M11 15 L33 15 L33 18.5 L11 18.5 Z"/>', colour: 'rim' },
    ]),
  ],
  [
    'Conquête E — bannière pendue à sa traverse, en pointe, un chevron clair',
    inFrame([
      ...CROSS_STAFF,
      { element: '<path d="M8 11 L36 11 L36 29 L22 41 L8 29 Z"/>', colour: 'silhouette' },
      { element: '<path d="M11 24 L22 33.5 L33 24 L33 28 L22 37.5 L11 28 Z"/>', colour: 'rim' },
    ]),
  ],
  [
    'Conquête F — fanion en triangle sur sa hampe',
    inFrame([
      ...SIDE_STAFF,
      { element: '<path d="M9 6 L43 15.5 L9 25 Z"/>', colour: 'silhouette' },
    ]),
  ],
  [
    'Conquête G — drapeau qui flotte sur sa hampe',
    inFrame([
      ...SIDE_STAFF,
      {
        element:
          '<path d="M9 8 C15 3 21 3 26 7 C31 11 37 11 43 6 L43 22 C37 27 31 27 26 23 C21 19 15 19 9 24 Z"/>',
        colour: 'silhouette',
      },
    ]),
  ],
  [
    'Conquête H — oriflamme qui flotte, deux pointes',
    inFrame([
      ...SIDE_STAFF,
      {
        element:
          '<path d="M9 8 C15 3 21 3 26 7 C31 11 37 11 43 6 L35 14.5 L43 22 C37 27 31 27 26 23 C21 19 15 19 9 24 Z"/>',
        colour: 'silhouette',
      },
    ]),
  ],
]
