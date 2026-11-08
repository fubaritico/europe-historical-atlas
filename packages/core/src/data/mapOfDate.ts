/**
 * Which map a date shows, and which maps to prepare around it (ATLAS-333, the dev, 2026-11-08 — the slider of the
 * synchronoptic frieze).
 *
 * **A map stays until another map's date is reached** (the dev): at 1150 the map is 1100's, even though 1100 is a
 * century's map and 1200 is nearer. Going back below the shown map's year shows the map before at once.
 *
 * **The maps to prepare follow the slider**: going forward, the maps ahead; going back, the maps behind — the nearest
 * first, the nearest on the other side right after it, so a reader who turns back finds the map they left still at
 * hand. Many maps are meant (centuries, and emblematic years between them), so how far to reach is the caller's.
 */

/** Which way the slider last moved. */
export type SliderDirection = 'back' | 'forward'

/**
 * The years having a map, sorted, each once.
 * @param mapYears - the manifest's years, in any order
 * @returns them in ascending order
 */
function sortedYears(mapYears: readonly number[]): number[] {
  return [...new Set(mapYears)].sort((a, b) => a - b)
}

/**
 * The map a date shows: the latest map at or before it.
 * @param date - the year the reader is on
 * @param mapYears - the years having a map, in any order
 * @returns that map's year; `null` before the first map — no map is drawn yet there, and what to show is the dev's call
 */
export function mapYearAt(date: number, mapYears: readonly number[]): number | null {
  let shown: number | null = null
  for (const year of sortedYears(mapYears)) {
    if (year > date) break
    shown = year
  }
  return shown
}

/**
 * The maps to prepare around the one shown, in the order to prepare them: the next one in the slider's direction, the
 * next one on the other side, then further in the direction, then further on the other side.
 * @param shown - the map shown
 * @param direction - which way the slider last moved
 * @param mapYears - the years having a map, in any order
 * @param reach - how many maps to prepare on each side, at least one
 * @returns the maps' years, the shown one excluded
 * @throws when `reach` is under one — a window that prepares nothing is a caller's defect
 */
export function mapsToPrepare(
  shown: number,
  direction: SliderDirection,
  mapYears: readonly number[],
  reach: number
): number[] {
  if (!Number.isInteger(reach) || reach < 1) {
    throw new Error(
      `mapsToPrepare: reach must be a whole number of at least one, not ${String(reach)}`
    )
  }
  const years = sortedYears(mapYears)
  const before = years
    .filter((year) => year < shown)
    .reverse()
    .slice(0, reach)
  const after = years.filter((year) => year > shown).slice(0, reach)
  const [ahead, behind] = direction === 'forward' ? [after, before] : [before, after]
  return [...ahead.slice(0, 1), ...behind.slice(0, 1), ...ahead.slice(1), ...behind.slice(1)]
}
