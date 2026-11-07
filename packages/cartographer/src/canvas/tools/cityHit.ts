import { nearestPoint } from '../../geometry/hitTest'
import { shownCityPoints } from '../../state/citiesSlice'
import { lonLatToScreen } from '../../viewport/projection'

import type { FrameSnapContext } from './frameSnap'
import type { Point } from '../../viewport/viewport'

/**
 * Which city's point is under the pointer (CARTO-384): a click of the white arrow on it chooses the city in
 * `{Cities}`, a double-click opens its information box. **Only the cities shown** — an eye off draws no point, and
 * a point not drawn is not there to be clicked. The nearest within the handles' radius wins, as for an anchor.
 * @param context - the store, the frame and the handles' radius
 * @param at - the pointer, in screen pixels
 * @returns the city's id, or `null` when no shown city is within reach
 */
export function cityUnder(context: FrameSnapContext, at: Point): string | null {
  const state = context.store.getState()
  const shown = shownCityPoints(state.cities, state.shownCities, state.document.year)
  const points = shown.map(({ lonLat }) => lonLatToScreen(lonLat, context.frame, state.viewport))
  const index = nearestPoint(points, at, context.radius)
  if (index === null) return null
  return shown[index]?.id ?? null
}

/**
 * Choose the city whose point is under the pointer (CARTO-384) — the white arrow's click; **a click off every city
 * drops the city chosen**, so ‹enter› never opens one chosen long before (the dev, 2026-11-07, after trying it).
 * @param context - the store, the frame and the handles' radius
 * @param at - the pointer, in screen pixels
 * @returns `true` when a city was chosen, so the click goes no further
 */
export function chooseCityAt(context: FrameSnapContext, at: Point): boolean {
  const city = cityUnder(context, at)
  const state = context.store.getState()
  if (city !== null || state.selectedCity !== null) state.selectCity(city)
  return city !== null
}

/**
 * ‹enter› under the white arrow: the city chosen opens its information box (the dev, 2026-11-07: *"double-clicking
 * with the Mac's mouse is a real chore"*).
 * @param context - the store
 * @returns `true` when a city was chosen and its box opened, so the key goes no further
 */
export function openChosenCity(context: Pick<FrameSnapContext, 'store'>): boolean {
  const state = context.store.getState()
  if (state.selectedCity === null) return false
  state.openCity(state.selectedCity)
  return true
}
