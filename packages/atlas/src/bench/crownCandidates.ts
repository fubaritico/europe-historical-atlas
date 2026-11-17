/**
 * The crowns kept aside for the regional ones (ATLAS-287, ATLAS-288; the dev, 2026-11-17: « tu peux ranger tous ces
 * modèles de côté »), drawn from his photographs (`~/Desktop/crowns`) and each given its use by him: a king's closed
 * crown for Russian Europe, the Empire's, Eastern Europe's, the tsar's, the early medieval West's. Shown on the icons'
 * bench at `/icons.html?crowns`, beside the map's own — « H », the one crown everywhere until the regions are
 * applied (`scene/events/icons/meshes/crown.ts`); « B », the map's crown before it, is kept here too. Each moves into `meshes/` the day its region is.
 */

import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  SphereGeometry,
} from 'three'

import { crownParts } from '../scene/events/icons/meshes/crown'
import {
  CROWN_RADIUS,
  arch,
  archedOutline,
  around,
  bead,
  beadedBand,
  cross,
  leaned,
  lily,
  onRing,
  plate,
  pointOutline,
  radians,
  stone,
  stones,
  upArch,
} from '../scene/events/icons/meshes/crownShapes'

import type { Colour } from '../scene/events/icons/meshes/crownShapes'
import type { Part } from '../scene/events/icons/meshes/parts'

/** One candidate: its letter, what it tries, and its parts. */
export interface CrownCandidate {
  /** The letter he names it by. */
  readonly letter: string
  /** Its one idea, in his language. */
  readonly idea: string
  /** Its parts, built as the map builds a kind's. */
  readonly parts: () => Part[]
}

/** The radius every crown's band is turned at. */
const RADIUS = CROWN_RADIUS

/**
 * A cross on top of a closed crown, over an orb or a great stone.
 * @param height - where the orb sits
 * @param metal - the cross's metal
 * @param orb - the orb's geometry
 * @param orbColour - the orb's colour
 * @returns the parts
 */
function orbAndCross(
  height: number,
  metal: Colour,
  orb = new IcosahedronGeometry(0.08, 1),
  orbColour: Colour = metal
): Part[] {
  return [
    { geometry: orb, colour: orbColour, at: [0, height, 0] },
    ...cross(0.2, 0.14, 0.04).map((geometry): Part => ({
      geometry,
      colour: metal,
      at: [0, height + 0.07, 0],
    })),
    ...[
      [0, 0.22],
      [-0.085, 0.136],
      [0.085, 0.136],
    ].map(([along = 0, up = 0]): Part => ({
      geometry: bead(0.026),
      colour: metal,
      at: [along, height + 0.07 + up, 0],
    })),
  ]
}

/**
 * D — the closed crown (`western-big-1`): four lilies, a pearl on a point between two, two arches springing from the
 * lilies and crossing over a velvet cap, pearls up the arches, an orb and a cross.
 * @returns its parts
 */
function closedParts(): Part[] {
  const foot = 0.2
  const rise = 0.9
  const up = [20, 35, 50, 65, 115, 130, 145, 160]
  return [
    ...beadedBand(foot, 0, 'pearl'),
    ...stones(8, foot / 2, 0.04, Math.PI / 8),
    {
      geometry: new SphereGeometry(0.43, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.85, 1),
      colour: 'velvet',
      at: [0, foot - 0.02, 0],
    },
    ...around(4).flatMap((angle) => lily(angle, foot, 0.32, 0.12)),
    ...around(4, Math.PI / 4).flatMap((angle): Part[] => [
      {
        geometry: new ConeGeometry(0.04, 0.1, 5),
        colour: 'gold',
        at: onRing(angle, RADIUS - 0.02, foot + 0.05),
      },
      { geometry: bead(0.036), colour: 'pearl', at: onRing(angle, RADIUS - 0.02, foot + 0.13) },
    ]),
    ...[0, Math.PI / 2].flatMap((turn): Part[] => [
      { geometry: arch(0.46, rise, 0.035, 5, 1.6), colour: 'gold', at: [0, foot, 0], turn },
      ...upArch(turn, 0.5, rise, foot, up, 0.028),
    ]),
    ...orbAndCross(foot + 0.46 * rise + 0.07, 'gold'),
  ]
}

/**
 * The pearls bordering one panel of the Empire's crown: up its two sides and round its arch.
 * @param angle - where the panel faces
 * @param reach - how far from the axis the pearls stand
 * @param width - the panel's width
 * @param height - the panel's height
 * @returns the pearls
 */
function panelBorder(angle: number, reach: number, width: number, height: number): Part[] {
  const half = width / 2 - 0.028
  const spring = height - width / 2
  const sides = [0.05, spring / 2, spring - 0.02].flatMap((up): [number, number][] => [
    [-half, up],
    [half, up],
  ])
  const round = [30, 60, 90, 120, 150].map((degree): [number, number] => [
    Math.cos(radians(degree)) * half,
    spring + Math.sin(radians(degree)) * half,
  ])
  return [...sides, ...round].map(([along, up]): Part => ({
    geometry: bead(0.017),
    colour: 'pearl',
    at: onRing(angle, reach, up, along),
  }))
}

/**
 * The stones of one great panel of the Empire's crown: red, blue and pearl in turn, a great one in the middle.
 * @param angle - where the panel faces
 * @param reach - how far from the axis its face stands
 * @returns the stones
 */
function panelStones(angle: number, reach: number): Part[] {
  const colours: readonly Colour[] = ['jewel', 'pearl', 'sapphire']
  return [0.12, 0.25, 0.38].flatMap((height, row) =>
    [-0.085, 0, 0.085].map((along, column): Part => ({
      geometry: stone(row === 1 && column === 1 ? 0.052 : 0.034),
      colour: colours[(row + column) % colours.length] ?? 'jewel',
      at: onRing(angle, reach, height, along),
      turn: angle,
    }))
  )
}

/**
 * The jewelled cross on the brow of the Empire's crown, standing on its front panel.
 * @param reach - how far from the axis the front panel stands
 * @param foot - the front panel's height
 * @returns the cross and its stones
 */
function browCross(reach: number, foot: number): Part[] {
  const set: readonly (readonly [number, number, Colour])[] = [
    [0, 0.26, 'sapphire'],
    [-0.12, 0.26, 'jewel'],
    [0.12, 0.26, 'jewel'],
    [0, 0.11, 'pearl'],
    [0, 0.37, 'pearl'],
  ]
  return [
    {
      geometry: plate(archedOutline(0.1, 0.44), 0.04, 0.008),
      colour: 'gold',
      at: [0, foot - 0.02, reach],
    },
    { geometry: new BoxGeometry(0.34, 0.1, 0.05), colour: 'gold', at: [0, foot + 0.26, reach] },
    ...set.map(([along, up, colour]): Part => ({
      geometry: stone(0.034),
      colour,
      at: [along, foot + up, reach + 0.035],
    })),
  ]
}

/**
 * One panel of the Empire's crown: a great one covered in stones, or a lesser one enamelled, each bordered in pearls.
 * @param angle - where it faces
 * @param great - whether it is one of the four great panels
 * @returns its parts
 */
function empirePanel(angle: number, great: boolean): Part[] {
  const width = 2 * RADIUS * Math.sin(Math.PI / 8)
  const reach = RADIUS * Math.cos(Math.PI / 8)
  const height = great ? 0.62 : 0.48
  const face: Part[] = great
    ? panelStones(angle, reach + 0.035)
    : [
        {
          geometry: plate(archedOutline(width * 0.55, 0.3), 0.02, 0.005),
          colour: 'sapphire',
          at: onRing(angle, reach + 0.03, 0.08),
          turn: angle,
        },
      ]
  return [
    {
      geometry: plate(archedOutline(width, height), 0.05),
      colour: 'gold',
      at: onRing(angle, reach, 0),
      turn: angle,
    },
    ...face,
    ...panelBorder(angle, reach + 0.035, width, height),
  ]
}

/**
 * E — the crown of the Holy Roman Empire (`charlemagne-hre-1` and `-2`): eight arched panels in an octagon, bordered
 * in pearls, four covered in stones and four enamelled, a jewelled cross on the brow, one arch from brow to nape.
 * @returns its parts
 */
function empireParts(): Part[] {
  const reach = RADIUS * Math.cos(Math.PI / 8)
  return [
    ...around(8).flatMap((angle, index) => empirePanel(angle, index % 2 === 0)),
    {
      geometry: new SphereGeometry(0.4, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.45, 1),
      colour: 'velvet',
      at: [0, 0.3, 0],
    },
    {
      geometry: arch(reach, 0.8, 0.035, 4, 1.5),
      colour: 'gold',
      at: [0, 0.47, 0],
      turn: Math.PI / 2,
    },
    ...upArch(
      Math.PI / 2,
      reach + 0.045,
      0.8,
      0.47,
      [30, 45, 60, 75, 90, 105, 120, 135, 150],
      0.03
    ),
    ...browCross(reach, 0.62),
  ]
}

/**
 * The pendants of Byzantium's crown: chains hanging from the band, four on each side and one behind, three stones in
 * a trefoil at each end.
 * @param foot - where the band starts
 * @returns the chains and their stones
 */
function pendants(foot: number): Part[] {
  const sides = [-0.36, -0.12, 0.12, 0.36].flatMap((offset) => [
    Math.PI / 2 + offset,
    -Math.PI / 2 + offset,
  ])
  return [...sides, Math.PI].flatMap((angle): Part[] => [
    {
      geometry: new CylinderGeometry(0.011, 0.011, 0.22, 4),
      colour: 'gold',
      at: onRing(angle, RADIUS, foot - 0.11),
    },
    ...[
      [0, -0.24],
      [-0.03, -0.285],
      [0.03, -0.285],
    ].map(([along = 0, down = 0]): Part => ({
      geometry: bead(0.028, 0.6),
      colour: 'jewel',
      at: onRing(angle, RADIUS, foot + down, along),
      turn: angle,
    })),
  ])
}

/**
 * The leaning cross of Byzantium's crown, a ball on each of its three ends.
 * @param height - where it stands
 * @returns its parts
 */
function leaningCross(height: number): Part[] {
  const lean = -0.22
  const ends = [
    [0, 0.31],
    [-0.11, 0.204],
    [0.11, 0.204],
  ].map(([along = 0, up = 0]) => bead(0.03).translate(along, up, 0))
  return [...cross(0.3, 0.2, 0.04), ...ends].map((geometry): Part => ({
    geometry: geometry.rotateZ(lean),
    colour: 'gold',
    at: [0, height, 0],
  }))
}

/**
 * F — Byzantium's crown (`byzantine-1`, `byzance-2`, the Holy Crown of Hungary): a band between two rows of pearls,
 * arched and pointed plaques above it, two straps crossing in a dome with an enamel on each, a leaning cross, chains
 * hanging from the band.
 * @returns its parts
 */
function byzantineParts(): Part[] {
  const foot = 0.3
  const rim = foot + 0.2
  const top = rim + 0.46 * 0.8
  return [
    ...beadedBand(0.2, foot, 'pearl'),
    ...stones(8, foot + 0.1, 0.05),
    ...around(12).map((angle, index): Part => ({
      geometry: leaned(
        plate(
          index % 2 === 0 ? archedOutline(0.2, 0.2) : pointOutline(0.2, 0.2, 0.01),
          0.03,
          0.006
        ),
        0,
        -0.3
      ),
      colour: index % 2 === 0 ? 'gold' : 'sapphire',
      at: onRing(angle, RADIUS - 0.03, rim),
      turn: angle,
    })),
    ...[0, Math.PI / 2].flatMap((turn): Part[] => [
      { geometry: arch(0.46, 0.8, 0.028, 4, 3), colour: 'gold', at: [0, rim, 0], turn },
      ...upArch(turn, 0.5, 0.8, rim, [40, 140], 0.04).map((part): Part => ({
        ...part,
        colour: 'sapphire',
      })),
    ]),
    { geometry: new BoxGeometry(0.26, 0.05, 0.26), colour: 'gold', at: [0, top, 0] },
    ...leaningCross(top + 0.02),
    ...pendants(foot),
  ]
}

/**
 * The two shells of the tsar's crown, parted like a mitre, pearls along their four edges.
 * @param foot - where they stand
 * @param gap - half the angle left open between them, at the brow and at the nape
 * @param tall - how far they are flattened, 1 for a sphere's own curve
 * @returns the domes and their pearls
 */
function mitre(foot: number, gap: number, tall: number): Part[] {
  // Each shell runs past its widest ring and curves back in to the band: it swells out over the band, as on the
  // tsar's crown.
  const radius = 0.57
  const sweep = Math.PI * 0.62
  const centre = foot - radius * Math.cos(sweep) * tall
  const span = Math.PI - 2 * gap
  const edges = [Math.PI / 2 - gap, Math.PI / 2 + gap, -Math.PI / 2 + gap, -Math.PI / 2 - gap]
  return [
    ...[-Math.PI / 2 + gap, Math.PI / 2 + gap].map((start): Part => ({
      geometry: new SphereGeometry(radius, 10, 8, start, span, 0, sweep).scale(1, tall, 1),
      colour: 'steel',
      at: [0, centre, 0],
    })),
    ...edges.flatMap((edge) =>
      [0.18, 0.4, 0.62, 0.84, 1.06, 1.28, 1.5, 1.72].map((down): Part => ({
        geometry: bead(0.036),
        colour: 'pearl',
        at: [
          -(radius + 0.02) * Math.cos(edge) * Math.sin(down),
          centre + (radius + 0.02) * Math.cos(down) * tall,
          (radius + 0.02) * Math.sin(edge) * Math.sin(down),
        ],
      }))
    ),
  ]
}

/**
 * G — the tsar's crown (`tzar-east-1`, `tsar-east-2`), redone from the two photographs (the dev, 2026-11-17: « il
 * manque la couronne de tsar » — the first one read as a small gilt helmet): silver, a low band of stones, two great
 * shells swelling out over the band and parted at the brow and the nape over a red cap, a row of pearls along each
 * of their edges, a wide strap of clear stones from brow to nape, a great red stone and a cross on top.
 * @returns its parts
 */
function easternParts(): Part[] {
  const foot = 0.15
  const tall = 0.86
  const rise = 1.56
  const top = foot + 0.5 * rise
  return [
    ...beadedBand(foot, 0, 'pearl', 'steel'),
    ...around(8, Math.PI / 8).map((angle, index): Part => ({
      geometry: stone(0.04),
      colour: index % 2 === 0 ? 'jewel' : 'pearl',
      at: onRing(angle, RADIUS + 0.02, foot / 2),
      turn: angle,
    })),
    {
      geometry: new SphereGeometry(0.47, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 1.4, 1),
      colour: 'velvet',
      at: [0, foot, 0],
    },
    ...mitre(foot, 0.62, tall),
    {
      geometry: arch(0.5, rise, 0.035, 4, 3.4),
      colour: 'steel',
      at: [0, foot, 0],
      turn: Math.PI / 2,
    },
    ...upArch(Math.PI / 2, 0.55, rise, foot, [14, 28, 42, 56, 70, 110, 124, 138, 152, 166], 0.046),
    ...orbAndCross(
      top + 0.13,
      'steel',
      new IcosahedronGeometry(0.11, 1).scale(1, 1.25, 0.8),
      'jewel'
    ),
  ]
}

/** How many points the crown carries, tall and short in turn. */
const CROWN_POINTS = 8

/** The band's height: where the points spring. */
const CROWN_BAND_HEIGHT = 0.22

/** A tall point's height above the band. */
const CROWN_TALL_POINT = 0.54

/** The height of the short point standing between two tall ones. */
const CROWN_SHORT_POINT = 0.28

/** How far a point leans outward, in radians. */
const CROWN_POINT_LEAN = 0.24

/**
 * One point of the crown: drawn in to a neck, a collar, a ball and its knob.
 * @param angle - where it stands
 * @param height - its height
 * @param foot - where it springs
 * @returns its parts
 */
function ballPoint(angle: number, height: number, foot: number): Part[] {
  const width = 2 * CROWN_RADIUS * Math.sin(Math.PI / CROWN_POINTS) * 1.04
  const at = onRing(angle, CROWN_RADIUS - 0.03, foot)
  const upright = (geometry: Part['geometry'], lift: number): Part => ({
    geometry: leaned(geometry, lift, CROWN_POINT_LEAN),
    colour: 'gold',
    at,
    turn: angle,
  })
  return [
    upright(plate(pointOutline(width, height, 0.06), 0.04), 0),
    upright(new CylinderGeometry(0.052, 0.036, 0.05, 8), height + 0.02),
    upright(new IcosahedronGeometry(0.072, 1), height + 0.108),
    upright(bead(0.024), height + 0.19),
  ]
}

/**
 * B — the kings' open crown: eight points drawn in to a neck, tall and short in turn, a ball on each, on a band
 * between two beaded rows, a cut stone under each point, red and blue in turn. The map's crown for a few hours of
 * 2026-11-17, until the dev chose « H » in its place on the map itself.
 * @returns its parts
 */
function ballPointParts(): Part[] {
  return [
    ...beadedBand(CROWN_BAND_HEIGHT, 0, 'gold'),
    ...stones(CROWN_POINTS, CROWN_BAND_HEIGHT / 2, 0.036, Math.PI / CROWN_POINTS),
    ...around(CROWN_POINTS).flatMap((angle, index) =>
      ballPoint(angle, index % 2 === 0 ? CROWN_TALL_POINT : CROWN_SHORT_POINT, CROWN_BAND_HEIGHT)
    ),
  ]
}

/**
 * The candidates the dev kept, each with the use he gave it (2026-11-17): H the one crown everywhere until the
 * regional ones are applied (B first, then H on the map's own evidence); C, the fleurs-de-lis, thrown away; the letters never reused.
 */
export const CROWN_CANDIDATES: readonly CrownCandidate[] = [
  { letter: 'B', idea: 'pointes à boule, la générique d’avant', parts: ballPointParts },
  { letter: 'D', idea: 'roi, Europe russe', parts: closedParts },
  { letter: 'E', idea: 'Saint-Empire', parts: empireParts },
  { letter: 'F', idea: 'Europe de l’Est', parts: byzantineParts },
  { letter: 'G', idea: 'tsar, refaite d’après les photos', parts: easternParts },
  { letter: 'H', idea: 'Occident, XIe–XIIe : la générique, celle de la carte', parts: crownParts },
]
