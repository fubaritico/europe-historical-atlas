import { polityAt } from '../geometry/fillHit'
import { nearestStretch } from '../geometry/stretchHit'

import type { PolityRings } from '../geometry/fillHit'
import type { Point } from '../view/viewport'
import type { BorderRelation } from '@europe-historical-atlas/core/editor/borderRelation'
import type { DerivedBorder } from '@europe-historical-atlas/core/editor/derivedBorders'
import type { YearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

/**
 * What the status bar says is under the pointer (2026-10-13, after the mockup's bar: *"Holy Roman Empire ·
 * empire"*): a border when the pointer is on one — *"Royaume de France – Royaume de Bourgogne ·
 * sovereign"* — else the polity whose fill it is over, else nothing.
 *
 * A border before a fill: a border lies on the edge of two fills, so the pointer on it is over one of them
 * too, and the border is the more specific thing to name. A coast is not named — the coastline says it.
 */

/** How each relation is named in the bar — the chrome speaks English (P8). */
const RELATION_WORDS: Readonly<Record<BorderRelation, string>> = {
  sovereign: 'sovereign',
  vassal: 'vassal',
  'co-vassal': 'co-vassals',
  unclaimed: 'unclaimed ground',
  coastline: 'coast',
}

/** Everything {@link featureUnder} reads. */
export interface FeatureInputs {
  /** The document, for the polities' names and ranks. */
  document: YearDocument
  /** The document's borders. */
  borders: readonly DerivedBorder[]
  /** Every anchor, on screen, parallel to the document's table. */
  anchors: readonly Point[]
  /** Each polity's rings on screen, in paint order. */
  territories: readonly PolityRings[]
  /** The pointer, on screen. */
  at: Point
  /** How near a border the pointer must be, on screen. */
  radius: number
}

/**
 * The border nearest the pointer within the radius — a coast left out.
 * @param inputs - the borders, the anchors and the pointer
 * @returns the border, or `null`
 */
function borderUnder(inputs: FeatureInputs): DerivedBorder | null {
  const owners = new Map<string, DerivedBorder>()
  const stretches: [number, number][] = []
  for (const border of inputs.borders) {
    if (border.relation === 'coastline') continue
    for (let at = 0; at + 1 < border.run.length; at += 1) {
      const a = border.run[at]
      const b = border.run[at + 1]
      if (a === undefined || b === undefined) continue
      stretches.push([a, b])
      owners.set(`${String(a)}:${String(b)}`, border)
    }
  }
  const hit = nearestStretch(inputs.anchors, stretches, inputs.at, inputs.radius)
  return hit === null ? null : (owners.get(`${String(hit.a)}:${String(hit.b)}`) ?? null)
}

/**
 * Name what is under the pointer.
 * @param inputs - the document, its borders, the projections and the pointer
 * @returns the sentence for the bar, or `null` over the sea or ground nobody claims
 */
export function featureUnder(inputs: FeatureInputs): string | null {
  const nameOf = (id: string): string =>
    inputs.document.polities.find((polity) => polity.id === id)?.name ?? id
  const border = borderUnder(inputs)
  if (border !== null)
    return `${border.between.map(nameOf).join(' – ')} · ${RELATION_WORDS[border.relation]}`
  const holder = polityAt(inputs.territories, inputs.at)
  if (holder === null) return null
  const rank = inputs.document.polities.find((polity) => polity.id === holder)?.rank ?? null
  return rank === null ? nameOf(holder) : `${nameOf(holder)} · ${rank}`
}
