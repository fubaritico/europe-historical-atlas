import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useAdditionRefs } from './useAdditionRefs'

describe('useAdditionRefs', () => {
  describe('happy path', () => {
    it('says the dialogue open, and the item the form offers', () => {
      const { result } = renderHook(() => useAdditionRefs('Q272033'))

      expect(result.current.open.current).toBe(true)
      expect(result.current.offeredNow.current).toBe('Q272033')
    })
  })

  describe('variants', () => {
    it('follows the item the form offers from one render to the next', () => {
      const { result, rerender } = renderHook(({ offered }) => useAdditionRefs(offered), {
        initialProps: { offered: 'Q272033' },
      })

      rerender({ offered: 'Q1' })

      expect(result.current.offeredNow.current).toBe('Q1')
    })
  })

  // L3, L4: N/A — two refs and two effects; nothing can fail

  describe('edge cases', () => {
    it('says the dialogue closed once unmounted', () => {
      const { result, unmount } = renderHook(() => useAdditionRefs(null))
      const { open } = result.current

      unmount()

      expect(open.current).toBe(false)
    })

    it('says no item when the form offers none', () => {
      const { result } = renderHook(() => useAdditionRefs(null))

      expect(result.current.offeredNow.current).toBeNull()
    })
  })
})
