// @vitest-environment jsdom
import { DataTexture, Scene } from 'three'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { laySeaNames, rebuildSeaNames } from './mapSeaNameLayer'

import type { DrawSeaLabel } from './seaLabel'
import type { LayerContext } from '../../layers/layerContext'

/** The map's frame (`years/index.json`), and a grid whose width over height the plane takes. */
const META = {
  bbox: { west: -45, south: 11.178401873711783, east: 78.75, north: 76.84081641443098 },
  width: 1920,
  height: 1745,
}

/**
 * A context with just what the seas' names read: a relief's frame, a projection, the land on the GPU, a language.
 * @param locale - the reader's language
 * @param withRelief - whether the relief's frame is known yet
 * @returns the context
 */
function contextFor(locale: 'fr' | 'en', withRelief = true): LayerContext {
  const land = {
    west: new DataTexture(new Uint8Array(1), 1, 1),
    east: new DataTexture(new Uint8Array(1), 1, 1),
    split: 0.5,
    dispose: vi.fn(),
  }
  return {
    scene: new Scene(),
    locale,
    sources: { heightmap: withRelief ? { meta: META } : null },
    projection: { toWorld: (u: number, v: number) => [u, 0, v] },
    handles: { seaNames: null, land },
    dev: { rose: { lift: 0.01 } },
  } as unknown as LayerContext
}

/**
 * A drawer that records the texts it is asked for.
 * @returns the drawer and what it drew
 */
function recordingDrawer(): { draw: DrawSeaLabel; texts: string[] } {
  const texts: string[] = []
  const draw: DrawSeaLabel = (text) => {
    texts.push(text)
    return Promise.resolve({ canvas: document.createElement('canvas'), aspect: 8 })
  }
  return { draw, texts }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('rebuildSeaNames', () => {
  describe('happy path', () => {
    it('lays the eight names, as one object on the scene', async () => {
      const context = contextFor('en')
      await rebuildSeaNames(context, recordingDrawer().draw, 0.01, () => true)
      expect(context.handles.seaNames?.object.children).toHaveLength(8)
      expect(context.scene.children).toEqual([context.handles.seaNames?.object])
    })
  })

  describe('variants', () => {
    it('writes the names in French for a French reader', async () => {
      const { draw, texts } = recordingDrawer()
      await rebuildSeaNames(contextFor('fr'), draw, 0.01, () => true)
      expect(texts[0]).toBe('OCÉAN ATLANTIQUE')
    })

    it('writes the names in English for an English reader', async () => {
      const { draw, texts } = recordingDrawer()
      await rebuildSeaNames(contextFor('en'), draw, 0.01, () => true)
      expect(texts[0]).toBe('ATLANTIC OCEAN')
    })

    it('replaces the names laid before, leaving one object on the scene', async () => {
      const context = contextFor('en')
      await rebuildSeaNames(context, recordingDrawer().draw, 0.01, () => true)
      const first = context.handles.seaNames
      await rebuildSeaNames(context, recordingDrawer().draw, 0.01, () => true)
      expect(context.handles.seaNames).not.toBe(first)
      expect(context.scene.children).toEqual([context.handles.seaNames?.object])
    })
  })

  describe('managed errors', () => {
    it('lays nothing when a newer call started or the layers were torn down meanwhile', async () => {
      const context = contextFor('en')
      await rebuildSeaNames(context, recordingDrawer().draw, 0.01, () => false)
      expect([context.handles.seaNames, context.scene.children.length]).toEqual([null, 0])
    })

    it('leaves the names laid before when a stale call ends', async () => {
      const context = contextFor('en')
      await rebuildSeaNames(context, recordingDrawer().draw, 0.01, () => true)
      const laid = context.handles.seaNames
      await rebuildSeaNames(context, recordingDrawer().draw, 0.01, () => false)
      expect(context.handles.seaNames).toBe(laid)
    })
  })

  describe('unmanaged errors', () => {
    it('says in the console that the names could not be drawn, and lets the map go on', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const context = { ...contextFor('en'), seaLabels: () => Promise.reject(new Error('no face')) }
      laySeaNames(context, () => true)
      await vi.waitFor(() => {
        expect(error).toHaveBeenCalledWith(
          '[Atlas] the seas’ names could not be drawn',
          expect.any(Error)
        )
      })
      expect(context.handles.seaNames).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('lays nothing before the relief’s frame is known, and draws nothing', async () => {
      const { draw, texts } = recordingDrawer()
      const context = contextFor('en', false)
      await rebuildSeaNames(context, draw, 0.01, () => true)
      expect([context.handles.seaNames, texts.length]).toEqual([null, 0])
    })
  })
})
