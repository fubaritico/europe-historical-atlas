/** A map is drawn every hundred years (1100, 1200, 1300): the years a title's cities are attached at. */
const MAP_EVERY = 100

/**
 * The year the title's page proposes for its cities (CMS-507, the historian's call of 2026-11-24): the year of the map
 * that covers the title — the first round century within its years — else the title's first year, for a title held
 * between two maps.
 * @param from - the title's first year, or `null` before it is typed
 * @param to - its last year, or `null` for a title of one year
 * @returns the year to propose, or `null` while the title has no year
 */
export function mapYear(from: number | null, to: number | null): number | null {
  if (from === null) return null
  const last = to ?? from
  const century = Math.ceil(from / MAP_EVERY) * MAP_EVERY
  return century <= last ? century : from
}
