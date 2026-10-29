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
      names: { setDetail: vi.fn(), setZoom, setBlur: vi.fn(), setReveal: vi.fn() },
    }
    const context = {
      dev,
      sources: createMapSources(),
      handles: handles as unknown as LayerHandles,
      reveal: { value: 1 },
    } as unknown as LayerContext
    frameLineWork(context, 0.5, 120)
    expect(setZoom).toHaveBeenCalledWith(0.5, dev.names)
    // Past the close-up zoom, the names take the borders' whole blur.
    expect(handles.names.setBlur).toHaveBeenCalledWith(dev.names.blur)
  })

  // ATLAS-302: the blur reads the borders without the relief, so it must be off when the relief may hide them.
  it('blurs the borders by the panel’s reach times the closeness, and not at all when the relief may hide them', () => {
    const setBlur = vi.fn()
    const dev = createDevState()
    dev.political.borderBlur = 2
    dev.political.borderInlayZoom = 0.4
    const borders = {
      setDetail: vi.fn(),
      setWidthScale: vi.fn(),
      setOpacityScale: vi.fn(),
      setCloseness: vi.fn(),
      setDashScale: vi.fn(),
      setBlur,
    }
    const handles = {
      rivers: null,
      fills: null,
      tribes: null,
      borders,
      coastline: null,
      rhumb: null,
      names: null,
    }
    const context = {
      dev,
      sources: createMapSources(),
      handles: handles as unknown as LayerHandles,
      reveal: { value: 1 },
    } as unknown as LayerContext
    frameLineWork(context, 0.2, 120)
    expect(setBlur).toHaveBeenLastCalledWith(1)
    dev.political.borderOnTop = false
    frameLineWork(context, 0.2, 120)
    expect(setBlur).toHaveBeenLastCalledWith(0)
  })

  // The dev, 2026-10-29: everything but the relief fades in together at startup.
  it('multiplies the countries’, the names’ and the events’ opacity by how far they have come in', () => {
    const dev = createDevState()
    const handles = {
      rivers: null,
      fills: { setDetail: vi.fn(), setLook: vi.fn() },
      tribes: { setLook: vi.fn(), setFeather: vi.fn() },
      borders: null,
      coastline: null,
      rhumb: null,
      names: { setDetail: vi.fn(), setZoom: vi.fn(), setBlur: vi.fn(), setReveal: vi.fn() },
      events: { setZoom: vi.fn(), setBlur: vi.fn(), setReveal: vi.fn() },
    }
    const context = {
      dev,
      sources: createMapSources(),
      handles: handles as unknown as LayerHandles,
      reveal: { value: 0.25 },
    } as unknown as LayerContext
    frameLineWork(context, 0.5, 120)
    expect([
      handles.fills.setLook.mock.lastCall,
      handles.tribes.setLook.mock.lastCall,
      handles.names.setReveal.mock.lastCall,
      handles.events.setReveal.mock.lastCall,
    ]).toEqual([
      [dev.texture.politicalMode, dev.texture.politicalStrength * 0.25],
      [dev.texture.politicalMode, dev.texture.politicalStrength * 0.25],
      [0.25],
      [0.25],
    ])
  })
})
