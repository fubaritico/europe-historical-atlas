import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  TEST_COAST_PROVENANCE,
  TEST_RIVER_PROVENANCE,
  TEST_SHORE,
  testGestureContext,
  testPolity,
  testStore,
} from '../testGestureContext'

import { nearestLayer } from './layerHits'
import { PENCIL_INTERVAL_MS, pencilCancel, pencilDrag, pencilEnd, pencilStart } from './pencil'
import { penClick, undoGesture } from './toolGestures'

import type { RiverLine } from './snapLayers'
import type { PenMode } from '../../state/toolSlice'

afterEach(() => {
  vi.restoreAllMocks()
})

/**
 * A river running inland from the shore's estuary at x = 450: from y = 210 down to y = 610, a vertex every
 * 10 pixels — so at (450, 204) the shore is nearer, and at (450, 206) the river is.
 */
const MAAS: RiverLine = {
  points: Array.from({ length: 41 }, (_, index): [number, number] => [450, 210 + index * 10]),
  closed: false,
  bounds: { left: 450, top: 210, right: 450, bottom: 610 },
  name: 'Maas',
}

/**
 * France aimed at, the shore at y = 200 and the Maas, and the Pen in the given mode.
 * @param mode - the Pen's mode
 * @returns the context and its reports
 */
function waterContext(mode: PenMode) {
  const store = testStore()
  store
    .getState()
    .createPolity(testPolity('fr', 'Reaume de France'), { kind: 'create', label: 'fr' })
  store.getState().aimAt('fr')
  store.getState().choosePenMode(mode)
  return testGestureContext(store, [TEST_SHORE], [MAAS])
}

/**
 * The provenance of a placed point, to tell a coast point, a river point and a free one apart.
 * @param context - the gesture context
 * @param index - the point's index in the outline
 * @returns its provenance
 */
function provenanceAt(context: ReturnType<typeof waterContext>['context'], index: number) {
  return context.session.outline[index]?.provenance
}

/**
 * France's triangle drawn inland, away from both waters, and closed; the Pen then in the mode given.
 * @param mode - the Pen's mode once the triangle is drawn
 * @returns the context and its reports
 */
function besideATriangle(mode: PenMode) {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  const built = waterContext('free')
  for (const at of [
    [200, 400],
    [300, 400],
    [250, 340],
    [200, 400],
  ] as const)
    penClick(built.context, at)
  built.context.store.getState().choosePenMode(mode)
  built.reports.length = 0
  return built
}

describe('the Pen finding a coast or a river by itself (s02)', () => {
  describe('happy path', () => {
    // s02 — "When I click / Then an anchor is placed exactly on the coast vertex / And the Pen becomes
    // 'Pen — follow the coast' / And the result zone reads 'Pen — follow the coast'".
    it('snaps a plain-Pen click near the shore and turns the Pen to following the coast', () => {
      const { context, reports } = waterContext('free')
      penClick(context, [150, 204])
      expect(context.session.outline).toHaveLength(1)
      expect(provenanceAt(context, 0)).toEqual(TEST_COAST_PROVENANCE)
      expect(context.store.getState().penMode).toBe('coast')
      expect(reports).toEqual(['Pen — follow the coast'])
    })

    // s02 — "When I click further along the same coast / Then the whole stretch … is inserted".
    it('inserts the stretch on the next click along the same shore', () => {
      const { context, reports } = waterContext('free')
      penClick(context, [150, 204])
      penClick(context, [300, 197])
      expect(context.session.outline).toHaveLength(16)
      expect(reports.at(-1)).toBe('inserted 15 vertices from the coastline')
    })

    // s02 — "the plain Pen reaches a river": the Pen follows the river, and says so.
    it('snaps a plain-Pen click near a river and turns the Pen to following it', () => {
      const { context, reports } = waterContext('free')
      penClick(context, [453, 400])
      expect(provenanceAt(context, 0)).toEqual(TEST_RIVER_PROVENANCE)
      expect(context.store.getState().penMode).toBe('river')
      expect(reports).toEqual(['Pen — follow a river'])
    })
  })

  describe('variants', () => {
    // s02 — "the Pencil reaches a coast or a river": the point lands on the vertex, the stroke stops.
    it('ends a Pencil stroke on the shore and turns the Pen to following the coast', () => {
      const { context, reports } = waterContext('pencil')
      pencilStart(context, [150, 300], 0)
      pencilDrag(context, [150, 250], PENCIL_INTERVAL_MS)
      pencilDrag(context, [150, 203], 2 * PENCIL_INTERVAL_MS)
      pencilDrag(context, [150, 150], 3 * PENCIL_INTERVAL_MS)
      pencilEnd(context, [150, 100], 4 * PENCIL_INTERVAL_MS)
      expect(context.session.outline).toHaveLength(3)
      expect(provenanceAt(context, 2)).toEqual(TEST_COAST_PROVENANCE)
      expect(context.store.getState().penMode).toBe('coast')
      expect(reports).toEqual(['Pen — follow the coast'])
    })

    it('ends a Pencil stroke on a river and turns the Pen to following it', () => {
      const { context, reports } = waterContext('pencil')
      pencilStart(context, [300, 400], 0)
      pencilDrag(context, [400, 400], PENCIL_INTERVAL_MS)
      pencilDrag(context, [447, 400], 2 * PENCIL_INTERVAL_MS)
      pencilEnd(context, [500, 400], 3 * PENCIL_INTERVAL_MS)
      expect(context.session.outline).toHaveLength(3)
      expect(provenanceAt(context, 2)).toEqual(TEST_RIVER_PROVENANCE)
      expect(context.store.getState().penMode).toBe('river')
      expect(reports).toEqual(['Pen — follow a river'])
    })

    // s02 — "a coast and a river both within reach / Then the nearer vertex of the two".
    it('takes the nearer of the shore and the river at the estuary', () => {
      const { context } = waterContext('free')
      expect(nearestLayer(context, [450, 204])).toBe('coast')
      expect(nearestLayer(context, [450, 206])).toBe('river')
      // Exactly between the shore's vertex at y = 200 and the river's at y = 210: the shore takes the tie.
      expect(nearestLayer(context, [450, 205])).toBe('coast')
      expect(nearestLayer(context, [300, 400])).toBeNull()
    })

    // s02 — "from the coast to a river, and back to the land": the land gives back the starting mode.
    it('goes from the coast to a river directly, then back to the plain Pen on land', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { context, reports } = waterContext('free')
      penClick(context, [150, 204])
      penClick(context, [453, 400])
      expect(context.store.getState().penMode).toBe('river')
      penClick(context, [200, 500])
      expect(context.store.getState().penMode).toBe('free')
      expect(reports).toEqual(['Pen — follow the coast', 'Pen — follow a river', 'Pen'])
    })

    // s02 — "leaving the water gives the Pen back": the click places its point, the mode goes back.
    it('gives the plain Pen back on the first click off the water, which places its point', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { context, reports } = waterContext('free')
      penClick(context, [150, 204])
      penClick(context, [200, 400])
      expect(context.session.outline).toHaveLength(2)
      expect(provenanceAt(context, 1)).not.toEqual(TEST_COAST_PROVENANCE)
      expect(context.store.getState().penMode).toBe('free')
      expect(reports.at(-1)).toBe('Pen')
    })

    it('gives the Pencil back to a stroke that reached the water', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { context, reports } = waterContext('pencil')
      pencilStart(context, [150, 203], 0)
      pencilEnd(context, [150, 203], 0)
      penClick(context, [200, 400])
      expect(context.store.getState().penMode).toBe('pencil')
      expect(reports.at(-1)).toBe('Pencil — freehand')
    })

    // s02 — "When I had chosen the coast or the river mode myself / Then it goes back to the plain Pen".
    it('gives the plain Pen back when the river mode was chosen by hand', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { context } = waterContext('pencil')
      context.store.getState().choosePenMode('river')
      penClick(context, [453, 400])
      penClick(context, [200, 400])
      expect(context.store.getState().penMode).toBe('free')
    })
  })

  describe('managed errors — what does not switch', () => {
    // s02 — "an anchor away from them / Then the Pen goes back to the mode it came from".
    it('gives the Pen back when the click joins an anchor away from the water', () => {
      const { context, reports } = besideATriangle('free')
      context.store
        .getState()
        .createPolity(testPolity('hre', 'Empire'), { kind: 'create', label: 'hre' })
      context.store.getState().aimAt('hre')
      penClick(context, [150, 204])
      penClick(context, [300, 400])
      expect(context.session.outline.at(-1)?.anchor).not.toBeNull()
      expect(context.store.getState().penMode).toBe('free')
      expect(reports.at(-1)).toBe('Pen')
    })

    // s02 — "When a click … inserts a point into the target's own stretch / Then the mode does not change".
    it('keeps the coast mode when the idle Pen inserts into the target’s own stretch', () => {
      const { context } = besideATriangle('coast')
      penClick(context, [250, 400])
      expect(context.store.getState().document.claims[0]?.rings[0]).toHaveLength(4)
      expect(context.store.getState().penMode).toBe('coast')
    })

    // s02 — "When a click falls off the map and places nothing / Then the mode does not change either".
    it('keeps the coast mode on a click that places nothing, off the map', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { context } = waterContext('free')
      penClick(context, [150, 204])
      penClick(context, [-5000, -5000])
      expect(context.store.getState().penMode).toBe('coast')
    })

    // The click on the water decides even when it places nothing: the vertex the outline already ends on.
    it('switches on a click on the shore vertex the outline already ends on', () => {
      const { context } = waterContext('free')
      penClick(context, [150, 204])
      context.store.getState().choosePenMode('free')
      penClick(context, [150, 204])
      expect(context.session.outline).toHaveLength(1)
      expect(context.store.getState().penMode).toBe('coast')
    })
  })

  describe('unmanaged errors', () => {
    // The press itself on the shore: the Pencil gives way in the press, and the drag that follows in
    // the same event lays nothing.
    it('lays nothing after a Pencil press that landed on the shore', () => {
      const { context } = waterContext('pencil')
      pencilStart(context, [150, 203], 0)
      pencilDrag(context, [150, 300], PENCIL_INTERVAL_MS)
      pencilEnd(context, [150, 350], 2 * PENCIL_INTERVAL_MS)
      expect(context.session.outline).toHaveLength(1)
    })
  })

  describe('edge cases', () => {
    // The water's point joins the stroke: ‹ctrl+z› takes the stroke back whole, that point included.
    it('takes the coast point back with the stroke it ended', () => {
      const { context } = waterContext('pencil')
      pencilStart(context, [150, 300], 0)
      pencilDrag(context, [150, 250], PENCIL_INTERVAL_MS)
      pencilDrag(context, [150, 203], 2 * PENCIL_INTERVAL_MS)
      pencilEnd(context, [150, 203], 3 * PENCIL_INTERVAL_MS)
      undoGesture(context, false)
      expect(context.session.outline).toEqual([])
      expect(context.session.snap).toBeNull()
    })

    // QUAL-005's rule, a cancelled gesture is one that did not happen: the switch it made goes with it.
    it('gives the Pencil back when a stroke that reached the shore is cancelled', () => {
      const { context, reports } = waterContext('pencil')
      pencilStart(context, [150, 300], 0)
      pencilDrag(context, [150, 203], PENCIL_INTERVAL_MS)
      pencilCancel(context)
      expect(context.session.outline).toEqual([])
      expect(context.store.getState().penMode).toBe('pencil')
      expect(reports.at(-1)).toBe('Pencil — freehand')
    })

    // s02 — "When a click closes the outline on its first anchor / Then the mode does not change".
    it('keeps the coast mode when the click closes the outline', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { context } = waterContext('free')
      penClick(context, [150, 204])
      penClick(context, [300, 197])
      penClick(context, [220, 350])
      context.store.getState().choosePenMode('coast')
      penClick(context, [151, 201])
      expect(context.store.getState().document.claims).toHaveLength(1)
      expect(context.store.getState().penMode).toBe('coast')
    })
  })
})
