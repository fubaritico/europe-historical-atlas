import { isRingOpen } from '@europe-historical-atlas/core/data/outlines'
import { edgePosition } from '@europe-historical-atlas/core/editor/eraseEdge'

import { describeDrawingTarget } from '../../state/drawingTarget'

import { stretchUnder } from './anchorGestures'
import { TAG } from './consoleTag'

import type { AnchorGestureContext } from './anchorGestures'
import type { YearDocument } from '@europe-historical-atlas/core/data/yearDocument'

/**
 * The white arrow's edge — the line between two anchors (CARTO-397, the dev, 2026-11-08: *"il faudrait qu'on puisse
 * enlever un trait entre deux points"*). A click on one of the target's edges selects it; ‹delete› erases it from every
 * outline drawing it — a closed outline opens there, an open one is cut in two, no anchor goes. **A shared edge leaves
 * both polities** (*"c'est spécialement pour les lacs"*): one line on screen, both shores opened at once.
 */

/** The step kind an erased edge is recorded under. */
export const ERASE_EDGE_KIND = 'erase-edge'

/**
 * The names of every polity whose outline draws an edge, in claim order.
 * @param document - the document
 * @param a - one anchor of the edge
 * @param b - the other
 * @returns their names, their ids when the registry lacks them
 */
export function edgeHolders(document: YearDocument, a: number, b: number): string[] {
  const names: string[] = []
  for (const claim of document.claims) {
    const draws = claim.rings.some(
      (ring, at) => edgePosition(ring, isRingOpen(claim, at), a, b) >= 0
    )
    if (!draws) continue
    // An id the registry lacks is a fault `documentFaults` reports; here the id says who holds it.
    names.push(document.polities.find((polity) => polity.id === claim.polity)?.name ?? claim.polity)
  }
  return names
}

/**
 * A click of the white arrow on one of the target's edges: select it, and say so — the selected anchors are dropped,
 * a selection being either points or an edge.
 * @param context - the session and the store
 * @param at - the pointer, in screen pixels
 * @returns `true` when the click was on an edge of the target, and selected it
 */
export function selectEdgeAt(
  context: AnchorGestureContext,
  at: readonly [number, number]
): boolean {
  // From afar the click only chooses a polity (H-34): an edge there would be chosen blind, kilometres wide.
  if (context.fromAfar?.() === true) return false
  const { document, target } = context.store.getState()
  const aimed = describeDrawingTarget(document, target)
  if (aimed === null) return false
  const hit = stretchUnder(context, aimed.id, at)
  if (hit === null) return false
  context.session.selected = []
  context.session.edge = [hit.a, hit.b]
  const names = edgeHolders(document, hit.a, hit.b).join(', ')
  context.report(context.words.t('edgeSelected', { names }))
  return true
}

/**
 * ‹delete› or ‹backspace› with an edge selected: erase it from every outline drawing it, one step of the history.
 * @param context - the session and the store
 * @returns `true` when the key was taken — an edge was selected
 */
export function eraseSelectedEdge(context: AnchorGestureContext): boolean {
  const edge = context.session.edge
  if (edge === null) return false
  context.session.edge = null
  const [a, b] = edge
  const names = edgeHolders(context.store.getState().document, a, b).join(', ')
  const erasure = context.store
    .getState()
    .eraseEdge(a, b, { kind: ERASE_EDGE_KIND, label: context.words.t('stepEraseEdge') })
  if (erasure === null) {
    // An undo since the click may have taken the edge away: declined, and said — nothing is wrong with the map.
    console.warn(
      `${TAG} no edge erased: no outline draws the line between anchors ${String(a)} and ${String(b)} any more.`
    )
    return true
  }
  const { opened, cut, dropped, removed } = erasure
  context.report(context.words.t('erasedEdge', { names, opened, cut, dropped, removed }))
  return true
}

/**
 * The edge selection after the document changed: kept while an outline still draws it, dropped once an undo or an
 * edit took it away — or its line would stay drawn as selected over nothing (review ARCH-002).
 * @param edge - the edge selected, or `null`
 * @param document - the document as it is now
 * @returns the edge, or `null`
 */
export function keptEdge(
  edge: readonly [number, number] | null,
  document: YearDocument
): [number, number] | null {
  if (edge === null || edgeHolders(document, edge[0], edge[1]).length === 0) return null
  return [edge[0], edge[1]]
}
