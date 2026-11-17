/**
 * The death icon: a grave (ATLAS-288; the dev, 2026-11-17: « on va essayer de faire la mort. Donc, les pierres
 * tombales […] ça va être simple en 3D »), its faith **cut into the stone**: « on grave une croix quand c'est un
 * chrétien, un croissant quand c'est un musulman, une étoile quand c'est un juif ». The sign is a real hollow — the
 * stone's face is a plate pierced to the sign's outline, the hollow's dark floor a little behind it. One stone for the
 * three faiths, so the sign is what is compared (« c'est d'avoir quelque chose de lisible »); for one who is neither
 * king, sultan nor tsar it is enough (« ça peut suffire ») — a mausoleum is ATLAS-472.
 *
 * **On the map through the dev's preview alone** (`app/preview`), with the cross: no event type of the content
 * chooses it yet, and where the dead's faith comes from is not decided. The crescent and the star are on the icons'
 * bench, `/icons.html?tomb`.
 *
 * Built as it stands on the ground, its face to the south (`+z`), where the map's camera looks from.
 */

import { BoxGeometry, ExtrudeGeometry, Path, Shape } from 'three'

import type { Part } from './parts'
import type { BufferGeometry } from 'three'

/** The headstone: its width, its height to the top of its round, the plinth it stands on. */
const STONE = { width: 0.54, height: 0.86, plinth: 0.1 }

/** How thick the stone's body is, and the face plate the sign is cut through. */
const BODY_THICK = 0.12
const FACE_THICK = 0.035

/** How high on the stone the sign's middle sits, above the plinth. */
const SIGN_AT = 0.5

/**
 * The outline of an upright slab with a round head, its foot at zero.
 * @param width - across
 * @param height - to the top of its round
 * @returns the outline
 */
function roundHeaded(width: number, height: number): Shape {
  const shape = new Shape()
  shape.moveTo(-width / 2, 0)
  shape.lineTo(width / 2, 0)
  shape.lineTo(width / 2, height - width / 2)
  shape.absarc(0, height - width / 2, width / 2, 0, Math.PI, false)
  shape.closePath()
  return shape
}

/**
 * An outline drawn out along `z`, about its middle.
 * @param shape - the outline, with the holes cut in it
 * @param thick - from face to back
 * @returns its geometry
 */
function slab(shape: Shape, thick: number): BufferGeometry {
  return new ExtrudeGeometry(shape, {
    depth: thick,
    bevelEnabled: false,
    curveSegments: 8,
  }).translate(0, 0, -thick / 2)
}

/** A sign cut into a stone: its outline about the sign's middle, and how wide and tall the hollow's floor must be. */
export interface Sign {
  /** The outline to cut, about `[0, 0]`. */
  readonly outline: Path
  /** The floor's width and height: the outline's own, a little over. */
  readonly floor: [number, number]
}

/**
 * A Latin cross to cut.
 * @returns the sign
 */
export function crossSign(): Sign {
  // Half the bar, half the arms, the foot and the head, the arms' height.
  const [bar, arm, foot, head, at] = [0.04, 0.13, -0.2, 0.2, 0.07]
  const points: [number, number][] = [
    [-bar, foot],
    [bar, foot],
    [bar, at - bar],
    [arm, at - bar],
    [arm, at + bar],
    [bar, at + bar],
    [bar, head],
    [-bar, head],
    [-bar, at + bar],
    [-arm, at + bar],
    [-arm, at - bar],
    [-bar, at - bar],
  ]
  const outline = new Path()
  points.forEach(([x, y], index) => {
    if (index === 0) outline.moveTo(x, y)
    else outline.lineTo(x, y)
  })
  outline.closePath()
  return { outline, floor: [0.3, 0.44] }
}

/**
 * A crescent to cut, its horns to the right: a disc, less a smaller one set off toward the horns.
 * @returns the sign
 */
export function crescentSign(): Sign {
  const [outer, inner, off] = [0.15, 0.12, 0.065]
  // Where the two circles meet, and the angles of that point seen from each centre.
  const meetX = (off * off + outer * outer - inner * inner) / (2 * off)
  const meetY = Math.sqrt(outer * outer - meetX * meetX)
  const fromOuter = Math.atan2(meetY, meetX)
  const fromInner = Math.atan2(meetY, meetX - off)
  const outline = new Path()
  // Round the back of the outer disc, from the upper horn to the lower; then back along the inner one's.
  outline.absarc(-0.03, 0, outer, fromOuter, 2 * Math.PI - fromOuter, false)
  outline.absarc(off - 0.03, 0, inner, -fromInner, fromInner - 2 * Math.PI, true)
  outline.closePath()
  return { outline, floor: [0.34, 0.34] }
}

/**
 * A star of six points to cut: two triangles' one outline.
 * @returns the sign
 */
export function starSign(): Sign {
  const tip = 0.17
  // Where two triangles cross, between two tips.
  const notch = tip / Math.sqrt(3)
  const outline = new Path()
  for (let k = 0; k < 12; k++) {
    const angle = Math.PI / 2 + (k * Math.PI) / 6
    const reach = k % 2 === 0 ? tip : notch
    const [x, y] = [Math.cos(angle) * reach, Math.sin(angle) * reach]
    if (k === 0) outline.moveTo(x, y)
    else outline.lineTo(x, y)
  }
  outline.closePath()
  return { outline, floor: [0.36, 0.38] }
}

/**
 * A headstone with its sign cut into its face: the body, the hollow's dark floor on it, and the face plate pierced to
 * the sign's outline — the floor showing through, sunk by the plate's thickness.
 * @param sign - the sign to cut
 * @returns its parts
 */
export function engraved(sign: Sign): Part[] {
  const { width, height, plinth } = STONE
  // The face, pierced: the sign's outline moved to where it sits on the stone.
  const face = roundHeaded(width, height)
  const hole = new Path(
    sign.outline.getPoints(24).map((point) => point.clone().setY(point.y + SIGN_AT))
  )
  face.holes.push(hole)
  const front = BODY_THICK / 2
  return [
    { geometry: new BoxGeometry(0.72, plinth, 0.34), colour: 'rock', at: [0, plinth / 2, 0] },
    {
      geometry: slab(roundHeaded(width, height), BODY_THICK),
      colour: 'limestoneShade',
      at: [0, plinth, 0],
    },
    // The hollow's floor, lying on the body's face, under the sign.
    {
      geometry: new BoxGeometry(sign.floor[0], sign.floor[1], 0.01),
      colour: 'door',
      at: [0, plinth + SIGN_AT, front + 0.005],
    },
    {
      geometry: slab(face, FACE_THICK),
      colour: 'limestone',
      at: [0, plinth, front + FACE_THICK / 2],
    },
  ]
}

/**
 * The grave the map stands: the stone cut with a cross.
 * @returns its parts
 */
export function tombParts(): Part[] {
  return engraved(crossSign())
}
