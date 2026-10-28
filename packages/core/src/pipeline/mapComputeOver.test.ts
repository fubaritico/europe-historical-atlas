import { describe, expect, it, vi } from 'vitest'

import { mapComputeOver, unwrapDone } from './workerCompute'

import type { ComputeEvent } from './computeProtocol'
import type { PoliticalResult, TerrainBakeResult } from './mapCompute'
import type { SendCommand } from './workerCompute'
import type { RegionBorders } from '../data/regionBorders'

const POLITICAL = { colors: new Uint8Array(4), borders: [] } as unknown as PoliticalResult
const BORDERS = [] as unknown as RegionBorders
const BAKE = { rgba: new Uint8ClampedArray(4), width: 1, height: 1 } as unknown as TerrainBakeResult

/** A transport that always answers with the given event, and records what it was asked. */
function answering(event: (id: number) => ComputeEvent): {
  send: SendCommand
  sent: ReturnType<typeof vi.fn>
} {
  const sent = vi.fn()
  const send: SendCommand = (build, onProgress) => {
    const command = build(7)
    sent(command, onProgress)
    return Promise.resolve(event(7))
  }
  return { send, sent }
}

describe('unwrapDone', () => {
  describe('happy path', () => {
    it('lets a completion through', () => {
      const event: ComputeEvent = { kind: 'done', id: 1, payload: { kind: 'ack' } }
      expect(unwrapDone(event)).toBe(event)
    })
  })

  describe('variants', () => {
    it('carries the payload it was handed', () => {
      const event: ComputeEvent = {
        kind: 'done',
        id: 1,
        payload: { kind: 'political', result: POLITICAL },
      }
      expect(unwrapDone(event).payload.kind).toBe('political')
    })
  })

  describe('managed errors', () => {
    it('turns a compute-side failure back into an error, keeping its words', () => {
      expect(() => {
        unwrapDone({ kind: 'failed', id: 1, message: 'raster ran out of memory' })
      }).toThrow('raster ran out of memory')
    })
  })

  describe('unmanaged errors', () => {
    it('refuses an event that is neither a completion nor a failure', () => {
      // A progress event settling a call would mean the protocol itself went wrong, so it must not be
      // quietly treated as an answer.
      expect(() => {
        unwrapDone({ kind: 'progress', id: 1, fraction: 0.5, phase: 'bake' })
      }).toThrow('unexpected progress')
    })
  })

  describe('edge cases', () => {
    it('reports an empty failure message rather than inventing one', () => {
      expect(() => {
        unwrapDone({ kind: 'failed', id: 1, message: '' })
      }).toThrow(Error)
    })
  })
})

describe('mapComputeOver', () => {
  describe('happy path', () => {
    it('returns the political result the transport answered with', async () => {
      const { send } = answering((id) => ({
        kind: 'done',
        id,
        payload: { kind: 'political', result: POLITICAL },
      }))
      await expect(
        mapComputeOver(send, vi.fn()).computePolitical({
          regions: [],
          rasterScale: 1,
          snapToCoast: 0,
          colorBySuzerain: false,
          palette: [],
          borderSmoothing: 0,
        })
      ).resolves.toBe(POLITICAL)
    })
  })

  describe('variants', () => {
    it('builds a setSources command carrying the sources', async () => {
      const { send, sent } = answering((id) => ({ kind: 'done', id, payload: { kind: 'ack' } }))
      const sources = { heightmap: null, landMask: null } as unknown as Parameters<
        ReturnType<typeof mapComputeOver>['setSources']
      >[0]
      await mapComputeOver(send, vi.fn()).setSources(sources)
      expect(sent.mock.calls[0]?.[0]).toMatchObject({ kind: 'setSources', id: 7, sources })
    })

    it('returns the traced borders', async () => {
      const { send } = answering((id) => ({
        kind: 'done',
        id,
        payload: { kind: 'borders', borders: BORDERS },
      }))
      await expect(mapComputeOver(send, vi.fn()).deriveBorders(2)).resolves.toBe(BORDERS)
    })

    it('returns the baked pixels', async () => {
      const { send } = answering((id) => ({
        kind: 'done',
        id,
        payload: { kind: 'bake', result: BAKE },
      }))
      await expect(
        mapComputeOver(send, vi.fn()).bakeTerrain(
          {} as Parameters<ReturnType<typeof mapComputeOver>['bakeTerrain']>[0]
        )
      ).resolves.toBe(BAKE)
    })

    it('forwards a progress reporter only for the two calls that report', async () => {
      const { send, sent } = answering((id) => ({ kind: 'done', id, payload: { kind: 'ack' } }))
      const onProgress = vi.fn()
      const compute = mapComputeOver(send, vi.fn())
      await compute.clearPolitical()
      expect(sent.mock.calls[0]?.[1]).toBeUndefined()
      await compute
        .bakeTerrain({} as Parameters<typeof compute.bakeTerrain>[0], onProgress)
        .catch(() => undefined)
      expect(sent.mock.calls[1]?.[1]).toBe(onProgress)
    })

    it('returns the names placed, and refuses an answer of another kind', async () => {
      const NAMES = { levels: [], gridWidth: 1, gridHeight: 1, unnamed: [] }
      const named = answering((id) => ({
        kind: 'done',
        id,
        payload: { kind: 'names', names: NAMES },
      }))
      const request = {} as Parameters<ReturnType<typeof mapComputeOver>['placeYearNames']>[0]
      await expect(mapComputeOver(named.send, vi.fn()).placeYearNames(request)).resolves.toBe(NAMES)
      const acked = answering((id) => ({ kind: 'done', id, payload: { kind: 'ack' } }))
      await expect(mapComputeOver(acked.send, vi.fn()).placeYearNames(request)).rejects.toThrow(
        /answered a names request with ack/
      )
    })

    it('hands disposal straight to the transport', () => {
      const dispose = vi.fn()
      mapComputeOver(vi.fn(), dispose).dispose()
      expect(dispose).toHaveBeenCalledTimes(1)
    })
  })

  describe('managed errors', () => {
    it('rejects when the transport reports a failure', async () => {
      const { send } = answering((id) => ({ kind: 'failed', id, message: 'worker is gone' }))
      await expect(mapComputeOver(send, vi.fn()).clearPolitical()).rejects.toThrow('worker is gone')
    })
  })

  describe('unmanaged errors', () => {
    it('refuses a bake answered with borders rather than handing back the wrong shape', async () => {
      // The wire cannot be type-checked, so a protocol that drifted would otherwise surface as a
      // texture built from a border list — far from where the mistake was made.
      const { send } = answering((id) => ({
        kind: 'done',
        id,
        payload: { kind: 'borders', borders: BORDERS },
      }))
      await expect(
        mapComputeOver(send, vi.fn()).bakeTerrain(
          {} as Parameters<ReturnType<typeof mapComputeOver>['bakeTerrain']>[0]
        )
      ).rejects.toThrow('answered a bake request with borders')
    })

    it('refuses a political request answered with an acknowledgement', async () => {
      const { send } = answering((id) => ({ kind: 'done', id, payload: { kind: 'ack' } }))
      await expect(
        mapComputeOver(send, vi.fn()).computePolitical({
          regions: [],
          rasterScale: 1,
          snapToCoast: 0,
          colorBySuzerain: false,
          palette: [],
          borderSmoothing: 0,
        })
      ).rejects.toThrow('answered a political request with ack')
    })
  })

  describe('edge cases', () => {
    it('accepts an acknowledgement for the calls that expect no payload', async () => {
      const { send } = answering((id) => ({ kind: 'done', id, payload: { kind: 'ack' } }))
      await expect(mapComputeOver(send, vi.fn()).clearPolitical()).resolves.toBeUndefined()
    })
  })
})
