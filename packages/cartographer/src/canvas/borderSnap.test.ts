import { afterEach, describe, expect, it, vi } from 'vitest'

import { cloneYearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

import { FREE_POINT_PROVENANCE } from '../state/editionSlice'
import { openEmptyYear } from '../state/openEmptyYear'
import { createCartographerStore } from '../state/store'
import { projectToBackdrop, remapToScreen, screenToLonLatOnBackdrop } from '../view/projection'
import { TEST_BACKDROP_FRAME } from '../view/testFrame'

import { anchorClick, anchorHit, anchorSentence, borderRunTo } from './borderSnap'
import { idleSession } from './toolSession'

import type { GestureContext } from './toolGestures'
import type { YearPolity } from '@europe-historical-atlas/core/data/yearFormat'

afterEach(() => {
  vi.restoreAllMocks()
})

/** A polity with only an id and a name. */
function polity(id: string): YearPolity {
  return {
    id,
    name: id,
    rank: null,
    status: null,
    suzerain: null,
    existsFrom: null,
    existsTo: null,
    colour: null,
    wikidata: null,
  }
}

/** France's hexagon, screen positions at scale 1: anchors 0 to 5 in ring order. */
const HEXAGON: [number, number][] = [
  [200, 100],
  [300, 100],
  [350, 200],
  [300, 300],
  [200, 300],
  [150, 200],
]

/**
 * France drawn as a hexagon, and the Pen aimed at the Empire, with a recorder for the reports.
 * @returns the gesture context and what it reported
 */
function openContext() {
  const viewport = { scale: 1, originX: 0, originY: 0 }
  const store = createCartographerStore({
    edition: { document: openEmptyYear(1100), clone: cloneYearDocument },
    viewport: { viewport },
  })
  store.getState().createPolity(polity('fr'), { kind: 'create', label: 'fr' })
  store.getState().createPolity(polity('hre'), { kind: 'create', label: 'hre' })
  const points = HEXAGON.map((at) => {
    const lonLat = screenToLonLatOnBackdrop(at, TEST_BACKDROP_FRAME, viewport)
    if (lonLat === null) throw new Error('off the backdrop')
    return { at: lonLat, provenance: FREE_POINT_PROVENANCE }
  })
  store.getState().drawOutline('fr', points, { kind: 'draw-outline', label: 'fr' })
  store.getState().aimAt('hre')
  const reports: string[] = []
  const context: GestureContext = {
    store,
    frame: TEST_BACKDROP_FRAME,
    session: idleSession(),
    anchorsOnScreen: () =>
      remapToScreen(
        projectToBackdrop(store.getState().document.anchors, TEST_BACKDROP_FRAME),
        store.getState().viewport
      ),
    territoriesOnScreen: () => [],
    radius: 8,
    coast: [],
    coastProvenance: { name: 'test shore', licence: 'CC0' },
    report: (message) => {
      reports.push(message)
    },
  }
  return { context, reports }
}

/** The anchor indices of the outline in progress. */
const joined = (context: GestureContext) => context.session.outline.map((point) => point.anchor)

describe('borderSnap', () => {
  describe('happy path', () => {
    it('joins the anchor under the Pen, by its index', () => {
      const { context } = openContext()
      expect(anchorClick(context, [301, 101])).toBe(true)
      expect(joined(context)).toEqual([1])
    })

    it('follows two anchors of the ring between, and reports "followed 2 anchors"', () => {
      const { context, reports } = openContext()
      anchorClick(context, [300, 100])
      anchorClick(context, [300, 300])
      expect(joined(context)).toEqual([1, 2, 3])
      expect(reports).toEqual(['followed 2 anchors of a shared border'])
    })
  })

  describe('variants', () => {
    // From anchor 1 to anchor 5, the short way crosses index 0: 1, 0, 5 — not 1, 2, 3, 4, 5.
    it('takes the short way across the ring’s start, in that order', () => {
      const { context } = openContext()
      anchorClick(context, [300, 100])
      anchorClick(context, [150, 200])
      expect(joined(context)).toEqual([1, 0, 5])
    })

    it('reports "followed 1 anchor" for a single step', () => {
      const { context, reports } = openContext()
      anchorClick(context, [300, 100])
      anchorClick(context, [350, 200])
      expect(reports).toEqual(['followed 1 anchor of a shared border'])
    })
  })

  describe('managed errors', () => {
    it('only lands on the anchor when the outline’s last point is not an anchor', () => {
      const { context, reports } = openContext()
      context.session.outline.push({ at: [0, 0], provenance: FREE_POINT_PROVENANCE, anchor: null })
      expect(borderRunTo(context, 3)).toBeNull()
      anchorClick(context, [300, 300])
      expect(joined(context)).toEqual([null, 3])
      expect(reports).toEqual([])
    })

    // ARCH-101: a run back through an anchor the outline holds would make the ring touch itself.
    it('refuses a run through the outline’s own anchors, joins only the anchor, and says so', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { context, reports } = openContext()
      anchorClick(context, [300, 300])
      context.session.outline.push({ at: [0, 0], provenance: FREE_POINT_PROVENANCE, anchor: null })
      anchorClick(context, [350, 200])
      expect(joined(context)).toEqual([3, null, 2])
      // From 2, the short way to 4 is 2, 3, 4 — and 3 is the outline's first point.
      anchorClick(context, [200, 300])
      expect(joined(context)).toEqual([3, null, 2, 4])
      expect(reports).toEqual([])
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('only the anchor was joined'))
    })
  })

  describe('unmanaged errors', () => {
    it('reports an anchor with no declared source and joins nothing of it', () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { context } = openContext()
      context.store.getState().document.anchorSource[1] = 99
      expect(anchorClick(context, [300, 100])).toBe(true)
      expect(joined(context)).toEqual([])
      expect(error).toHaveBeenCalledWith(expect.stringContaining('no declared source'))
    })
  })

  describe('edge cases', () => {
    it('does not offer an anchor the outline already holds', () => {
      const { context } = openContext()
      anchorClick(context, [300, 100])
      expect(anchorHit(context, [300, 100])).toBeNull()
    })

    it('counts the paths holding an anchor, singular and plural', () => {
      const { context } = openContext()
      expect(anchorSentence(context, 1)).toBe('Branching from a shared anchor — held by 1 path')
      context.store.getState().drawOutline(
        'hre',
        [1, 2, 3].map((index) => ({
          at: context.store.getState().document.anchors[index] ?? [0, 0],
          provenance: FREE_POINT_PROVENANCE,
          anchor: index,
        })),
        { kind: 'draw-outline', label: 'hre' }
      )
      expect(anchorSentence(context, 1)).toBe('Branching from a shared anchor — held by 2 paths')
    })
  })
})
