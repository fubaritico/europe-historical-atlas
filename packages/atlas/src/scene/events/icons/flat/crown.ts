/**
 * The accession icon's flat drawing, for afar (ATLAS-287): a crown kept to the essential, one dark silhouette in the
 * swords' 44 frame — chosen on the legibility bench (`/svg-icons.html`, « S3 », the dev, 2026-11-17), the third round
 * of the day. « C », drawn from the crown with tall points, had points too long and too thin (« uniformiser en termes
 * de masse entre le blanc et le marron »); « F », a thick band and three balls, was chosen next (« c'est efficace »)
 * and found on the map « un peu gros » and too wide beside the swords and the trebuchet (« essaye un coup de banc
 * avec des dents de scie »). The 3D crown it stands for is `../meshes/crown`.
 */

import type { Drawing } from './drawing'

/**
 * The crown seen from afar: one outline with three saw teeth — the middle one a little taller — and a ball on each
 * point. The balls overlap their points, so the three read as one shape with the body.
 */
export const CROWN_DRAWING: Drawing = {
  // The swords' frame: the top runs from 6 to 38 across; the side balls and the foot, rim included, inside it.
  viewBox: [0, 0, 44, 44],
  outlined: false,
  groups: [
    {
      transform: '',
      shapes: [
        // The body: up the left side, the three teeth and their two notches, down the right side — its foot drawn
        // in, 24 wide under a top of 32 (the dev, 2026-11-17: « le haut de la couronne, c'est bon, mais la base un peu
        // moins large »).
        {
          element: '<path d="M10 34 L6 17 L14 25 L22 15 L30 25 L38 17 L34 34 Z"/>',
          colour: 'silhouette',
        },
        // A ball on each point.
        { element: '<circle cx="6" cy="15" r="2.8"/>', colour: 'silhouette' },
        { element: '<circle cx="22" cy="13" r="2.8"/>', colour: 'silhouette' },
        { element: '<circle cx="38" cy="15" r="2.8"/>', colour: 'silhouette' },
      ],
    },
  ],
}
