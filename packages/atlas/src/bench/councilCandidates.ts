/**
 * The council's candidates on the icons' bench, `/icons.html?council` (ATLAS-476). The dev, 2026-11-18: the hat the
 * pope wears, perhaps composed with just the tip of the crozier. Four ideas, one each: the tiara alone, the tiara with
 * a crozier's crook behind it, a bishop's mitre with the same crook, and the pope's cap as it was about 1100 — a white
 * cone under a single circlet, the three crowns coming two centuries later.
 */

import { BoxGeometry, CylinderGeometry, ExtrudeGeometry, Shape, SphereGeometry } from 'three'

import {
  cap,
  circlet,
  crook,
  tiaraAloneParts,
  tiaraParts,
} from '../scene/events/icons/meshes/tiara'

import type { Part } from '../scene/events/icons/meshes/parts'

/** One candidate: its letter, what it tries, and its parts. */
export interface CouncilCandidate {
  /** The letter he names it by. */
  readonly letter: string
  /** Its one idea, in his language. */
  readonly idea: string
  /** Its parts, built as the map builds a kind's. */
  readonly parts: () => Part[]
}

/** How many faces a round part has about its upright. */
const ROUND = 20

/**
 * One face of a mitre: a tall panel ending in a point, leaning a little.
 * @param lean - how far it leans, in radians — toward the reader when positive
 * @param depth - where it stands, front or back
 * @returns the part
 */
function mitreFace(lean: number, depth: number): Part {
  const shape = new Shape()
  shape.moveTo(-0.3, 0)
  shape.lineTo(0.3, 0)
  shape.lineTo(0.33, 0.42)
  shape.lineTo(0, 0.86)
  shape.lineTo(-0.33, 0.42)
  shape.closePath()
  const geometry = new ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: false })
  geometry.translate(0, 0, -0.025).rotateX(lean)
  return { geometry, colour: 'pearl', at: [0, 0.1, depth] }
}

/**
 * A bishop's mitre: its two pointed faces, the band about the brow, a gold stripe up the front.
 * @returns its parts
 */
function mitreParts(): Part[] {
  const band = new CylinderGeometry(0.3, 0.3, 0.14, ROUND)
  // Flattened front to back: a head's band, not a drum.
  band.scale(1, 1, 0.5)
  return [
    { geometry: band, colour: 'gold', at: [0, 0.07, 0] },
    // Leaning toward each other, as the two faces of a mitre meet at its sides.
    mitreFace(-0.12, 0.14),
    mitreFace(0.12, -0.14),
    // The stripe up the front face, and the one along its foot — across its middle the two read as a cross upside down.
    { geometry: new BoxGeometry(0.07, 0.7, 0.02), colour: 'gold', at: [0, 0.5, 0.135] },
    { geometry: new BoxGeometry(0.58, 0.07, 0.02), colour: 'gold', at: [0, 0.2, 0.165] },
  ]
}

/**
 * The pope's cap about 1100: the white cone under a single circlet, a small knop on its tip.
 * @returns its parts
 */
function earlyCapParts(): Part[] {
  return [
    cap(0.32, 0.8),
    ...circlet(0.315, 0.03, 0),
    { geometry: new SphereGeometry(0.05, 10, 8), colour: 'gold', at: [0, 0.82, 0] },
  ]
}

/** The candidates tried for the councils' icon. */
export const COUNCIL_CANDIDATES: readonly CouncilCandidate[] = [
  { letter: 'A', idea: 'la tiare du pape, ses trois couronnes', parts: tiaraAloneParts },
  {
    letter: 'B',
    idea: 'la tiare, le bout d’une crosse derrière, tournée vers la tiare',
    parts: () => [...tiaraAloneParts(), ...crook([0.5, 0, -0.12], 0.78, false)],
  },
  {
    // The dev, 2026-11-18, of « B »: « très bien, avec la crosse dans l'autre sens : pas dirigée vers le chapeau, mais
    // vers l'extérieur ».
    letter: 'B2',
    idea: 'la tiare, la crosse tournée vers l’extérieur',
    // The map's own, since he chose it.
    parts: tiaraParts,
  },
  {
    letter: 'C',
    idea: 'la mitre d’évêque, le bout d’une crosse derrière',
    parts: () => [...mitreParts(), ...crook([0.5, 0, -0.12], 0.78, false)],
  },
  {
    letter: 'D',
    idea: 'la coiffe du pape vers 1100 : un cône blanc, un seul cercle',
    parts: earlyCapParts,
  },
]
