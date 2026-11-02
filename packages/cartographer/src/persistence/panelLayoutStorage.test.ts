import { afterEach, describe, expect, it, vi } from 'vitest'

import { PANEL_LAYOUT_KEY, readPanelLayout, writePanelLayout } from './panelLayoutStorage'

import type { LayoutStorage, StoredPanelLayout } from './panelLayoutStorage'

const IDS = ['polities', 'line', 'layers'] as const
type Id = (typeof IDS)[number]

/**
 * A storage in memory.
 * @param kept - what it holds at first
 * @returns the storage and its content
 */
function memory(kept: string | null = null) {
  const items = new Map<string, string>()
  if (kept !== null) items.set(PANEL_LAYOUT_KEY, kept)
  const storage: LayoutStorage = {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value)
    },
  }
  return { storage, items }
}

const LAYOUT: StoredPanelLayout<Id> = {
  docked: ['layers', 'polities'],
  floating: { line: { x: 10, y: 20, width: 300, height: 200 } },
  dockWidth: 320,
  heights: { layers: 150 },
}

afterEach(() => {
  vi.restoreAllMocks()
})

// CARTO-342: the panels where the author left them, from one session to the next.
describe('panelLayoutStorage', () => {
  describe('happy path', () => {
    it('reads back the layout it wrote', () => {
      const { storage } = memory()
      writePanelLayout(storage, LAYOUT)
      expect(readPanelLayout(storage, IDS)).toEqual(LAYOUT)
    })
  })

  describe('variants', () => {
    it('reads nothing when nothing was kept', () => {
      expect(readPanelLayout(memory().storage, IDS)).toBeNull()
    })

    it('docks at the bottom a panel the kept layout does not name, and says so', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const kept = JSON.stringify({ ...LAYOUT, floating: {} })
      expect(readPanelLayout(memory(kept).storage, IDS)?.docked).toEqual([
        'layers',
        'polities',
        'line',
      ])
      expect(warn).toHaveBeenCalledTimes(1)
    })
  })

  describe('managed errors', () => {
    it('opens as at first on a kept layout that is not JSON, said in the console', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      expect(readPanelLayout(memory('{not json').storage, IDS)).toBeNull()
      expect(warn).toHaveBeenCalledTimes(1)
    })

    it('opens as at first on a kept value that is no layout, said in the console', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      expect(readPanelLayout(memory('{"docked": 3}').storage, IDS)).toBeNull()
      expect(warn).toHaveBeenCalledTimes(1)
    })
  })

  describe('unmanaged errors', () => {
    it('drops a panel that no longer exists, a twice-docked one, and a floating rectangle with no size', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const kept = JSON.stringify({
        docked: ['gone', 'layers', 'layers'],
        floating: { polities: { x: 0, y: 0, width: 0, height: 10 }, line: LAYOUT.floating.line },
        dockWidth: 300,
        heights: { gone: 50, layers: 'tall' },
      })
      expect(readPanelLayout(memory(kept).storage, IDS)).toEqual({
        docked: ['layers', 'polities'],
        floating: { line: LAYOUT.floating.line },
        dockWidth: 300,
        heights: {},
      })
    })
  })

  // L5: the empty column is a layout like another — panelsSlice.test.ts.
})
