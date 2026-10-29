import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { NAME_GRID_WIDTH } from '@europe-historical-atlas/core/pipeline/yearNames'
import { createLatestOnly } from '@europe-historical-atlas/core/utils/latestOnly'

import { createMapSources } from '../../sources/mapSources'
import { createDevState } from '../../tunables/devState'
import { namePlacement } from '../../tunables/params'
import { AUTHORED_YEAR, META, YEAR } from '../testing/yearFixtures'

import { rebuildYearNames } from './names'

import type { MapLayers } from '../../scene/layers/mapLayers'
import type { MapSources } from '../../sources/mapSources'
import type { PipelineContext } from '../pipelineContext'
import type { Heightmap } from '@europe-historical-atlas/core/data/heightmap'
import type { YearNames } from '@europe-historical-atlas/core/pipeline/yearNames'

/** What the names' compute answers with. */
const PLACED: YearNames = { levels: [], gridWidth: NAME_GRID_WIDTH, gridHeight: 1, unnamed: [] }

/** A 2D context measuring every character the same, as jsdom has none. */
const CONTEXT = {
  font: '',
  fillStyle: '',
  textBaseline: '',
  textAlign: '',
  measureText: () => ({
    width: 64,
    actualBoundingBoxAscent: 90,
    actualBoundingBoxDescent: 10,
    fontBoundingBoxAscent: 100,
    fontBoundingBoxDescent: 30,
  }),
  fillText: vi.fn(),
  getImageData: (_x: number, _y: number, w: number, h: number) => ({
    data: new Uint8ClampedArray(w * h * 4),
  }),
  createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
  putImageData: vi.fn(),
}

/** A context with the stage's collaborators, and its layers and compute as spies. */
interface Stage {
  readonly context: PipelineContext
  readonly sources: MapSources
  readonly rebuildNames: ReturnType<typeof vi.fn>
  readonly placeYearNames: ReturnType<typeof vi.fn>
}

/**
 * The world the stage runs in.
 * @param answer - what the names' compute does
 * @returns the context and its spies
 */
function stage(answer: () => Promise<YearNames> = () => Promise.resolve(PLACED)): Stage {
  const sources = createMapSources()
  sources.heightmap = { meta: META } as unknown as Heightmap
  const rebuildNames = vi.fn()
  const placeYearNames = vi.fn(answer)
  const context = {
    sources,
    layers: { rebuildNames } as unknown as MapLayers,
    dev: createDevState(),
    isDisposed: () => false,
    box: { names: { placeYearNames } },
    nameFace: null,
    namesGate: createLatestOnly(),
  } as unknown as PipelineContext
  return { context, sources, rebuildNames, placeYearNames }
}

beforeEach(() => {
  vi.stubGlobal(
    'FontFace',
    class {
      /**
       * Loads at once.
       * @returns itself
       */
      load(): Promise<this> {
        return Promise.resolve(this)
      }
    }
  )
  Object.defineProperty(document, 'fonts', { value: { add: vi.fn() }, configurable: true })
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    CONTEXT as unknown as CanvasRenderingContext2D
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('rebuildYearNames', () => {
  describe('happy path', () => {
    it('lays an authored year’s names on the map once they are placed', async () => {
      const { context, sources, rebuildNames } = stage()
      await rebuildYearNames(context, AUTHORED_YEAR)
      expect(sources.yearNames).toBe(PLACED)
      expect(sources.nameSheet?.cells.size).toBeGreaterThan(0)
      expect(rebuildNames).toHaveBeenCalledTimes(2)
    })

    it('asks for every level, by the year’s polities, with the placement the dev chose', async () => {
      const { context, placeYearNames } = stage()
      await rebuildYearNames(context, AUTHORED_YEAR)
      const request = placeYearNames.mock.calls[0]?.[0] as Parameters<
        PipelineContext['box']['names']['placeYearNames']
      >[0]
      expect(request.regions).toBe(AUTHORED_YEAR.regions)
      expect(request.bearersByLevel[0]).toHaveLength(AUTHORED_YEAR.regions.length)
      expect(Object.keys(request.names).length).toBeGreaterThan(0)
      expect(request.options).toEqual(namePlacement(context.dev.names))
      expect(request.gridHeight).toBe(Math.round((NAME_GRID_WIDTH * META.height) / META.width))
    })
  })

  describe('variants', () => {
    // The dev, 2026-10-29: « on affiche le titre tel que tu le reçois, avec des majuscules et des minuscules ».
    it('writes the names as they are written by default, the short ones without their title', async () => {
      const { context, placeYearNames } = stage()
      await rebuildYearNames(context, AUTHORED_YEAR)
      const request = placeYearNames.mock.calls[0]?.[0] as Parameters<
        PipelineContext['box']['names']['placeYearNames']
      >[0]
      const written = Object.values(request.names)
      expect(written.some((name) => name !== name.toUpperCase())).toBe(true)
      expect(written.some((name) => name.startsWith('Kingdom of'))).toBe(false)
      // The letters as measured, unspaced: the spacing is the construction's (64 pixels at the sheet's 128 an em).
      expect(Object.values(request.glyphs)[0]?.advance).toBe(0.5)
    })

    it('writes the names in capitals when the panel says so', async () => {
      const { context, placeYearNames } = stage()
      context.dev.names.capitals = true
      await rebuildYearNames(context, AUTHORED_YEAR)
      const request = placeYearNames.mock.calls[0]?.[0] as Parameters<
        PipelineContext['box']['names']['placeYearNames']
      >[0]
      expect(Object.values(request.names).every((name) => name === name.toUpperCase())).toBe(true)
    })

    it('takes the last year’s names off at once, before the new ones are placed', async () => {
      const { context, sources, rebuildNames } = stage(() => new Promise(() => undefined))
      sources.yearNames = PLACED
      void rebuildYearNames(context, AUTHORED_YEAR)
      await Promise.resolve()
      expect(sources.yearNames).toBeNull()
      expect(rebuildNames).toHaveBeenCalledTimes(1)
    })
  })

  describe('managed errors', () => {
    it('names no payload year, and says so', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { context, placeYearNames } = stage()
      await rebuildYearNames(context, YEAR)
      expect(placeYearNames).not.toHaveBeenCalled()
      expect(warn).toHaveBeenCalledWith(expect.stringMatching(/not an authored year/))
    })

    it('gives up a request a newer one overtakes, before asking for its names', async () => {
      const { context, sources, placeYearNames } = stage()
      const first = rebuildYearNames(context, AUTHORED_YEAR)
      const second = rebuildYearNames(context, AUTHORED_YEAR)
      await Promise.all([first, second])
      expect(placeYearNames).toHaveBeenCalledTimes(1)
      expect(sources.yearNames).toBe(PLACED)
    })
  })

  describe('unmanaged errors', () => {
    it('leaves the map without names, and says so, when the placement fails', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { context, sources } = stage(() => Promise.reject(new Error('worker gone')))
      await rebuildYearNames(context, AUTHORED_YEAR)
      expect(sources.yearNames).toBeNull()
      expect(error).toHaveBeenCalledWith(
        '[atlas] the countries’ names could not be placed',
        expect.any(Error)
      )
    })
  })

  describe('edge cases', () => {
    it('loads the face again after a failed load, rather than keeping the failure', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      let loads = 0
      vi.stubGlobal(
        'FontFace',
        class {
          /**
           * Fails the first time, loads the next.
           * @returns itself
           */
          load(): Promise<this> {
            loads += 1
            return loads === 1 ? Promise.reject(new Error('offline')) : Promise.resolve(this)
          }
        }
      )
      const { context, sources } = stage()
      await rebuildYearNames(context, AUTHORED_YEAR)
      expect(sources.yearNames).toBeNull()
      await rebuildYearNames(context, AUTHORED_YEAR)
      expect([loads, sources.yearNames]).toEqual([2, PLACED])
    })

    it('loads the face once for two years', async () => {
      const { context } = stage()
      await rebuildYearNames(context, AUTHORED_YEAR)
      const face = context.nameFace
      await rebuildYearNames(context, AUTHORED_YEAR)
      expect(context.nameFace).toBe(face)
    })
  })
})
