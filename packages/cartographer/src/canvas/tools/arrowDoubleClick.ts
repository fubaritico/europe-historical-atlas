import { polityAt } from '../../geometry/fillHit'
import { nearestAmong } from '../../geometry/hitTest'

import { editHandlesOf } from './anchorGestures'
import { cityUnder } from './cityHit'
import { TAG } from './consoleTag'

import type { GestureContext } from './toolGestures'
import type { Point } from '../../viewport/viewport'

/**
 * A double-click of the white arrow: **on a city's point** it opens the city's information box (CARTO-384) — the
 * city, chosen by the first click, stays chosen in `{Cities}`; in a polity's fill it opens that polity's form
 * (CARTO-246) — the polity on top, as a click chooses it, so a vassal rather than its suzerain.
 *
 * **On a point it opens nothing**: a point may be held by several polities, and picking one of them would be
 * arbitrary. An anchor wins over a city's point under it, as the click's press grabs the anchor first. Off every
 * polity it opens nothing either. Both are said in the console (*no refusal is silent*); the screen has nothing to
 * show, the first click having already chosen.
 * @param context - the session and the store
 * @param at - where the double-click was, in screen pixels
 */
export function arrowDoubleClick(context: GestureContext, at: Point): void {
  const onPoint = nearestAmong(
    context.anchorsOnScreen(),
    editHandlesOf(context),
    at,
    context.radius
  )
  if (onPoint !== null) {
    console.warn(
      `${TAG} a double-click on a point opens no form: a point may be shared — double-click inside a fill.`
    )
    return
  }
  const city = cityUnder(context, at)
  if (city !== null) {
    context.store.getState().openCity(city)
    return
  }
  const under = polityAt(context.territoriesOnScreen(), at)
  if (under === null) {
    console.warn(`${TAG} a double-click outside every polity opens no form.`)
    return
  }
  context.store.getState().openPolityForm(under)
}
