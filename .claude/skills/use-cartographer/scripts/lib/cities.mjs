/**
 * The witness cities of a year, read from the CMS's base — **read-only**: the base is the dev's, and a script never
 * writes to it (the skill's rules, `/enter-in-cms` for entries).
 */

/**
 * A city at a date, with the holder its sources name.
 * @typedef {object} City
 * @property {number} id - the place-period's id in the CMS
 * @property {string} name - its French name, or its English one, or `#<id>`
 * @property {import('./geo.mjs').LonLat} at - longitude and latitude
 * @property {string | null} holderName - the holder as entered, or `null` when none was entered
 * @property {string | null} holderQid - the holder's Wikidata id, or `null`
 */

/** The query: every place-period whose dates cover the year, with its place's position and names. */
export const CITIES_OF_A_YEAR = `
  select pp.id as id, p.location as location, pp.holder_name as holderName, pp.holder_qid as holderQid,
         fr.name as nameFr, en.name as nameEn
  from place_periods pp
  join places p on p.id = pp.place_id
  left join places_locales fr on fr._parent_id = p.id and fr._locale = 'fr'
  left join places_locales en on en._parent_id = p.id and en._locale = 'en'
  where pp.date_start_year <= :year and (pp.date_end_year is null or pp.date_end_year >= :year)`

/**
 * Turn the query's rows into cities.
 * @param {readonly Record<string, unknown>[]} rows - the rows of {@link CITIES_OF_A_YEAR}
 * @returns {City[]} the cities, sorted by name
 */
export function citiesFromRows(rows) {
  return rows
    .map((row) => {
      const location = JSON.parse(String(row.location))
      if (location?.type !== 'Point')
        throw new Error(`place-period ${row.id}: its place has no point`)
      return {
        id: Number(row.id),
        name: String(row.nameFr ?? row.nameEn ?? `#${row.id}`),
        at: /** @type {const} */ ([location.coordinates[0], location.coordinates[1]]),
        holderName: row.holderName === null ? null : String(row.holderName),
        holderQid: row.holderQid === null ? null : String(row.holderQid),
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
}

/**
 * Read the cities of a year from the base.
 * @param {string} dbPath - the SQLite file
 * @param {number} year - the year
 * @param {(path: string) => { prepare: (sql: string) => { all: (params: object) => Record<string, unknown>[] } }} openReadOnly
 *   - opens the base read-only (`node:sqlite` in the commands, a fake in the tests)
 * @returns {City[]} the cities
 */
export function readCities(dbPath, year, openReadOnly) {
  return citiesFromRows(openReadOnly(dbPath).prepare(CITIES_OF_A_YEAR).all({ year }))
}

/**
 * Whether a city lies in a box.
 * @param {City} city - the city
 * @param {readonly [number, number, number, number] | undefined} box - west, south, east, north; none keeps every city
 * @returns {boolean} `true` inside, or when there is no box
 */
export function inBox(city, box) {
  if (box === undefined) return true
  const [west, south, east, north] = box
  return city.at[0] >= west && city.at[0] <= east && city.at[1] >= south && city.at[1] <= north
}
