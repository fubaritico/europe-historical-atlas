/**
 * The siege icon's flat drawing, for afar — a first draft, waiting for its own pass on sight (ATLAS-286).
 */

import type { Drawing } from './drawing'

/** A crenellated tower and its door, outlined. */
export const TOWER_DRAWING: Drawing = {
  viewBox: '0 0 64 64',
  outlined: true,
  groups: [
    {
      transform: '',
      shapes: [
        { element: '<path d="M20 58 L22 22 L42 22 L44 58 Z"/>', colour: 'stone' },
        {
          element:
            '<path d="M18 22 L18 12 L24 12 L24 16 L29 16 L29 12 L35 12 L35 16 L40 16 L40 12 L46 12 L46 22 Z"/>',
          colour: 'stone',
        },
        { element: '<path d="M28 58 L28 48 Q32 43 36 48 L36 58 Z"/>', colour: 'door' },
      ],
    },
  ],
}
