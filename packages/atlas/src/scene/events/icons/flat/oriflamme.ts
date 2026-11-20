/**
 * The conquest's flat drawing, for afar (ATLAS-477): the oriflamme of its 3D model (`../meshes/oriflamme`) as one dark
 * silhouette in the swords' 44 frame — its cloth floating to two points, its staff on the foot of two steps. Chosen
 * on the legibility bench (`/svg-icons.html`), « H » then « H2 » (the dev, 2026-11-20). His remark on the first « H »,
 * whose shapes went to the frame's edge: *"your icons are cut at the top and the bottom"* — so **every shape stays 2
 * units inside the frame**, the rim's half-width, and the rim itself is inside; and *"maybe it takes in the little
 * foot at the mast's foot"* — it does.
 */

import type { Drawing } from './drawing'

/** The oriflamme seen from afar: the staff and its ball, the floating cloth, the two steps of the foot. */
export const ORIFLAMME_DRAWING: Drawing = {
  // The swords' frame: every shape within 2 and 42, so the rim (4 wide, half of it outside a shape) is not cut.
  viewBox: [0, 0, 44, 44],
  outlined: false,
  // The staff's middle: the drawing is planted by its staff, as its 3D model is.
  standsAt: 8,
  groups: [
    {
      transform: '',
      shapes: [
        // The staff, down to the foot.
        { element: '<path d="M6 6 L10 6 L10 35 L6 35 Z"/>', colour: 'silhouette' },
        // The ball on its tip.
        { element: '<circle cx="8" cy="5" r="3"/>', colour: 'silhouette' },
        // The cloth, floating from the staff to two points.
        {
          element:
            '<path d="M10 9 C15.5 4.5 21 4.5 26 8 C31 11.5 36.5 11.5 42 7 L34.5 15 L42 23 C36.5 27.5 31 27.5 26 24 C21 20.5 15.5 20.5 10 25 Z"/>',
          colour: 'silhouette',
        },
        // The foot: two steps, the lower one wider.
        { element: '<path d="M4 34 L12 34 L12 38 L4 38 Z"/>', colour: 'silhouette' },
        { element: '<path d="M2 38 L14 38 L14 42 L2 42 Z"/>', colour: 'silhouette' },
      ],
    },
  ],
}
