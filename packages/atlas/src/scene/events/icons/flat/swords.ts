/**
 * The battle icon's flat drawing, for afar — its shapes chosen on the legibility bench (`/svg-icons.html`, « C2 », the
 * dev, 2026-10-26), painted as one dark silhouette since « B » (2026-10-27). Its 3D model is `../meshes/swords`.
 */

import type { Drawing, FlatShape } from './drawing'

/**
 * One sword as a silhouette, point up along the drawing's vertical middle: a wide blade, a short guard set well below
 * the crossing so the two guards of a pair never meet and make another shape (the dev, 2026-10-26), a grip ending
 * in a small pommel (it was too big).
 * Chosen on the legibility bench (`/svg-icons.html`, « C2 »).
 * @returns its shapes
 */
function flatSword(): FlatShape[] {
  return [
    { element: '<path d="M28.5 16 L32 8 L35.5 16 L35.5 44 L28.5 44 Z"/>', colour: 'silhouette' },
    { element: '<rect x="26" y="43" width="12" height="6" rx="1.5"/>', colour: 'silhouette' },
    { element: '<rect x="29.5" y="49" width="5" height="7"/>', colour: 'silhouette' },
    { element: '<circle cx="32" cy="56.5" r="2.5"/>', colour: 'silhouette' },
  ]
}

/** The crossed swords seen from afar: two flat swords turned each way about the field's middle. */
export const SWORDS_DRAWING: Drawing = {
  // The pair, crossed about the field's middle, reaches 22 from it with its pommels and their rim.
  viewBox: [10, 10, 44, 44],
  outlined: false,
  groups: [
    { transform: 'rotate(45 32 32)', shapes: flatSword() },
    { transform: 'rotate(-45 32 32)', shapes: flatSword() },
  ],
}
