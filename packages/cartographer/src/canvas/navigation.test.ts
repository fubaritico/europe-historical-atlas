import { describe, expect, it } from 'vitest'

import { historyKey } from './navigation'

/** A key with no modifier, to spread modifiers over. */
const PLAIN = { key: 'z', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false }

describe('historyKey', () => {
  describe('happy path', () => {
    // s03 — ‹ctrl+z› undoes, ‹ctrl+shift+z› redoes.
    it('reads ‹ctrl+Z› as undo and ‹ctrl+shift+Z› as redo', () => {
      expect(historyKey({ ...PLAIN, ctrlKey: true })).toBe('undo')
      expect(historyKey({ ...PLAIN, key: 'Z', ctrlKey: true, shiftKey: true })).toBe('redo')
    })
  })

  describe('variants', () => {
    // s03 — "On a Mac the shortcut is ‹cmd+z›".
    it('takes ‹cmd› for ‹ctrl›', () => {
      expect(historyKey({ ...PLAIN, metaKey: true })).toBe('undo')
      expect(historyKey({ ...PLAIN, key: 'Z', metaKey: true, shiftKey: true })).toBe('redo')
    })
  })

  describe('managed errors', () => {
    it('reads a bare Z as nothing — the history needs its modifier', () => {
      expect(historyKey(PLAIN)).toBeNull()
      expect(historyKey({ ...PLAIN, shiftKey: true })).toBeNull()
    })
  })

  describe('unmanaged errors', () => {
    // Held with ‹alt›, the key is the platform's.
    it('reads a key held with ‹alt› as nothing', () => {
      expect(historyKey({ ...PLAIN, ctrlKey: true, altKey: true })).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('reads another modified letter as nothing', () => {
      expect(historyKey({ ...PLAIN, key: 'y', ctrlKey: true })).toBeNull()
    })
  })
})
