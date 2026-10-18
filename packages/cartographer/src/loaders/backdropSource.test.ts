import { describe, expect, it, vi } from 'vitest'

import { isAssetError } from '@europe-historical-atlas/core/data/assetError'
import { createHeightmap } from '@europe-historical-atlas/core/data/heightmap'
import { createLandMask } from '@europe-historical-atlas/core/data/landMask'

import { bakeToBitmap, frameFromHeightmap, loadBackdrop } from './backdropSource'

import type { BackdropDeps } from './backdropSource'
import type { HeightmapMeta } from '@europe-historical-atlas/core/data/heightmap'
import type { LandMaskMeta } from '@europe-historical-atlas/core/data/landMask'
import type {
  MapCompute,
  TerrainBakeResult,
} from '@europe-historical-atlas/core/pipeline/mapCompute'
import type { TerrainTextureOptions } from '@europe-historical-atlas/core/pipeline/terrainOptions'

/** The ground both fixtures cover. Shared, because the pair agreeing is the normal case. */
const BBOX = { west: -45, south: 11, east: 78.75, north: 76.84 }

/**
 * A DEM with **different width and height**, deliberately.
 *
 * A square grid would let `frameFromHeightmap` swap the two axes and still pass, which is the shape of
 * mistake a frame is most likely to carry — and the one with no visible symptom beyond everything being
 * in the wrong place.
 */
const DEM_META: HeightmapMeta = {
  width: 8,
  height: 5,
  zoom: 5,
  bbox: BBOX,
  min: -100,
  max: 900,
  encoding: 'int16-le-metres',
}

/**
 * A mask over the **same ground at four times the resolution**, as the real pair is.
 *
 * This is the fixture that matters. The mask's bbox is identical to the DEM's, so a frame derived from
 * the wrong one of the two would have the right bounds and the wrong grid — and the projection would be
 * off by a factor of four with every box still agreeing. Nothing but the size can catch it.
 */
const MASK_META: LandMaskMeta = { width: 32, height: 20, scale: 4, bbox: BBOX, source: 'test' }

/**
 * A source that hands back a value already in hand.
 *
 * `() => Promise.resolve(x)` and not `async () => x`: the second is an async function with nothing to
 * await, which the typed lint rejects — and rightly, since it reads as if it were waiting for something.
 * @param value - what to load
 * @returns the port
 */
function sourceOf<T>(value: T): { load: () => Promise<T> } {
  return { load: () => Promise.resolve(value) }
}

/**
 * A source that fails.
 * @param message - how it failed
 * @returns the port
 */
function failingSource<T>(message: string): { load: () => Promise<T> } {
  return { load: () => Promise.reject(new Error(message)) }
}

/** The calls worth asserting on, held directly so no assertion detaches a method from its object. */
interface Spies {
  /** Installing the two grids on the compute. */
  setSources: ReturnType<typeof vi.fn>
  /** The political half, which must never run. */
  computePolitical: ReturnType<typeof vi.fn>
  /** Taking the political layer back off — equally never, there being none. */
  clearPolitical: ReturnType<typeof vi.fn>
  /** The bake itself. */
  bakeTerrain: ReturnType<typeof vi.fn>
}

/**
 * The two sources, plus a compute that records what it was asked.
 * @param overrides - what to replace for a given test
 * @returns the deps, and the spies worth asserting on
 */
function deps(overrides: Partial<BackdropDeps> = {}): {
  deps: BackdropDeps
  baked: TerrainBakeResult
  spies: Spies
} {
  const dem = createHeightmap(DEM_META, new Int16Array(DEM_META.width * DEM_META.height))
  const mask = createLandMask(MASK_META, () => true)
  const baked: TerrainBakeResult = {
    rgba: new Uint8Array(DEM_META.width * DEM_META.height * 4),
    width: DEM_META.width,
    height: DEM_META.height,
  }
  const spies: Spies = {
    setSources: vi.fn(() => Promise.resolve()),
    computePolitical: vi.fn(() =>
      Promise.reject(new Error('the backdrop must never install a political layer'))
    ),
    clearPolitical: vi.fn(() => Promise.resolve()),
    bakeTerrain: vi.fn(() => Promise.resolve(baked)),
  }
  const compute = {
    ...spies,
    deriveBorders: vi.fn(() => Promise.resolve([])),
    dispose: vi.fn(),
  } as unknown as MapCompute
  return {
    deps: {
      heightmap: sourceOf(dem),
      landMask: sourceOf(mask),
      compute,
      toImage: () => Promise.resolve(document.createElement('canvas')),
      options: {} as TerrainTextureOptions,
      ...overrides,
    },
    baked,
    spies,
  }
}

describe('frameFromHeightmap', () => {
  describe('happy path', () => {
    it('takes the grid and the ground from the elevation metadata', () => {
      expect(frameFromHeightmap(DEM_META)).toEqual({
        size: { width: 8, height: 5 },
        bounds: BBOX,
      })
    })
  })

  describe('variants', () => {
    it('does not confuse the two axes', () => {
      const frame = frameFromHeightmap({ ...DEM_META, width: 3, height: 7 })

      expect(frame.size.width).toBe(3)
      expect(frame.size.height).toBe(7)
    })
  })

  describe('edge cases', () => {
    it('carries a bbox that crosses the prime meridian unchanged', () => {
      const bbox = { west: -10.5, south: 0, east: 10.5, north: 60 }

      expect(frameFromHeightmap({ ...DEM_META, bbox }).bounds).toEqual(bbox)
    })
  })

  // L3/L4: N/A — a pure read of parsed metadata. Whether the numbers are numbers at all is the
  // heightmap reader's job, and `parseHeightmapMeta` already owns and tests it.
})

describe('loadBackdrop', () => {
  describe('happy path', () => {
    it('loads both assets, installs them, bakes, and returns the picture', async () => {
      const { deps: d, spies } = deps()

      const backdrop = await loadBackdrop(d)

      expect(spies.setSources).toHaveBeenCalledTimes(1)
      expect(spies.bakeTerrain).toHaveBeenCalledTimes(1)
      expect(backdrop.image).toBeInstanceOf(HTMLCanvasElement)
    })

    it('frames against the relief and not the mask, which is four times denser', async () => {
      const { deps: d } = deps()

      const backdrop = await loadBackdrop(d)

      // The two fixtures share a bbox on purpose: deriving the frame from the mask would give the
      // right bounds and a 32×20 grid, and every box would still agree. This is the one assertion
      // that separates the two.
      expect(backdrop.frame.size).toEqual({ width: 8, height: 5 })
      expect(backdrop.frame.bounds).toEqual(BBOX)
    })

    it('never installs a political layer, which is what leaves the terrain bare', async () => {
      const { deps: d, spies } = deps()

      await loadBackdrop(d)

      expect(spies.computePolitical).not.toHaveBeenCalled()
      expect(spies.clearPolitical).not.toHaveBeenCalled()
    })
  })

  describe('variants', () => {
    it('forwards the progress sink to the bake, so a wait can be shown', async () => {
      const onProgress = vi.fn()
      const { deps: d, spies } = deps({ onProgress })

      await loadBackdrop(d)

      expect(spies.bakeTerrain).toHaveBeenCalledWith(d.options, onProgress)
    })

    it('hands the mask over packed, the only form that crosses a worker boundary', async () => {
      const { deps: d, spies } = deps()

      await loadBackdrop(d)

      const sources = spies.setSources.mock.calls[0]?.[0] as {
        landMask: { bits: Uint8Array; meta: LandMaskMeta } | null
      }

      expect(sources.landMask?.bits).toBeInstanceOf(Uint8Array)
      expect(sources.landMask?.meta.scale).toBe(4)
    })
  })

  describe('managed errors', () => {
    it('refuses a mask covering different ground, before anything is baked', async () => {
      const elsewhere = createLandMask({ ...MASK_META, bbox: { ...BBOX, east: 20 } }, () => true)
      const { deps: d, spies } = deps({ landMask: sourceOf(elsewhere) })

      const thrown: unknown = await loadBackdrop(d).catch((error: unknown) => error)

      expect(isAssetError(thrown) && thrown.failure).toBe('semantic')
      expect(isAssetError(thrown) && thrown.asset).toBe('landMask')
      expect(spies.setSources).not.toHaveBeenCalled()
      expect(spies.bakeTerrain).not.toHaveBeenCalled()
    })

    it('propagates a missing relief rather than substituting anything', async () => {
      const { deps: d, spies } = deps({ heightmap: failingSource('404') })

      await expect(loadBackdrop(d)).rejects.toThrow('404')
      expect(spies.bakeTerrain).not.toHaveBeenCalled()
    })

    it('propagates a missing mask too — neither asset is optional here', async () => {
      const { deps: d, spies } = deps({ landMask: failingSource('mask 404') })

      await expect(loadBackdrop(d)).rejects.toThrow('mask 404')
      expect(spies.bakeTerrain).not.toHaveBeenCalled()
    })
  })

  describe('unmanaged errors', () => {
    it('lets a failing bake surface, rather than returning a picture-less backdrop', async () => {
      const { deps: d, spies } = deps()
      spies.bakeTerrain.mockRejectedValueOnce(new Error('worker died'))

      await expect(loadBackdrop(d)).rejects.toThrow('worker died')
    })

    it('lets a failing image conversion surface', async () => {
      const { deps: d } = deps({
        toImage: () => Promise.reject(new Error('no bitmap')),
      })

      await expect(loadBackdrop(d)).rejects.toThrow('no bitmap')
    })
  })

  describe('edge cases', () => {
    it('loads the two assets concurrently, not one after the other', async () => {
      const order: string[] = []
      let releaseDem: (() => void) | null = null
      const { deps: d } = deps({
        heightmap: {
          load: async () => {
            order.push('dem started')
            await new Promise<void>((resolve) => {
              releaseDem = resolve
            })
            return createHeightmap(DEM_META, new Int16Array(DEM_META.width * DEM_META.height))
          },
        },
        landMask: {
          load: () => {
            order.push('mask started')
            releaseDem?.()
            return Promise.resolve(createLandMask(MASK_META, () => true))
          },
        },
      })

      await loadBackdrop(d)

      // The mask could only have started while the relief was still in flight, which a sequential
      // `await` then `await` cannot produce: it would deadlock on the unreleased promise.
      expect(order).toEqual(['dem started', 'mask started'])
    })
  })
})

describe('bakeToBitmap', () => {
  describe('happy path', () => {
    it('wraps the baked bytes without copying them, at the baked size', async () => {
      const rgba = new Uint8Array(16)
      const seen: { data: Uint8ClampedArray; width: number; height: number }[] = []
      vi.stubGlobal(
        'ImageData',
        class {
          constructor(
            public data: Uint8ClampedArray,
            public width: number,
            public height: number
          ) {
            seen.push({ data, width, height })
          }
        }
      )
      const bitmap = {} as ImageBitmap
      vi.stubGlobal(
        'createImageBitmap',
        vi.fn(() => Promise.resolve(bitmap))
      )

      const result = await bakeToBitmap({ rgba, width: 2, height: 2 })

      expect(result).toBe(bitmap)
      expect(seen[0]?.width).toBe(2)
      expect(seen[0]?.height).toBe(2)
      // The same buffer, not a duplicate: at supersample 2 a copy would be ~24 MB per bake.
      expect(seen[0]?.data.buffer).toBe(rgba.buffer)
      vi.unstubAllGlobals()
    })
  })

  // L2–L5: N/A — three lines over two browser APIs, with no branch of its own. What could go wrong
  // (a missing `createImageBitmap`) is a browser that cannot run this application, and the failure
  // surfaces through `loadBackdrop`, which has its own case above.
})

describe('the test fixture stays out of production', () => {
  /**
   * Every module under `src/` — this file sits in `loaders/`, hence `../` — read as text.
   *
   * **`import.meta.glob` and not `node:fs`**, which is the whole reason this guard is writable at all:
   * reading the tree with `fs` needs `@types/node`, and no package here declares them — the root pins
   * `"types": ["vite/client"]` so that a browser package compiles against the browser. Vite's own glob
   * is part of that declared environment, so the check costs no contract.
   */
  const modules = import.meta.glob('../**/*.{ts,tsx}', {
    query: '?raw',
    import: 'default',
    eager: true,
  })

  /** A test fixture's file: `testFrame.ts`, `testGestureContext.ts` — `test` then a capital. */
  const TEST_FIXTURE = /\/test[A-Z]\w*\.ts$/

  it('is imported by no production module', () => {
    const offenders = Object.entries(modules)
      .filter(([path]) => !/\.test\.tsx?$/.test(path) && !TEST_FIXTURE.test(path))
      .filter(([, source]) => /from '[^']*\/test[A-Z]\w*'/.test(source))
      .map(([path]) => path)

    // `TEST_BACKDROP_FRAME` was the application's frame until 2026-10-07, and that is precisely the
    // defect ARCH-102 named: a hand-declared box, with a silent failure mode. A production import
    // would put it straight back, and a comment asking nicely would not stop it.
    expect(offenders).toEqual([])
  })

  it('sees the production modules at all, so a green result means something', () => {
    // The guard above passes trivially if the glob matches nothing — the failure mode of every
    // file-walking test. This is the assertion that it is actually looking.
    const production = Object.keys(modules).filter((path) => !/\.test\.tsx?$/.test(path))

    expect(production).toContain('../main.tsx')
    expect(production).toContain('./backdropSource.ts')
  })
})
