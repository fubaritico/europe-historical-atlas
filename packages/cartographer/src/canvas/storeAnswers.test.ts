import { afterEach, describe, expect, it, vi } from 'vitest'

import { AUTOMATIC_PALETTE } from '@europe-historical-atlas/core/data/regionPalette'
import { cloneYearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

import { openEmptyYear } from '../state/openEmptyYear'
import { createPolityColourSource } from '../state/polityColourSource'
import { createCartographerStore } from '../state/store'
import { TEST_BACKDROP_FRAME, TEST_LAND_MASK } from '../viewport/testFrame'
import { UNFRAMED } from '../viewport/viewport'

import { canvasWords } from './canvasWords'
import { startCanvasController } from './controller'
import { createHistoryRelay } from './history/historyRelay'
import { CHROME_PAINT_STYLE } from './paint/style'
import { paintOnGuides } from './storeAnswers'
import { testPolity } from './testGestureContext'

import type { CartographerStoreHook } from '../state/store'

// open-outlines.md — the dev, 2026-11-05: "as soon as you leave the outline, for whatever reason, it is saved, and you
// can resume it"; ‹cmd+A› selects every point of the polity selected. Through the real controller, so the order of the
// subscriptions — keep, then start over — is what is tested.

/** Three canvas points, apart enough that none closes on another. */
const LINE = [
  [300, 200],
  [500, 200],
  [500, 400],
] as const

/**
 * A canvas of a fixed size in the page.
 * @returns the canvas
 */
function canvasWithBox(): HTMLCanvasElement {
  const node = document.createElement('canvas')
  Object.defineProperty(node, 'clientWidth', { value: 800 })
  Object.defineProperty(node, 'clientHeight', { value: 600 })
  node.setPointerCapture = vi.fn()
  node.hasPointerCapture = vi.fn(() => true)
  node.releasePointerCapture = vi.fn()
  document.body.append(node)
  return node
}

/**
 * A pointer event at a canvas position.
 * @param type - the event's type
 * @param at - where, in CSS pixels
 * @returns the event
 */
function pointer(type: string, at: readonly [number, number]): Event {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.assign(event, { pointerId: 1, offsetX: at[0], offsetY: at[1] })
  return event
}

/**
 * The controller on an empty 1100, France and the Empire created, the Pen in France, three points placed.
 * @returns the canvas, the store and the teardown
 */
function threePointsInFrance(): {
  node: HTMLCanvasElement
  store: CartographerStoreHook
  dispose: () => void
} {
  const store = createCartographerStore({
    edition: { document: openEmptyYear(1100), clone: cloneYearDocument },
    viewport: { viewport: UNFRAMED },
  })
  const node = canvasWithBox()
  const dispose = startCanvasController(node, {
    store,
    frame: TEST_BACKDROP_FRAME,
    backdropImage: document.createElement('canvas'),
    vectorLayers: {
      coast: [],
      rivers: [],
      coastProvenance: { name: 'test coast', licence: 'test' },
      riverProvenance: { name: 'test rivers', licence: 'test' },
    },
    onHover: vi.fn(),
    onFeature: () => undefined,
    onAction: vi.fn(),
    onResult: vi.fn(),
    maxSnapReachKm: Infinity,
    style: CHROME_PAINT_STYLE,
    overlay: document.createElement('canvas'),
    colours: createPolityColourSource(AUTOMATIC_PALETTE),
    history: createHistoryRelay(),
    landMask: TEST_LAND_MASK,
    tribeImage: () => document.createElement('canvas'),
    words: () => canvasWords('en'),
  })
  const step = { kind: 'create-polity', label: 'create' }
  store.getState().createPolity(testPolity('fr', 'Reaume de France'), step)
  store.getState().createPolity(testPolity('hre', 'Sacrum Imperium'), step)
  store.getState().aimAt('fr')
  for (const at of LINE) {
    node.dispatchEvent(pointer('pointerdown', at))
    node.dispatchEvent(pointer('pointerup', at))
  }
  return { node, store, dispose }
}

/**
 * France's claim.
 * @param store - the store
 * @returns the claim, or `undefined`
 */
function france(store: CartographerStoreHook) {
  return store.getState().document.claims.find((claim) => claim.polity === 'fr')
}

afterEach(() => {
  document.body.replaceChildren()
})

describe('storeAnswers', () => {
  describe('happy path', () => {
    it('keeps the outline in hand, open, when another polity is selected', () => {
      const { store, dispose } = threePointsInFrance()
      store.getState().chooseTarget('hre')

      expect(france(store)).toMatchObject({ open: [0] })
      expect(france(store)?.rings[0]).toHaveLength(3)
      dispose()
    })

    it('selects every point of the polity selected on ‹cmd+A›, the white arrow taken', () => {
      const { store, dispose } = threePointsInFrance()
      store.getState().chooseTarget('hre')
      store.getState().chooseTarget('fr')
      store.getState().askSelectAll()

      expect(store.getState().tool).toBe('edit')
      expect([...store.getState().selectedAnchors].sort()).toEqual([0, 1, 2])
      dispose()
    })
  })

  describe('variants', () => {
    // s20 — the cities as points: ticking the box redraws the map, nothing else changes.
    it('repaints once when the cities are asked as points', () => {
      const store = createCartographerStore({
        edition: { document: openEmptyYear(1100), clone: cloneYearDocument },
        viewport: { viewport: UNFRAMED },
      })
      const paint = vi.fn()
      const unsubscribe = paintOnGuides({ deps: { store } }, paint)
      store.getState().setCitiesAsPoints(true)

      expect(paint).toHaveBeenCalledTimes(1)
      unsubscribe.forEach((each) => {
        each()
      })
    })

    it('keeps the outline in hand when another tool is taken', () => {
      const { store, dispose } = threePointsInFrance()
      store.getState().selectTool('navigate')

      expect(france(store)).toMatchObject({ open: [0] })
      dispose()
    })

    it('keeps the outline in hand on ‹escape›', () => {
      const { node, store, dispose } = threePointsInFrance()
      node.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

      expect(france(store)).toMatchObject({ open: [0] })
      dispose()
    })
  })

  describe('managed errors', () => {
    it('warns, and selects nothing, when the polity selected has no point', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { store, dispose } = threePointsInFrance()
      store.getState().chooseTarget('hre')
      store.getState().askSelectAll()

      expect(store.getState().selectedAnchors).toEqual([])
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('no point to select'))
      warn.mockRestore()
      dispose()
    })
  })
})
