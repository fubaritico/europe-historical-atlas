import { afterEach, describe, expect, it, vi } from 'vitest'

import { RETRY_CEILING_MS, createMapBuffer, retryDelayMs } from './mapBuffer'

import type { MapBufferDeps } from './mapBuffer'
import type { PrepareOutcome } from './stages/prepareAside'

const YEARS = [800, 1000, 1100, 1200, 1300]

/** Let every pending promise run. */
async function settle(): Promise<void> {
  for (let i = 0; i < 20; i++) await Promise.resolve()
}

/**
 * A buffer over stand-ins: preparing answers the outcomes queued per year, `ready` once they run out.
 * @param outcomes - the outcomes to answer, per year, in order
 * @returns the buffer and its spies
 */
function buffer(outcomes: Record<number, PrepareOutcome[]> = {}) {
  const prepared: number[] = []
  const slept: number[] = []
  const deps: MapBufferDeps = {
    years: YEARS,
    prepare: vi.fn((year: number): Promise<PrepareOutcome> => {
      prepared.push(year)
      return Promise.resolve(outcomes[year]?.shift() ?? { kind: 'ready' })
    }),
    keepOnly: vi.fn(),
    whenQuiet: () => Promise.resolve(),
    sleep: (ms) => {
      slept.push(ms)
      return Promise.resolve()
    },
  }
  return { map: createMapBuffer(deps), deps, prepared, slept }
}

afterEach(() => {
  vi.restoreAllMocks()
})

// ATLAS-333, the dev, 2026-11-08 evening: three maps, like a video player's buffer.
describe('createMapBuffer', () => {
  describe('happy path', () => {
    it('keeps the map shown and its two neighbours, and prepares the next one first', async () => {
      const { map, deps, prepared } = buffer()
      map.shown(1100)
      await settle()
      expect(deps.keepOnly).toHaveBeenCalledWith([1100, 1200, 1000])
      expect(prepared).toEqual([1200, 1000])
    })
  })

  describe('variants', () => {
    it('prepares the one before first when the reader went back', async () => {
      const { map, prepared } = buffer()
      map.shown(1200)
      await settle()
      prepared.length = 0
      map.shown(1100)
      await settle()
      expect(prepared).toEqual([1000, 1200])
    })

    it('keeps one neighbour at the first map', async () => {
      const { map, deps } = buffer()
      map.shown(800)
      await settle()
      expect(deps.keepOnly).toHaveBeenCalledWith([800, 1000])
    })

    it('tries again a map the busy map put off, after the other neighbour, saying so once', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const busy: PrepareOutcome = { kind: 'later', why: 'busy' }
      const { map, prepared, slept } = buffer({ 1200: [busy, busy] })
      map.shown(1100)
      await settle()
      expect([prepared, slept, warn.mock.calls.length]).toEqual([
        [1200, 1000, 1200, 1200],
        [1000, 1000],
        1,
      ])
    })

    // Reviews QUAL-003, ARCH-001: a neighbour failing for the network never holds the other one back.
    it('prepares the other neighbour while the first waits to be tried again', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const network: PrepareOutcome = { kind: 'failed', recoverable: true, error: new TypeError() }
      const { map, prepared } = buffer({ 1200: [network] })
      map.shown(1100)
      await settle()
      expect(prepared).toEqual([1200, 1000, 1200])
    })

    it('stops preparing the old window once another map is shown', async () => {
      const { map, prepared } = buffer({ 1200: [{ kind: 'later', why: 'busy' }] })
      map.shown(1100)
      map.shown(1300)
      await settle()
      expect(prepared).not.toContain(1000)
    })
  })

  describe('managed errors', () => {
    it('tries a recoverable failure again until it works, waiting longer each time', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const network: PrepareOutcome = { kind: 'failed', recoverable: true, error: new TypeError() }
      const { map, prepared, slept } = buffer({ 1200: [network, network, network] })
      map.shown(1100)
      await settle()
      expect([prepared.filter((y) => y === 1200).length, slept]).toEqual([4, [1000, 2000, 4000]])
    })

    it('gives up an irreversible failure at once, said in the console, and goes on', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const absent: PrepareOutcome = { kind: 'failed', recoverable: false, error: new Error('404') }
      const { map, prepared, slept } = buffer({ 1200: [absent] })
      map.shown(1100)
      await settle()
      expect([prepared, slept, error.mock.calls.length]).toEqual([[1200, 1000], [], 1])
    })

    it('never tries again a map given up, when the reader comes back near it', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const absent: PrepareOutcome = { kind: 'failed', recoverable: false, error: new Error('404') }
      const { map, prepared } = buffer({ 1200: [absent] })
      map.shown(1100)
      await settle()
      map.shown(1300)
      await settle()
      expect(prepared.filter((year) => year === 1200)).toEqual([1200])
    })

    it('says a map that cannot be prepared ahead, and goes on', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { map, prepared } = buffer({ 1200: [{ kind: 'skipped', why: 'painted' }] })
      map.shown(1100)
      await settle()
      expect([prepared, warn.mock.calls[0]?.[0]]).toEqual([
        [1200, 1000],
        '[atlas] the map of 1200 is not prepared ahead: painted.',
      ])
    })
  })

  describe('unmanaged errors', () => {
    it('gives up a map whose preparation throws, as irreversible', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { map, deps } = buffer()
      vi.mocked(deps.prepare).mockRejectedValueOnce(new Error('defect'))
      map.shown(1100)
      await settle()
      const asked = vi.mocked(deps.prepare).mock.calls.map(([year]) => year)
      expect([asked, error.mock.calls.length]).toEqual([[1200, 1000], 1])
    })
  })

  describe('edge cases', () => {
    it('prepares nothing once disposed', async () => {
      const { map, prepared } = buffer({ 1200: [{ kind: 'later', why: 'busy' }] })
      map.shown(1100)
      map.dispose()
      await settle()
      expect(prepared).toEqual([])
    })

    it('waits at most thirty seconds between two tries', () => {
      expect([retryDelayMs(1), retryDelayMs(5), retryDelayMs(6), retryDelayMs(40)]).toEqual([
        1000,
        16000,
        RETRY_CEILING_MS,
        RETRY_CEILING_MS,
      ])
    })
  })
})
