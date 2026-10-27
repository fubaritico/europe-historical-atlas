/**
 * The siege icon's flat drawing, for afar — one dark silhouette, chosen on the legibility bench (`/svg-icons.html`,
 * « B », the dev, 2026-10-27). Its 3D model is `../meshes/tower`.
 */

import type { Drawing } from './drawing'

/**
 * A crenellated tower, three merlons, in the silhouette's brown, drawn as one outline with its door cut into it from
 * the foot, so the light rim follows into the doorway as it follows the rest (the dev, 2026-10-27: *« si la porte est
 * creusée dans la silhouette de la tour, le contour blanc suive »*).
 */
export const TOWER_DRAWING: Drawing = {
  // The tower and its rim run from 16 to 48 across and 10 to 60 down: a square of 50 about its middle.
  viewBox: '7 10 50 50',
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
