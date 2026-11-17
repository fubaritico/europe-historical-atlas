/**
 * The cathedral's flat drawing, for afar (ATLAS-434): its west front, in the spirit of Notre-Dame de Paris — the two
 * towers with their pinnacles, the spire seen between them, the gallery, the rose, the three pointed doors — one dark
 * silhouette in the swords' 44 frame, its openings set on it in the rim's light. The dev, 2026-11-17: the first draft,
 * the cathedral seen from the side, read as a factory (« tu peux faire le fronton avec les deux tours […] c'est
 * beaucoup plus compréhensible »); the front drawn plain was « trop géométrique […] trop brut » (« il faudrait que tu
 * travailles un tout petit peu plus les détails. Mais dans l'esprit, c'est ça. On voit la rosace »). Drawn from the
 * monument, not from anyone's logo. **Tuned on the map, not judged on the legibility bench.** Its 3D model is
 * `../meshes/cathedral`.
 */

import type { Drawing } from './drawing'

/** The cathedral seen from afar, from the west. */
export const CATHEDRAL_DRAWING: Drawing = {
  // The swords' frame: the towers' foot, their pinnacles and the spire's tip, rim included, inside it.
  viewBox: [0, 0, 44, 44],
  outlined: false,
  groups: [
    {
      transform: '',
      shapes: [
        // The front as one outline: the left tower and its two pinnacles, the wall between the towers with the spire
        // rising behind it, the right tower.
        {
          element:
            '<path d="M5.5 39 L5.5 9 L7 9 L7 6.5 L9 6.5 L9 9 L14.5 9 L14.5 6.5 L16.5 6.5 L16.5 9 L18 9 L18 19 L20.7 19 L22 5.5 L23.3 19 L26 19 L26 9 L27.5 9 L27.5 6.5 L29.5 6.5 L29.5 9 L35 9 L35 6.5 L37 6.5 L37 9 L38.5 9 L38.5 39 Z"/>',
          colour: 'silhouette',
        },
        // The four tall openings of the towers, two each, with pointed heads.
        {
          element:
            '<path d="M7.8 18.5 L7.8 13.3 Q7.8 11.9 9.3 11.5 Q10.8 11.9 10.8 13.3 L10.8 18.5 Z"/>',
          colour: 'rim',
        },
        {
          element:
            '<path d="M12.7 18.5 L12.7 13.3 Q12.7 11.9 14.2 11.5 Q15.7 11.9 15.7 13.3 L15.7 18.5 Z"/>',
          colour: 'rim',
        },
        {
          element:
            '<path d="M28.3 18.5 L28.3 13.3 Q28.3 11.9 29.8 11.5 Q31.3 11.9 31.3 13.3 L31.3 18.5 Z"/>',
          colour: 'rim',
        },
        {
          element:
            '<path d="M33.2 18.5 L33.2 13.3 Q33.2 11.9 34.7 11.5 Q36.2 11.9 36.2 13.3 L36.2 18.5 Z"/>',
          colour: 'rim',
        },
        // The gallery, a line across the whole front.
        { element: '<rect x="5.5" y="20.3" width="33" height="1.4"/>', colour: 'rim' },
        // The rose.
        { element: '<circle cx="22" cy="26.2" r="3.3"/>', colour: 'rim' },
        // The three doors, pointed: the great one, then one under each tower.
        {
          element:
            '<path d="M19.2 39 L19.2 34.800000000000004 Q19.2 32.6 22 31.6 Q24.8 32.6 24.8 34.800000000000004 L24.8 39 Z"/>',
          colour: 'rim',
        },
        {
          element:
            '<path d="M9.65 39 L9.65 36.2 Q9.65 34 11.75 33 Q13.85 34 13.85 36.2 L13.85 39 Z"/>',
          colour: 'rim',
        },
        {
          element:
            '<path d="M30.15 39 L30.15 36.2 Q30.15 34 32.25 33 Q34.35 34 34.35 36.2 L34.35 39 Z"/>',
          colour: 'rim',
        },
        // A small round window over each side door.
        { element: '<circle cx="11.75" cy="26.2" r="1.7"/>', colour: 'rim' },
        { element: '<circle cx="32.25" cy="26.2" r="1.7"/>', colour: 'rim' },
      ],
    },
  ],
}
