/**
 * The council's flat drawing, for afar (ATLAS-476): the tiara and the crozier of its 3D model (`../meshes/tiara`) as
 * one dark silhouette in the swords' 44 frame, its three crowns set on it solid, in the rim's own light — as the cross
 * is on the grave. A first drawing, to judge on the map.
 */

import type { Drawing } from './drawing'

/**
 * The tiara seen from afar: its ogival cap with the cross on its tip, the three crowns as three light bands, and the
 * crozier beside it, its crook curling away.
 */
export const TIARA_DRAWING: Drawing = {
  // The swords' frame: the cap, the crook and the rim inside it.
  viewBox: [0, 0, 44, 44],
  outlined: false,
  groups: [
    {
      transform: '',
      shapes: [
        // The cap.
        {
          element: '<path d="M4 39 L4 29 C4 18 10 11 16.5 8 C23 11 29 18 29 29 L29 39 Z"/>',
          colour: 'silhouette',
        },
        // The cross on its tip.
        {
          element:
            '<path d="M15 9 L15 5.5 L12.5 5.5 L12.5 3 L15 3 L15 0.5 L18 0.5 L18 3 L20.5 3 L20.5 5.5 L18 5.5 L18 9 Z"/>',
          colour: 'silhouette',
        },
        // The three crowns, solid.
        { element: '<path d="M4 32.5 L29 32.5 L29 35.5 L4 35.5 Z"/>', colour: 'rim' },
        { element: '<path d="M4.6 24.5 L28.4 24.5 L28.7 27.5 L4.3 27.5 Z"/>', colour: 'rim' },
        { element: '<path d="M8 16.5 L25 16.5 L26.4 19.5 L6.6 19.5 Z"/>', colour: 'rim' },
        // The crozier's staff.
        { element: '<path d="M33.4 17 L36.6 17 L36.6 39 L33.4 39 Z"/>', colour: 'silhouette' },
        // Its crook, curling away from the tiara: three quarters of a ring.
        {
          element:
            '<path d="M33.4 17 A4.8 4.8 0 0 1 43 17 A4.8 4.8 0 0 1 41.6 20.4 L39.3 18.1 A1.6 1.6 0 1 0 36.6 17 Z"/>',
          colour: 'silhouette',
        },
      ],
    },
  ],
}
