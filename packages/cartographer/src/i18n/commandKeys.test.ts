import { describe, expect, it } from 'vitest'

import { COMMAND_KEYS, shortcutText } from './commandKeys'

describe('commandKeys', () => {
  describe('happy path', () => {
    it('writes a command’s shortcut for the system and the language', () => {
      expect(shortcutText('pasteSheet', 'other', 'fr')).toEqual({
        shown: 'Ctrl+Maj+V',
        aria: 'Meta+Shift+V Control+Shift+V',
      })
    })
  })

  describe('variants', () => {
    it('writes it in the Mac’s symbols on a Mac', () => {
      expect(shortcutText('pasteSheet', 'mac', 'fr').shown).toBe('⇧⌘V')
    })
  })

  // L3: N/A — a table of literals and one function over it; nothing is refused.
  // L4: N/A — nothing is read from outside.

  describe('edge cases', () => {
    it('gives no two commands the same chord, which would make two listeners answer one key', () => {
      // The whole chord, never the key alone: save, saveAs, undo and redo share their keys by design.
      const chords = Object.values(COMMAND_KEYS).map((chord) =>
        JSON.stringify({
          key: chord.key.toLowerCase(),
          command: 'command' in chord,
          shift: 'shift' in chord,
          alt: 'alt' in chord,
        })
      )

      expect(new Set(chords).size).toBe(chords.length)
    })
  })
})
