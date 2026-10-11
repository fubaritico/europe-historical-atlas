import { afterEach, describe, expect, it, vi } from 'vitest'

import { cloneYearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

import { openEmptyYear } from '../state/openEmptyYear'
import { createCartographerStore } from '../state/store'
import { lonLatToScreen, projectToBackdrop, remapToScreen } from '../view/projection'
import { TEST_BACKDROP_FRAME } from '../view/testFrame'

import {
  MOVE_ANCHOR_STEP,
  arrowDrag,
  arrowPress,
  arrowRelease,
  closeOutline,
  lonLatAt,
  penClick,
  redoGesture,
  toolKey,
  undoGesture,
} from './toolGestures'
import { idleSession } from './toolSession'

import type { GestureContext } from './toolGestures'
import type { YearPolity } from '@europe-historical-atlas/core/data/yearFormat'

/** A polity with only an id and a name. */
function polity(id: string, name: string): YearPolity {
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
function openContext(aimed = true): GestureContext {
  const store = createCartographerStore({
    edition: { document: openEmptyYear(1100), clone: cloneYearDocument },
    viewport: { viewport: { scale: 1, originX: 0, originY: 0 } },
  })
  store.getState().createPolity(polity('fr', 'Reaume de France'), { kind: 'create', label: 'fr' })
  store.getState().createPolity(polity('hre', 'Sacrum Imperium'), { kind: 'create', label: 'hre' })
  if (aimed) store.getState().aimAt('fr')
  return {
    store,
    frame: TEST_BACKDROP_FRAME,
    session: idleSession(),
    anchorsOnScreen: () =>
      remapToScreen(
        projectToBackdrop(store.getState().document.anchors, TEST_BACKDROP_FRAME),
        store.getState().viewport
      ),
    radius: 8,
  }
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
    it('abandons an outline in progress before undoing anything', () => {
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
})
