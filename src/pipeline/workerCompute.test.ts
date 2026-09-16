import { describe, expect, it, vi } from 'vitest'

import { createLandMask } from '../data/landMask'

import { serveCompute } from './computeServer'
import { createInlineMapCompute } from './inlineCompute'
import { DEFAULT_TERRAIN_OPTIONS } from './terrainCompose'
import { createWorkerMapCompute } from './workerCompute'

import type { ComputeCommand, ComputeEvent, WorkerScope } from './computeProtocol'
import type { ComputePhase, ComputeSources, MapCompute, PoliticalRequest } from './mapCompute'
import type { TerrainTextureOptions } from './terrainCompose'
import type { ComputeWorkerHandle } from './workerCompute'
import type { HeightmapMeta } from '../data/heightmap'
import type { Region } from '../data/regionSource'

const MASK_META = { width: 4, height: 4, scale: 1, bbox: { west: 0, south: 0, east: 1, north: 1 } }

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
      handle.onerror?.(new ErrorEvent('error', { message }))
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

      expect(result.width).toBe(4)
      expect(result.cells.length).toBe(16)
      expect(result.tints).toHaveLength(2)
      expect(result.tints[0]).not.toEqual(result.tints[1])
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
  })

  describe('variants', () => {
    it('hands the baked pixels over instead of copying them', async () => {
      const link = loopback(createInlineMapCompute())
      const client = createWorkerMapCompute({ spawn: () => link.handle })
      await client.setSources(sources())
      const bake = await client.bakeTerrain(OPTIONS)
      expect(link.transfers.at(-1)).toEqual([bake.rgba.buffer])
    })

    it('copies the political raster, because the worker keeps painting from its own', async () => {
      const link = loopback(createInlineMapCompute())
      const client = createWorkerMapCompute({ spawn: () => link.handle })
      await client.setSources(sources())
      const first = await client.computePolitical(REQUEST)
      // Had the worker transferred its own grid away, the next bake would have nothing to tint with.
      const tinted = await client.bakeTerrain(OPTIONS)
      await client.clearPolitical()
      const bare = await client.bakeTerrain(OPTIONS)
      expect(first.cells.length).toBe(16)
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
      expect(political.cells.length).toBe(16)
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
