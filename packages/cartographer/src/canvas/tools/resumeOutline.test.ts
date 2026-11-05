import { afterEach, describe, expect, it, vi } from 'vitest'

import { lonLatToScreen } from '../../viewport/projection'
import { testGestureContext, testPolity, testStore } from '../testGestureContext'

import { keepOutlineInHand, resumeClick } from './resumeOutline'
import { penClick } from './toolGestures'

import type { GestureContext } from './toolGestures'

// open-outlines.md — the dev, 2026-11-05: "closed or not, an outline is saved when you change polity"; "one must be
// able to stop it, resume it".

/** Three corners, apart enough that no click closes on another. */
const LINE: [number, number][] = [
  [100, 100],
  [200, 100],
  [200, 200],
]

/**
 * A store with France aimed at, the Pen in hand.
 * @returns the gesture context and its reports
 */
function openContext(): { context: GestureContext; reports: string[] } {
  const store = testStore()
  store
    .getState()
    .createPolity(testPolity('fr', 'Reaume de France'), { kind: 'create', label: 'fr' })
  store.getState().aimAt('fr')
  return testGestureContext(store)
}

/**
 * France's claim.
 * @param context - the gesture context
 * @returns the claim, or `undefined`
 */
function france(context: GestureContext) {
  return context.store.getState().document.claims.find((claim) => claim.polity === 'fr')
}

/**
 * Where an anchor of the document lands on screen.
 * @param context - the gesture context
 * @param index - the anchor
 * @returns its screen position
 */
function onScreen(context: GestureContext, index: number): [number, number] {
  const anchor = context.store.getState().document.anchors[index]
  if (anchor === undefined) throw new Error(`no anchor ${String(index)}`)
  return lonLatToScreen(anchor, context.frame, context.store.getState().viewport)
}

/**
 * Draw France's three points and keep them open, as a change of polity does.
 * @param context - the gesture context
 */
function keptOpen(context: GestureContext): void {
  for (const at of LINE) penClick(context, at)
  keepOutlineInHand(context, 'fr')
  context.session.outline = []
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('resumeOutline', () => {
  describe('happy path', () => {
    it('keeps the outline in hand, open, as one step named for the polity', () => {
      const { context, reports } = openContext()
      keptOpen(context)

      expect(france(context)).toEqual({ polity: 'fr', rings: [[0, 1, 2]], open: [0] })
      expect(context.store.getState().undoLabel).toBe('keep outline of Reaume de France')
      expect(reports.at(-1)).toBe(
        'Outline of Reaume de France kept, open: take it up with the Pen by one of its ends'
      )
    })

    it('takes an open outline up by its last end, the points in hand in order', () => {
      const { context, reports } = openContext()
      keptOpen(context)

      expect(resumeClick(context, onScreen(context, 2))).toBe(true)
      expect(context.session.outline.map((point) => point.anchor)).toEqual([0, 1, 2])
      expect(context.session.resumed).toEqual({ polity: 'fr', at: 0, anchors: [0, 1, 2] })
      expect(reports.at(-1)).toMatch(/^Open outline of Reaume de France taken up/)
    })

    it('closes a resumed outline on its other end, in its place', () => {
      const { context } = openContext()
      keptOpen(context)
      penClick(context, onScreen(context, 2))
      penClick(context, [100, 200])
      penClick(context, onScreen(context, 0))

      expect(france(context)?.rings).toEqual([[0, 1, 2, 3]])
      expect(france(context)?.open).toBeUndefined()
      expect(context.session.outline).toEqual([])
    })
  })

  describe('variants', () => {
    it('takes an open outline up by its first end, the points in hand reversed', () => {
      const { context } = openContext()
      keptOpen(context)
      resumeClick(context, onScreen(context, 0))

      expect(context.session.outline.map((point) => point.anchor)).toEqual([2, 1, 0])
    })

    it('puts a resumed outline back in its place, still open, when the polity changes', () => {
      const { context } = openContext()
      keptOpen(context)
      penClick(context, onScreen(context, 2))
      penClick(context, [100, 200])
      keepOutlineInHand(context, 'fr')

      expect(france(context)).toEqual({ polity: 'fr', rings: [[0, 1, 2, 3]], open: [0] })
    })

    it('records nothing for a resumed outline left as it was', () => {
      const { context } = openContext()
      keptOpen(context)
      const label = context.store.getState().undoLabel
      resumeClick(context, onScreen(context, 2))
      keepOutlineInHand(context, 'fr')

      expect(context.store.getState().undoLabel).toBe(label)
    })
  })

  describe('managed errors', () => {
    // The dev, 2026-11-05: a vassal is not closed over a suzerain still open; its outline is erased, and the warning
    // dialogue says why.
    it('refuses to close a vassal whose suzerain is still open, erases the outline and warns', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { context } = openContext()
      const step = { kind: 'create', label: 'hre' }
      context.store
        .getState()
        .createPolity({ ...testPolity('hre', 'Sacrum Imperium'), suzerain: 'fr' }, step)
      keptOpen(context)
      context.store.getState().aimAt('hre')
      for (const at of [
        [120, 120],
        [180, 120],
        [180, 180],
      ] as const)
        penClick(context, at)
      penClick(context, [120, 120])

      const { document, warning } = context.store.getState()
      expect(document.claims.find((claim) => claim.polity === 'hre')).toBeUndefined()
      expect(context.session.outline).toEqual([])
      expect(warning?.text).toMatch(
        /^Sacrum Imperium is not closed: the outline of its suzerain, Reaume de France/
      )
    })

    it('keeps nothing from a single point in hand', () => {
      const { context } = openContext()
      penClick(context, LINE[0] ?? [0, 0])
      keepOutlineInHand(context, 'fr')

      expect(france(context)).toBeUndefined()
      expect(context.store.getState().canUndo).toBe(true)
    })

    it('takes nothing up with points already in hand', () => {
      const { context } = openContext()
      keptOpen(context)
      penClick(context, [300, 300])

      expect(resumeClick(context, onScreen(context, 2))).toBe(false)
    })

    it('takes up nothing from a closed outline’s point', () => {
      const { context } = openContext()
      for (const at of LINE) penClick(context, at)
      penClick(context, LINE[0] ?? [0, 0])

      expect(resumeClick(context, onScreen(context, 2))).toBe(false)
    })

    it('says loudly an outline in hand drawn for a polity the map no longer holds', () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { context } = openContext()
      for (const at of LINE) penClick(context, at)
      keepOutlineInHand(context, 'gone')

      expect(error).toHaveBeenCalledWith(
        expect.stringMatching(/"gone", which the map no longer holds/)
      )
    })
  })
})
