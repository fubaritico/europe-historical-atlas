import { describe, expect, it, vi } from 'vitest'

import { installSaveShortcut, isSaveKey } from './saveShortcut'

/** A key with no modifier, to override. */
const PLAIN = { key: 's', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false }

/** Press a key on a target, returning the event so its `defaultPrevented` can be read. */
function press(target: EventTarget, init: KeyboardEventInit): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { cancelable: true, ...init })
  target.dispatchEvent(event)
  return event
}

describe('isSaveKey', () => {
  describe('happy path', () => {
    it('reads ‹ctrl+S› as save', () => {
      expect(isSaveKey({ ...PLAIN, ctrlKey: true })).toBe(true)
    })
  })

  describe('variants', () => {
    it('reads ‹cmd+S› as save, and a capital S the same', () => {
      expect(isSaveKey({ ...PLAIN, metaKey: true })).toBe(true)
      expect(isSaveKey({ ...PLAIN, key: 'S', ctrlKey: true })).toBe(true)
    })
  })

  describe('managed errors', () => {
    it('leaves ‹ctrl+shift+S› to Save as, and ‹ctrl+alt+S› to the platform', () => {
      expect(isSaveKey({ ...PLAIN, ctrlKey: true, shiftKey: true })).toBe(false)
      expect(isSaveKey({ ...PLAIN, ctrlKey: true, altKey: true })).toBe(false)
    })
  })

  // L4: N/A — a pure reading of four booleans and a string.

  describe('edge cases', () => {
    it('ignores S alone and ‹ctrl› with another key', () => {
      expect(isSaveKey(PLAIN)).toBe(false)
      expect(isSaveKey({ ...PLAIN, key: 'z', ctrlKey: true })).toBe(false)
    })
  })
})

describe('installSaveShortcut', () => {
  describe('happy path', () => {
    it('saves on ‹ctrl+S› and keeps the browser’s Save page dialog away', () => {
      const target = new EventTarget()
      const onSave = vi.fn()
      installSaveShortcut(target as unknown as Window, onSave)
      const event = press(target, { key: 's', ctrlKey: true })

      expect(onSave).toHaveBeenCalledTimes(1)
      expect(event.defaultPrevented).toBe(true)
    })
  })

  describe('variants', () => {
    it('leaves every other key to its owner, unprevented', () => {
      const target = new EventTarget()
      const onSave = vi.fn()
      installSaveShortcut(target as unknown as Window, onSave)
      const event = press(target, { key: 'z', ctrlKey: true })

      expect(onSave).not.toHaveBeenCalled()
      expect(event.defaultPrevented).toBe(false)
    })
  })

  // L3: N/A — nothing is refused; the session behind `onSave` says why a save cannot happen.
  // L4: N/A — no async work and no collaborator but the target.

  describe('edge cases', () => {
    it('saves once while the key is held, still refusing the dialog on each repetition', () => {
      const target = new EventTarget()
      const onSave = vi.fn()
      installSaveShortcut(target as unknown as Window, onSave)
      press(target, { key: 's', ctrlKey: true })
      const repeated = press(target, { key: 's', ctrlKey: true, repeat: true })

      expect(onSave).toHaveBeenCalledTimes(1)
      expect(repeated.defaultPrevented).toBe(true)
    })

    it('stops listening once removed', () => {
      const target = new EventTarget()
      const onSave = vi.fn()
      const stop = installSaveShortcut(target as unknown as Window, onSave)
      stop()
      press(target, { key: 's', ctrlKey: true })

      expect(onSave).not.toHaveBeenCalled()
    })
  })
})
