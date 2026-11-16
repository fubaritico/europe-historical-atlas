// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useLoadedBlock } from './useLoadedBlock'

import type { LoadedChain } from './useLoadedBlock'

const CHAIN: LoadedChain = {
  readings: [
    { titles: [{ id: 10, name: 'Mathias II — comté de Nantes' }], steps: [], end: 'unknown' },
  ],
  year: 1100,
}

/**
 * The block's loading over a holder and a year that can change.
 * @returns the hook's result, its filler and a way to change the holder or the year
 */
function setUp() {
  const fill = vi.fn()
  const view = renderHook(
    ({ holder, year }: { holder: number | string | null; year: number | null }) =>
      useLoadedBlock(holder, year, fill),
    { initialProps: { holder: 10 as number | string | null, year: 1100 } }
  )
  return { ...view, fill }
}

describe('useLoadedBlock', () => {
  describe('happy path', () => {
    it('loads a chain read into the block, and keeps it', () => {
      const { result, fill } = setUp()
      act(() => {
        result.current.load(CHAIN)
      })
      expect(result.current.loaded).toBe(CHAIN)
      expect(fill).toHaveBeenLastCalledWith(CHAIN)
    })
  })

  describe('variants', () => {
    // Review QUAL-001, 2026-11-16: the old title's lines were saved under the new one
    it('empties the block at once when another holder is chosen', () => {
      const { result, fill, rerender } = setUp()
      act(() => {
        result.current.load(CHAIN)
      })
      rerender({ holder: 99, year: 1100 })
      expect(result.current.loaded).toBeNull()
      expect(fill).toHaveBeenLastCalledWith(null)
    })

    it('empties the block at once when another year is typed', () => {
      const { result, rerender } = setUp()
      act(() => {
        result.current.load(CHAIN)
      })
      rerender({ holder: 10, year: 1101 })
      expect(result.current.loaded).toBeNull()
    })
  })

  // L3/L4: N/A — no write and no throw: it only holds what the block was loaded from

  describe('edge cases', () => {
    it('keeps the block through a render with the same holder and year — a read again after a save', () => {
      const { result, rerender } = setUp()
      act(() => {
        result.current.load(CHAIN)
      })
      rerender({ holder: 10, year: 1100 })
      expect(result.current.loaded).toBe(CHAIN)
    })
  })
})
