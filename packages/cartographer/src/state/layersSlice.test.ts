import { afterEach, describe, expect, it, vi } from 'vitest'

import { cloneYearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

import { UNFRAMED } from '../view/viewport'

import { DEFAULT_LAYERS } from './layersSlice'
import { openEmptyYear } from './openEmptyYear'
import { createCartographerStore } from './store'

/**
 * A store on an empty 1100.
 * @returns the store
 */
function store() {
  return createCartographerStore({
    edition: { document: openEmptyYear(1100), clone: cloneYearDocument },
    viewport: { viewport: UNFRAMED },
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('layers slice', () => {
  describe('happy path', () => {
    it('opens with every layer shown and opaque', () => {
      expect(store().getState().layers).toEqual(DEFAULT_LAYERS)
      expect(
        Object.values(DEFAULT_LAYERS).every((layer) => layer.visible && layer.opacity === 100)
      ).toBe(true)
    })

    it('hides a layer, and only that one', () => {
      const shared = store()
      shared.getState().setLayerVisible('rivers', false)
      expect(shared.getState().layers.rivers.visible).toBe(false)
      expect(shared.getState().layers.coastline.visible).toBe(true)
    })
  })

  describe('variants', () => {
    it('sets an opacity, keeping the layer’s visibility', () => {
      const shared = store()
      shared.getState().setLayerVisible('fills', false)
      shared.getState().setLayerOpacity('fills', 40)
      expect(shared.getState().layers.fills).toEqual({ visible: false, opacity: 40 })
    })
  })

  describe('managed errors', () => {
    it('clamps an opacity outside 0–100', () => {
      const shared = store()
      shared.getState().setLayerOpacity('borders', 140)
      expect(shared.getState().layers.borders.opacity).toBe(100)
      shared.getState().setLayerOpacity('borders', -5)
      expect(shared.getState().layers.borders.opacity).toBe(0)
    })
  })

  describe('unmanaged errors', () => {
    it('refuses a non-number, says so, and keeps the setting', () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const shared = store()
      shared.getState().setLayerOpacity('borders', 30)
      shared.getState().setLayerOpacity('borders', Number.NaN)
      expect(shared.getState().layers.borders.opacity).toBe(30)
      expect(error).toHaveBeenCalledOnce()
    })
  })

  describe('edge cases', () => {
    it('stays out of the undo line: hiding a layer is no step, and an undo does not bring it back', () => {
      const shared = store()
      shared.getState().setLayerVisible('backdrop', false)
      expect(shared.getState().canUndo).toBe(false)
      shared.getState().undo()
      expect(shared.getState().layers.backdrop.visible).toBe(false)
    })
  })
})
