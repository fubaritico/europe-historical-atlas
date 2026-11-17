/**
 * The cathedral's flat drawing, for afar (ATLAS-434): its west front, the two towers and the wall between them —
 * one dark silhouette in the swords' 44 frame, its rose, its door and the towers' openings set on it in the rim's
 * light. The dev, 2026-11-17, of the first draft, the cathedral seen from the side, which read as a factory: « tu peux
 * faire le fronton avec les deux tours […] c'est beaucoup plus compréhensible ». **Not judged on the legibility
 * bench.** Its 3D model is `../meshes/cathedral`.
 */

import type { Drawing } from './drawing'

/** The cathedral seen from afar, from the west: two square towers, the lower wall between them, a rose over a door. */
export const CATHEDRAL_DRAWING: Drawing = {
  // The swords' frame: the towers' foot and their tops, rim included, inside it.
  viewBox: [0, 0, 44, 44],
  outlined: false,
  groups: [
    {
      transform: '',
      shapes: [
        // The front as one outline: up the left tower, down to the wall between the two, up the right tower.
        {
          element: '<path d="M6 39 L6 7 L18 7 L18 17 L26 17 L26 7 L38 7 L38 39 Z"/>',
          colour: 'silhouette',
        },
        // The rose, and the great door under it.
        { element: '<circle cx="22" cy="24" r="3.4"/>', colour: 'rim' },
        {
          element: '<path d="M19.5 39 L19.5 33 A2.5 2.5 0 0 1 24.5 33 L24.5 39 Z"/>',
          colour: 'rim',
        },
        // Each tower's tall opening.
        { element: '<rect x="10" y="12" width="4" height="11" rx="2"/>', colour: 'rim' },
        { element: '<rect x="30" y="12" width="4" height="11" rx="2"/>', colour: 'rim' },
      ],
    },
  ],
}
