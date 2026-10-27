/**
 * The plain pin's flat drawing, for afar (ATLAS-298): a round head on a stem ending in a point, upright, one dark
 * silhouette in the swords' 44 frame — chosen on the legibility bench (`/svg-icons.html`, « A », the dev, 2026-10-27:
 * « j'aime bien la version penchée, mais on va faire la A »). Its 3D form is `../../pin`.
 */

import type { Drawing } from './drawing'

/** The pin seen from afar: its head and its stem, upright about the field's middle. */
export const PIN_DRAWING: Drawing = {
  // The swords' frame: the head's top and the point's tip, rim included, inside it.
  viewBox: [10, 10, 44, 44],
  outlined: false,
  groups: [
    {
      transform: '',
      shapes: [
        { element: '<circle cx="32" cy="22" r="9"/>', colour: 'silhouette' },
        { element: '<path d="M30 29 L34 29 L34 46 L32 52 L30 46 Z"/>', colour: 'silhouette' },
      ],
    },
  ],
}
