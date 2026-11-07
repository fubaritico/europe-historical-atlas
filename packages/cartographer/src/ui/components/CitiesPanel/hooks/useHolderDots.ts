import { holderDot } from '../utils/holderDot'

import type { CityMark } from '../../../../state/citiesSlice'
import type { PolityColourSource } from '../../../../state/polityColourSource'
import type { CartographerStoreHook } from '../../../../state/store'
import type { HolderDot } from '../utils/holderDot'

/**
 * A city's dot in `{Cities}` (CARTO-367), bound to the store: its holder's colour and its bubble, read at each render as
 * the verdicts are, so a polity recoloured or made a vassal in the map shows at once. A function rather than a table:
 * every row gets its dot, with no city that could be missing from it.
 * @param store - the store the document lives in
 * @param colours - the polities' colours — the canvas reads the same source, so the dot is the point's colour
 * @returns a city's dot
 */
export function useHolderDots(
  store: CartographerStoreHook,
  colours: PolityColourSource
): (city: CityMark) => HolderDot {
  // Store
  const document = store((state) => state.document)
  // The document is mutated in place: the version is what says a polity was recoloured.
  const version = store((state) => state.version)

  // Derived
  const byId = colours.coloursOf(document, version)

  // Return
  return (city) => holderDot(document, byId, city.holder)
}
