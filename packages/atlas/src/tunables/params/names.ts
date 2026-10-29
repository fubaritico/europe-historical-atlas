/**
 * The countries' names (ATLAS-301) — how they are written and set: one construction, three settings for its shape
 * (`core/pipeline/nameConstruction`), the realms they are written in (`core/pipeline/nameRealm`), and the sizes.
 *
 * One group of the dev-panel declaration table: the param shape, its defaults, the range and label of every
 * control, and the display order. A change places the year's names again (seconds, in their own worker).
 */

import { DEFAULT_NAME_PLACEMENT } from '@europe-historical-atlas/core/pipeline/namePlacement'

import type { NamePlacementOptions } from '@europe-historical-atlas/core/pipeline/namePlacement'
import type { ControlTable } from '@europe-historical-atlas/core/utils/controlSpec'

/** How the countries' names are written and placed. */
export interface NameDevParams {
  /**
   * Written in capitals — off since 2026-10-29: the name as it is written, capitals and small letters (the dev: *« on
   * affiche le titre tel que tu le reçois »*).
   */
  capitals: boolean
  /** The letters' height, as a share of the country's thickness across its line. */
  heightShare: number
  /** The share of the country's length a name covers, its letters spaced to reach it. */
  cover: number
  /** The most the letters are spaced, in ems: a short name in a long country stops there. */
  trackingMost: number
  /** The widest strait a country's name spans, in cells: its pieces parted by less are named once. */
  strait: number
  /** The smallest far piece of a country named, as a share of its largest. */
  farShare: number
  /** A far piece of a country this many cells large is named whatever its share. */
  farCells: number
  /**
   * How far a spilling name may bite into a neighbour, in cells — never into another name (the dev, 2026-10-29: *« faudrait
   * quand même que ça puisse chevaucher un petit peu entre voisins »*).
   */
  neighbourBite: number
  /** The smallest size a name is written at, in cells; a polity whose short name fits nowhere at it has none. */
  minSize: number
  /**
   * The smallest size a full name is written at, in cells; under it, the short one is written instead — « France »
   * where « Kingdom of France » does not fit (the dev, 2026-10-29).
   */
  longMinSize: number
  /** The largest size a name written beside a realm too small for it is set at, in cells (ATLAS-315). */
  offsetSize: number
  /** The largest size a name is written at, in cells. */
  maxSize: number
  /**
   * The camera's zoom, `0` furthest out, up to which the white edge is whole — it is there to read the names from afar
   * (the dev, 2026-10-28: *« quand c'est complètement dézoomé, il y a un contour autour des textes »*).
   */
  haloWholeZoom: number
  /** The zoom from which the white edge is gone (*« une fois que c'est zoomé, il n'y a plus de contours blancs »*). */
  haloGoneZoom: number
  /**
   * The zoom from which every name fades toward a watermark, over the last steps of the zoom — the dev, 2026-10-29:
   * *« un troisième point de zoom où les noms deviennent à 50 % transparents »*.
   */
  watermarkZoom: number
  /** The share of their opacity the names keep at the closest zoom (*« commençons à cinquante pour cent »*). */
  watermarkShare: number
  /**
   * The names' own light blur close up, in CSS pixels — growing with the close-up look as the borders' does, lighter
   * than theirs (the dev, 2026-10-29: *« un peu moins de flou sur les noms des pays »*).
   */
  blur: number
}

/**
 * The construction's settings are core's own starts (`DEFAULT_NAME_PLACEMENT`), to judge on the map; no capitals (the
 * dev, 2026-10-29: *« on affiche le titre tel que tu le reçois »*).
 */
export const DEFAULT_NAME_PARAMS: NameDevParams = {
  capitals: false,
  ...DEFAULT_NAME_PLACEMENT,
  haloWholeZoom: 0.1,
  haloGoneZoom: 0.4,
  // The last steps of the zoom — Claude's start, to tune on the map.
  watermarkZoom: 0.85,
  // 0.5 first, then « un peu plus de transparence au zoom complet » (the dev, 29/10).
  watermarkShare: 0.4,
  blur: 0.6,
}

/** Range, step and label of every {@link NameDevParams} field. */
export const NAME_CONTROLS: ControlTable<NameDevParams> = {
  capitals: { kind: 'boolean', label: 'capitals' },
  heightShare: {
    kind: 'number',
    min: 0.2,
    max: 1,
    step: 0.05,
    label: 'height: share of thickness',
  },
  cover: { kind: 'number', min: 0.3, max: 0.9, step: 0.05, label: 'length: share covered' },
  trackingMost: {
    kind: 'number',
    min: 0,
    max: 1.5,
    step: 0.05,
    label: 'letter spacing at most (em)',
  },
  strait: { kind: 'number', min: 0, max: 40, step: 1, label: 'widest strait spanned' },
  farShare: { kind: 'number', min: 0, max: 1, step: 0.05, label: 'far piece: share of largest' },
  farCells: {
    kind: 'number',
    min: 100,
    max: 20000,
    step: 100,
    label: 'far piece: named from (cells)',
  },
  neighbourBite: { kind: 'number', min: 0, max: 4, step: 0.25, label: 'bite into neighbours' },
  minSize: { kind: 'number', min: 1, max: 12, step: 0.5, label: 'smallest size' },
  longMinSize: { kind: 'number', min: 1, max: 20, step: 0.5, label: 'full name: smallest size' },
  offsetSize: {
    kind: 'number',
    min: 1,
    max: 8,
    step: 0.25,
    label: 'name beside its country: size',
  },
  maxSize: { kind: 'number', min: 8, max: 120, step: 1, label: 'largest size' },
  haloWholeZoom: {
    kind: 'number',
    min: 0,
    max: 1,
    step: 0.01,
    label: 'white edge whole to (zoom)',
  },
  haloGoneZoom: { kind: 'number', min: 0, max: 1, step: 0.01, label: 'white edge gone at (zoom)' },
  watermarkZoom: { kind: 'number', min: 0, max: 1, step: 0.01, label: 'watermark from (zoom)' },
  watermarkShare: { kind: 'number', min: 0, max: 1, step: 0.05, label: 'watermark opacity' },
  blur: { kind: 'number', min: 0, max: 4, step: 0.1, label: 'blur close up (px)' },
}

/** Display order of the names' controls that place them again — their placement's. */
export const NAME_CONTROL_ORDER: (keyof NameDevParams)[] = [
  'capitals',
  'heightShare',
  'cover',
  'trackingMost',
  'strait',
  'farShare',
  'farCells',
  'neighbourBite',
  'minSize',
  'longMinSize',
  'offsetSize',
  'maxSize',
]

/** Display order of the names' controls read every frame — how they show on screen; nothing is placed again. */
export const NAME_SCREEN_ORDER: (keyof NameDevParams)[] = [
  'haloWholeZoom',
  'haloGoneZoom',
  'watermarkZoom',
  'watermarkShare',
  'blur',
]

/**
 * How the names are set and placed, from the panel's settings — data in, data out, read by the year's names stage and
 * the names' bench alike.
 * @param params - the names' settings
 * @returns the placement's options
 */
export function namePlacement(params: NameDevParams): NamePlacementOptions {
  return {
    heightShare: params.heightShare,
    cover: params.cover,
    trackingMost: params.trackingMost,
    strait: params.strait,
    farShare: params.farShare,
    farCells: params.farCells,
    neighbourBite: params.neighbourBite,
    longMinSize: params.longMinSize,
    offsetSize: params.offsetSize,
    minSize: params.minSize,
    maxSize: params.maxSize,
  }
}
