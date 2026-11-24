import { describe, expect, it, vi } from 'vitest'

import { createAtlasStore } from './atlasStore'
import { bridgeYear } from './yearBridge'

/** Node's process, which runs these tests — the atlas has no Node types, so only what is used is declared. */
const nodeProcess = (
  globalThis as unknown as {
    process: {
      on: (name: 'unhandledRejection', listener: (reason: unknown) => void) => void
      off: (name: 'unhandledRejection', listener: (reason: unknown) => void) => void
    }
  }
).process

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

/**
 * A map that draws the year it is set to when told, over a store started on 1100.
 * @returns the store, the map's year, how to finish, fail or throw the drawing in flight, and the unsubscription
 */
function setup() {
  const store = createAtlasStore()
  store.getState().started([1100, 1200, 1300], 1100)
  const map = { set: 1100, drawn: 1100 as number | null }
  const drawings: {
    finish: () => void
    failTold: () => void
    fail: (error: unknown) => void
  }[] = []
  const draw = vi.fn(
    () =>
      new Promise<void>((resolve, reject) => {
        const year = map.set
        drawings.push({
          finish: () => {
            map.drawn = year
            resolve()
          },
          // As `rebuildPolitical` fails: the failure told by its own notice, the promise resolved, nothing new drawn.
          failTold: resolve,
          fail: reject,
        })
      })
  )
  const setYear = vi.fn((year: number) => {
    map.set = year
  })
  const stop = bridgeYear({ store, setYear, draw, drawnYear: () => map.drawn })
  return { store, map, drawings, draw, setYear, stop }
}

// ATLAS-392: a year requested in the store is drawn on the map, and the request settled.
describe('bridgeYear', () => {
  describe('happy path', () => {
    it('sets and draws the year asked, then shows it and ends the request', async () => {
      const { store, drawings, setYear, draw } = setup()
      store.getState().requestYear(1200)
      expect(setYear).toHaveBeenCalledWith(1200)
      expect(draw).toHaveBeenCalledTimes(1)
      drawings[0]?.finish()
      await flush()
      expect(store.getState()).toMatchObject({ shownYear: 1200, requested: null })
    })
  })

  describe('variants', () => {
    it('draws nothing when a request ends — only a year asked starts a drawing', async () => {
      const { store, drawings, draw } = setup()
      store.getState().requestYear(1200)
      drawings[0]?.finish()
      await flush()
      expect(draw).toHaveBeenCalledTimes(1)
      expect(store.getState().requested).toBeNull()
    })
  })

  describe('managed errors', () => {
    it('ends a request whose drawing failed on the year still drawn — the map says the failure itself', async () => {
      const { store, drawings } = setup()
      store.getState().requestYear(1200)
      drawings[0]?.failTold()
      await flush()
      expect(store.getState()).toMatchObject({ shownYear: 1100, requested: null })
    })
  })

  describe('unmanaged errors', () => {
    it('ends the request on an unexpected rejection, then lets it through to the error net', async () => {
      const failure = new Error('drawing broke')
      const rejections: unknown[] = []
      const onRejection = (reason: unknown): void => {
        rejections.push(reason)
      }
      nodeProcess.on('unhandledRejection', onRejection)
      const { store, drawings } = setup()
      store.getState().requestYear(1200)
      drawings[0]?.fail(failure)
      await flush()
      await flush()
      nodeProcess.off('unhandledRejection', onRejection)
      expect(store.getState()).toMatchObject({ shownYear: 1100, requested: null })
      expect(rejections).toEqual([failure])
    })
  })

  describe('edge cases', () => {
    it('shows the newest year when a request overtakes one in flight, never the older', async () => {
      const { store, drawings } = setup()
      store.getState().requestYear(1200)
      store.getState().requestYear(1300)
      // The older drawing ends first, overtaken: the map is drawing 1300 meanwhile.
      drawings[0]?.finish()
      await flush()
      expect(store.getState()).toMatchObject({ shownYear: 1100, requested: { year: 1300 } })
      drawings[1]?.finish()
      await flush()
      expect(store.getState()).toMatchObject({ shownYear: 1300, requested: null })
    })

    it('draws a year requested again while it is drawn, with the tunables set since (review ARCH-002)', async () => {
      const { store, drawings, draw } = setup()
      store.getState().requestYear(1200)
      store.getState().requestYear(1200)
      expect(draw).toHaveBeenCalledTimes(2)
      drawings[0]?.finish()
      await flush()
      expect(store.getState().requested?.year).toBe(1200)
      drawings[1]?.finish()
      await flush()
      expect(store.getState()).toMatchObject({ shownYear: 1200, requested: null })
    })

    it('hears nothing more once stopped', () => {
      const { store, stop, draw } = setup()
      stop()
      store.getState().requestYear(1200)
      expect(draw).not.toHaveBeenCalled()
    })
  })
})
