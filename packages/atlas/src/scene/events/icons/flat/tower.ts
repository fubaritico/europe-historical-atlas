/**
 * A tower's flat drawing — one dark silhouette, chosen on the legibility bench (`/svg-icons.html`, « B », the dev,
 * 2026-10-27), the siege's until a trebuchet replaced it the same evening; **kept in reserve** with its 3D model,
 * `../meshes/tower`.
 */

import type { Drawing } from './drawing'

/**
 * A crenellated tower, three merlons, in the silhouette's brown, drawn as one outline with its door cut into it from
 * the foot, so the light rim follows into the doorway as it follows the rest (the dev, 2026-10-27: *« si la porte est
 * creusée dans la silhouette de la tour, le contour blanc suive »*).
 */
export const TOWER_DRAWING: Drawing = {
  // The tower runs from 18 to 46 across and 12 to 58 down; with its rim, a square of 51 about its middle.
  viewBox: [6.5, 9.5, 51, 51],
  outlined: false,
  groups: [
    {
      transform: '',
      shapes: [
        {
          // From the foot, left of the door: up through the arched doorway, along the right wall, the merlons from
          // right to left, down the left wall.
          element:
            '<path d="M20 58 L28 58 L28 48 Q32 43 36 48 L36 58 L44 58 L42 22 L46 22 L46 12 L40 12 L40 16 L35 16 L35 12 L29 12 L29 16 L24 16 L24 12 L18 12 L18 22 L22 22 Z"/>',
          colour: 'silhouette',
        },
      ],
    },
  ],
}
