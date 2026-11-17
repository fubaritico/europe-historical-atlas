/**
 * The tomb's flat drawing, for afar — tuned on the map itself, **not judged on the legibility bench** (ATLAS-288; the
 * dev, 2026-11-17: « on va pas passer par le banc, tu le règles là directement »): one dark silhouette in the swords'
 * 44 frame, as the others are, and its cross set on it solid, in the rim's own light (« il faut que ce soit blanc
 * plein, pour la croix »). Made small first, for reserve (« toujours ce problème de la pudeur »), then larger again:
 * small, it no longer read with the map zoomed all the way out (« c'est pas très lisible […] un peu plus grand,
 * dézoomé »). It keeps the white halo behind it, as every flat drawing (« c'est pour la lisibilité »). Its 3D model
 * is `../meshes/tomb`.
 */

import type { Drawing } from './drawing'

/**
 * The grave seen from afar: the stone with its round head on its plinth, and the cross on it — a shape of its own in
 * the rim's light, not a hole: cut out, a cross this wide let the country's colour show through its middle.
 */
export const TOMB_DRAWING: Drawing = {
  // The swords' frame: the plinth and the stone's head, rim included, inside it.
  viewBox: [0, 0, 44, 44],
  outlined: false,
  groups: [
    {
      transform: '',
      shapes: [
        // The stone on its plinth.
        {
          element:
            '<path d="M7 39 L7 34 L11 34 L11 18 A11 11 0 0 1 33 18 L33 34 L37 34 L37 39 Z"/>',
          colour: 'silhouette',
        },
        // The cross, solid.
        {
          element:
            '<path d="M19.5 14 L24.5 14 L24.5 18.5 L28.5 18.5 L28.5 23.5 L24.5 23.5 L24.5 31 L19.5 31 L19.5 23.5 L15.5 23.5 L15.5 18.5 L19.5 18.5 Z"/>',
          colour: 'rim',
        },
      ],
    },
  ],
}
