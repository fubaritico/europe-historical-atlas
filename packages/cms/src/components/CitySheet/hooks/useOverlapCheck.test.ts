// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useOverlapCheck } from './useOverlapCheck'

import type { SavedSheet } from '../../../fields/sheetOverlap'

/** Rome's saved sheet, « vers 1100 ». */
const rome: SavedSheet = { id: 1, date: { start: { year: 1100, circa: true } } }

describe('useOverlapCheck', () => {
  describe('happy path', () => {
    it('hands the check for the place whose sheets were read, in the server’s words', () => {
      const { result } = renderHook(() => useOverlapCheck('/api', 'fr', undefined))
      act(() => {
        result.current.onSheets({ kind: 'read', place: 5, sheets: [rome] })
      })
      const check = result.current.current(5)
      expect(check?.saved).toEqual([rome])
      expect(
        check?.refusal('Rome', {
          kind: 'instant',
          at: { year: 1100, month: null, day: null, calendar: null, circa: true, margin: null },
        })
      ).toMatch(/^Rome a déjà une fiche pour vers 1100\./)
    })
  })

  describe('variants', () => {
    it('carries this sheet’s id, so it is not compared with itself', () => {
      const { result } = renderHook(() => useOverlapCheck('/api', 'fr', 1))
      act(() => {
        result.current.onSheets({ kind: 'read', place: 5, sheets: [rome] })
      })
      expect(result.current.current(5)?.ownId).toBe(1)
    })
  })

  describe('managed errors', () => {
    it('hands no check while the sheets are not read, or could not be', () => {
      const { result } = renderHook(() => useOverlapCheck('/api', 'fr', undefined))
      expect(result.current.current(5)).toBeUndefined()
      act(() => {
        result.current.onSheets({ kind: 'failed' })
      })
      expect(result.current.current(5)).toBeUndefined()
    })
  })

  describe('unmanaged errors', () => {
    // Between a change of place and the read of its sheets, the validation runs against what it has: never the
    // sheets of the place just left.
    it('hands no check for a place other than the one whose sheets were read', () => {
      const { result } = renderHook(() => useOverlapCheck('/api', 'fr', undefined))
      act(() => {
        result.current.onSheets({ kind: 'read', place: 5, sheets: [rome] })
      })
      expect(result.current.current(6)).toBeUndefined()
      expect(result.current.current(null)).toBeUndefined()
    })
  })

  describe('edge cases', () => {
    it('takes a place id given as text for the same place', () => {
      const { result } = renderHook(() => useOverlapCheck('/api', 'fr', undefined))
      act(() => {
        result.current.onSheets({ kind: 'read', place: 5, sheets: [rome] })
      })
      expect(result.current.current('5')?.saved).toEqual([rome])
    })
  })
})
