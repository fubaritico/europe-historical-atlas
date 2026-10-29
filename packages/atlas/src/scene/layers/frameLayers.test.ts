import { Object3D } from 'three'
import { describe, expect, it, vi } from 'vitest'

import { createMapSources } from '../../sources/mapSources'
import { createDevState } from '../../tunables/devState'

import { frameLineWork, frameRelief } from './frameLayers'

import type { LayerContext, LayerHandles } from './layerContext'

/** The layers laid on the relief that keep a height of their own, and are told the relief's scale instead. */
const TOLD = ['edge', 'events'] as const

/** The layers laid on the relief that are scaled as a whole. */
const SCALED = ['coastline', 'rivers', 'borders', 'fills', 'tribes', 'names'] as const

/** The layers on the scene that are not on the relief, and must never follow it. */
const FLAT = ['rhumb', 'compass', 'sheet', 'frame', 'labels', 'title'] as const

/**
 * A context whose every drawn layer is a stand-in: an object to scale, and a scale setter to spy on.
 * @returns the context, and the relief stand-in
 */
function standIns(): { context: LayerContext; relief: Object3D } {
  const relief = new Object3D()
  const handles: Record<string, unknown> = {
    relief,
    texture: null,
    sheetTexture: null,
    fillCut: null,
    tribeCut: null,
  }
  for (const key of TOLD) handles[key] = { object: new Object3D(), setReliefScale: vi.fn() }
  for (const key of [...SCALED, ...FLAT]) handles[key] = { object: new Object3D() }
  const dev = createDevState()
  dev.relief.exaggeration = 3
  dev.relief.exaggZoomIn = 1
  const context = {
    dev,
    sources: createMapSources(),
    handles: handles as unknown as LayerHandles,
  } as unknown as LayerContext
  return { context, relief }
}

/**
 * A stand-in layer, by key.
 * @param context - the context holding it
 * @param key - its handle
 * @returns it
 */
function layer(context: LayerContext, key: string): { object: Object3D; setReliefScale?: unknown } {
  return (context.handles as unknown as Record<string, { object: Object3D }>)[key] as {
    object: Object3D
  }
}

describe('frameRelief', () => {
  describe('happy path', () => {
    it('scales the relief by the exaggeration', () => {
      const { context, relief } = standIns()
      frameRelief(context, 0)
      expect(relief.scale.y).toBe(3)
    })
  })

  describe('variants', () => {
    it('scales every layer laid on the relief by the relief’s own scale', () => {
      const { context } = standIns()
      frameRelief(context, 0)
      for (const key of SCALED) expect(layer(context, key).object.scale.y, key).toBe(3)
    })

    it('tells the relief’s scale to the layers that keep a height of their own', () => {
      const { context } = standIns()
      frameRelief(context, 0)
      for (const key of TOLD)
        expect(layer(context, key).setReliefScale, key).toHaveBeenCalledWith(3)
    })

    it('leaves every layer that is not on the relief at its own scale', () => {
      const { context } = standIns()
      frameRelief(context, 0)
      for (const key of FLAT) expect(layer(context, key).object.scale.y, key).toBe(1)
    })
  })

  // L3: N/A — nothing is refused
  // L4: N/A — no async work, nothing external

  describe('edge cases', () => {
    it('does nothing before the relief is built', () => {
      const { context } = standIns()
      ;(context.handles as unknown as Record<string, unknown>).relief = null
      frameRelief(context, 0)
      for (const key of SCALED) expect(layer(context, key).object.scale.y, key).toBe(1)
    })

    it('skips a layer laid on the relief that is not built yet', () => {
      const { context, relief } = standIns()
      ;(context.handles as unknown as Record<string, unknown>).rivers = null
      expect(() => {
        frameRelief(context, 0)
      }).not.toThrow()
      expect(relief.scale.y).toBe(3)
    })
  })
})

describe('frameLineWork', () => {
  // The guard behind the panel's exemption of the names' sizes on screen (`devPanel.test`): they fire no callback, so
  // only this says they reach the layer every frame.
  it('hands the names’ layer the camera’s zoom and the panel’s settings, every frame', () => {
    const setZoom = vi.fn()
    const dev = createDevState()
    const handles = {
      rivers: null,
      fills: null,
      tribes: null,
      borders: null,
      coastline: null,
      rhumb: null,
      names: { setDetail: vi.fn(), setZoom },
    }
    const context = {
      dev,
      sources: createMapSources(),
      handles: handles as unknown as LayerHandles,
    } as unknown as LayerContext
    frameLineWork(context, 0.5, 120)
    expect(setZoom).toHaveBeenCalledWith(0.5, dev.names)
  })
})
