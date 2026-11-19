import type { CityRowProps } from '../cityListProps'
import type { HolderDot } from './holderDot'

/**
 * Whether two renders of a city's row would draw the same row (CARTO-485) — what lets the list skip every row a change
 * does not touch: an eye ticked redraws one row of thirteen thousand, not all of them. Everything is compared by
 * identity but the dot, made anew at each version of the map: it is compared by what it shows.
 * @param before - the row's props at its last render
 * @param after - its props now
 * @returns `true` when nothing the row shows or calls has changed
 */
export function sameCityRow(before: CityRowProps, after: CityRowProps): boolean {
  return (
    before.city === after.city &&
    before.visible === after.visible &&
    before.chosen === after.chosen &&
    before.opened === after.opened &&
    before.verdict === after.verdict &&
    before.onShown === after.onShown &&
    before.onSelect === after.onSelect &&
    before.onOpen === after.onOpen &&
    sameDot(before.dot, after.dot)
  )
}

/**
 * Whether two dots show the same thing: the same dot, or the same colour and the same bubble.
 * @param before - the dot at the last render
 * @param after - the dot now
 * @returns `true` when a row would draw them alike
 */
function sameDot(before: HolderDot, after: HolderDot): boolean {
  if (before === after) return true
  return (
    before.colour === after.colour &&
    before.key === after.key &&
    sameValues(before.values, after.values)
  )
}

/**
 * Whether two sets of a message's values hold the same texts.
 * @param before - the values at the last render
 * @param after - the values now
 * @returns `true` when both name the same keys with the same texts
 */
function sameValues(
  before: Readonly<Record<string, string>>,
  after: Readonly<Record<string, string>>
): boolean {
  const keys = Object.keys(before)
  return (
    keys.length === Object.keys(after).length && keys.every((key) => before[key] === after[key])
  )
}
