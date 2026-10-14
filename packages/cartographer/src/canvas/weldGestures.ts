import { isWeldRefusal } from '@europe-historical-atlas/core/editor/anchorWeld'

import { nearestAmong } from '../geometry/hitTest'
import { nearestStretch } from '../geometry/stretchHit'
import { describeDrawingTarget } from '../state/drawingTarget'
import { screenToLonLatOnBackdrop } from '../view/projection'

import { TAG } from './consoleTag'

import type { GestureContext } from './toolGestures'
import type { WeldOffer } from './toolSession'
import type { Point } from '../view/viewport'
import type { WeldDone, WeldRefusal } from '@europe-historical-atlas/core/editor/anchorWeld'
import type { YearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

/*
 * Welding with the white arrow (`H-37`, the dev, 2026-10-14): an anchor of the target dragged alone near
 * another polity's anchor snaps onto it, and released there the two become one; near another polity's
 * stretch it snaps onto the stretch, and released there the neighbour gains it. Either way the border is
 * shared from then on — never two outlines that only coincide.
 *
 * Pure over the gesture context: the controller asks what a drag would weld onto, and what a release does.
 */

/** How `{History}` names a weld. */
export const WELD_ANCHOR_STEP = { kind: 'weld-anchor', label: 'weld anchor' } as const

/**
 * The rings of every polity but one.
 * @param document - the document to read
 * @param polityId - the polity left out
 * @returns the other polities' rings
 */
function otherRings(document: YearDocument, polityId: string): number[][] {
  return document.claims
    .filter((claim) => claim.polity !== polityId)
    .flatMap((claim) => claim.rings)
}

/**
 * The stretches of a set of rings, as pairs of anchors, the closing one included.
 * @param rings - the rings
 * @returns each stretch once per ring
 */
function stretchesOf(rings: readonly number[][]): [number, number][] {
  return rings.flatMap((ring) =>
    ring.length < 2
      ? []
      : ring.map((index, at): [number, number] => [index, ring[(at + 1) % ring.length] ?? index])
  )
}

/**
 * A key for a stretch, the same either way round.
 * @param stretch - its two anchors
 * @returns the key
 */
function stretchKey([a, b]: readonly [number, number]): string {
  return a < b ? `${String(a)}-${String(b)}` : `${String(b)}-${String(a)}`
}

/**
 * What an anchor of the target, dragged alone, would weld onto with the pointer here: another polity's
 * anchor within reach first — the border is already there — then a point of another polity's stretch.
 * Never the target's own: those are its points, not a neighbour's border.
 * @param context - the store, the frame and the projected anchors
 * @param index - the anchor dragged
 * @param at - the pointer, in screen pixels
 * @returns the offer, or `null` when the drag only moves
 */
export function weldOfferAt(
  context: GestureContext,
  index: number,
  at: readonly [number, number]
): WeldOffer | null {
  const { document, target, viewport } = context.store.getState()
  const aimed = describeDrawingTarget(document, target)
  if (aimed === null) return null
  const own = document.claims.filter((claim) => claim.polity === aimed.id).flatMap((c) => c.rings)
  const held = new Set(own.flat())
  const others = otherRings(document, aimed.id)
  const anchors = [...new Set(others.flat())].filter((i) => i !== index && !held.has(i))
  const screen = context.anchorsOnScreen()
  const into = nearestAmong(screen, anchors, [at[0], at[1]], context.radius)
  const point = into === null ? undefined : document.anchors[into]
  if (into !== null && point !== undefined)
    return { kind: 'anchor', into, at: [point[0], point[1]] }
  // The target's own stretches are left out, shared ones included: dropping a point on its own border
  // is a move, not a weld.
  const ownKeys = new Set(stretchesOf(own).map(stretchKey))
  const stretches = stretchesOf(others).filter(
    (s) => s[0] !== index && s[1] !== index && !ownKeys.has(stretchKey(s))
  )
  const hit = nearestStretch(screen, stretches, [at[0], at[1]], context.radius)
  if (hit === null) return null
  const lonLat = screenToLonLatOnBackdrop(hit.at, context.frame, viewport)
  return lonLat === null ? null : { kind: 'stretch', a: hit.a, b: hit.b, at: lonLat }
}

/**
 * The names of polities, verbatim — their ids when the registry lacks them.
 * @param document - the document to read
 * @param ids - the polities
 * @returns the names, joined
 */
function names(document: YearDocument, ids: readonly string[]): string {
  return ids.map((id) => document.polities.find((p) => p.id === id)?.name ?? id).join(', ')
}

/**
 * Release a dragged anchor onto what it was offered: weld it, as one step, and say onto whose outline —
 * or say why not, and leave the document as it was.
 * @param context - the store and the result zone
 * @param index - the anchor dragged
 * @param offer - what it would weld onto
 */
export function releaseWeld(context: GestureContext, index: number, offer: WeldOffer): void {
  const state = context.store.getState()
  const result: WeldDone | WeldRefusal | null =
    offer.kind === 'anchor'
      ? state.weldAnchor(index, offer.into, WELD_ANCHOR_STEP)
      : state.threadAnchor(index, offer.a, offer.b, offer.at, WELD_ANCHOR_STEP)
  if (result === null) {
    console.error(`${TAG} the document refused to weld anchor ${String(index)} the tool offered.`)
    return
  }
  if (isWeldRefusal(result)) {
    const why =
      result.refused === 'pinch'
        ? 'the outline would pass twice through that point'
        : 'an outline would keep fewer than three anchors'
    console.warn(`${TAG} anchor ${String(index)} not welded: ${why}.`)
    context.report(`not welded — ${why}`)
    return
  }
  const document = context.store.getState().document
  const aimed = describeDrawingTarget(document, state.target)
  const others = result.polities.filter((polity) => polity !== aimed?.id)
  const onto = offer.kind === 'anchor' ? 'anchor' : 'border'
  context.report(`welded onto ${names(document, others)}’s ${onto}`)
}

/**
 * Where the dragged anchor shows while a weld is on offer — the point it will land on, on screen.
 * @param offer - the weld on offer
 * @param toScreen - degrees to screen pixels
 * @returns the point, or `null` with no offer
 */
export function weldTargetOnScreen(
  offer: WeldOffer | null,
  toScreen: (lonLat: readonly [number, number]) => Point
): Point | null {
  return offer === null ? null : toScreen(offer.at)
}
