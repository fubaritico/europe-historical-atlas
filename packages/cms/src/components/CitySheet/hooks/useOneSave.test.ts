// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useOneSave } from './useOneSave'

describe('useOneSave', () => {
  describe('happy path', () => {
    it('runs a save and gives its answer', async () => {
      const { result } = renderHook(() => useOneSave())
      expect(await result.current.run(() => Promise.resolve(false))).toBe(false)
    })
  })

  describe('variants', () => {
    it('sends nothing for a second save while the first runs, and says it is busy', async () => {
      const { result } = renderHook(() => useOneSave())
      let release: (done: boolean) => void = () => undefined
      const first = result.current.run(
        () =>
          new Promise<boolean>((resolve) => {
            release = resolve
          })
      )
      const second = vi.fn(() => Promise.resolve(false))
      expect(result.current.busy()).toBe(true)
      expect(await result.current.run(second)).toBe(true)
      expect(second).not.toHaveBeenCalled()
      await act(async () => {
        release(true)
        await first
      })
      expect(result.current.busy()).toBe(false)
    })
  })

  describe('unmanaged errors', () => {
    it('lets a thrown save through, and is free again after it', async () => {
      const { result } = renderHook(() => useOneSave())
      await expect(result.current.run(() => Promise.reject(new Error('broken')))).rejects.toThrow(
        'broken'
      )
      expect(result.current.busy()).toBe(false)
    })
  })

  // L3: N/A — it handles no error, it only holds the second save; L5: covered by the busy case
})
