/**
 * The soiled ground about a building's foot (the dev, 2026-11-17, of the cathedral: « une texture un peu noircie,
 * dégueulasse, du sol, pour voir qu'elle est dans le sol »): the building's own footprint, spread past its walls,
 * darkest against them, blotched and grainy — laid in the shadow's own image, so it follows the relief with it. Pure arithmetic
 * over a grid, exercised with literals.
 */

import { blurCoverage } from './silhouette'

/** How the soil is laid. */
export interface Soil {
  /** How dark it is against the walls, 0 none to 1 as dark as the cast shadow. */
  darkness: number
  /** How far it spreads past the walls, in pixels of the grid. */
  spread: number
}

/**
 * How dark the soiled ground is at its darkest — darker than a cast shadow (`SHADOW_OPACITY`), which was the point
 * (« un peu noircie »): the shadows' image is drawn at this opacity, and a cast shadow takes only its share of it.
 */
export const SOIL_OPACITY = 0.7

/** How wide a blotch of the soil is, in pixels of the grid. */
const BLOTCH = 9

/** The lightest a blotch makes the soil, as a share of its darkness. */
const BLOTCH_FLOOR = 0.5

/** How wide a grain of the soil is, in pixels of the grid: the smallest that still shows once the image is laid. */
const GRAIN = 2

/** The lightest a grain makes the soil, as a share of its darkness. */
const GRAIN_FLOOR = 0.45

/**
 * How much the spread footprint is raised before it is softened: enough for a narrow building — a nave a few pixels
 * across, which one blur alone would thin to nothing — to give a ground as dark as a wide one's, right up to the
 * spread's end.
 */
const SOIL_GAIN = 4

/**
 * A number from 0 to 1 for a cell of the grid, the same at every drawing.
 * @param column - the cell's column
 * @param row - the cell's row
 * @returns the number
 */
function cellNoise(column: number, row: number): number {
  const wave = Math.sin(column * 127.1 + row * 311.7) * 43758.5453
  return wave - Math.floor(wave)
}

/**
 * How much of the soil's darkness a pixel keeps: uneven from place to place, smoothly, never under the floor.
 * @param x - the pixel's column
 * @param y - the pixel's row
 * @returns the share, from `BLOTCH_FLOOR` to 1
 */
export function blotch(x: number, y: number): number {
  const column = Math.floor(x / BLOTCH)
  const row = Math.floor(y / BLOTCH)
  const across = x / BLOTCH - column
  const down = y / BLOTCH - row
  const top = cellNoise(column, row) * (1 - across) + cellNoise(column + 1, row) * across
  const bottom = cellNoise(column, row + 1) * (1 - across) + cellNoise(column + 1, row + 1) * across
  return BLOTCH_FLOOR + (1 - BLOTCH_FLOOR) * (top * (1 - down) + bottom * down)
}

/**
 * The soil's grain at a pixel: fine, rough, the same at every drawing (the dev, 2026-11-17: « avec du grain, pour que
 * ça fasse terre, granuleux »).
 * @param x - the pixel's column
 * @param y - the pixel's row
 * @returns the share of its darkness the pixel keeps, from `GRAIN_FLOOR` to 1
 */
export function grain(x: number, y: number): number {
  // Another wave than the blotches', so the two never line up.
  const wave = Math.sin(Math.floor(x / GRAIN) * 269.5 + Math.floor(y / GRAIN) * 183.3) * 24634.6345
  return GRAIN_FLOOR + (1 - GRAIN_FLOOR) * (wave - Math.floor(wave))
}

/**
 * Lay the soil under a cast shadow: wherever the footprint, spread, is darker than the shadow, it shows.
 * @param cast - the cast shadow's coverage, row by row
 * @param footprint - the building's footprint, straight under it, row by row
 * @param width - the grid's pixels across
 * @param height - its pixels down
 * @param soil - how dark the soil is and how far it spreads
 * @returns the two together, a new grid
 */
export function soiled(
  cast: Float32Array,
  footprint: Float32Array,
  width: number,
  height: number,
  soil: Soil
): Float32Array {
  // Spread and raised to a full patch reaching past the walls, then softened by half the spread at its edge.
  const patch = blurCoverage(footprint, width, height, soil.spread)
  for (let k = 0; k < patch.length; k++) patch[k] = Math.min(1, (patch[k] ?? 0) * SOIL_GAIN)
  const spread = blurCoverage(patch, width, height, Math.round(soil.spread / 2))
  const out = new Float32Array(cast.length)
  for (let k = 0; k < out.length; k++) {
    const x = k % width
    const y = Math.floor(k / width)
    const dirt = soil.darkness * (spread[k] ?? 0) * blotch(x, y) * grain(x, y)
    out[k] = Math.max(cast[k] ?? 0, dirt)
  }
  return out
}
