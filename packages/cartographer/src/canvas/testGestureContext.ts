import { cloneYearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

import { FREE_POINT_PROVENANCE } from '../state/editionSlice'
import { openEmptyYear } from '../state/openEmptyYear'
import { createCartographerStore } from '../state/store'
import { projectToBackdrop, remapToScreen, screenToLonLatOnBackdrop } from '../view/projection'
import { TEST_BACKDROP_FRAME } from '../view/testFrame'

import { projectedTerritories } from './scene'
import { snapLayersOf } from './snapLayers'
import { idleSession } from './toolSession'

import type { RiverLine } from './snapLayers'
import type { GestureContext } from './toolGestures'
import type { SnapLine } from '../geometry/lineSnap'
import type { CartographerStoreHook } from '../state/store'
import type { YearPolity } from '@europe-historical-atlas/core/data/yearFormat'

/**
 * **A test fixture** — the gesture context the tool tests drive, written once so the copies cannot
 * drift. No production module may import it (`backdropSource.test.ts` holds that, as for `testFrame`).
 */

/** What the test coastline is said to be traced from. */
export const TEST_COAST_PROVENANCE = { name: 'test shore', licence: 'CC0' }

/**
 * A straight shore along y = 200, from x = 100 to x = 500, a vertex every 10 pixels — in backdrop pixels,
 * which `testStore`'s view makes screen pixels.
 */
export const TEST_SHORE: SnapLine = {
  points: Array.from({ length: 41 }, (_, index): [number, number] => [100 + index * 10, 200]),
  closed: false,
  bounds: { left: 100, top: 200, right: 500, bottom: 200 },
}

/** What the test rivers are said to be drawn from. */
export const TEST_RIVER_PROVENANCE = { name: 'test rivers', licence: 'PD' }

/**
 * A polity with only an id and a name.
 * @param id - its id
 * @param name - its name, the id when not given
 * @returns the polity
 */
export function testPolity(id: string, name: string = id): YearPolity {
  return {
    id,
    name,
    rank: null,
    status: null,
    suzerain: null,
    existsFrom: null,
    existsTo: null,
    colour: null,
    wikidata: null,
  }
}

/**
 * A store on an empty 1100, under a view where a screen pixel is a backdrop pixel.
 * @returns the store
 */
export function testStore(): CartographerStoreHook {
  return createCartographerStore({
    edition: { document: openEmptyYear(1100), clone: cloneYearDocument },
    viewport: { viewport: { scale: 1, originX: 0, originY: 0 } },
  })
}

/**
 * The gesture context over a store: the anchors and the territories projected for real, an 8-pixel
 * radius, a fresh session, and every report kept.
 * @param store - the store
 * @param coast - the coastline, none by default
 * @param rivers - the river centrelines, none by default
 * @returns the context, and the reports it has made
 */
export function testGestureContext(
  store: CartographerStoreHook,
  coast: readonly SnapLine[] = [],
  rivers: readonly RiverLine[] = []
): { context: GestureContext; reports: string[] } {
  const reports: string[] = []
  const anchorsOnScreen = () =>
    remapToScreen(
      projectToBackdrop(store.getState().document.anchors, TEST_BACKDROP_FRAME),
      store.getState().viewport
    )
  const context: GestureContext = {
    store,
    frame: TEST_BACKDROP_FRAME,
    session: idleSession(),
    anchorsOnScreen,
    territoriesOnScreen: () => projectedTerritories(store.getState().document, anchorsOnScreen()),
    radius: 8,
    layers: snapLayersOf({
      coast,
      coastProvenance: TEST_COAST_PROVENANCE,
      rivers,
      riverProvenance: TEST_RIVER_PROVENANCE,
    }),
    report: (message) => {
      reports.push(message)
    },
  }
  return { context, reports }
}

/**
 * Draw an outline for a polity, from screen points under the store's view, reusing the anchors given by index.
 * @param store - the store
 * @param polityId - whose outline
 * @param points - the screen points
 * @param reuse - for each point, the anchor it reuses, or `null`
 */
export function drawOutlineAt(
  store: CartographerStoreHook,
  polityId: string,
  points: readonly [number, number][],
  reuse: readonly (number | null)[] = []
): void {
  const placed = points.map((at, index) => {
    const lonLat = screenToLonLatOnBackdrop(at, TEST_BACKDROP_FRAME, store.getState().viewport)
    if (lonLat === null) throw new Error('off the backdrop')
    return { at: lonLat, provenance: FREE_POINT_PROVENANCE, anchor: reuse[index] ?? null }
  })
  if (!store.getState().drawOutline(polityId, placed, { kind: 'draw-outline', label: polityId })) {
    throw new Error(`the outline of ${polityId} was refused`)
  }
}
