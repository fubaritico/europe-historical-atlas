import { afterEach, describe, expect, it, vi } from 'vitest'

import { lonLatToScreen } from '../view/projection'

import {
  TEST_COAST_PROVENANCE,
  testGestureContext,
  testPolity,
  testStore,
} from './testGestureContext'
import {
  MOVE_ANCHOR_STEP,
  arrowDrag,
  arrowPress,
  arrowRelease,
  closeOutline,
  coastHit,
  lonLatAt,
  penClick,
  redoGesture,
  toolKey,
  undoGesture,
} from './toolGestures'

import type { GestureContext } from './toolGestures'
import type { CoastContour } from '../geometry/coastSnap'

/** Three screen points that make a triangle well inside the backdrop. */
const TRIANGLE: [number, number][] = [
  [100, 100],
  [300, 100],
  [300, 300],
]

/**
 * A store with France created and aimed at, under a view where a screen pixel is a backdrop pixel.
 * @param aimed - whether France is the target
 * @returns the gesture context, over a fresh session
 */
function openContext(aimed = true, coast: readonly CoastContour[] = []): GestureContext {
  const store = testStore()
  store
    .getState()
    .createPolity(testPolity('fr', 'Reaume de France'), { kind: 'create', label: 'fr' })
  store
    .getState()
    .createPolity(testPolity('hre', 'Sacrum Imperium'), { kind: 'create', label: 'hre' })
  if (aimed) store.getState().aimAt('fr')
  return testGestureContext(store, coast).context
}

/**
 * Draw and close France's triangle with three clicks and a fourth on the first anchor.
 * @param context - the gesture context
 */
function drawTriangle(context: GestureContext): void {
  for (const at of TRIANGLE) penClick(context, at)
  penClick(context, [102, 101])
}

/** Where an anchor of the document lands on screen. */
function onScreen(context: GestureContext, index: number): [number, number] {
  const anchor = context.store.getState().document.anchors[index]
  if (anchor === undefined) throw new Error(`no anchor ${String(index)}`)
  return lonLatToScreen(anchor, context.frame, context.store.getState().viewport)
}

afterEach(() => {
  vi.restoreAllMocks()
})

/** Silence and record the console at both levels. */
function watchConsole() {
  return {
    warn: vi.spyOn(console, 'warn').mockImplementation(() => undefined),
    error: vi.spyOn(console, 'error').mockImplementation(() => undefined),
  }
}

describe('toolGestures', () => {
  describe('happy path', () => {
    // s02 — "a click places an anchor in that polity": in the session, until the ring closes.
    it('places each Pen click in the outline, not yet in the document', () => {
      const context = openContext()
      for (const at of TRIANGLE) penClick(context, at)
      expect(context.session.outline).toHaveLength(3)
      expect(context.store.getState().document.anchors).toEqual([])
    })

    // s02 — "When I click it / Then the ring closes", and H-10: one gesture, one step.
    it('closes the ring on a click near the first anchor, as one undo step', () => {
      const context = openContext()
      const before = context.store.getState().rows.length
      drawTriangle(context)
      const state = context.store.getState()
      expect(state.document.claims).toEqual([{ polity: 'fr', rings: [[0, 1, 2]] }])
      expect(state.rows).toHaveLength(before + 1)
      expect(state.undoLabel).toBe('draw outline of Reaume de France')
      expect(context.session.outline).toEqual([])
    })

    // CURSORS.md asks for exactly this test: the hot spot is the cross's centre, so a click at a known
    // screen point must store the coordinate under it — a one-pixel offset would move every anchor.
    it('stores the coordinate under the click, to the pixel', () => {
      const context = openContext()
      drawTriangle(context)
      expect(onScreen(context, 1)[0]).toBeCloseTo(300, 6)
      expect(onScreen(context, 1)[1]).toBeCloseTo(100, 6)
    })

    // s03 — "press on a handle and drag it / When I release / Then the move is committed as one step".
    it('moves the grabbed anchor on release, as one undo step', () => {
      const context = openContext()
      drawTriangle(context)
      context.store.getState().selectTool('edit')
      arrowPress(context, [301, 99])
      arrowDrag(context, [350, 150])
      expect(context.store.getState().undoLabel).toBe('draw outline of Reaume de France')
      arrowRelease(context)
      expect(onScreen(context, 1)[0]).toBeCloseTo(350, 6)
      expect(context.store.getState().undoLabel).toBe(MOVE_ANCHOR_STEP.label)
    })
  })

  describe('variants', () => {
    it('closes on ‹enter› with a straight segment, wherever the pointer is', () => {
      const context = openContext()
      for (const at of TRIANGLE) penClick(context, at)
      expect(toolKey(context, 'Enter')).toBe(true)
      expect(context.store.getState().document.claims[0]?.rings).toEqual([[0, 1, 2]])
    })

    // s02 — "When I press ‹backspace› / Then the eleventh vertex is removed".
    it('takes back the last anchor on ‹backspace›', () => {
      const context = openContext()
      for (const at of TRIANGLE) penClick(context, at)
      toolKey(context, 'Backspace')
      expect(context.session.outline).toHaveLength(2)
    })

    // s02 — "When I press ‹escape› / Then the whole outline in progress is abandoned".
    it('abandons the outline on ‹escape›, leaving the polity with no territory', () => {
      const context = openContext()
      for (const at of TRIANGLE) penClick(context, at)
      toolKey(context, 'Escape')
      expect(context.session.outline).toEqual([])
      expect(context.store.getState().document.claims).toEqual([])
    })

    // s03 — "every path holding any of them follows": the anchor is one index in both rings.
    it('moves a shared anchor in every ring that holds it', () => {
      const context = openContext()
      drawTriangle(context)
      const document = context.store.getState().document
      document.claims.push({ polity: 'hre', rings: [[1, 2, 0]] })
      context.store.getState().selectTool('edit')
      arrowPress(context, [300, 100])
      arrowDrag(context, [320, 120])
      arrowRelease(context)
      // One anchor moved, none copied: both rings still name index 1, and it is where it was dropped.
      const after = context.store.getState().document
      expect(after.anchors).toHaveLength(3)
      expect(after.claims.map((claim) => claim.rings[0]?.includes(1))).toEqual([true, true])
      expect(onScreen(context, 1)[0]).toBeCloseTo(320, 6)
    })

    it('selects without moving on a press and release in place', () => {
      const context = openContext()
      drawTriangle(context)
      const rows = context.store.getState().rows.length
      arrowPress(context, [300, 100])
      arrowRelease(context)
      expect(context.session.selected).toBe(1)
      expect(context.store.getState().rows).toHaveLength(rows)
    })
  })

  describe('managed errors', () => {
    // s02 — "the Pen refuses to place an anchor" with nobody to draw for.
    it('places nothing when nobody is aimed at, and says so', () => {
      const logged = watchConsole()
      const context = openContext(false)
      penClick(context, [100, 100])
      expect(context.session.outline).toEqual([])
      expect(logged.warn).toHaveBeenCalledWith(expect.stringContaining('select a polity'))
    })

    // s02 — "a click selects nothing — there is no polity whose points it could select".
    it('selects nothing with the arrow when nobody is aimed at', () => {
      const context = openContext()
      drawTriangle(context)
      context.store.setState({ target: null })
      arrowPress(context, [300, 100])
      expect(context.session.selected).toBeNull()
    })

    // The dev's inversion of Illustrator: whose points first. A neighbour's anchor is not reachable.
    it('cannot pick up an anchor the target does not hold', () => {
      const context = openContext()
      drawTriangle(context)
      context.store.getState().aimAt('hre')
      arrowPress(context, [300, 100])
      expect(context.session.selected).toBeNull()
    })

    it('does not close two anchors, which enclose nothing, and says so', () => {
      const logged = watchConsole()
      const context = openContext()
      penClick(context, [100, 100])
      penClick(context, [300, 100])
      closeOutline(context)
      expect(context.store.getState().document.claims).toEqual([])
      expect(context.session.outline).toHaveLength(2)
      expect(logged.warn).toHaveBeenCalledWith(expect.stringContaining('three anchors'))
    })
  })

  describe('unmanaged errors', () => {
    // The vellum around the backdrop is not a place.
    it('places nothing off the backdrop, and says so', () => {
      const logged = watchConsole()
      const context = openContext()
      penClick(context, [-50, -50])
      expect(context.session.outline).toEqual([])
      expect(lonLatAt(context, [-50, -50])).toBeNull()
      expect(logged.warn).toHaveBeenCalledWith(expect.stringContaining('off the map'))
    })

    // The target is gone (an undo took the polity): the outline stays on screen, nothing is lost to it.
    it('keeps the outline when the target no longer resolves at closing, and says so', () => {
      const logged = watchConsole()
      const context = openContext()
      for (const at of TRIANGLE) penClick(context, at)
      context.store.setState({ target: 'gone' })
      closeOutline(context)
      expect(context.session.outline).toHaveLength(3)
      expect(logged.warn).toHaveBeenCalledWith(expect.stringContaining('no polity is selected'))
    })

    // What no gesture should reach: the document refusing what the tool checked. Loud, at error level.
    it('reports a document that refuses a checked outline as an error, keeping the outline', () => {
      const logged = watchConsole()
      const context = openContext()
      for (const at of TRIANGLE) penClick(context, at)
      context.store.setState({ drawOutline: () => false })
      closeOutline(context)
      expect(context.session.outline).toHaveLength(3)
      expect(logged.error).toHaveBeenCalledWith(expect.stringContaining('refused the outline'))
    })

    it('reports a document that refuses a move as an error', () => {
      const logged = watchConsole()
      const context = openContext()
      drawTriangle(context)
      context.store.setState({ moveAnchor: () => false })
      arrowPress(context, [300, 100])
      arrowDrag(context, [320, 120])
      arrowRelease(context)
      expect(logged.error).toHaveBeenCalledWith(expect.stringContaining('refused to move anchor 1'))
    })
  })

  describe('edge cases', () => {
    it('leaves a dragged anchor where it last landed when the pointer leaves the backdrop', () => {
      const context = openContext()
      drawTriangle(context)
      arrowPress(context, [300, 100])
      arrowDrag(context, [320, 120])
      arrowDrag(context, [-50, -50])
      arrowRelease(context)
      expect(onScreen(context, 1)[0]).toBeCloseTo(320, 6)
    })

    it('lets the hand’s keys through when there is no outline to act on', () => {
      const context = openContext()
      expect(toolKey(context, 'Backspace')).toBe(false)
      expect(toolKey(context, 'Escape')).toBe(false)
    })

    it('drops the arrow’s selection on ‹escape›', () => {
      const context = openContext()
      drawTriangle(context)
      context.store.getState().selectTool('edit')
      arrowPress(context, [300, 100])
      expect(toolKey(context, 'Escape')).toBe(true)
      expect(context.session.selected).toBeNull()
    })
  })
})

describe('undoGesture and redoGesture', () => {
  describe('happy path', () => {
    it('takes back the last closed outline, and puts it back', () => {
      const context = openContext()
      drawTriangle(context)
      undoGesture(context, false)
      expect(context.store.getState().document.claims).toEqual([])
      redoGesture(context, false)
      expect(context.store.getState().document.claims).toHaveLength(1)
    })
  })

  describe('variants', () => {
    // H-10 applied to the session: the outline in progress is the gesture in progress, so it goes first.
    it('takes back the open outline’s anchor before undoing anything', () => {
      const context = openContext()
      drawTriangle(context)
      penClick(context, [500, 500])
      undoGesture(context, false)
      expect(context.session.outline).toEqual([])
      expect(context.store.getState().document.claims).toHaveLength(1)
      undoGesture(context, false)
      expect(context.store.getState().document.claims).toEqual([])
    })
  })

  describe('managed errors', () => {
    // No refusal is silent (rules/error-handling.md).
    it('says there is nothing to redo at the end of the line', () => {
      const logged = watchConsole()
      redoGesture(openContext(), false)
      expect(logged.warn).toHaveBeenCalledWith(expect.stringContaining('nothing to redo'))
    })
  })

  describe('unmanaged errors', () => {
    it('says there is nothing to undo at the origin', () => {
      const logged = watchConsole()
      const context = openContext()
      while (context.store.getState().canUndo) context.store.getState().undo()
      undoGesture(context, false)
      expect(logged.warn).toHaveBeenCalledWith(expect.stringContaining('nothing to undo'))
    })
  })

  describe('edge cases', () => {
    // s03 — "undoing never changes the tool in my hand".
    it('leaves the tool in hand untouched', () => {
      const context = openContext()
      drawTriangle(context)
      context.store.getState().selectTool('edit')
      undoGesture(context, false)
      expect(context.store.getState().tool).toBe('edit')
    })
  })

  describe('what the review found', () => {
    // ARCH-001 / QUAL-001: an undo mid-drag drops the drag, so the release writes nothing on the
    // rewound document — and the selection, which is not a gesture, stays.
    it('drops a drag in progress before undoing, and keeps the selection', () => {
      const context = openContext()
      drawTriangle(context)
      arrowPress(context, [300, 100])
      arrowDrag(context, [320, 120])
      undoGesture(context, false)
      arrowRelease(context)
      expect(context.store.getState().document.claims).toHaveLength(1)
      expect(context.store.getState().undoLabel).toBe('draw outline of Reaume de France')
      expect(context.session.selected).toBe(1)
    })

    it('drops an outline in progress before redoing', () => {
      const context = openContext()
      drawTriangle(context)
      undoGesture(context, false)
      penClick(context, [500, 500])
      redoGesture(context, false)
      expect(context.session.outline).toEqual([])
      expect(context.store.getState().document.claims).toEqual([])
    })

    // QUAL-002: a held key walks the line, but the warning is said once per press.
    it('says nothing to undo once per press, not on every repeat', () => {
      const logged = watchConsole()
      const context = openContext()
      while (context.store.getState().canUndo) context.store.getState().undo()
      undoGesture(context, false)
      undoGesture(context, true)
      undoGesture(context, true)
      expect(logged.warn).toHaveBeenCalledTimes(1)
    })
  })

  describe('one step at a time — the closing reopens', () => {
    // The dev, 2026-10-11: "que ça enlève juste la fermeture de la zone".
    it('reopens the outline it closed, with its points back in hand', () => {
      const context = openContext()
      drawTriangle(context)
      undoGesture(context, false)
      expect(context.store.getState().document.claims).toEqual([])
      expect(context.session.outline).toHaveLength(3)
      expect(onScreenPoint(context, context.session.outline[1]?.at)[0]).toBeCloseTo(300, 6)
    })

    it('then takes back one anchor per press', () => {
      const context = openContext()
      drawTriangle(context)
      undoGesture(context, false)
      undoGesture(context, false)
      expect(context.session.outline).toHaveLength(2)
    })

    it('closes it again on redo, and empties the hand', () => {
      const context = openContext()
      drawTriangle(context)
      undoGesture(context, false)
      redoGesture(context, false)
      expect(context.session.outline).toEqual([])
      expect(context.store.getState().document.claims[0]?.rings).toHaveLength(1)
    })

    // Once the author has changed the reopened outline, it is theirs: a redo does not overwrite it.
    it('does not close a reopened outline the author has changed — the redo waits, and says so', () => {
      const logged = watchConsole()
      const context = openContext()
      drawTriangle(context)
      undoGesture(context, false)
      penClick(context, [200, 250])
      redoGesture(context, false)
      expect(context.session.outline).toEqual([])
      expect(context.store.getState().document.claims).toEqual([])
      expect(context.store.getState().canRedo).toBe(true)
      expect(logged.warn).toHaveBeenCalledWith(expect.stringContaining('redo again'))
    })

    // A reopened outline let go with Escape is no longer the one an undo handed back.
    it('forgets the reopened outline once Escape lets it go', () => {
      const context = openContext()
      drawTriangle(context)
      undoGesture(context, false)
      toolKey(context, 'Escape')
      expect(context.session.reopened).toBeNull()
    })

    // No refusal is silent: undoing a closing with the arrow in hand reopens nothing, and says so.
    it('undoes a closing without reopening it under another tool, and says so', () => {
      const logged = watchConsole()
      const context = openContext()
      drawTriangle(context)
      context.store.getState().selectTool('edit')
      undoGesture(context, false)
      expect(context.store.getState().document.claims).toEqual([])
      expect(context.session.outline).toEqual([])
      expect(logged.warn).toHaveBeenCalledWith(expect.stringContaining('no outline was put back'))
    })

    it('reopens nothing, and says nothing, when the step undone was not a closing', () => {
      const logged = watchConsole()
      const context = openContext()
      drawTriangle(context)
      context.store.getState().selectTool('edit')
      arrowPress(context, [300, 100])
      arrowDrag(context, [320, 120])
      arrowRelease(context)
      context.store.getState().selectTool('draw')
      undoGesture(context, false)
      expect(context.session.outline).toEqual([])
      expect(logged.warn).not.toHaveBeenCalled()
    })
  })
})

/** Where a point in degrees lands on screen, under the context's view. */
function onScreenPoint(
  context: GestureContext,
  point: [number, number] | undefined
): [number, number] {
  if (point === undefined) throw new Error('no point')
  return lonLatToScreen(point, context.frame, context.store.getState().viewport)
}

/** A straight shore from (100,200) to (500,200), a vertex every 10 backdrop pixels. */
const SHORE: CoastContour = {
  points: Array.from({ length: 41 }, (_, index): [number, number] => [100 + index * 10, 200]),
  closed: false,
  bounds: { left: 100, top: 200, right: 500, bottom: 200 },
}

/** A small island well away from the shore. */
const ISLE: CoastContour = {
  points: [
    [700, 600],
    [710, 600],
    [710, 610],
  ],
  closed: true,
  bounds: { left: 700, top: 600, right: 710, bottom: 610 },
}

/**
 * A context with the Pen following the coast, and a recorder for what it reports.
 * @returns the context and the reports
 */
function coastContext() {
  const context = openContext(true, [SHORE, ISLE])
  context.store.getState().choosePenMode('coast')
  const reports: string[] = []
  context.report = (message) => {
    reports.push(message)
  }
  return { context, reports }
}

describe('the Pen following the coast', () => {
  describe('happy path', () => {
    // s02 — "a first vertex is placed exactly on the coastline contour".
    it('places the first anchor exactly on the coast, under its provenance', () => {
      const { context } = coastContext()
      penClick(context, [151, 204])
      expect(context.session.outline).toHaveLength(1)
      expect(onScreenPoint(context, context.session.outline[0]?.at)[0]).toBeCloseTo(150, 6)
      expect(onScreenPoint(context, context.session.outline[0]?.at)[1]).toBeCloseTo(200, 6)
      expect(context.session.outline[0]?.provenance).toEqual(TEST_COAST_PROVENANCE)
    })

    // s02 — "the whole coastline sub-path between the two is inserted / inserted 412 vertices".
    it('inserts the whole stretch on the second click, and says how many', () => {
      const { context, reports } = coastContext()
      penClick(context, [150, 203])
      penClick(context, [300, 197])
      expect(context.session.outline).toHaveLength(16)
      expect(reports).toEqual(['inserted 15 vertices from the coastline'])
    })

    it('records the snapped anchors under the coast’s provenance once the ring closes', () => {
      const { context } = coastContext()
      penClick(context, [150, 200])
      penClick(context, [200, 200])
      context.store.getState().choosePenMode('free')
      penClick(context, [175, 300])
      penClick(context, [151, 201])
      const { sources, anchorSource } = context.store.getState().document
      expect(sources.map((source) => source.name).sort()).toEqual(['reported by eye', 'test shore'])
      expect(anchorSource).toHaveLength(7)
    })
  })

  describe('variants', () => {
    it('follows on from the last snapped vertex, in either direction', () => {
      const { context } = coastContext()
      penClick(context, [300, 200])
      penClick(context, [250, 200])
      penClick(context, [400, 200])
      // 1 + 5 back towards the start + 15 forward again.
      expect(context.session.outline).toHaveLength(21)
    })

    it('places only the vertex when the second click lands on another contour', () => {
      const { context, reports } = coastContext()
      penClick(context, [150, 200])
      penClick(context, [705, 601])
      expect(context.session.outline).toHaveLength(2)
      expect(reports).toEqual([])
    })
  })

  describe('managed errors', () => {
    // s02 — "no river within 12 km — place points freely": the same rule for the coast, and said.
    it('places a free point off the coast, and says so', () => {
      const logged = watchConsole()
      const { context } = coastContext()
      penClick(context, [300, 400])
      expect(context.session.outline[0]?.provenance.name).toBe('reported by eye')
      expect(logged.warn).toHaveBeenCalledWith(expect.stringContaining('no coastline within reach'))
    })
  })

  describe('unmanaged errors', () => {
    // A free point placed after a snapped one breaks the run: the next snap starts afresh.
    it('does not bridge a stretch across a free point', () => {
      const { context, reports } = coastContext()
      penClick(context, [150, 200])
      context.store.getState().choosePenMode('free')
      penClick(context, [200, 300])
      context.store.getState().choosePenMode('coast')
      penClick(context, [300, 200])
      expect(context.session.outline).toHaveLength(3)
      expect(reports).toEqual([])
    })

    it('starts afresh after Backspace takes back a snapped anchor', () => {
      const { context, reports } = coastContext()
      penClick(context, [150, 200])
      penClick(context, [160, 200])
      toolKey(context, 'Backspace')
      penClick(context, [300, 200])
      expect(reports).toEqual(['inserted 1 vertex from the coastline'])
      expect(context.session.outline).toHaveLength(2)
    })
  })

  describe('edge cases', () => {
    // Closing wins: the first anchor sits on the coast too, and a click on it must close the ring.
    it('still closes the ring on the first anchor while following the coast', () => {
      const { context } = coastContext()
      penClick(context, [150, 200])
      penClick(context, [200, 200])
      context.store.getState().choosePenMode('free')
      penClick(context, [175, 300])
      context.store.getState().choosePenMode('coast')
      penClick(context, [151, 201])
      expect(context.store.getState().document.claims).toHaveLength(1)
    })

    it('finds no coast when the view has no scale yet', () => {
      const { context } = coastContext()
      context.store.getState().setViewport({ scale: 0, originX: 0, originY: 0 })
      expect(coastHit(context, [150, 200])).toBeNull()
    })
  })

  describe('what the review found', () => {
    // QUAL-101: a second click on the vertex already placed inserts nothing and reports nothing.
    it('places nothing on a second click on the same coast vertex, and says so', () => {
      const logged = watchConsole()
      const { context, reports } = coastContext()
      penClick(context, [150, 200])
      penClick(context, [151, 201])
      expect(context.session.outline).toHaveLength(1)
      expect(reports).toEqual([])
      expect(logged.warn).toHaveBeenCalledWith(
        expect.stringContaining('already ends on that coast vertex')
      )
    })

    // QUAL-105: the reach is in screen pixels, so it shrinks on the coast's grid as the view zooms in.
    it('reaches the coast in screen pixels, whatever the scale', () => {
      const { context } = coastContext()
      context.store.getState().setViewport({ scale: 2, originX: 0, originY: 0 })
      // 6 screen px from the vertex at backdrop (150, 200), which is screen (300, 400) at scale 2.
      expect(coastHit(context, [300, 406])).toEqual({ contour: 0, vertex: 5 })
      // 12 screen px away is out of an 8 px reach, though it is only 6 backdrop px away.
      expect(coastHit(context, [300, 412])).toBeNull()
    })

    // QUAL-106: each of the resets breaks the run, so the next snapped click starts afresh.
    it('starts afresh after Escape abandons the outline', () => {
      const { context, reports } = coastContext()
      penClick(context, [150, 200])
      toolKey(context, 'Escape')
      penClick(context, [300, 200])
      expect(context.session.outline).toHaveLength(1)
      expect(reports).toEqual([])
    })

    it('starts afresh after ctrl+Z takes back the last snapped anchor', () => {
      const { context, reports } = coastContext()
      penClick(context, [150, 200])
      penClick(context, [160, 200])
      undoGesture(context, false)
      penClick(context, [300, 200])
      expect(context.session.outline).toHaveLength(2)
      expect(reports).toEqual(['inserted 1 vertex from the coastline'])
    })

    // QUAL-112: a reopened ring whose anchor has no declared source drops it, and says so.
    it('reports and leaves out an anchor with no declared source when reopening', () => {
      const logged = watchConsole()
      const context = openContext()
      drawTriangle(context)
      context.store.getState().document.anchorSource[1] = 99
      undoGesture(context, false)
      expect(context.session.outline).toHaveLength(2)
      expect(logged.error).toHaveBeenCalledWith(expect.stringContaining('no declared source'))
    })

    it('reads nothing of a ring when the step undone is not a closing', () => {
      const logged = watchConsole()
      const context = openContext()
      drawTriangle(context)
      context.store.getState().document.anchorSource[1] = 99
      context.store.getState().selectTool('edit')
      arrowPress(context, [100, 100])
      arrowDrag(context, [110, 110])
      arrowRelease(context)
      context.store.getState().selectTool('draw')
      undoGesture(context, false)
      expect(logged.error).not.toHaveBeenCalled()
    })
  })

  describe('a click in a fill', () => {
    // The dev, 2026-10-11: clicking in a polity's fill selects it, as {Polities} does.
    it('aims at the polity whose fill the arrow is pressed in, the arrow staying in hand', () => {
      const context = openContext()
      drawTriangle(context)
      context.store.getState().chooseTarget('hre')
      context.store.getState().selectTool('edit')
      arrowPress(context, [250, 150])
      expect(context.store.getState().target).toBe('fr')
      expect(context.store.getState().tool).toBe('edit')
    })

    // A handle wins over the fill it sits on: the press picks up the anchor, the target is unchanged.
    it('picks up a handle rather than re-aiming', () => {
      const context = openContext()
      drawTriangle(context)
      context.store.getState().selectTool('edit')
      arrowPress(context, [300, 100])
      expect(context.session.selected).toBe(1)
      expect(context.store.getState().target).toBe('fr')
    })

    // The dev, 2026-10-11: a press on unclaimed ground deselects, as in Illustrator.
    it('aims at nobody on a press over unclaimed ground', () => {
      const context = openContext()
      drawTriangle(context)
      context.store.getState().selectTool('edit')
      arrowPress(context, [900, 900])
      expect(context.store.getState().target).toBeNull()
    })
  })

  describe('a shared border', () => {
    /**
     * France's triangle drawn and closed, then the Empire aimed at with the Pen.
     * @returns the context, on the Empire
     */
    function neighbourContext() {
      const context = openContext()
      drawTriangle(context)
      context.store.getState().aimAt('hre')
      return context
    }

    // H-06: the Pen lands on France's anchor itself — no copy is made.
    it('joins a neighbour’s anchor by its index', () => {
      const context = neighbourContext()
      penClick(context, [302, 101])
      expect(context.session.outline[0]?.anchor).toBe(1)
    })

    it('follows the neighbour’s ring between two joined anchors, and says how many', () => {
      const context = neighbourContext()
      const reports: string[] = []
      context.report = (message) => {
        reports.push(message)
      }
      penClick(context, [300, 100])
      penClick(context, [300, 300])
      expect(context.session.outline.map((point) => point.anchor)).toEqual([1, 2])
      expect(reports).toEqual(['followed 1 anchor of a shared border'])
    })

    // The point of it all: the two polities hold one border, so moving it moves both.
    it('closes onto the shared anchors without copying them, so one move moves both borders', () => {
      const context = neighbourContext()
      penClick(context, [300, 100])
      penClick(context, [300, 300])
      penClick(context, [450, 200])
      penClick(context, [301, 101])
      const { document } = context.store.getState()
      expect(document.anchors).toHaveLength(4)
      expect(document.claims.find((claim) => claim.polity === 'hre')?.rings[0]).toEqual([1, 2, 3])
      context.store.getState().moveAnchor(1, [5, 5], MOVE_ANCHOR_STEP)
      expect(
        context.store.getState().document.claims.every((claim) => claim.rings[0]?.includes(1))
      ).toBe(true)
    })

    // Reopening keeps the shared anchors shared: closing again copies nothing.
    it('keeps the shared anchors shared through an undo and a second closing', () => {
      const context = neighbourContext()
      penClick(context, [300, 100])
      penClick(context, [300, 300])
      penClick(context, [450, 200])
      penClick(context, [301, 101])
      undoGesture(context, false)
      expect(context.session.outline.map((point) => point.anchor)).toEqual([1, 2, null])
      closeOutline(context)
      expect(context.store.getState().document.anchors).toHaveLength(4)
    })

    // The outline's own points are not offered: the first is the closing, the others are already in it.
    it('does not join an anchor the outline in progress already holds', () => {
      const context = neighbourContext()
      penClick(context, [300, 100])
      penClick(context, [450, 200])
      penClick(context, [300, 300])
      penClick(context, [452, 201])
      expect(context.session.outline.map((point) => point.anchor)).toEqual([1, null, 2, null])
    })
  })
})

describe('two neighbours along one shore', () => {
  /**
   * France drawn along the shore from x = 100 to x = 250 — anchors 0 to 15, one per vertex — and
   * closed inland; then the Empire aimed at, the Pen still following the coast.
   * @returns the context, on the Empire, and its reports
   */
  function shoreNeighbours() {
    const { context, reports } = coastContext()
    penClick(context, [100, 200])
    penClick(context, [250, 200])
    context.store.getState().choosePenMode('free')
    penClick(context, [175, 300])
    penClick(context, [101, 201])
    context.store.getState().aimAt('hre')
    context.store.getState().choosePenMode('coast')
    reports.length = 0
    return { context, reports }
  }

  // The dev's case, Spain then Portugal: the shared vertex is France's own anchor, and the Pen keeps
  // following the coast from it rather than branching off it.
  it('starts on the neighbour’s coast anchor by its index, and follows the shore from there', () => {
    const { context, reports } = shoreNeighbours()

    penClick(context, [250, 202])
    penClick(context, [400, 198])

    expect(context.session.outline[0]?.anchor).toBe(15)
    expect(context.session.outline.slice(1).every((point) => point.anchor === null)).toBe(true)
    expect(reports).toEqual(['inserted 15 vertices from the coastline'])
  })

  it('reuses every neighbour’s anchor a coast stretch runs over, and adds only the rest', () => {
    const { context } = shoreNeighbours()

    penClick(context, [300, 200])
    penClick(context, [200, 200])

    expect(context.session.outline.map((point) => point.anchor)).toEqual([
      null,
      null,
      null,
      null,
      null,
      15,
      14,
      13,
      12,
      11,
      10,
    ])
  })

  it('keeps the neighbour’s provenance on a reused anchor', () => {
    const { context } = shoreNeighbours()
    penClick(context, [250, 200])
    expect(context.session.outline[0]?.provenance).toEqual(TEST_COAST_PROVENANCE)
  })

  // In free mode the shore is not followed, so an existing anchor is still branched onto.
  it('branches onto the neighbour’s anchor in free mode', () => {
    const { context } = shoreNeighbours()
    context.store.getState().choosePenMode('free')

    penClick(context, [250, 202])

    expect(context.session.outline[0]?.anchor).toBe(15)
    expect(context.session.snap).toBeNull()
  })

  it('places a free point next to the shore without capturing a neighbour’s anchor', () => {
    const { context } = shoreNeighbours()
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    context.store.getState().choosePenMode('free')

    penClick(context, [240, 260])

    expect(context.session.outline[0]?.anchor).toBeNull()
  })
})

describe('the Pen inserting a point on the target’s outline', () => {
  /**
   * France's triangle drawn and closed, the Pen still in hand and idle.
   * @returns the context
   */
  function idlePenOnTriangle() {
    const context = openContext()
    drawTriangle(context)
    return context
  }

  /** France's rings. */
  function franceRings(context: GestureContext): number[][] {
    return (
      context.store.getState().document.claims.find((claim) => claim.polity === 'fr')?.rings ?? []
    )
  }

  describe('happy path', () => {
    // As Illustrator's Pen over a selected path (the dev, 2026-10-11).
    it('inserts a point between anchors 0 and 1 when the idle Pen clicks the top side', () => {
      const context = idlePenOnTriangle()

      penClick(context, [200, 102])

      expect(franceRings(context)).toEqual([[0, 3, 1, 2]])
      expect(context.session.outline).toEqual([])
    })
  })

  describe('variants', () => {
    it('neither selects nor holds the point it inserted — a drag after it moves nothing', () => {
      const context = idlePenOnTriangle()

      penClick(context, [200, 102])

      expect(context.session.selected).toBeNull()
      expect(context.session.grabbed).toBeNull()
    })
  })

  describe('managed errors', () => {
    it('places an outline point, not an insertion, once an outline is in progress', () => {
      const context = idlePenOnTriangle()
      penClick(context, [200, 30])

      penClick(context, [200, 102])

      expect(franceRings(context)).toEqual([[0, 1, 2]])
      expect(context.session.outline).toHaveLength(2)
    })
  })

  describe('unmanaged errors', () => {
    // L4: N/A beyond the arrow's — the same insertion runs; its refusal is tested in anchorGestures.
    it('inserts nothing on a polity that is not the target', () => {
      const context = idlePenOnTriangle()
      context.store.getState().aimAt('hre')

      penClick(context, [200, 102])

      expect(franceRings(context)).toEqual([[0, 1, 2]])
    })
  })

  describe('edge cases', () => {
    // s02 — an anchor under the Pen is branched onto, never deleted nor inserted beside.
    it('branches onto an anchor rather than inserting next to it', () => {
      const context = idlePenOnTriangle()

      penClick(context, [101, 101])

      expect(franceRings(context)).toEqual([[0, 1, 2]])
      expect(context.session.outline[0]?.anchor).toBe(0)
    })
  })
})

describe('the idle Pen over its own stretch while following the coast', () => {
  // QUAL-003: the order is deliberate — the target's own stretch is edited, the coast is not followed.
  it('inserts on the target’s own stretch rather than snapping to a shore within reach', () => {
    const { context } = coastContext()
    context.store.getState().choosePenMode('free')
    for (const at of [
      [100, 210],
      [300, 210],
      [200, 320],
    ] as const)
      penClick(context, at)
    penClick(context, [101, 211])
    context.store.getState().choosePenMode('coast')

    penClick(context, [200, 207])

    expect(context.session.outline).toEqual([])
    expect(context.store.getState().document.claims[0]?.rings).toEqual([[0, 3, 1, 2]])
  })
})
