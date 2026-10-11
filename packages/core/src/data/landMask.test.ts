import { describe, expect, it, vi } from 'vitest'

import { createHeightmap } from './heightmap'
import {
  createElevationLandMask,
  createFetchLandMaskSource,
  createLandMask,
  createPackedLandMask,
} from './landMask'

import type { HeightmapMeta } from './heightmap'
import type { LandMaskMeta } from './landMask'

const BBOX = { west: 0, south: 0, east: 1, north: 1 }

/** Metadata for a small test grid. */
function meta(width: number, height: number): LandMaskMeta {
  return { width, height, scale: 1, bbox: BBOX, source: 'test' }
}

/** A 2×1 mask: water to the west, land to the east. */
function shore(): ReturnType<typeof createLandMask> {
  return createLandMask(meta(2, 1), (col) => col === 1)
}

describe('landMask', () => {
  describe('happy path', () => {
    it('reports land and water at the cells themselves', () => {
      const mask = shore()
      expect(mask.isLand(0, 0)).toBe(false)
      expect(mask.isLand(1, 0)).toBe(true)
    })

    it('gives full coverage over land and none over water', () => {
      const mask = shore()
      expect(mask.coverage(0, 0)).toBe(0)
      expect(mask.coverage(1, 0)).toBe(1)
    })

    it('packs and unpacks to the same mask — the round trip a worker boundary is', () => {
      const original = createLandMask(meta(5, 3), (col, row) => (col + row) % 3 === 0)
      const restored = createPackedLandMask(meta(5, 3), original.pack())
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 5; col++) {
          const u = col / 4
          const v = row / 2
          expect(restored.isLand(u, v)).toBe(original.isLand(u, v))
        }
      }
    })
  })

  describe('variants', () => {
    it('grades coverage across the shore instead of snapping to a cell', () => {
      // This continuous value is what lets the coastline be drawn with a sub-cell edge.
      const mask = shore()
      expect(mask.coverage(0.5, 0)).toBeCloseTo(0.5, 9)
      expect(mask.coverage(0.25, 0)).toBeCloseTo(0.25, 9)
    })

    it('decodes packed bits most-significant first', () => {
      // 0b1010_0000 → land, water, land, water across the first four cells.
      const mask = createPackedLandMask(meta(4, 1), new Uint8Array([0b1010_0000]))
      expect([0, 1, 2, 3].map((col) => mask.isLand(col / 3, 0))).toEqual([true, false, true, false])
    })

    it('reads a bit beyond the first byte', () => {
      const mask = createPackedLandMask(meta(16, 1), new Uint8Array([0x00, 0b0000_0001]))
      expect(mask.isLand(15 / 15, 0)).toBe(true)
      expect(mask.isLand(14 / 15, 0)).toBe(false)
    })

    it('hands an already-packed mask its own storage back, rather than walking the grid again', () => {
      const bits = new Uint8Array([0b1010_0000])
      expect(createPackedLandMask(meta(4, 1), bits).pack()).toBe(bits)
    })

    it('packs a predicate mask most-significant first', () => {
      const mask = createLandMask(meta(4, 1), (col) => col % 2 === 0)
      expect(Array.from(mask.pack())).toEqual([0b1010_0000])
    })

    it('derives a mask from elevation, with the documented blind spots', () => {
      const hm = createHeightmap(elevationMeta(3, 1), new Int16Array([-5, 0, 40]))
      const mask = createElevationLandMask(hm, 0)
      // Exactly at the threshold counts as water, matching the coastline convention.
      expect([0, 0.5, 1].map((u) => mask.isLand(u, 0))).toEqual([false, false, true])
    })

    it('fetches and decodes through the source port', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(meta(8, 1)) })
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(new Uint8Array([0b1111_0000]).buffer),
        })
      vi.stubGlobal('fetch', fetchMock)
      const mask = await createFetchLandMaskSource('/masks/x').load()
      expect(mask.isLand(0, 0)).toBe(true)
      expect(mask.isLand(1, 0)).toBe(false)
      vi.unstubAllGlobals()
    })

    // The source travels with the data: the Cartographer records it on every anchor traced from it.
    it('keeps what the mask was rasterised from', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(meta(8, 1)) })
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(new Uint8Array([0]).buffer),
        })
      vi.stubGlobal('fetch', fetchMock)
      expect((await createFetchLandMaskSource('/masks/x').load()).meta.source).toBe('test')
      vi.unstubAllGlobals()
    })
  })

  describe('managed errors', () => {
    // A mask that does not say where it comes from is refused, never given a plausible source.
    it('refuses a sidecar that declares no source', async () => {
      const { source: _dropped, ...unsourced } = meta(8, 1)
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(unsourced) })
      )
      await expect(createFetchLandMaskSource('/masks/x').load()).rejects.toThrow(/meta\.source/)
      vi.unstubAllGlobals()
    })

    it('surfaces a missing sidecar rather than guessing a grid', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
      await expect(createFetchLandMaskSource('/masks/x').load()).rejects.toThrow(
        /landMask \(transport\) \/masks\/x\.json: HTTP 404/
      )
      vi.unstubAllGlobals()
    })

    it('surfaces a missing bitfield', async () => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(meta(8, 1)) })
          .mockResolvedValueOnce({ ok: false, status: 500 })
      )
      await expect(createFetchLandMaskSource('/masks/x').load()).rejects.toThrow(
        /landMask \(transport\) \/masks\/x\.bin: HTTP 500/
      )
      vi.unstubAllGlobals()
    })

    it('rejects a bitfield too short for its declared grid', async () => {
      // Silently accepting it would paint half the map as ocean with no error anywhere.
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(meta(64, 64)) })
          .mockResolvedValueOnce({
            ok: true,
            arrayBuffer: () => Promise.resolve(new Uint8Array(4).buffer),
          })
      )
      await expect(createFetchLandMaskSource('/masks/x').load()).rejects.toThrow(
        /landMask \(consistency\).*4 bytes for a 64×64 grid, expected 512/
      )
      vi.unstubAllGlobals()
    })
  })

  describe('unmanaged errors', () => {
    it('propagates a network rejection instead of silently drowning the map', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
      await expect(createFetchLandMaskSource('/masks/x').load()).rejects.toThrow('offline')
      vi.unstubAllGlobals()
    })
  })

  describe('edge cases', () => {
    it('clamps coordinates outside the frame to its edge cells', () => {
      const mask = shore()
      expect(mask.isLand(-5, 0)).toBe(false)
      expect(mask.isLand(5, 0)).toBe(true)
      expect(mask.coverage(-5, -5)).toBe(0)
      expect(mask.coverage(5, 5)).toBe(1)
    })

    it('handles a single-cell grid', () => {
      const mask = createLandMask(meta(1, 1), () => true)
      expect(mask.isLand(0.5, 0.5)).toBe(true)
      expect(mask.coverage(0.5, 0.5)).toBe(1)
    })

    it('reads a missing byte as water rather than throwing', () => {
      const mask = createPackedLandMask(meta(8, 1), new Uint8Array(0))
      expect(mask.isLand(0, 0)).toBe(false)
    })

    it('packs a grid whose cell count is not a whole number of bytes', () => {
      // 5 cells → one byte, the last three bits unused and left at zero.
      const bits = createLandMask(meta(5, 1), () => true).pack()
      expect(bits.length).toBe(1)
      expect(bits[0]).toBe(0b1111_1000)
    })
  })
})

/** Metadata for a heightmap used to derive a mask. */
function elevationMeta(width: number, height: number): HeightmapMeta {
  return { width, height, zoom: 5, bbox: BBOX, min: -5, max: 40, encoding: 'int16-le-metres' }
}
