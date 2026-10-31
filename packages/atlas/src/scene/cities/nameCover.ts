/**
 * Which cities' points fall on a country's name (ATLAS-323, the dev, 2026-11-01): afar the country's name matters more
 * than a capital's point, which has no name yet and says nothing on its own — *« c'est le nom du pays qui est le plus
 * important […] masquer un point de capitale […] s'il coïncide avec le nom d'un pays »*. The names are placed as they
 * were; the point yields.
 */

import type { YearNames } from '@europe-historical-atlas/core/pipeline/yearNames'

/**
 * How far around a letter's middle a point counts as on it, as a share of the name's size: the letter's half height,
 * and a little room for the mark's own width.
 */
export const LETTER_REACH = 0.7

/** How far above its baseline a letter's middle stands, as a share of the name's size. */
const LETTER_MIDDLE = 0.35

/**
 * Whether each point falls on one of the names seen from afar — the first display level's, shown while no vassal is.
 * @param points - the points, in normalized grid coordinates, `u` west→east and `v` north→south, `0..1`
 * @param names - the year's names as placed, or `null` before they are
 * @returns one answer a point, in their order; none covered before the names are placed
 */
export function coveredByNames(
  points: readonly { readonly u: number; readonly v: number }[],
  names: YearNames | null
): boolean[] {
  const afar = names?.levels[0]?.placed ?? []
  if (names === null || afar.length === 0) return points.map(() => false)
  // Each letter's middle and reach, in the names' grid cells.
  const letters = afar.flatMap(({ size, glyphs }) =>
    glyphs.map(({ x, y, angle }) => ({
      x: x + Math.sin(angle) * size * LETTER_MIDDLE,
      y: y - Math.cos(angle) * size * LETTER_MIDDLE,
      reach: size * LETTER_REACH,
    }))
  )
  return points.map(({ u, v }) => {
    // The names' own frame: a cell's centre at its integer index, `u = 1` on the last one (`nameGeometry`).
    const [px, py] = [u * (names.gridWidth - 1), v * (names.gridHeight - 1)]
    return letters.some(({ x, y, reach }) => Math.hypot(px - x, py - y) <= reach)
  })
}
