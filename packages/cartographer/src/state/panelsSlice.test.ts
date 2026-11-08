import { afterEach, describe, expect, it, vi } from 'vitest'

import { cloneYearDocument } from '@europe-historical-atlas/core/data/yearDocument'

import { UNFRAMED } from '../viewport/viewport'

import { openEmptyYear } from './openEmptyYear'
import {
  DEFAULT_PANEL_LAYOUT,
  DOCK_WIDTH_RANGE,
  withPanelDocked,
  withPanelFloating,
} from './panelsSlice'
import { createCartographerStore } from './store'

afterEach(() => {
  vi.restoreAllMocks()
})

/**
 * A store on an empty 1100.
 * @returns the store
 */
function testStore() {
  return createCartographerStore({
    edition: { document: openEmptyYear(1100), clone: cloneYearDocument },
    viewport: { viewport: UNFRAMED },
  })
}

const RECT = { x: 400, y: 200, width: 280, height: 200 }

// CARTO-342: the panels docked in the right column or floating, written on release.
describe('panelsSlice', () => {
  describe('happy path', () => {
    it('opens with every panel docked in the opening order, at the design’s width', () => {
      expect(testStore().getState().panelLayout).toEqual(DEFAULT_PANEL_LAYOUT)
    })

    it('floats {Layers} at a rectangle, out of the column, and docks it back at the top', () => {
      const store = testStore()
      store.getState().floatPanel('layers', RECT)
      expect(store.getState().panelLayout.docked).toEqual([
        'polities',
        'line',
        'overrides',
        'cities',
      ])
      expect(store.getState().panelLayout.floating).toEqual({ layers: RECT })
      store.getState().dockPanel('layers', 0)
      expect(store.getState().panelLayout.docked).toEqual([
        'layers',
        'polities',
        'line',
        'overrides',
        'cities',
      ])
      expect(store.getState().panelLayout.floating).toEqual({})
    })
  })

  describe('variants', () => {
    it('moves a docked panel within the column', () => {
      expect(withPanelDocked(DEFAULT_PANEL_LAYOUT, 'cities', 1).docked).toEqual([
        'polities',
        'cities',
        'line',
        'overrides',
        'layers',
      ])
    })

    it('moves a floating panel to another rectangle', () => {
      const once = withPanelFloating(DEFAULT_PANEL_LAYOUT, 'line', RECT)
      expect(withPanelFloating(once, 'line', { ...RECT, x: 10 }).floating).toEqual({
        line: { ...RECT, x: 10 },
      })
    })

    it('sets the column’s width within its range, and a docked panel’s height', () => {
      const store = testStore()
      store.getState().setDockWidth(9999)
      store.getState().setPanelHeight('layers', 180.4)
      expect([
        store.getState().panelLayout.dockWidth,
        store.getState().panelLayout.heights,
      ]).toEqual([DOCK_WIDTH_RANGE.max, { layers: 180 }])
    })
  })

  describe('managed errors', () => {
    it('refuses a width or a height that is no number, says it, and keeps the layout', () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const store = testStore()
      store.getState().setDockWidth(Number.NaN)
      store.getState().setPanelHeight('layers', -3)
      expect(store.getState().panelLayout).toEqual(DEFAULT_PANEL_LAYOUT)
      expect(error).toHaveBeenCalledTimes(2)
    })
  })

  // L4: N/A — plain values.

  describe('edge cases', () => {
    it('empties the column when every panel floats', () => {
      let layout = DEFAULT_PANEL_LAYOUT
      for (const id of DEFAULT_PANEL_LAYOUT.docked) layout = withPanelFloating(layout, id, RECT)
      expect(layout.docked).toEqual([])
    })

    it('brings a kept layout’s width back within the column’s range', () => {
      const store = testStore()
      store.getState().setPanelLayout({ ...DEFAULT_PANEL_LAYOUT, dockWidth: 5 })
      expect(store.getState().panelLayout.dockWidth).toBe(DOCK_WIDTH_RANGE.min)
    })

    it('docks at the bottom a place past the end', () => {
      expect(withPanelDocked(DEFAULT_PANEL_LAYOUT, 'polities', 99).docked.at(-1)).toBe('polities')
    })

    it('stays out of the undo line', () => {
      const store = testStore()
      const version = store.getState().version
      store.getState().floatPanel('cities', RECT)
      expect(store.getState().version).toBe(version)
    })
  })
})
