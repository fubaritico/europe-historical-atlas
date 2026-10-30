// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { usePlaceSearch } from './usePlaceSearch'

import type { PlaceChoice } from '../utils/sheetValues'

/** Rome, as the base answers it. */
const rome: PlaceChoice = { id: 5, name: 'Rome' }

/** Rouen. */
const rouen: PlaceChoice = { id: 6, name: 'Rouen' }

afterEach(() => {
  vi.restoreAllMocks()
})

describe('usePlaceSearch', () => {
  describe('happy path', () => {
    it('offers what the base answers, and says it has answered only once it has', async () => {
      const { result } = renderHook(() => usePlaceSearch(() => Promise.resolve([rome])))
      act(() => {
        result.current.run('Ro')
      })
      expect(result.current.answered).toBe(false)
      await waitFor(() => {
        expect(result.current.answered).toBe(true)
      })
      await waitFor(() => {
        expect(result.current.matches).toEqual([rome])
      })
      expect(result.current.failed).toBe(false)
    })
  })

  describe('variants', () => {
    it('empties the list when the field is emptied', async () => {
      const { result } = renderHook(() => usePlaceSearch(() => Promise.resolve([rome])))
      act(() => {
        result.current.run('Ro')
      })
      await waitFor(() => {
        expect(result.current.matches).toEqual([rome])
      })
      act(() => {
        result.current.run('')
      })
      expect(result.current.matches).toEqual([])
    })
  })

  describe('managed errors', () => {
    it('says a failed search, then forgets it once the field is emptied', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { result } = renderHook(() =>
        usePlaceSearch(() => Promise.reject(new TypeError('Failed to fetch')))
      )
      act(() => {
        result.current.run('Ro')
      })
      await waitFor(() => {
        expect(result.current.failed).toBe(true)
      })
      expect(console.error).toHaveBeenCalledWith(
        '[CMS] the search for places failed',
        expect.any(TypeError)
      )
      act(() => {
        result.current.run('')
      })
      expect(result.current.failed).toBe(false)
    })
  })

  describe('unmanaged errors', () => {
    it('drops a failure that arrives after a newer search', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      let failFirst: (error: Error) => void = () => undefined
      const search = vi
        .fn<(query: string) => Promise<PlaceChoice[]>>()
        .mockImplementationOnce(() => new Promise((_resolve, reject) => (failFirst = reject)))
        .mockImplementationOnce(() => Promise.resolve([rouen]))
      const { result } = renderHook(() => usePlaceSearch(search))
      act(() => {
        result.current.run('R')
        result.current.run('Rou')
      })
      await waitFor(() => {
        expect(result.current.matches).toEqual([rouen])
      })
      await act(async () => {
        failFirst(new TypeError('late'))
        await Promise.resolve()
      })
      expect(result.current.failed).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('keeps the newest answer when an older one arrives late', async () => {
      let answerFirst: (places: PlaceChoice[]) => void = () => undefined
      const search = vi
        .fn<(query: string) => Promise<PlaceChoice[]>>()
        .mockImplementationOnce(() => new Promise((resolve) => (answerFirst = resolve)))
        .mockImplementationOnce(() => Promise.resolve([rouen]))
      const { result } = renderHook(() => usePlaceSearch(search))
      act(() => {
        result.current.run('R')
        result.current.run('Rou')
      })
      await waitFor(() => {
        expect(result.current.matches).toEqual([rouen])
      })
      await act(async () => {
        answerFirst([rome])
        await Promise.resolve()
      })
      expect(result.current.matches).toEqual([rouen])
    })
  })
})
