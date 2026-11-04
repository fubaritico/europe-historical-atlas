import { describe, expect, it } from 'vitest'

import { ariaShortcut, isChord, platformOf, shortcutLabel } from './shortcuts'

import type { PressedKey } from './shortcuts'

/**
 * A key pressed, nothing held unless said.
 * @param key - `KeyboardEvent.key`
 * @param held - the modifiers and the code
 * @returns the key
 */
function pressed(key: string, held: Partial<PressedKey> = {}): PressedKey {
  return {
    key,
    code: `Key${key.toUpperCase()}`,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    ...held,
  }
}

describe('shortcuts', () => {
  describe('happy path', () => {
    it('writes a shortcut in the Mac’s symbols on a Mac', () => {
      expect(shortcutLabel({ key: 'v', command: true, shift: true }, 'mac', 'fr')).toBe('⇧⌘V')
    })

    it('writes it in words joined by « + » elsewhere, in French', () => {
      expect(shortcutLabel({ key: 'v', command: true, shift: true }, 'other', 'fr')).toBe(
        'Ctrl+Maj+V'
      )
    })

    it('hears ‹cmd+C› as copy', () => {
      expect(isChord(pressed('c', { metaKey: true }), { key: 'c', command: true })).toBe(true)
    })
  })

  describe('variants', () => {
    it('writes the modifiers in Apple’s order, ⌥ then ⇧ then ⌘', () => {
      expect(shortcutLabel({ key: 'v', command: true, shift: true, alt: true }, 'mac', 'en')).toBe(
        '⌥⇧⌘V'
      )
    })

    it('writes ‹ctrl› first, then ‹alt›, then ‹shift›, in English', () => {
      expect(
        shortcutLabel({ key: 'v', command: true, shift: true, alt: true }, 'other', 'en')
      ).toBe('Ctrl+Alt+Shift+V')
    })

    it('writes an arrow as its glyph', () => {
      expect(shortcutLabel({ key: 'ArrowUp', command: true }, 'mac', 'fr')).toBe('⌘↑')
    })

    it('hears ‹ctrl+C› as copy too, the other system’s modifier', () => {
      expect(isChord(pressed('c', { ctrlKey: true }), { key: 'c', command: true })).toBe(true)
    })

    it('hears ‹cmd› and ‹ctrl› held together as the one command modifier', () => {
      expect(
        isChord(pressed('c', { metaKey: true, ctrlKey: true }), { key: 'c', command: true })
      ).toBe(true)
    })

    it('hears ‹cmd+Z› by its character on an AZERTY keyboard, whose place is « KeyW »', () => {
      expect(
        isChord(pressed('z', { metaKey: true, code: 'KeyW' }), { key: 'z', command: true })
      ).toBe(true)
    })

    it('hears ‹alt+cmd+V› on a Mac by its place, the character being « √ »', () => {
      const event = pressed('√', { metaKey: true, altKey: true, code: 'KeyV' })

      expect(isChord(event, { key: 'v', command: true, alt: true })).toBe(true)
    })

    it('tells a screen reader both systems’ forms', () => {
      expect(ariaShortcut({ key: 'v', command: true, shift: true })).toBe(
        'Meta+Shift+V Control+Shift+V'
      )
    })

    it('tells it one form when the chord holds no command', () => {
      expect(ariaShortcut({ key: 'Delete' })).toBe('Delete')
    })

    it('reads a Mac from the browser’s newer field', () => {
      expect(platformOf({ userAgentData: { platform: 'macOS' } })).toBe('mac')
    })

    it('reads a Mac from the older field when the newer one is absent', () => {
      expect(platformOf({ platform: 'MacIntel' })).toBe('mac')
    })

    it('reads anything else as another system', () => {
      expect(platformOf({ userAgentData: { platform: 'Windows' } })).toBe('other')
    })
  })

  describe('managed errors', () => {
    it('answers nothing when the browser says nothing of its system', () => {
      expect(platformOf({})).toBeNull()
    })

    it('answers nothing when the browser says an empty name', () => {
      expect(platformOf({ platform: '' })).toBeNull()
    })
  })

  // L4: N/A — pure functions over plain values; nothing can be missing that the types do not already say.

  describe('edge cases', () => {
    it('does not hear ‹shift+cmd+C› as ‹cmd+C›', () => {
      expect(
        isChord(pressed('C', { metaKey: true, shiftKey: true }), { key: 'c', command: true })
      ).toBe(false)
    })

    it('does not hear ‹C› alone as ‹cmd+C›', () => {
      expect(isChord(pressed('c'), { key: 'c', command: true })).toBe(false)
    })

    it('does not hear the key placed at V without ‹alt› when its character is another', () => {
      // An AZERTY ‹cmd+W› sits where QWERTY has Z: the place alone must not answer for a command without ‹alt›.
      expect(
        isChord(pressed('w', { metaKey: true, code: 'KeyZ' }), { key: 'z', command: true })
      ).toBe(false)
    })
  })
})
