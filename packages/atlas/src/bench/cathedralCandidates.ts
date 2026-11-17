/**
 * A cathedral, tried for the councils' icon (ATLAS-288; the dev, 2026-11-17: « un mélange : une nef, un transept, un
 * chœur, deux tours, les rosaces suggérées […] juste pour voir le rendu »), drawn from his photographs of Notre-Dame
 * de Paris, Rouen, Reims, Quimper, Bordeaux and Le Mans. Shown on the icons' bench at `/icons.html?cathedral`; it
 * moves into `scene/events/icons/meshes/` the day he keeps it.
 *
 * **Two tones of stone** bring its volumes out under the icons' lights, which give every face turned the same way
 * the same tone: the walls in the shade, what stands out of them — buttresses, turrets, cornices, pinnacles — in the
 * light (the dev, 2026-11-17: « faire ressortir les volumes du bâtiment avec l'éclairage »).
 *
 * **Set on the map at Cologne, the same day, and kept for the day it stands there** (« tous les éléments […] rangés sur
 * une étagère, prêts à être mis en place »): 0.6 of an icon's height tall — half a trebuchet's; turned 36° about its
 * upright, its west front toward the reader, a three-quarter; still; no halo behind it; the counter-light from the
 * camera at 1 (`light/lighting`); its ground soiled at 1 (`ICON_SOIL`, `shadows/soil`).
 *
 * Built as it stands on the ground: its nave along the west–east line (`x`, the towers to the west), seen from the
 * south (`+z`), as the map's camera looks.
 */

import { BoxGeometry, ConeGeometry, CylinderGeometry, ExtrudeGeometry, Shape } from 'three'

import type { Part } from '../scene/events/icons/meshes/parts'
import type { BufferGeometry } from 'three'

/** One candidate: its letter, what it tries, and its parts. */
export interface CathedralCandidate {
  /** The letter he names it by. */
  readonly letter: string
  /** Its one idea, in his language. */
  readonly idea: string
  /** Its parts, built as the map builds a kind's. */
  readonly parts: () => Part[]
}

/** Half the nave's width, and the choir's radius. */
const NAVE_HALF = 0.18

/** The height of the nave's walls, where its roof springs. */
const WALL = 0.5

/** How high the roofs rise above the walls. */
const ROOF = 0.22

/** Half the aisles' width, the ambulatory's radius. */
const AISLE_HALF = 0.27

/** The aisles' height. */
const AISLE = 0.26

/** Where the nave starts, at the towers' back, and where it ends, at the choir's round. */
const NAVE_WEST = -0.7
const NAVE_EAST = 0.75

/** Where the transept crosses the nave, and half its length across. */
const CROSSING = 0.15
const TRANSEPT_HALF = 0.42

/** The towers: where they stand west of the nave, how far from its axis, their side and their height. */
const TOWER_X = -0.82
const TOWER_Z = 0.2
const TOWER_SIDE = 0.24
const TOWER_HEIGHT = 0.95

/**
 * A roof with two slopes, or a gable's wall: a triangle drawn out along `z`, about its middle, its foot at zero.
 * @param width - across the slopes
 * @param height - to the ridge
 * @param length - along the ridge
 * @returns its geometry
 */
function gable(width: number, height: number, length: number): BufferGeometry {
  const shape = new Shape()
  shape.moveTo(-width / 2, 0)
  shape.lineTo(width / 2, 0)
  shape.lineTo(0, height)
  shape.closePath()
  return new ExtrudeGeometry(shape, { depth: length, bevelEnabled: false }).translate(
    0,
    0,
    -length / 2
  )
}

/**
 * A rose window, or its heart: a disc of glass, its face turned along `z`.
 * @param radius - its radius
 * @returns its geometry
 */
function rose(radius: number): BufferGeometry {
  return new CylinderGeometry(radius, radius, 0.02, 16).rotateX(Math.PI / 2)
}

/**
 * A lean-to roof: a slope falling from a wall, drawn out along `z`, about its middle — its high edge at zero, its foot
 * `width` away along `-x`.
 * @param width - how far it reaches from the wall
 * @param height - how high it stands against the wall
 * @param length - along the wall
 * @returns its geometry
 */
function leanTo(width: number, height: number, length: number): BufferGeometry {
  const shape = new Shape()
  shape.moveTo(0, 0)
  shape.lineTo(-width, 0)
  shape.lineTo(0, height)
  shape.closePath()
  return new ExtrudeGeometry(shape, { depth: length, bevelEnabled: false }).translate(
    0,
    0,
    -length / 2
  )
}

/**
 * A pinnacle: a small pointed cap with four faces.
 * @param radius - its foot's radius
 * @param height - its height
 * @returns its geometry
 */
function pinnacle(radius: number, height: number): BufferGeometry {
  return new ConeGeometry(radius, height, 4).rotateY(Math.PI / 4)
}

/** How high an aisle's lean-to roof stands against the nave's wall. */
const AISLE_ROOF = 0.08

/**
 * The nave and its aisles with their lean-to roofs, the cornice under the great roof, and the roof.
 * @returns their parts
 */
function nave(): Part[] {
  const length = NAVE_EAST - NAVE_WEST
  const middle = (NAVE_EAST + NAVE_WEST) / 2
  return [
    {
      geometry: new BoxGeometry(length, AISLE, 2 * AISLE_HALF),
      colour: 'limestoneShade',
      at: [middle, AISLE / 2, 0],
    },
    {
      geometry: new BoxGeometry(length, WALL, 2 * NAVE_HALF),
      colour: 'limestoneShade',
      at: [middle, WALL / 2, 0],
    },
    // The cornice, jutting out under the roof.
    {
      geometry: new BoxGeometry(length, 0.03, 2 * NAVE_HALF + 0.04),
      colour: 'limestone',
      at: [middle, WALL - 0.015, 0],
    },
    // The nave's roof, its ridge turned along the nave.
    {
      geometry: gable(2 * NAVE_HALF, ROOF, length),
      colour: 'slate',
      at: [middle, WALL, 0],
      turn: Math.PI / 2,
    },
    // Each aisle's roof, falling outward from the nave's wall.
    ...[-1, 1].map((side): Part => ({
      geometry: leanTo(AISLE_HALF - NAVE_HALF + 0.01, AISLE_ROOF, length),
      colour: 'slate',
      at: [middle, AISLE, side * NAVE_HALF],
      turn: (-side * Math.PI) / 2,
    })),
  ]
}

/**
 * One end of the transept: a gable between two capped turrets, a rose, and a door under its porch.
 * @param side - `-1` the north end, `1` the south one
 * @returns its parts
 */
function transeptEnd(side: number): Part[] {
  const end = side * TRANSEPT_HALF
  return [
    {
      geometry: gable(0.34, ROOF, 0.02),
      colour: 'limestone',
      at: [CROSSING, WALL, end + side * 0.005],
    },
    // The rose, kept small so it does not take over (the dev, 2026-11-17: « les rosaces qui ressortent un peu
    // moins »): blue glass about a red heart.
    { geometry: rose(0.075), colour: 'sapphire', at: [CROSSING, 0.38, end + side * 0.01] },
    { geometry: rose(0.028), colour: 'jewel', at: [CROSSING, 0.38, end + side * 0.014] },
    // The door.
    {
      geometry: new BoxGeometry(0.09, 0.15, 0.02),
      colour: 'door',
      at: [CROSSING, 0.125, end + side * 0.01],
    },
    // A turret at each corner, capped.
    ...[-1, 1].flatMap((corner): Part[] => [
      {
        geometry: new BoxGeometry(0.07, 0.62, 0.07),
        colour: 'limestone',
        at: [CROSSING + corner * 0.17, 0.31, end],
      },
      {
        geometry: pinnacle(0.055, 0.14),
        colour: 'slate',
        at: [CROSSING + corner * 0.17, 0.69, end],
      },
    ]),
  ]
}

/**
 * The transept on its step, its roof and its two ends, and the spire on its lantern over the crossing.
 * @returns their parts
 */
function transept(): Part[] {
  return [
    {
      geometry: new BoxGeometry(0.4, 0.05, 2 * TRANSEPT_HALF + 0.06),
      colour: 'limestone',
      at: [CROSSING, 0.025, 0],
    },
    {
      geometry: new BoxGeometry(0.34, WALL, 2 * TRANSEPT_HALF),
      colour: 'limestoneShade',
      at: [CROSSING, WALL / 2, 0],
    },
    { geometry: gable(0.34, ROOF, 2 * TRANSEPT_HALF), colour: 'slate', at: [CROSSING, WALL, 0] },
    ...transeptEnd(-1),
    ...transeptEnd(1),
    // The spire over the crossing, on its lantern.
    {
      geometry: new BoxGeometry(0.1, 0.1, 0.1),
      colour: 'limestone',
      at: [CROSSING, WALL + ROOF - 0.02, 0],
    },
    {
      geometry: new ConeGeometry(0.058, 0.42, 8),
      colour: 'slate',
      at: [CROSSING, WALL + ROOF + 0.23, 0],
    },
  ]
}

/**
 * A point round the choir.
 * @param angle - from the south, turning to the east then the north
 * @param reach - how far from the choir's middle
 * @param y - how high
 * @returns the point
 */
function round(angle: number, reach: number, y: number): [number, number, number] {
  return [NAVE_EAST + Math.sin(angle) * reach, y, Math.cos(angle) * reach]
}

/**
 * What stands round the choir: five chapels with their pointed roofs, and a buttress with its pinnacle between two.
 * @returns their parts
 */
function choirRing(): Part[] {
  const chapels = [1, 2, 3, 4, 5].map((step) => (step * Math.PI) / 6)
  const piers = [1.5, 2.5, 3.5, 4.5].map((step) => (step * Math.PI) / 6)
  return [
    ...chapels.flatMap((angle): Part[] => [
      {
        geometry: new CylinderGeometry(0.075, 0.075, 0.2, 8),
        colour: 'limestoneShade',
        at: round(angle, AISLE_HALF, 0.1),
      },
      {
        geometry: new ConeGeometry(0.085, 0.09, 8),
        colour: 'slate',
        at: round(angle, AISLE_HALF, 0.245),
      },
    ]),
    ...piers.flatMap((angle): Part[] => [
      {
        geometry: new BoxGeometry(0.045, 0.24, 0.045),
        colour: 'limestone',
        at: round(angle, NAVE_HALF + 0.04, 0.4),
        turn: angle,
      },
      {
        geometry: pinnacle(0.035, 0.1),
        colour: 'limestone',
        at: round(angle, NAVE_HALF + 0.04, 0.57),
        turn: angle,
      },
    ]),
  ]
}

/**
 * The choir's round end to the east: its wall, its cornice and its roof, the ambulatory and its roof, and what stands
 * round it.
 * @returns its parts
 */
function choir(): Part[] {
  // A half round opening to the east: three turns its cylinders from `+z` toward `+x` over the first half turn.
  const half = [12, 1, false, 0, Math.PI] as const
  return [
    {
      geometry: new CylinderGeometry(AISLE_HALF, AISLE_HALF, AISLE, ...half),
      colour: 'limestoneShade',
      at: [NAVE_EAST, AISLE / 2, 0],
    },
    {
      geometry: new CylinderGeometry(NAVE_HALF, AISLE_HALF + 0.01, AISLE_ROOF, ...half),
      colour: 'slate',
      at: [NAVE_EAST, AISLE + AISLE_ROOF / 2, 0],
    },
    {
      geometry: new CylinderGeometry(NAVE_HALF, NAVE_HALF, WALL, ...half),
      colour: 'limestoneShade',
      at: [NAVE_EAST, WALL / 2, 0],
    },
    {
      geometry: new CylinderGeometry(NAVE_HALF + 0.02, NAVE_HALF + 0.02, 0.03, ...half),
      colour: 'limestone',
      at: [NAVE_EAST, WALL - 0.015, 0],
    },
    {
      geometry: new ConeGeometry(NAVE_HALF + 0.01, ROOF, ...half),
      colour: 'slate',
      at: [NAVE_EAST, WALL + ROOF / 2, 0],
    },
    ...choirRing(),
  ]
}

/**
 * The buttresses along the aisles — a wide foot, a thinner pier rising over the aisle's roof, a pinnacle — and the
 * tall windows between them.
 * @returns their parts
 */
function sides(): Part[] {
  const piers = [-0.5, -0.3, -0.1, 0.45, 0.62]
  const windows = [-0.6, -0.4, -0.2, 0.385, 0.535, 0.69]
  return [-1, 1].flatMap((side): Part[] => [
    ...piers.flatMap((x): Part[] => [
      { geometry: new BoxGeometry(0.07, 0.3, 0.1), colour: 'limestone', at: [x, 0.15, side * 0.3] },
      {
        geometry: new BoxGeometry(0.045, 0.24, 0.06),
        colour: 'limestone',
        at: [x, 0.4, side * 0.29],
      },
      { geometry: pinnacle(0.04, 0.1), colour: 'limestone', at: [x, 0.57, side * 0.29] },
    ]),
    // Stained glass, blue and red in turn (the dev, 2026-11-17: « bleu et rouge au lieu de noir »).
    ...windows.map((x, index): Part => ({
      geometry: new BoxGeometry(0.06, 0.12, 0.02),
      colour: index % 2 === 0 ? 'sapphire' : 'jewel',
      at: [x, 0.41, side * (NAVE_HALF + 0.005)],
    })),
  ])
}

/**
 * A tower's tall bell openings, dark — hollowed out, never glass (the dev, 2026-11-17: « les tours, c'est creusé […]
 * noir, c'est bien ») — two on its outer side, two on its west face.
 * @param side - `-1` the north tower, `1` the south one
 * @param face - where the west face stands
 * @returns their parts
 */
function bellOpenings(side: number, face: number): Part[] {
  const z = side * TOWER_Z
  return [-0.045, 0.045].flatMap((off): Part[] => [
    {
      geometry: new BoxGeometry(0.04, 0.28, 0.02),
      colour: 'door',
      at: [TOWER_X + off, 0.7, z + side * (TOWER_SIDE / 2 + 0.005)],
    },
    {
      geometry: new BoxGeometry(0.02, 0.28, 0.04),
      colour: 'door',
      at: [face, 0.7, z + off],
    },
  ])
}

/**
 * One tower of the west front: its shaft between four corner buttresses, two string courses, the cornice under its
 * flat top and a pinnacle on each corner, its bell openings, its door under a porch.
 * @param side - `-1` the north tower, `1` the south one
 * @param face - where the west face stands
 * @returns its parts
 */
function tower(side: number, face: number): Part[] {
  const z = side * TOWER_Z
  const corners = [-1, 1].flatMap((a) => [-1, 1].map((b): [number, number] => [a, b]))
  return [
    {
      geometry: new BoxGeometry(TOWER_SIDE, TOWER_HEIGHT, TOWER_SIDE),
      colour: 'limestoneShade',
      at: [TOWER_X, TOWER_HEIGHT / 2, z],
    },
    ...[0.3, 0.52].map((y): Part => ({
      geometry: new BoxGeometry(0.27, 0.025, 0.27),
      colour: 'limestone',
      at: [TOWER_X, y, z],
    })),
    {
      geometry: new BoxGeometry(0.29, 0.05, 0.29),
      colour: 'limestone',
      at: [TOWER_X, TOWER_HEIGHT - 0.025, z],
    },
    ...corners.flatMap(([a, b]): Part[] => [
      {
        geometry: new BoxGeometry(0.055, 0.86, 0.055),
        colour: 'limestone',
        at: [TOWER_X + a * 0.12, 0.43, z + b * 0.12],
      },
      {
        geometry: pinnacle(0.035, 0.1),
        colour: 'limestone',
        at: [TOWER_X + a * 0.115, TOWER_HEIGHT + 0.05, z + b * 0.115],
      },
    ]),
    ...bellOpenings(side, face),
    // Its door, and the small gable of its porch.
    { geometry: new BoxGeometry(0.02, 0.13, 0.07), colour: 'door', at: [face, 0.065, z] },
    {
      geometry: gable(0.11, 0.06, 0.04),
      colour: 'limestone',
      at: [face - 0.01, 0.13, z],
      turn: Math.PI / 2,
    },
  ]
}

/**
 * The west front: two square towers, the wall between them with its rose and its gallery, the great door under its
 * porch.
 * @returns its parts
 */
function westFront(): Part[] {
  const face = TOWER_X - TOWER_SIDE / 2 - 0.005
  return [
    ...tower(-1, face),
    ...tower(1, face),
    // The wall between the towers, its rose facing west, the gallery over it, the great door and its porch.
    {
      geometry: new BoxGeometry(TOWER_SIDE, 0.64, 0.16),
      colour: 'limestoneShade',
      at: [TOWER_X, 0.32, 0],
    },
    { geometry: rose(0.05).rotateY(Math.PI / 2), colour: 'sapphire', at: [face, 0.42, 0] },
    { geometry: rose(0.02).rotateY(Math.PI / 2), colour: 'jewel', at: [face - 0.004, 0.42, 0] },
    { geometry: new BoxGeometry(0.02, 0.05, 0.14), colour: 'door', at: [face, 0.58, 0] },
    { geometry: new BoxGeometry(0.02, 0.18, 0.09), colour: 'door', at: [face, 0.09, 0] },
    {
      geometry: gable(0.14, 0.08, 0.04),
      colour: 'limestone',
      at: [face - 0.01, 0.18, 0],
      turn: Math.PI / 2,
    },
    // The gallery of statues across the whole front, over the doors.
    { geometry: new BoxGeometry(0.015, 0.03, 0.6), colour: 'door', at: [face - 0.002, 0.27, 0] },
  ]
}

/**
 * A — a Gothic cathedral: a nave and its aisles, a transept with a rose at each end, a round choir with its chapels,
 * two square towers to the west, a spire over the crossing.
 * @returns its parts
 */
function cathedralParts(): Part[] {
  return [...nave(), ...transept(), ...choir(), ...sides(), ...westFront()]
}

/** The candidates tried for the councils' icon. */
export const CATHEDRAL_CANDIDATES: readonly CathedralCandidate[] = [
  {
    letter: 'A',
    idea: 'nef et bas-côtés, transept à tourelles, chœur à chapelles, deux tours, flèche, rosaces',
    parts: cathedralParts,
  },
]
