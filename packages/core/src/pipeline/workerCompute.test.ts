import { describe, expect, it, vi } from 'vitest'

import { createLandMask } from '../data/landMask'
import { projectRegions } from '../data/regionSource'
import { franceAndAquitaine } from '../data/testing/authoredYearFixture'
import { toRegionPayload } from '../data/toRegionPayload'
import { UNMEASURED_BAND_KM } from '../data/vassalBand'

import { serveCompute } from './computeServer'
import { layFills } from './fillBuffers'
import { createInlineMapCompute } from './inlineCompute'
import { DEFAULT_TERRAIN_OPTIONS } from './terrainCompose'
import { createWorkerMapCompute } from './workerCompute'

import type { ComputeCommand, ComputeEvent, WorkerScope } from './computeProtocol'
import type { ComputePhase, ComputeSources, MapCompute, PoliticalRequest } from './mapCompute'
import type { TerrainTextureOptions } from './terrainCompose'
import type { ComputeWorkerHandle } from './workerCompute'
import type { YearNamesRequest } from './yearNames'
import type { HeightmapMeta } from '../data/heightmap'
import type { Region } from '../data/regionSource'

const MASK_META = {
  width: 4,
  height: 4,
  scale: 1,
  bbox: { west: 0, south: 0, east: 1, north: 1 },
  source: 'test',
}

/** Metadata for a 4x4 test grid. */
const HEIGHTMAP_META: HeightmapMeta = {
  width: 4,
  height: 4,
  zoom: 5,
  bbox: { west: 0, south: 0, east: 1, north: 1 },
  min: 0,
  max: 1000,
  encoding: 'int16-le-metres',
}

/** A polity covering a rectangle of the unit square. */
function box(name: string, u0: number, u1: number): Region {
  return {
    name,
    subjectTo: null,
    partOf: null,
    rings: [
      [
        { u: u0, v: 0 },
        { u: u1, v: 0 },
        { u: u1, v: 1 },
        { u: u0, v: 1 },
      ],
    ],
  }
}

/** Fresh sources each call — a transferred buffer must not be shared between tests. */
function sources(): ComputeSources {
  return {
    heightmap: { meta: HEIGHTMAP_META, data: new Int16Array(16).fill(500) },
    landMask: { meta: MASK_META, bits: createLandMask(MASK_META, () => true).pack() },
  }
}

const REQUEST: PoliticalRequest = {
  regions: [box('Alpha', 0, 0.45), box('Beta', 0.55, 1)],
  rasterScale: 1,
  snapToCoast: 0,
  colorBySuzerain: false,
  palette: [
    { r: 10, g: 20, b: 30 },
    { r: 40, g: 50, b: 60 },
  ],
  borderSmoothing: 0,
}

const OPTIONS: TerrainTextureOptions = { ...DEFAULT_TERRAIN_OPTIONS, supersample: 1 }

/** A worker handle and the scope it talks to, wired straight to each other in this thread. */
interface Loopback {
  /** What the client holds. */
  handle: ComputeWorkerHandle
  /** Every transfer list the server posted, in order. */
  transfers: (Transferable[] | undefined)[]
  /** Pretend the worker crashed. */
  crash: (message: string) => void
  /** Whether `terminate()` has been called. */
  terminated: () => boolean
}

/** One square polity, one letter, one level — the smallest year of names. */
const NAMES_REQUEST: YearNamesRequest = {
  regions: [
    {
      name: 'k',
      subjectTo: null,
      partOf: null,
      polityId: 'k',
      rings: [
        [
          { u: 0.05, v: 0.05 },
          { u: 0.95, v: 0.05 },
          { u: 0.95, v: 0.95 },
          { u: 0.05, v: 0.95 },
        ],
      ],
    },
  ],
  bearersByLevel: [['k']],
  names: { k: 'K' },
  fullNames: {},
  glyphs: { K: { advance: 1, ascent: 1, descent: 0 } },
  gridWidth: 20,
  gridHeight: 20,
  options: {
    heightShare: 0.6,
    cover: 0.75,
    trackingMost: 0.6,
    neighbourBite: 0,
    minSize: 0.5,
    longMinSize: 0.5,
    offsetSize: 2.5,
    maxSize: 1000,
    strait: 4,
    farShare: 0.2,
    farCells: 1e9,
  },
}

/**
 * Run a real {@link serveCompute} against a fake channel, so the client and the server are exercised
 * against each other rather than against a mock of what each believes the other does.
 */
function loopback(compute: MapCompute): Loopback {
  let listener: ((event: MessageEvent<ComputeCommand>) => void) | null = null
  let terminated = false
  const transfers: (Transferable[] | undefined)[] = []

  const handle: ComputeWorkerHandle = {
    onmessage: null,
    onerror: null,
    postMessage(message: unknown): void {
      if (terminated) return
      listener?.({ data: message } as MessageEvent<ComputeCommand>)
    },
    terminate(): void {
      terminated = true
    },
  }

  const scope: WorkerScope = {
    addEventListener(_type, next): void {
      listener = next
    },
    postMessage(event: ComputeEvent, transfer?: Transferable[]): void {
      if (terminated) return
      transfers.push(transfer)
      handle.onmessage?.({ data: event } as MessageEvent<ComputeEvent>)
    },
  }

  serveCompute(scope, compute)
  return {
    handle,
    transfers,
    crash: (message) => {
      // A stand-in carrying the one field the contract reads, in the same shape as the `onmessage` line
      // above. `ErrorEvent` is a *type* this package has (it compiles against `WebWorker`) but not a
      // runtime constructor — Node has none, and this package has deliberately no DOM to borrow one from.
      handle.onerror?.({ message } as ErrorEvent)
    },
    terminated: () => terminated,
  }
}

describe('createWorkerMapCompute', () => {
  describe('happy path', () => {
    it('computes a political year across the wire', async () => {
      const link = loopback(createInlineMapCompute())
      const client = createWorkerMapCompute({ spawn: () => link.handle })
      await client.setSources(sources())
      const result = await client.computePolitical(REQUEST)

      expect(result.tints).toHaveLength(2)
      expect(result.tints[0]).not.toEqual(result.tints[1])
    })

    it('places a year’s names across the wire, with no sources installed', async () => {
      const link = loopback(createInlineMapCompute())
      const client = createWorkerMapCompute({ spawn: () => link.handle })
      const names = await client.placeYearNames(NAMES_REQUEST)
      expect(names.levels[0]?.placed.map(({ polity }) => polity)).toEqual(['k'])
    })

    it('bakes a terrain image across the wire', async () => {
      const link = loopback(createInlineMapCompute())
      const client = createWorkerMapCompute({ spawn: () => link.handle })
      await client.setSources(sources())
      const bake = await client.bakeTerrain(OPTIONS)
      expect(bake.width).toBe(4)
      expect(bake.rgba.length).toBe(4 * 4 * 4)
    })

    it('forwards every phase the compute announces', async () => {
      const link = loopback(createInlineMapCompute())
      const client = createWorkerMapCompute({ spawn: () => link.handle })
      await client.setSources(sources())
      const seen: ComputePhase[] = []
      await client.computePolitical(REQUEST, (_, phase) => seen.push(phase))
      expect(seen).toEqual(['rasterise', 'expand', 'colours', 'borders'])
    })

    it('announces the names’ placement across the wire, before it runs', async () => {
      const link = loopback(createInlineMapCompute())
      const client = createWorkerMapCompute({ spawn: () => link.handle })
      const seen: ComputePhase[] = []
      await client.placeYearNames(NAMES_REQUEST, (_, phase) => seen.push(phase))
      expect(seen).toEqual(['names'])
    })
  })

  describe('variants', () => {
    // ATLAS-333, ATLAS-396: the fills cut and laid off the main thread.
    it('lays a square polity across the wire as the main thread would, and hands its arrays over', async () => {
      const link = loopback(createInlineMapCompute())
      const client = createWorkerMapCompute({ spawn: () => link.handle })
      const square = [
        { u: 0.25, v: 0.25 },
        { u: 0.75, v: 0.25 },
        { u: 0.75, v: 0.75 },
        { u: 0.25, v: 0.75 },
      ]
      const request = {
        regions: [{ rings: [square] }],
        grid: { segX: 4, segY: 4 },
        tintLevels: [[{ r: 200, g: 40, b: 10 }]],
        bandDepths: [0],
        band: null,
        heights: Float32Array.from({ length: 25 }, (_, node) => node / 10),
        worldWidth: 10,
        worldDepth: 10,
      }
      const arrays = await client.layFills(request)
      expect(arrays).toEqual(layFills(request))
      expect(link.transfers.at(-1)).toEqual([
        arrays.positions.buffer,
        arrays.indices.buffer,
        arrays.bandDepth.buffer,
        arrays.bandKm.buffer,
        arrays.realmKm.buffer,
        ...arrays.tints.map((tint) => tint.buffer),
      ])
    })

    // ATLAS-398: a vassal's distances come back with its fill, handed over too; a sovereign's carry none.
    it('lays a vassal beside a sovereign across the wire, the vassal’s vertices with their depth and distance', async () => {
      const link = loopback(createInlineMapCompute())
      const client = createWorkerMapCompute({ spawn: () => link.handle })
      const left = [
        { u: 0.1, v: 0.25 },
        { u: 0.45, v: 0.25 },
        { u: 0.45, v: 0.75 },
        { u: 0.1, v: 0.75 },
      ]
      const right = left.map(({ u, v }) => ({ u: u + 0.45, v }))
      const grid = { segX: 8, segY: 8 }
      const band = { bounds: { west: 0, south: 40, east: 10, north: 50 }, reachKm: 30 }
      const request = {
        regions: [{ rings: [left] }, { rings: [right], banded: true }],
        grid,
        tintLevels: [
          [
            { r: 10, g: 20, b: 30 },
            { r: 200, g: 100, b: 50 },
          ],
        ],
        bandDepths: [0, 1],
        band,
        heights: new Float32Array(81),
        worldWidth: 10,
        worldDepth: 10,
      }
      const arrays = await client.layFills(request)
      expect(arrays).toEqual(layFills(request))
      // The sovereign's run carries no depth and no distance; the vassal's every vertex has its depth, and some lie
      // inside its outline (a negative distance).
      const depths = new Set(arrays.bandDepth)
      expect(depths).toEqual(new Set([0, 1]))
      const vassalKm = Array.from(arrays.bandKm).filter(
        (_, vertex) => arrays.bandDepth[vertex] === 1
      )
      expect(vassalKm.some((km) => km !== 0)).toBe(true)
      const sovereignKm = Array.from(arrays.bandKm).filter(
        (_, vertex) => arrays.bandDepth[vertex] === 0
      )
      // The sovereign was not flagged in this request, so it reads deep inside: its colour whole.
      expect(sovereignKm.every((km) => km === UNMEASURED_BAND_KM)).toBe(true)
    })

    // ATLAS-333: the year settled across the wire, as the main thread would settle it.
    it('settles an authored year across the wire as the main thread would', async () => {
      const link = loopback(createInlineMapCompute())
      const client = createWorkerMapCompute({ spawn: () => link.handle })
      await client.setSources(sources())
      const year = franceAndAquitaine()
      const bbox = { west: -10, south: 35, east: 10, north: 60 }
      const request = {
        year,
        bbox,
        regions: projectRegions(toRegionPayload(year, bbox)).regions,
        palette: ['#aa0000', '#00aa00'] as [string, ...string[]],
      }
      const across = await client.settleYear(request)
      const here = createInlineMapCompute()
      await here.setSources(sources())
      expect(across).toEqual(await here.settleYear(request))
      expect(across.borders.between.length).toBeGreaterThan(0)
    })

    it('measures a tribe across the wire as the main thread would, on the land it holds', async () => {
      const link = loopback(createInlineMapCompute())
      const client = createWorkerMapCompute({ spawn: () => link.handle })
      await client.setSources(sources())
      const square = [
        { u: 0.25, v: 0.25 },
        { u: 0.75, v: 0.25 },
        { u: 0.75, v: 0.75 },
        { u: 0.25, v: 0.75 },
      ]
      const tribe = { polity: 'prussians', colour: '#41580b', rings: [square] }
      const request = {
        claims: [{ polityId: 'prussians', rings: [square] }],
        bounds: { west: 0, south: 50, east: 10, north: 60 },
        grid: { segX: 4, segY: 4 },
        reachKm: 60,
        claimReachKm: 20,
        spill: true,
        seaLevel: 0,
      }
      const across = await client.cutTribes([tribe], request)
      const here = createInlineMapCompute()
      await here.setSources(sources())
      expect(across).toEqual(await here.cutTribes([tribe], request))
      expect(across[0]?.triangles.length).toBeGreaterThan(0)
      // Its four arrays handed over, not copied.
      expect(link.transfers.at(-1)).toHaveLength(4)
    })

    // CARTO-439, found in the dev's atlas the same day: the page sent each tribe field by field, the outlined mark left
    // behind — every outlined tribe was cut, and drawn, as a plain one.
    it('carries an outlined tribe’s mark across the wire to its patch', async () => {
      const link = loopback(createInlineMapCompute())
      const client = createWorkerMapCompute({ spawn: () => link.handle })
      await client.setSources(sources())
      const square = [
        { u: 0.25, v: 0.25 },
        { u: 0.75, v: 0.25 },
        { u: 0.75, v: 0.75 },
        { u: 0.25, v: 0.75 },
      ]
      const request = {
        claims: [{ polityId: 'pomerania', rings: [square] }],
        bounds: { west: 0, south: 50, east: 10, north: 60 },
        grid: { segX: 4, segY: 4 },
        reachKm: 60,
        claimReachKm: 20,
        spill: false,
        seaLevel: 0,
      }
      const [rim] = await client.cutTribes(
        [{ polity: 'pomerania', colour: '#8bc059', rings: [square], outlined: true }],
        request
      )
      expect(rim?.outlined).toBe(true)
    })

    it('hands the baked pixels over instead of copying them', async () => {
      const link = loopback(createInlineMapCompute())
      const client = createWorkerMapCompute({ spawn: () => link.handle })
      await client.setSources(sources())
      const bake = await client.bakeTerrain(OPTIONS)
      expect(link.transfers.at(-1)).toEqual([bake.rgba.buffer])
    })

    it('leaves the political grid in the worker, and keeps painting from it', async () => {
      // The grid used to come back as raw cells — 45 MB a year at the 4x raster, for one caller that has
      // since been deleted. Nothing is transferred for a political result now; what proves the worker
      // still holds its own is that the next bake can tint with it.
      const link = loopback(createInlineMapCompute())
      const client = createWorkerMapCompute({ spawn: () => link.handle })
      await client.setSources(sources())
      await client.computePolitical(REQUEST)
      expect(link.transfers.at(-1)).toEqual([])
      const tinted = await client.bakeTerrain(OPTIONS)
      await client.clearPolitical()
      const bare = await client.bakeTerrain(OPTIONS)
      expect(Array.from(tinted.rgba)).not.toEqual(Array.from(bare.rgba))
    })

    it('re-derives borders without sending the year back across', async () => {
      const link = loopback(createInlineMapCompute())
      const client = createWorkerMapCompute({ spawn: () => link.handle })
      await client.setSources(sources())
      const computed = await client.computePolitical(REQUEST)
      const again = await client.deriveBorders(0)
      expect(again.between).toHaveLength(computed.borders.between.length)
    })

    it('keeps two calls apart', async () => {
      const link = loopback(createInlineMapCompute())
      const client = createWorkerMapCompute({ spawn: () => link.handle })
      await client.setSources(sources())
      const [political, bake] = await Promise.all([
        client.computePolitical(REQUEST),
        client.bakeTerrain(OPTIONS),
      ])
      expect(political.tints).toHaveLength(2)
      expect(bake.rgba.length).toBe(4 * 4 * 4)
    })
  })

  describe('managed errors', () => {
    it('rejects with the message a failing compute threw', async () => {
      const link = loopback(createInlineMapCompute()) // no sources installed
      const client = createWorkerMapCompute({ spawn: () => link.handle })
      await expect(client.computePolitical(REQUEST)).rejects.toThrow(/heightmap/)
    })

    it('refuses a call made after the worker died', async () => {
      const link = loopback(createInlineMapCompute())
      const client = createWorkerMapCompute({ spawn: () => link.handle })
      link.crash('boom')
      await expect(client.bakeTerrain(OPTIONS)).rejects.toThrow(/gone/)
    })

    it('catches an answer of the wrong kind rather than reading it as the right one', async () => {
      const handle: ComputeWorkerHandle = {
        onmessage: null,
        onerror: null,
        postMessage(message: unknown): void {
          const command = message as ComputeCommand
          const event: ComputeEvent = { kind: 'done', id: command.id, payload: { kind: 'ack' } }
          handle.onmessage?.({ data: event } as MessageEvent<ComputeEvent>)
        },
        terminate(): void {
          /* nothing to tear down */
        },
      }
      const client = createWorkerMapCompute({ spawn: () => handle })
      await expect(client.bakeTerrain(OPTIONS)).rejects.toThrow(/answered a bake request with ack/)
    })
  })

  describe('unmanaged errors', () => {
    it('fails every call in flight when the worker crashes, and says so once', async () => {
      const link = loopback(createInlineMapCompute())
      const onFatal = vi.fn()
      const client = createWorkerMapCompute({ spawn: () => link.handle, onFatal })
      await client.setSources(sources())

      // A call that never gets an answer, because the worker dies under it.
      const inFlight = client.bakeTerrain(OPTIONS)
      link.crash('out of memory')
      await expect(inFlight).rejects.toThrow(/out of memory/)
      expect(onFatal).toHaveBeenCalledTimes(1)
    })

    it('answers a command it does not recognise, rather than leaving the caller waiting', async () => {
      const held: { listener: ((event: MessageEvent<ComputeCommand>) => void) | null } = {
        listener: null,
      }
      const posted: ComputeEvent[] = []
      serveCompute(
        {
          addEventListener: (_type, next): void => {
            held.listener = next
          },
          postMessage: (event): void => {
            posted.push(event)
          },
        },
        createInlineMapCompute()
      )
      // A worker bundle that has drifted from this one: a command kind this build has never heard of.
      const strange = { kind: 'resample', id: 1 } as unknown as ComputeCommand
      held.listener?.({ data: strange } as MessageEvent<ComputeCommand>)

      await vi.waitFor(() => {
        expect(posted).toHaveLength(1)
      })
      // Falling off the end of the switch would have resolved `run()` to undefined, thrown inside the
      // success handler where no rejection handler can see it, and left the caller pending forever.
      expect(posted[0]).toMatchObject({ kind: 'failed', id: 1 })
    })

    it('ignores an answer to a call it is not waiting for', async () => {
      const link = loopback(createInlineMapCompute())
      const client = createWorkerMapCompute({ spawn: () => link.handle })
      await client.setSources(sources())
      const stray: ComputeEvent = { kind: 'done', id: 9999, payload: { kind: 'ack' } }
      expect(() => {
        link.handle.onmessage?.({ data: stray } as MessageEvent<ComputeEvent>)
      }).not.toThrow()
    })
  })

  describe('edge cases', () => {
    it('terminates the worker on dispose and fails what was in flight', async () => {
      const link = loopback(createInlineMapCompute())
      const onFatal = vi.fn()
      const client = createWorkerMapCompute({ spawn: () => link.handle, onFatal })
      await client.setSources(sources())
      const inFlight = client.bakeTerrain(OPTIONS)
      client.dispose()
      await expect(inFlight).rejects.toThrow(/disposed/)
      expect(link.terminated()).toBe(true)
      // A deliberate teardown is not news: only a worker that died on its own is.
      expect(onFatal).not.toHaveBeenCalled()
    })

    it('does not spawn a second worker per call', async () => {
      const link = loopback(createInlineMapCompute())
      const spawn = vi.fn(() => link.handle)
      const client = createWorkerMapCompute({ spawn })
      await client.setSources(sources())
      await client.bakeTerrain(OPTIONS)
      expect(spawn).toHaveBeenCalledTimes(1)
    })
  })
})
