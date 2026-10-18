import { describe, expect, it, vi } from 'vitest'

import { createSnapshotPicker } from './snapshotPicker'

describe('createSnapshotPicker', () => {
  describe('happy path', () => {
    it('starts closed, opens, and closes', () => {
      const picker = createSnapshotPicker()
      expect(picker.isOpen()).toBe(false)

      picker.open()
      expect(picker.isOpen()).toBe(true)

      picker.close()
      expect(picker.isOpen()).toBe(false)
    })

    it('tells a listener of each opening and closing', () => {
      const picker = createSnapshotPicker()
      const listener = vi.fn()
      picker.subscribe(listener)

      picker.open()
      picker.close()

      expect(listener).toHaveBeenCalledTimes(2)
    })
  })

  describe('variants', () => {
    it('tells every listener', () => {
      const picker = createSnapshotPicker()
      const first = vi.fn()
      const second = vi.fn()
      picker.subscribe(first)
      picker.subscribe(second)

      picker.open()

      expect(first).toHaveBeenCalledOnce()
      expect(second).toHaveBeenCalledOnce()
    })

    it('stops telling a listener once it unsubscribes', () => {
      const picker = createSnapshotPicker()
      const listener = vi.fn()
      const unsubscribe = picker.subscribe(listener)

      unsubscribe()
      picker.open()

      expect(listener).not.toHaveBeenCalled()
    })

    it('keeps two pickers apart', () => {
      const one = createSnapshotPicker()
      const other = createSnapshotPicker()

      one.open()

      expect(other.isOpen()).toBe(false)
    })
  })

  // L3: N/A — opening and closing cannot fail; there is nothing to refuse.
  // L4: N/A — no input, no collaborator, nothing asynchronous.

  describe('edge cases', () => {
    it('tells no one when opened while open, or closed while closed', () => {
      const picker = createSnapshotPicker()
      const listener = vi.fn()
      picker.subscribe(listener)

      picker.close()
      picker.open()
      picker.open()

      expect(listener).toHaveBeenCalledOnce()
      expect(picker.isOpen()).toBe(true)
    })

    it('leaves the others listening when one unsubscribes twice', () => {
      const picker = createSnapshotPicker()
      const kept = vi.fn()
      const unsubscribe = picker.subscribe(vi.fn())
      picker.subscribe(kept)

      unsubscribe()
      unsubscribe()
      picker.open()

      expect(kept).toHaveBeenCalledOnce()
    })
  })
})
