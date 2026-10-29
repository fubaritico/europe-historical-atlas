/**
 * The countries' names (ATLAS-301) — how they are written and how their place is chosen among their candidates.
 *
 * One group of the dev-panel declaration table: the param shape, its defaults, the range and label of every
 * control, and the display order. A change places the year's names again (seconds, in their own worker).
 */

import { DEFAULT_NAME_WEIGHTS } from '@europe-historical-atlas/core/pipeline/nameChoice'

import type { ControlTable } from '@europe-historical-atlas/core/utils/controlSpec'

/** How the countries' names are written and placed. */
export interface NameDevParams {
  /** Written in capitals, as on the dev's reference maps. */
  capitals: boolean
  /** Extra room after every letter, in ems — the same for every name, so the map stays even. */
  tracking: number
  /** The room a candidate keeps to the borders, in cells of the names' grid. */
  margin: number
  /** How far a name may spill over its borders, in cells — a candidate that does pays the border weight. */
  overflow: number
  /**
   * How far a spilling name may bite into a neighbour, in cells — never into another name (the dev, 2026-10-29: *« faudrait
   * quand même que ça puisse chevaucher un petit peu entre voisins »*).
   */
  neighbourBite: number
  /** The smallest size a name is written at, in cells; a polity whose short name fits nowhere at it has none. */
  minSize: number
  /**
   * The smallest size a full name is written at, in cells; under it, the short one is written instead — « K. of France »
   * where « Kingdom of France » does not fit (the dev, 2026-10-29).
   */
  longMinSize: number
  /** The largest size a name is written at, in cells. */
  maxSize: number
  /** The reward for a large name. */
  weightSize: number
  /** The penalty for a name off the country's centre. */
  weightCentre: number
  /** The penalty for covering more or less than two thirds of the country's length. */
  weightCover: number
  /** The penalty for a bent line. */
  weightBend: number
  /** The penalty for a slanting name. */
  weightSlant: number
  /** The penalty for a name that does not keep the margin — up to the borders, or over them. */
  weightBorder: number
  /** The penalty for a name on two lines. */
  weightTwoLines: number
  /**
   * The camera's zoom, `0` furthest out, up to which the white edge is whole — it is there to read the names from afar
   * (the dev, 2026-10-28: *« quand c'est complètement dézoomé, il y a un contour autour des textes »*).
   */
  haloWholeZoom: number
  /** The zoom from which the white edge is gone (*« une fois que c'est zoomé, il n'y a plus de contours blancs »*). */
  haloGoneZoom: number
}

/**
 * Capitals spaced a little, a margin of one cell; an overflow of one and three quarters over the sea (the dev, 2026-10-28:
 * *« un peu »*, then four, three, two and a half and two judged too much on the map) and a cell's bite into a neighbour
 * (*« faudrait quand même que ça puisse chevaucher un petit peu entre voisins »*); the full name from 4 cells, the short
 * one under it; the comparison's weights as Claude set them first — all to tune on the map (the dev, 2026-10-28: *« on
 * teste directement dans l'app »*).
 */
export const DEFAULT_NAME_PARAMS: NameDevParams = {
  capitals: true,
  tracking: 0.12,
  margin: 1,
  overflow: 1.75,
  neighbourBite: 1,
  minSize: 1.5,
  longMinSize: 4,
  maxSize: 30,
  weightSize: DEFAULT_NAME_WEIGHTS.size,
  weightCentre: DEFAULT_NAME_WEIGHTS.centre,
  weightCover: DEFAULT_NAME_WEIGHTS.cover,
  weightBend: DEFAULT_NAME_WEIGHTS.bend,
  weightSlant: DEFAULT_NAME_WEIGHTS.slant,
  weightBorder: DEFAULT_NAME_WEIGHTS.border,
  weightTwoLines: DEFAULT_NAME_WEIGHTS.twoLines,
  haloWholeZoom: 0.1,
  haloGoneZoom: 0.4,
}

/** Range, step and label of every {@link NameDevParams} field. */
export const NAME_CONTROLS: ControlTable<NameDevParams> = {
  capitals: { kind: 'boolean', label: 'capitals' },
  tracking: { kind: 'number', min: 0, max: 0.6, step: 0.02, label: 'letter spacing (em)' },
  margin: { kind: 'number', min: 0, max: 6, step: 0.5, label: 'margin to borders' },
  overflow: { kind: 'number', min: 0, max: 8, step: 0.25, label: 'overflow past borders' },
  neighbourBite: { kind: 'number', min: 0, max: 4, step: 0.25, label: 'bite into neighbours' },
  minSize: { kind: 'number', min: 1, max: 12, step: 0.5, label: 'smallest size' },
  longMinSize: { kind: 'number', min: 1, max: 20, step: 0.5, label: 'full name: smallest size' },
  maxSize: { kind: 'number', min: 8, max: 80, step: 1, label: 'largest size' },
  weightSize: { kind: 'number', min: 0, max: 3, step: 0.05, label: 'weight: size' },
  weightCentre: { kind: 'number', min: 0, max: 3, step: 0.05, label: 'weight: centred' },
  weightCover: { kind: 'number', min: 0, max: 3, step: 0.05, label: 'weight: covers ⅔' },
  weightBend: { kind: 'number', min: 0, max: 3, step: 0.05, label: 'weight: bend' },
  weightSlant: { kind: 'number', min: 0, max: 3, step: 0.05, label: 'weight: slant' },
  weightBorder: { kind: 'number', min: 0, max: 3, step: 0.05, label: 'weight: past the margin' },
  weightTwoLines: { kind: 'number', min: 0, max: 3, step: 0.05, label: 'weight: two lines' },
  haloWholeZoom: {
    kind: 'number',
    min: 0,
    max: 1,
    step: 0.01,
    label: 'white edge whole to (zoom)',
  },
  haloGoneZoom: { kind: 'number', min: 0, max: 1, step: 0.01, label: 'white edge gone at (zoom)' },
}

/** Display order of the names' controls that place them again — their placement's. */
export const NAME_CONTROL_ORDER: (keyof NameDevParams)[] = [
  'capitals',
  'tracking',
  'margin',
  'overflow',
  'neighbourBite',
  'minSize',
  'longMinSize',
  'maxSize',
  'weightSize',
  'weightCentre',
  'weightCover',
  'weightBend',
  'weightSlant',
  'weightBorder',
  'weightTwoLines',
]

/** Display order of the names' controls read every frame — how they show on screen; nothing is placed again. */
export const NAME_SCREEN_ORDER: (keyof NameDevParams)[] = ['haloWholeZoom', 'haloGoneZoom']
