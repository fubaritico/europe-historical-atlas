// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useVassalChain } from './useVassalChain'

import type { ChainReading } from '../utils/readVassalChain'

const READING: ChainReading[] = [
  { titles: [{ id: '10', name: 'Mathias II — comté de Nantes' }], end: 'unknown' },
]

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useVassalChain', () => {
  describe('happy path', () => {
    it('reads the chain of the title at the year', async () => {
      const read = vi.fn(() => Promise.resolve(READING))
      const { result } = renderHook(() => useVassalChain(10, 1100, read))
      await waitFor(() => {
        expect(result.current).toEqual({ kind: 'read', year: 1100, readings: READING })
      })
      expect(read).toHaveBeenCalledWith(10, 1100)
    })
  })

  describe('variants', () => {
    it('reads nothing while no title is chosen', () => {
      const read = vi.fn(() => Promise.resolve(READING))
      const { result } = renderHook(() => useVassalChain(null, 1100, read))
      expect(result.current).toEqual({ kind: 'none' })
      expect(read).not.toHaveBeenCalled()
    })

    it('waits for a year before reading', () => {
      const read = vi.fn(() => Promise.resolve(READING))
      const { result } = renderHook(() => useVassalChain(10, null, read))
      expect(result.current).toEqual({ kind: 'no-year' })
      expect(read).not.toHaveBeenCalled()
    })
  })

  describe('managed errors', () => {
    it('says a failed read, and logs it', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const read = vi.fn(() => Promise.reject(new Error('refused')))
      const { result } = renderHook(() => useVassalChain(10, 1100, read))
      await waitFor(() => {
        expect(result.current).toEqual({ kind: 'failed' })
      })
      expect(error).toHaveBeenCalledWith(
        '[CMS] the chain of vassalage could not be read',
        expect.any(Error)
      )
    })
  })

  // L4: the read's own failures are the managed error above; nothing else in the hook can throw.

  describe('edge cases', () => {
    it('reads once the typing of the year stops, saying « loading » at once', async () => {
      const read = vi.fn(() => Promise.resolve(READING))
      const { result, rerender } = renderHook(({ year }) => useVassalChain(10, year, read), {
        initialProps: { year: 1 },
      })
      rerender({ year: 11 })
      rerender({ year: 110 })
      rerender({ year: 1100 })
      expect(result.current).toEqual({ kind: 'loading' })
      await waitFor(() => {
        expect(result.current).toEqual({ kind: 'read', year: 1100, readings: READING })
      })
      expect(read.mock.calls).toEqual([[10, 1100]])
    })

    it('keeps the newest answer when an older one arrives late', async () => {
      let late: (readings: ChainReading[]) => void = () => undefined
      const older = new Promise<ChainReading[]>((resolve) => {
        late = resolve
      })
      const newer: ChainReading[] = [
        { titles: [{ id: '20', name: 'Alain IV — duché de Bretagne' }], end: 'sovereign' },
      ]
      const read = vi.fn((title: number | string) =>
        title === 10 ? older : Promise.resolve(newer)
      )
      const { result, rerender } = renderHook(({ title }) => useVassalChain(title, 1100, read), {
        initialProps: { title: 10 as number | string },
      })
      rerender({ title: 20 })
      await waitFor(() => {
        expect(result.current).toEqual({ kind: 'read', year: 1100, readings: newer })
      })
      late(READING)
      await Promise.resolve()
      expect(result.current).toEqual({ kind: 'read', year: 1100, readings: newer })
    })
  })
})
