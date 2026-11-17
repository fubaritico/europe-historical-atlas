/**
 * The cathedral's flat drawing, for afar — **a first draft, not yet judged on the legibility bench** (ATLAS-434): one
 * dark silhouette in the swords' 44 frame, as the others are. Its 3D model is `../meshes/cathedral`.
 */

import type { Drawing } from './drawing'

/**
 * The cathedral seen from afar, from the south: its two towers to the west as one block notched at the top, the nave
 * under its roof falling to the choir, the spire over the crossing.
 */
export const CATHEDRAL_DRAWING: Drawing = {
  // The swords' frame: the towers' foot and the spire's tip, rim included, inside it.
  viewBox: [0, 0, 44, 44],
  outlined: false,
  groups: [
    {
      transform: '',
      shapes: [
        // The towers and the nave, as one outline.
        {
          element:
            '<path d="M5 36 L5 11 L11 11 L11 15 L14 15 L14 11 L20 11 L20 21 L36 21 L40 28 L40 36 Z"/>',
          colour: 'silhouette',
        },
        // The spire.
        { element: '<path d="M26 22 L29.5 7 L33 22 Z"/>', colour: 'silhouette' },
      ],
    },
  ],
}
