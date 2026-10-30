// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { usePlaceSheets } from './usePlaceSheets'

import type { SavedSheet } from '../../../fields/sheetOverlap'

/** Rome's saved sheet. */
const rome: SavedSheet = { id: 1, date: { start: { year: 1100 } } }

/** Paris's. */
const paris: SavedSheet = { id: 2, date: { start: { year: 1100 } } }

/**
 * Reads Rome's sheets.
 * @returns them
 */
function readRome(): Promise<SavedSheet[]> {
  return Promise.resolve([rome])
}

/**
 * A read that fails, as an unreachable server's.
 * @returns the rejection
 */
function readFails(): Promise<SavedSheet[]> {
  return Promise.reject(new TypeError('Failed to fetch'))
}

afterEach(() => {
  vi.restoreAllMocks()
})

// Each test hands the hook one `read` for its whole life, as the form does (`useOverlapCheck`, a `useCallback`): a new
// function at each render would read again at each render, without end.
describe('usePlaceSheets', () => {
  describe('happy path', () => {
    it('reads the chosen place’s sheets', async () => {
      const { result } = renderHook(() => usePlaceSheets(5, readRome))
      await waitFor(() => {
        expect(result.current).toEqual({ kind: 'read', place: 5, sheets: [rome] })
      })
    })
  })

  describe('variants', () => {
    it('reads nothing while no place is chosen', () => {
      const read = vi.fn(() => Promise.resolve([rome]))
      const { result } = renderHook(() => usePlaceSheets(null, read))
      expect(result.current).toEqual({ kind: 'none' })
      expect(read).not.toHaveBeenCalled()
    })
  })

  describe('managed errors', () => {
    it('says a failed read in the console and hands it back as failed', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { result } = renderHook(() => usePlaceSheets(5, readFails))
      await waitFor(() => {
        expect(result.current).toEqual({ kind: 'failed' })
      })
      expect(console.error).toHaveBeenCalledWith(
        "[CMS] the place's sheets could not be read; the overlap is checked at save",
        expect.any(TypeError)
      )
    })
  })

  describe('unmanaged errors', () => {
    it('drops the answer for a place left behind', async () => {
      let answerRome: (sheets: SavedSheet[]) => void = () => undefined
      const read = vi.fn((place: number | string) =>
        place === 5
          ? new Promise<SavedSheet[]>((resolve) => (answerRome = resolve))
          : Promise.resolve([paris])
      )
      const { result, rerender } = renderHook(({ place }) => usePlaceSheets(place, read), {
        initialProps: { place: 5 as number | string | null },
      })
      rerender({ place: 6 })
      await waitFor(() => {
        expect(result.current).toEqual({ kind: 'read', place: 6, sheets: [paris] })
      })
      answerRome([rome])
      await Promise.resolve()
      expect(result.current).toEqual({ kind: 'read', place: 6, sheets: [paris] })
    })
  })

  describe('edge cases', () => {
    it('forgets the sheets once the place is removed', async () => {
      const { result, rerender } = renderHook(({ place }) => usePlaceSheets(place, readRome), {
        initialProps: { place: 5 as number | string | null },
      })
      await waitFor(() => {
        expect(result.current.kind).toBe('read')
      })
      rerender({ place: null })
      expect(result.current).toEqual({ kind: 'none' })
    })
  })
})
