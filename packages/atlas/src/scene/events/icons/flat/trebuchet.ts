/**
 * The siege icon's flat drawing, for afar — a trebuchet, chosen on the legibility bench (`/svg-icons.html`, « C2 », the
 * dev, 2026-10-27, ATLAS-286): its 3D model is `../meshes/trebuchet`; the tower's drawing stays in reserve in
 * `./tower`. It shows the trebuchet in profile at the instant just after the stone leaves the sling (*« une
 * vue de profil du trébuchet, l'instant juste après avoir lancé le projectile »*). Out of the first three he took « C »
 * — one silhouette, the pouch without its cords, the stone in the same brown — made sturdier: *« un châssis plus
 * épais, mais il faut qu'on puisse bien voir le triangle de l'assemblage, qu'on comprenne bien la charpenterie, avec un
 * projectile plus gros que ça ne devrait être »*; *« il ne faut pas rechercher à respecter les proportions, ce qu'il
 * faut, c'est retenir l'idée »*. Then thickened on the map to stand as heavy as the swords (*« aussi épaisses que les
 * épées et aussi lisible »*): its timbers about an eighth of its width, as their blades are. It throws to the left, as the 3D model faces.
 */

import type { Drawing, FlatShape } from './drawing'

/** Where the axle stands in the drawing; the ground is at 72. */
const AXLE: [number, number] = [37, 34]

/** Which way the long arm points, just after the release: nearly upright, leaning a little toward the throw. */
const ARM_DIRECTION: [number, number] = [-0.25, -0.97]

/** The arm's long and short ends — short and stout, for the idea rather than the proportions. */
const ARM = { long: 24, short: 8 }

/** Which way the pouch was flung from the tip: up and ahead. */
const SLING_DIRECTION: [number, number] = [-0.59, -0.81]

/**
 * A bar between two points: a quadrilateral as wide at each end as given.
 * @param from - one end
 * @param to - the other end
 * @param widthFrom - its width at the first end
 * @param widthTo - its width at the other
 * @returns its path
 */
function bar(
  from: [number, number],
  to: [number, number],
  widthFrom: number,
  widthTo = widthFrom
): string {
  const [dx, dy] = [to[0] - from[0], to[1] - from[1]]
  const length = Math.hypot(dx, dy)
  // The bar's side, square to its length.
  const [nx, ny] = [-dy / length, dx / length]
  const corner = (at: [number, number], half: number, side: number): string =>
    `${(at[0] + nx * half * side).toFixed(2)} ${(at[1] + ny * half * side).toFixed(2)}`
  return `<path d="M${corner(from, widthFrom / 2, 1)} L${corner(to, widthTo / 2, 1)} L${corner(to, widthTo / 2, -1)} L${corner(from, widthFrom / 2, -1)} Z"/>`
}

/**
 * A point along a direction from another.
 * @param from - where it starts
 * @param direction - which way, a unit vector
 * @param distance - how far
 * @returns the point
 */
function along(
  from: [number, number],
  direction: [number, number],
  distance: number
): [number, number] {
  return [from[0] + direction[0] * distance, from[1] + direction[1] * distance]
}

/** The arm's tip, where the pouch was flung from. */
const TIP = along(AXLE, ARM_DIRECTION, ARM.long)

/** The arm's short end, in the club. */
const HEAD = along(AXLE, ARM_DIRECTION, -ARM.short)

/** Where the pouch is, flung past the tip, its cords left out. */
const POUCH = along(TIP, SLING_DIRECTION, 7)

/** Where the stone is, just out of the pouch, ahead of it — larger than a stone would be. */
const STONE = along(POUCH, [-0.989, 0.148], 15)

/**
 * The frame, standing still: a thick skid on the ground, the post under the axle, and two braces from far along the
 * skid to high on the post — so the two triangles of the carpentry stay wide open between them.
 * @returns its shapes
 */
function frame(): FlatShape[] {
  return [
    { element: '<rect x="8" y="61" width="58" height="11"/>', colour: 'silhouette' },
    { element: '<rect x="31.5" y="34" width="11" height="28"/>', colour: 'silhouette' },
    { element: bar([11, 66], [33, 38], 10), colour: 'silhouette' },
    { element: bar([63, 66], [41, 38], 10), colour: 'silhouette' },
  ]
}

/**
 * The arm, just after the release: the pole, stout, thinner at the tip; the club at the short end, about the axle.
 * @returns its shapes
 */
function arm(): FlatShape[] {
  return [
    { element: bar(HEAD, TIP, 11, 9), colour: 'silhouette' },
    { element: bar(along(AXLE, ARM_DIRECTION, 3), HEAD, 14, 15), colour: 'silhouette' },
  ]
}

/** The trebuchet, cropped to its frame, the stone and their rim. */
export const TREBUCHET_DRAWING: Drawing = {
  viewBox: [-6, -6, 82, 82],
  outlined: false,
  groups: [
    {
      transform: '',
      shapes: [
        ...frame(),
        ...arm(),
        {
          element: `<rect x="${(POUCH[0] - 4.5).toFixed(2)}" y="${(POUCH[1] - 3.5).toFixed(2)}" width="9" height="7" rx="2"/>`,
          colour: 'silhouette',
        },
        {
          element: `<circle cx="${STONE[0].toFixed(2)}" cy="${STONE[1].toFixed(2)}" r="9"/>`,
          colour: 'silhouette',
        },
      ],
    },
  ],
}
