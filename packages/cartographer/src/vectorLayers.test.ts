import { describe, expect, it, vi } from 'vitest'

import { createLandMask } from '@europe-historical-atlas/core/data/landMask'

import {
  COASTLINE_TRACE_WIDTH,
  loadVectorLayers,
  projectRiverLines,
  provenanceOf,
  toBackdropPixels,
  traceCoastline,
} from './vectorLayers'
import { TEST_BACKDROP_FRAME } from './view/testFrame'

import type { BackdropFrame } from './view/projection'
import type { River, RiverSource } from '@europe-historical-atlas/core/data/riverSource'
import type { GeoBounds } from '@europe-historical-atlas/core/geo/mercator'

/** A small frame with **different** width and height, so a swapped axis cannot pass. */
const FRAME: BackdropFrame = {
  size: { width: 200, height: 80 },
  bounds: TEST_BACKDROP_FRAME.bounds,
}

/**
 * A mask holding one square island, big enough to trace.
 * @param size - the grid's width and height in cells
 * @returns the mask
 */
function islandMask(size = 16) {
  return createLandMask(
    {
      width: size,
      height: size,
      scale: 1,
      bbox: TEST_BACKDROP_FRAME.bounds,
      source: 'test shore (CC0)',
    },
    (col, row) => col > 4 && col < 11 && row > 4 && row < 11
  )
}

/**
 * A river source answering at once, over the frame's own box unless told otherwise.
 * @param rivers - the centrelines
 * @param bbox - the box the payload declares
 * @returns the source
 */
function riverSource(rivers: River[], bbox: GeoBounds = FRAME.bounds): RiverSource {
  return { load: () => Promise.resolve({ source: 'test rivers (PD)', bbox, rivers }) }
}

describe('toBackdropPixels', () => {
  describe('happy path', () => {
    it('scales by the full size, so the edges land on the edges', () => {
      const points = toBackdropPixels(
        [
          { u: 0, v: 0 },
          { u: 1, v: 1 },
          { u: 0.5, v: 0.25 },
        ],
        FRAME
      )

      // Multiplied by `width`, not `width - 1`, which is what `lonLatToBackdrop` does: the backdrop is a
      // continuous domain from 0 to width. The other convention would slide every coast half a cell.
      expect(points).toEqual([
        [0, 0],
        [200, 80],
        [100, 20],
      ])
    })
  })

  describe('variants', () => {
    it('does not swap the two axes', () => {
      expect(toBackdropPixels([{ u: 1, v: 0 }], FRAME)).toEqual([[200, 0]])
    })
  })

  describe('edge cases', () => {
    it('returns nothing for nothing', () => {
      expect(toBackdropPixels([], FRAME)).toEqual([])
    })
  })

  // L3/L4: N/A — two multiplications over a list, with no branch and nothing that can fail.
})

describe('traceCoastline', () => {
  describe('happy path', () => {
    it('traces an island as one closed contour, in backdrop pixels', () => {
      const contours = traceCoastline(islandMask(), FRAME, 16)

      expect(contours).toHaveLength(1)
      expect(contours[0]?.closed).toBe(true)
      // In pixels of the frame, so inside it — not in [0, 1].
      const xs = contours[0]?.points.map((point) => point[0]) ?? []

      expect(Math.max(...xs)).toBeGreaterThan(1)
      expect(Math.max(...xs)).toBeLessThanOrEqual(FRAME.size.width)
    })
  })

  describe('variants', () => {
    it('traces at the width it is given, not at the mask’s own', () => {
      const coarse = traceCoastline(islandMask(64), FRAME, 16)
      const fine = traceCoastline(islandMask(64), FRAME, 64)

      const coarsePoints = coarse.reduce((total, c) => total + c.points.length, 0)
      const finePoints = fine.reduce((total, c) => total + c.points.length, 0)

      expect(finePoints).toBeGreaterThan(coarsePoints)
    })

    it('defaults to the atlas’s own tracing width, so the two agree on the coast', () => {
      expect(COASTLINE_TRACE_WIDTH).toBe(2560)
    })
  })

  describe('edge cases', () => {
    it('returns nothing for an all-land mask, there being no shore in it', () => {
      const allLand = createLandMask(
        {
          width: 8,
          height: 8,
          scale: 1,
          bbox: TEST_BACKDROP_FRAME.bounds,
          source: 'test shore (CC0)',
        },
        () => true
      )

      expect(traceCoastline(allLand, FRAME, 8)).toEqual([])
    })
  })

  // L3/L4: N/A — it composes two pure functions over a mask that has already been validated by its
  // reader. A malformed mask cannot reach here.
})

describe('projectRiverLines', () => {
  describe('happy path', () => {
    it('projects the points and carries the name and the rank', () => {
      const rivers: River[] = [
        {
          rank: 3,
          kind: 'River',
          name: 'Maas',
          points: [
            { u: 0, v: 0 },
            { u: 0.5, v: 1 },
          ],
        },
      ]

      const lines = projectRiverLines(rivers, FRAME)

      expect(lines[0]?.points).toEqual([
        [0, 0],
        [100, 80],
      ])
      // The name travels because the status bar shows it when snapping — and because the dataset holds
      // it in the local language (`Maas`, not `Meuse`), which H-02 records as a thing to show verbatim.
      expect(lines[0]?.name).toBe('Maas')
      expect(lines[0]?.rank).toBe(3)
    })
  })

  describe('variants', () => {
    it('never closes a centreline', () => {
      const rivers: River[] = [{ rank: 1, kind: 'River', name: null, points: [{ u: 0, v: 0 }] }]

      // A river runs from source to mouth or to the frame's edge. Closing one would paint a ring.
      expect(projectRiverLines(rivers, FRAME)[0]?.closed).toBe(false)
    })

    it('keeps a nameless river rather than dropping it', () => {
      const rivers: River[] = [{ rank: 9, kind: 'River', name: null, points: [{ u: 0, v: 0 }] }]

      // 25 of the 591 carry no name. They are still something to snap to.
      expect(projectRiverLines(rivers, FRAME)).toHaveLength(1)
      expect(projectRiverLines(rivers, FRAME)[0]?.name).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('returns nothing for nothing', () => {
      expect(projectRiverLines([], FRAME)).toEqual([])
    })
  })

  // L3/L4: N/A — a map over an already-validated payload.
})

describe('loadVectorLayers', () => {
  describe('happy path', () => {
    it('returns both layers, projected into the frame', async () => {
      const layers = await loadVectorLayers({
        mask: islandMask(),
        rivers: riverSource([
          { rank: 1, kind: 'River', name: 'Rhône', points: [{ u: 0.5, v: 0.5 }] },
        ]),
        frame: FRAME,
        traceWidth: 16,
      })

      expect(layers.coast.length).toBeGreaterThan(0)
      expect(layers.rivers[0]?.points).toEqual([[100, 40]])
      expect(layers.coastProvenance).toEqual({ name: 'test shore', licence: 'CC0' })
      expect(layers.riverProvenance).toEqual({ name: 'test rivers', licence: 'PD' })
    })
  })

  describe('variants', () => {
    it('mends the rivers before projecting them, so a river cut in two pieces is followed as one', async () => {
      // H-35: the Loire ships in pieces laid end to end; the Pen follows one polyline at a time.
      const layers = await loadVectorLayers({
        mask: islandMask(),
        rivers: riverSource([
          {
            rank: 5,
            kind: 'River',
            name: 'Loire',
            points: [
              { u: 0.1, v: 0.5 },
              { u: 0.2, v: 0.5 },
              { u: 0.3, v: 0.5 },
            ],
          },
          {
            rank: 5,
            kind: 'River',
            name: 'Loire',
            points: [
              { u: 0.3, v: 0.5 },
              { u: 0.4, v: 0.5 },
              { u: 0.5, v: 0.5 },
            ],
          },
        ]),
        frame: FRAME,
        traceWidth: 16,
      })

      expect(layers.rivers).toHaveLength(1)
      expect(layers.rivers[0]?.points).toHaveLength(5)
    })
  })

  describe('managed errors', () => {
    it('propagates a failing river load rather than drawing a map with holes in it', async () => {
      const failing = loadVectorLayers({
        mask: islandMask(),
        rivers: { load: () => Promise.reject(new Error('rivers 404')) },
        frame: FRAME,
        traceWidth: 16,
      })

      // The dev's call of 2026-10-07, applied here: a missing river is not cosmetic, it is a stretch of
      // frontier with nothing to snap to. The canvas area says so rather than drawing most of a map.
      await expect(failing).rejects.toThrow('rivers 404')
    })

    it('refuses rivers cropped to another box than the backdrop, naming the rivers', async () => {
      const slid = loadVectorLayers({
        mask: islandMask(),
        rivers: riverSource([], { ...FRAME.bounds, east: FRAME.bounds.east - 10 }),
        frame: FRAME,
        traceWidth: 16,
      })

      await expect(slid).rejects.toMatchObject({ asset: 'rivers', failure: 'semantic' })
    })

    it('refuses a river source that names no licence, rather than recording anchors under none', async () => {
      const unlicensed = loadVectorLayers({
        mask: islandMask(),
        rivers: {
          load: () => Promise.resolve({ source: 'rivers', bbox: FRAME.bounds, rivers: [] }),
        },
        frame: FRAME,
        traceWidth: 16,
      })

      await expect(unlicensed).rejects.toThrow(/no licence/)
    })
  })

  describe('edge cases', () => {
    it('does not trace before the rivers have answered, so one failure costs no 660 ms', async () => {
      const trace = vi.fn()
      const failing = loadVectorLayers({
        mask: new Proxy(islandMask(), {
          get(target, key) {
            trace()
            return Reflect.get(target, key) as unknown
          },
        }),
        rivers: { load: () => Promise.reject(new Error('rivers 404')) },
        frame: FRAME,
        traceWidth: 16,
      })

      await expect(failing).rejects.toThrow()
      // The tracing is the expensive half (539 ms at the shipped width). Awaiting the cheap, failable
      // half first is what keeps a 404 from costing it.
      expect(trace).not.toHaveBeenCalled()
    })
  })

  describe('edge cases — refusals come first', () => {
    it('does not trace when the river source names no licence', async () => {
      const read: (string | symbol)[] = []
      const unlicensed = loadVectorLayers({
        mask: new Proxy(islandMask(), {
          get(target, key) {
            read.push(key)
            return Reflect.get(target, key) as unknown
          },
        }),
        rivers: {
          load: () => Promise.resolve({ source: 'rivers', bbox: FRAME.bounds, rivers: [] }),
        },
        frame: FRAME,
        traceWidth: 16,
      })

      await expect(unlicensed).rejects.toThrow(/no licence/)
      // Reading the mask's declared source is the provenance check; anything else is the tracing.
      expect(read.filter((key) => key !== 'meta')).toEqual([])
    })
  })

  // L4: N/A — nothing is caught, so there is no swallowed rejection; the managed case above is the
  // whole of its error behaviour.
})

describe('provenanceOf', () => {
  describe('happy path', () => {
    it('splits the shipped mask’s declaration into a name and a licence', () => {
      expect(provenanceOf('Natural Earth 10m land minus lakes (public domain)')).toEqual({
        name: 'Natural Earth 10m land minus lakes',
        licence: 'public domain',
      })
    })
  })

  describe('variants', () => {
    it('takes the last bracket as the licence', () => {
      expect(provenanceOf('Survey (2nd ed.) of the coast (CC0)')).toEqual({
        name: 'Survey (2nd ed.) of the coast',
        licence: 'CC0',
      })
    })
  })

  describe('managed errors', () => {
    // A licence nobody declared is never recorded: the source is refused instead.
    it('refuses a source with no licence in brackets', () => {
      expect(() => provenanceOf('Natural Earth 10m land')).toThrow(/names no licence/)
    })
  })

  describe('unmanaged errors', () => {
    it('refuses an empty source', () => {
      expect(() => provenanceOf('')).toThrow(/names no licence/)
    })
  })

  describe('edge cases', () => {
    it('ignores the whitespace around the declaration', () => {
      expect(provenanceOf('  Shore (CC0)  ')).toEqual({ name: 'Shore', licence: 'CC0' })
    })
  })
})
