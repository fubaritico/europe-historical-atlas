import { afterEach, describe, expect, it, vi } from 'vitest'

import { FREE_POINT_PROVENANCE } from '../../state/editionSlice'
import { screenToLonLatOnBackdrop } from '../../viewport/projection'
import { TEST_BACKDROP_FRAME } from '../../viewport/testFrame'
import { TEST_SHORE, testGestureContext, testPolity, testStore } from '../testGestureContext'

import {
  doneMessage,
  refusalMessage,
  retraceAnchorUnder,
  retraceClick,
  retraceView,
} from './retrace'

import type { SnapLine } from '../../geometry/lineSnap'
import type { CartographerStoreHook } from '../../state/store'
import type { Point } from '../../viewport/viewport'
import type { RetraceRefusal } from '@europe-historical-atlas/core/editor/retrace'

afterEach(() => {
  vi.restoreAllMocks()
})

/** France's hexagon, screen positions at scale 1: anchors 0 to 5 in ring order. */
const HEXAGON: Point[] = [
  [200, 100],
  [300, 100],
  [350, 200],
  [300, 300],
  [200, 300],
  [150, 200],
]

/** Where a screen point is, in degrees, under the test view. */
function lonLat(store: CartographerStoreHook, at: Point): [number, number] {
  const point = screenToLonLatOnBackdrop(at, TEST_BACKDROP_FRAME, store.getState().viewport)
  if (point === null) throw new Error('off the backdrop')
  return point
}

/**
 * France as a hexagon, the Empire sharing its edge 1–2 (anchors 6 and 7 its own), and ⟨retrace⟩ in hand,
 * aimed at France.
 */
function openRetrace(coast: readonly SnapLine[] = []) {
  const store = testStore()
  const state = store.getState()
  state.createPolity(testPolity('fr', 'France'), { kind: 'create', label: 'fr' })
  state.createPolity(testPolity('hre', 'Empire'), { kind: 'create', label: 'hre' })
  const free = (at: Point) => ({ at: lonLat(store, at), provenance: FREE_POINT_PROVENANCE })
  state.drawOutline('fr', HEXAGON.map(free), { kind: 'draw-outline', label: 'fr' })
  const shared = (index: number) => ({ ...free(HEXAGON[index] ?? [0, 0]), anchor: index })
  state.drawOutline('hre', [shared(1), free([400, 100]), free([450, 200]), shared(2)], {
    kind: 'draw-outline',
    label: 'hre',
  })
  state.chooseTarget('fr')
  state.selectTool('retrace')
  return { store, ...testGestureContext(store, coast) }
}

/** France's ring. */
function france(store: CartographerStoreHook): number[] {
  return store.getState().document.claims.find((claim) => claim.polity === 'fr')?.rings[0] ?? []
}

/** The Empire's ring. */
function empire(store: CartographerStoreHook): number[] {
  return store.getState().document.claims.find((claim) => claim.polity === 'hre')?.rings[0] ?? []
}

/** A ring walked from one of its anchors. */
function from(ring: readonly number[], start: number): number[] {
  const at = ring.indexOf(start)
  return [...ring.slice(at), ...ring.slice(0, at)]
}

describe('retrace', () => {
  describe('happy path', () => {
    it('starts on the target’s anchor under the pointer', () => {
      const { context } = openRetrace()
      retraceClick(context, [201, 101])
      expect(context.session.outline.map((point) => point.anchor)).toEqual([0])
    })

    // H-46 — two anchors, and the stretch between them replaced by the run drawn, in one step.
    it('replaces the stretch between two anchors by the run drawn, in one undo step', () => {
      const { store, context, reports } = openRetrace()
      const before = store.getState().document.anchors.length
      retraceClick(context, [350, 200])
      retraceClick(context, [280, 250])
      retraceClick(context, [200, 300])
      expect(context.session.outline).toEqual([])
      expect(from(france(store), 2)).toEqual([2, before, 4, 5, 0, 1])
      expect(reports.at(-1)).toBe('France: 1 anchor replaced by 1')
      store.getState().undo()
      expect(from(france(store), 2)).toEqual([2, 3, 4, 5, 0, 1])
    })
  })

  describe('variants', () => {
    it('replaces the other side with ‹alt› held', () => {
      const { store, context } = openRetrace()
      // Without the Empire: the other side runs through 1, where it would meet France.
      store.getState().deletePolity('hre', { kind: 'delete', label: 'hre' })
      const before = store.getState().document.anchors.length
      context.flipSide = true
      retraceClick(context, [350, 200])
      retraceClick(context, [280, 250])
      retraceClick(context, [200, 300])
      expect(from(france(store), 2)).toEqual([2, 3, 4, before])
    })

    // H-06 — a stretch the Empire shares is one border: it takes the new run too.
    it('carries the new run into the neighbour on the stretch, and says it follows', () => {
      const { store, context, reports } = openRetrace()
      const added = store.getState().document.anchors.length
      retraceClick(context, [300, 100])
      retraceClick(context, [340, 130])
      retraceClick(context, [350, 200])
      expect(from(france(store), 1)).toEqual([1, added, 2, 3, 4, 5, 0])
      expect(from(empire(store), 1)).toEqual([1, 6, 7, 2, added])
      expect(reports.at(-1)).toBe('France: 0 anchors replaced by 1 · Empire follows')
    })

    // The trap: following the target's own ring between two of its anchors would lay the stretch back.
    it('lands straight on the end anchor rather than following the target’s own ring', () => {
      const { store, context, reports } = openRetrace()
      retraceClick(context, [350, 200])
      retraceClick(context, [200, 300])
      expect(from(france(store), 2)).toEqual([2, 4, 5, 0, 1])
      expect(reports.at(-1)).toBe('France: 1 anchor replaced by 0')
    })

    // Formentor, the walk of 2026-10-14: an end placed by eye on the shore is reached along the shore,
    // not joined in a straight line across the cape.
    it('follows the water the run is on up to an end anchor placed by eye', () => {
      const { store, context, reports } = openRetrace([TEST_SHORE])
      store.getState().deletePolity('hre', { kind: 'delete', label: 'hre' })
      retraceClick(context, [150, 200])
      retraceClick(context, [350, 200])
      expect(context.session.outline).toEqual([])
      expect(france(store)).toHaveLength(23)
      expect(reports.at(-1)).toBe('France: 2 anchors replaced by 19')
    })

    // The water near the end anchor takes the click; the anchor the preview promised still ends it.
    it('joins the end anchor after the water the click landed on', () => {
      const { store, context } = openRetrace([TEST_SHORE])
      retraceClick(context, [200, 300])
      retraceClick(context, [356, 200])
      expect(context.session.outline).toEqual([])
      expect(france(store)).not.toContain(3)
      expect(france(store)).toContain(2)
    })
  })

  describe('managed errors', () => {
    it('refuses a first click off the target’s anchors, and says where to click', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { context, reports } = openRetrace()
      retraceClick(context, [250, 200])
      expect(context.session.outline).toEqual([])
      expect(reports).toEqual(['click an anchor of France to start the retrace'])
      expect(warn).toHaveBeenCalledOnce()
    })

    it('refuses an end on another outline of the target, the run kept as it was', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { store, context, reports } = openRetrace()
      const free = (at: Point) => ({ at: lonLat(store, at), provenance: FREE_POINT_PROVENANCE })
      store.getState().drawOutline('fr', [free([500, 400]), free([550, 400]), free([525, 450])], {
        kind: 'draw-outline',
        label: 'island',
      })
      retraceClick(context, [200, 100])
      retraceClick(context, [400, 380])
      retraceClick(context, [500, 400])
      expect(context.session.outline).toHaveLength(2)
      expect(reports.at(-1)).toBe('not retraced: the end is not on the same outline of France')
    })

    // The Empire follows 1 → 2 and keeps its anchor 6: a run through 6 would have it visit 6 twice.
    it('refuses what the document refuses, naming the polity, the run kept', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { store, context, reports } = openRetrace()
      retraceClick(context, [300, 100])
      retraceClick(context, [400, 100])
      retraceClick(context, [350, 200])
      expect(context.session.outline.map((point) => point.anchor)).toEqual([1, 6])
      expect(from(france(store), 0)).toEqual([0, 1, 2, 3, 4, 5])
      expect(reports.at(-1)).toBe(
        'not retraced: the new run passes again through an anchor Empire keeps'
      )
    })

    // The dev, 2026-10-14: "c'est les Obotrites qui comptent" — the Empire meets France at 1, inside
    // 0 → 2: France is retraced, the Empire keeps its points, and the result says so.
    it('retraces through a junction, the polity met there keeping its points, and says so', () => {
      const { store, context, reports } = openRetrace()
      const empireBefore = [...empire(store)]
      retraceClick(context, [200, 100])
      retraceClick(context, [300, 90])
      retraceClick(context, [350, 200])
      expect(france(store)).not.toContain(1)
      expect(empire(store)).toEqual(empireBefore)
      expect(reports.at(-1)).toBe('France: 1 anchor replaced by 1 · Empire keeps its points')
    })

    it('places nothing with nobody aimed at, and says so', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { store, context } = openRetrace()
      store.getState().chooseTarget(null)
      retraceClick(context, [200, 100])
      expect(context.session.outline).toEqual([])
      expect(warn).toHaveBeenCalledWith(
        '[Cartographer] nothing retraced: select a polity to retrace first.'
      )
    })
  })

  describe('unmanaged errors', () => {
    it('words a refusal the tool should have prevented as a disagreement', () => {
      const { store } = openRetrace()
      const document = store.getState().document
      expect(refusalMessage({ kind: 'not-an-arc' }, document, 'France')).toBe(
        'not retraced: the tool and the document disagree'
      )
      expect(refusalMessage({ kind: 'bad-anchor' }, document, 'France')).toBe(
        'not retraced: the tool and the document disagree'
      )
    })
  })

  describe('edge cases', () => {
    it('words every refusal a gesture can reach', () => {
      const { store } = openRetrace()
      const document = store.getState().document
      const said = (refusal: RetraceRefusal) => refusalMessage(refusal, document, 'France')
      expect(said({ kind: 'dressed-run' })).toBe(
        'not retraced: a border dressed by hand runs over this stretch — clear it in {Overrides} first'
      )
      expect(said({ kind: 'loop', polity: 'hre' })).toBe(
        'not retraced: the new run passes again through an anchor Empire keeps'
      )
      expect(said({ kind: 'too-short', polity: 'fr' })).toBe(
        'not retraced: France would be left with fewer than 3 anchors'
      )
    })

    it('names several neighbours that follow', () => {
      const { store } = openRetrace()
      const done = { removed: 2, added: 3, neighbours: ['hre', 'fr'], untouched: ['fr', null] }
      expect(doneMessage(done, store.getState().document, 'X')).toBe(
        'X: 2 anchors replaced by 3 · Empire, France follow · France, a deliberate gap keep their points'
      )
    })

    it('does not offer an anchor the run already holds as its end', () => {
      const { context } = openRetrace()
      retraceClick(context, [200, 100])
      expect(retraceAnchorUnder(context, 'fr', [200, 100])).toBeNull()
    })
  })
})

describe('retraceView', () => {
  const FRANCE = { id: 'fr', name: 'France' }

  it('invites the first click, then names the anchor under the pointer', () => {
    const { context } = openRetrace()
    expect(retraceView(context, FRANCE, [250, 200]).sentence).toBe(
      'Retracing France — click one of its anchors to start'
    )
    expect(retraceView(context, FRANCE, [200, 100]).sentence).toBe(
      'Retracing France — start on this anchor'
    )
  })

  it('shows the stretch a click on the end would replace, before the click', () => {
    const { context } = openRetrace()
    retraceClick(context, [350, 200])
    retraceClick(context, [280, 250])
    const view = retraceView(context, FRANCE, [200, 300])
    expect(view.replaced?.map(([x, y]) => [Math.round(x), Math.round(y)])).toEqual([
      HEXAGON[2],
      HEXAGON[3],
      HEXAGON[4],
    ])
    expect(view.sentence).toBe('Retracing France — replaces 1 anchor · ‹alt› the other side')
  })

  it('names the neighbour that would follow', () => {
    const { context } = openRetrace()
    retraceClick(context, [300, 100])
    expect(retraceView(context, FRANCE, [350, 200]).sentence).toBe(
      'Retracing France — replaces 0 anchors · Empire follows · ‹alt› the other side'
    )
  })

  it('says why an end would be refused, and previews nothing', () => {
    const { context } = openRetrace()
    retraceClick(context, [300, 100])
    retraceClick(context, [400, 100])
    const view = retraceView(context, FRANCE, [350, 200])
    expect(view.replaced).toBeNull()
    expect(view.sentence).toBe(
      'Retracing France — cannot end here: the new run passes again through an anchor Empire keeps'
    )
  })

  it('says before the click which polity keeps its points', () => {
    const { context } = openRetrace()
    retraceClick(context, [200, 100])
    retraceClick(context, [300, 90])
    expect(retraceView(context, FRANCE, [350, 200]).sentence).toBe(
      'Retracing France — replaces 1 anchor · Empire keeps its points · ‹alt› the other side'
    )
  })

  // The bar then says what the click would lay, as for the Pen (`toolSession.retraceSentence`).
  it('leaves the sentence to the Pen’s while the pointer is on no end anchor', () => {
    const { context } = openRetrace()
    retraceClick(context, [200, 100])
    expect(retraceView(context, FRANCE, [250, 200])).toEqual({ replaced: null, sentence: null })
    expect(retraceView(context, FRANCE, null).replaced).toBeNull()
  })
})
