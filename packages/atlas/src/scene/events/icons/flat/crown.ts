/**
 * The accession icon's flat drawing, for afar — a first draft, waiting for its own pass on sight (ATLAS-287).
 */

import type { Drawing } from './drawing'

/** A crown with its points and a stone, outlined. */
export const CROWN_DRAWING: Drawing = {
  viewBox: '0 0 64 64',
  outlined: true,
  groups: [
    {
      transform: '',
      shapes: [
        {
          element: '<path d="M12 46 L10 20 L22 32 L32 14 L42 32 L54 20 L52 46 Z"/>',
          colour: 'gold',
        },
        { element: '<rect x="12" y="46" width="40" height="8" rx="1"/>', colour: 'gold' },
        { element: '<circle cx="32" cy="50" r="2.5"/>', colour: 'jewel' },
      ],
    },
  ],
}
