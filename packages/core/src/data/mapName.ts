/**
 * A Cartographer map's name — the name of its folder under `years/` (the Cartographer's `s19`, the dev, 2026-11-02:
 * *"a map exists, there is a folder for that map, I can open that map"*). One rule, read by the page that names a map
 * and by the dev server that writes it, so the two never disagree on what a name may be.
 */

/**
 * A year in a name: a whole number of up to five digits, a minus before Christ, written as the year is — no leading
 * zero, no `-0`, so `01100` can never stand for 1100 in the manifest while its files go to another folder (review
 * SEC-001, 2026-11-02). A map named so is the map the atlas publishes for that year.
 */
const YEAR_NAME = /^(?:0|-?[1-9]\d{0,4})$/

/**
 * A map's name: a letter or a digit, then letters, digits, `-`, `_` and `.`, 128 characters at most — or a year —
 * room for a working map's name and its `.autosave.<date and time>`. No `/`
 * and no leading `.`, so a path built from it can neither climb out of `years/` nor name a hidden folder.
 */
const MAP_NAME_PATTERN = '(?:-[1-9]\\d{0,4}|[A-Za-z0-9][A-Za-z0-9._-]{0,127})'

const MAP_NAME = new RegExp(`^${MAP_NAME_PATTERN}$`)

/**
 * Whether a text may name a map.
 * @param name - the text
 * @returns `true` when it follows {@link MAP_NAME_PATTERN}
 */
export function isMapName(name: string): boolean {
  return MAP_NAME.test(name)
}

/**
 * The longest name an author may give a map: room left for the longest suffix the editor adds to it, `.autosave.`
 * and a time (29 characters), so its autosave and its copies are names too (review ARCH-002, 2026-11-02).
 */
export const NEW_MAP_NAME_MAX = 99

/**
 * Whether a name typed by the author may name a new map — a map's name, short enough for its suffixes.
 * @param name - the name typed
 * @returns `true` when it may
 */
export function isNewMapName(name: string): boolean {
  return isMapName(name) && name.length <= NEW_MAP_NAME_MAX
}

/**
 * The year a map's name is, when it is one — `1100` is the map the atlas publishes for 1100.
 * @param name - a map's name
 * @returns the year, or `null` when the name is not a whole number
 */
export function yearNamed(name: string): number | null {
  return YEAR_NAME.test(name) ? Number(name) : null
}

/**
 * The name *Save a copy* gives: the map's name, `.copy.`, and the time to the second in a folder's form — no `:`
 * (`s19`, the dev: *"the same name as the current map + .copy.<date + time>"*).
 * @param map - the current map's name
 * @param at - when the copy is made, read in UTC so two machines name it alike
 * @returns e.g. `1100.copy.2026-11-02T18-30-12`
 */
export function copyName(map: string, at: Date): string {
  return `${map}.copy.${folderTime(at)}`
}

/** What an autosave's name carries between the map's and the time — and what tells an autosave from a map. */
const AUTOSAVE_MARK = '.autosave.'

/**
 * The name the automatic save of a map takes (the dev, 2026-11-02: *"the autosaves are named <name of the current
 * map>.autosave.<date + time>"*), in `years/` like every map: one per opening, the time the page started saving it.
 * An autosave of an autosave keeps the name of the map it came from, not a second suffix.
 * @param map - the current map's name
 * @param at - when the page started saving it, read in UTC
 * @returns e.g. `1100.autosave.2026-11-02T19-05-12`
 */
export function autosaveName(map: string, at: Date): string {
  const marked = map.indexOf(AUTOSAVE_MARK)
  const source = marked === -1 ? map : map.slice(0, marked)
  return `${source}${AUTOSAVE_MARK}${folderTime(at)}`
}

/**
 * Whether a map is an automatic save — what *Open…* draws with its own icon.
 * @param name - a map's name
 * @returns `true` for `<map>.autosave.<time>`
 */
export function isAutosaveName(name: string): boolean {
  return name.includes(AUTOSAVE_MARK)
}

/**
 * A time in a folder's name: to the second, in UTC, no `:`.
 * @param at - the time
 * @returns e.g. `2026-11-02T18-30-12`
 */
function folderTime(at: Date): string {
  return at.toISOString().slice(0, 19).replaceAll(':', '-')
}
