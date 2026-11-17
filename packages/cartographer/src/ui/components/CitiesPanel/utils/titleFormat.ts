/** A title's name read as the CMS writes it: « person — territory, dates » (`fields/claimTitles.titleLabel`). */
export interface TitleName {
  /** The person who holds it, `null` when the name names none apart. */
  readonly person: string | null
  /** The territory, or the whole name when nothing else is apart. */
  readonly territory: string
  /** Its dates, `null` when the name ends on none. */
  readonly dates: string | null
}

/** What the CMS writes between a title's holder and its territory. */
const PERSON_SEPARATOR = ' — '

/** What the CMS writes between a title's territory and its dates. */
const DATES_SEPARATOR = ', '

/**
 * A title's name cut into its holder, its territory and its dates — the one reader of the CMS's format in the
 * Cartographer (review ARCH-001, 2026-11-16). The person is before the first « — »; the dates after the last « , »,
 * only when that part holds a figure, so a territory with a comma in its name keeps it.
 * @param name - the title's name, as the export gives it
 * @returns its parts
 */
export function parseTitle(name: string): TitleName {
  const cut = name.indexOf(PERSON_SEPARATOR)
  const person = cut > 0 ? name.slice(0, cut) : null
  const rest = person === null ? name : name.slice(cut + PERSON_SEPARATOR.length)
  const at = rest.lastIndexOf(DATES_SEPARATOR)
  const tail = at === -1 ? '' : rest.slice(at + DATES_SEPARATOR.length)
  if (!/\d/u.test(tail)) return { person, territory: rest, dates: null }
  return { person, territory: rest.slice(0, at), dates: tail }
}

/** A title's dates that are one year alone. */
const ONE_YEAR = /^\d{3,4}$/u

/**
 * A title's dates as a city's chain writes them (the dev, 2026-11-17): **any** lone year is left out — in a chain read
 * at the map's year it is that year, repeated on every line; it is not compared with the map's — and a span of years,
 * which tells when the title was held, stays.
 * @param dates - the title's dates, as {@link parseTitle} reads them
 * @returns the dates to write after the territory, `null` for none
 */
export function chainDates(dates: string | null): string | null {
  return dates === null || ONE_YEAR.test(dates) ? null : dates
}

/**
 * A title's name with the name the map gives its polity, after its territory and before its dates (the dev,
 * 2026-11-16): « Henri IV du Saint-Empire — Saint-Empire romain germanique (Holy Roman Empire), 1100 ».
 * @param name - the title's name, as the export gives it
 * @param mapName - the name the map gives its polity, `null` when the map draws none
 * @returns the title's name, with the map's name when there is one
 */
export function withMapName(name: string, mapName: string | null): string {
  if (mapName === null) return name
  const { person, territory, dates } = parseTitle(name)
  const holder = person === null ? '' : `${person}${PERSON_SEPARATOR}`
  const when = dates === null ? '' : `${DATES_SEPARATOR}${dates}`
  return `${holder}${territory} (${mapName})${when}`
}
