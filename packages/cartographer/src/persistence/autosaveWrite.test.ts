import { describe, expect, it, vi } from 'vitest'

import { openEmptyYear } from '../state/openEmptyYear'

import { writeCopyThenMap } from './autosaveWrite'

const PAGE = openEmptyYear(1100)

// The dev, 2026-11-02: the autosave copies are kept, and the map open saves as you go.
describe('writeCopyThenMap', () => {
  describe('happy path', () => {
    it('writes the autosave copy, then the map open', async () => {
      const order: string[] = []
      const write = writeCopyThenMap({
        saveCopy: vi.fn((_, map: string) => {
          order.push(`copy ${map}`)
          return Promise.resolve()
        }),
        saveMap: vi.fn(() => {
          order.push('map')
          return Promise.resolve()
        }),
      })
      await write(PAGE, '1100.autosave.2026-11-02T20-06-07')
      expect(order).toEqual(['copy 1100.autosave.2026-11-02T20-06-07', 'map'])
    })
  })

  // L2: N/A — one order.

  describe('managed errors', () => {
    it('writes no map when the copy fails, and rejects for the keeper to say it', async () => {
      const saveMap = vi.fn(() => Promise.resolve())
      const write = writeCopyThenMap({
        saveCopy: () => Promise.reject(new Error('disk full')),
        saveMap,
      })
      await expect(write(PAGE, 'copy')).rejects.toThrow('disk full')
      expect(saveMap).not.toHaveBeenCalled()
    })

    it('rejects when the map fails after the copy was written', async () => {
      const write = writeCopyThenMap({
        saveCopy: () => Promise.resolve(),
        saveMap: () => Promise.reject(new Error('changed on disk')),
      })
      await expect(write(PAGE, 'copy')).rejects.toThrow('changed on disk')
    })
  })

  // L4, L5: N/A — two awaited calls.
})
