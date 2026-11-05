import { describe, expect, it, vi } from 'vitest'

import { createHeldClipboard } from './heldClipboard'

import type { ClipboardContent } from '@europe-historical-atlas/core/editor/clipboard'

const STRETCH: ClipboardContent = {
  kind: 'points',
  map: '1100',
  polity: 'Kingdom of Poland',
  pieces: [
    {
      closed: false,
      points: [
        { at: [18, 52], provenance: { name: 'reported by eye', licence: 'fact' } },
        { at: [19, 52], provenance: { name: 'reported by eye', licence: 'fact' } },
      ],
    },
  ],
}

describe('createHeldClipboard', () => {
  describe('happy path', () => {
    it('holds what the tab’s storage held as the page opened', () => {
      expect(createHeldClipboard(STRETCH, () => true).get()).toBe(STRETCH)
    })

    it('keeps a new copy in the tab, holds it and tells who listens', () => {
      const keep = vi.fn(() => true)
      const held = createHeldClipboard(null, keep)
      const listener = vi.fn()
      held.subscribe(listener)

      expect(held.hold(STRETCH)).toBe(true)
      expect(keep).toHaveBeenCalledWith(STRETCH)
      expect(held.get()).toBe(STRETCH)
      expect(listener).toHaveBeenCalledTimes(1)
    })
  })

  describe('variants', () => {
    it('holds nothing when the tab’s storage held nothing', () => {
      expect(createHeldClipboard(null, () => true).get()).toBeNull()
    })
  })

  describe('managed errors', () => {
    it('keeps what it held, and tells nobody, when the tab’s storage refuses the copy', () => {
      const held = createHeldClipboard(null, () => false)
      const listener = vi.fn()
      held.subscribe(listener)

      expect(held.hold(STRETCH)).toBe(false)
      expect(held.get()).toBeNull()
      expect(listener).not.toHaveBeenCalled()
    })
  })

  // L4: N/A — a value and its listeners; the storage's own failures are clipboardStorage's.

  describe('edge cases', () => {
    it('tells nothing more to a listener that stopped listening', () => {
      const held = createHeldClipboard(null, () => true)
      const listener = vi.fn()
      held.subscribe(listener)()
      held.hold(STRETCH)

      expect(listener).not.toHaveBeenCalled()
    })
  })
})
