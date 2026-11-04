import { afterEach, describe, expect, it, vi } from 'vitest'

import { copyPolities } from '@europe-historical-atlas/core/editor/clipboard'
import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'

import { CLIPBOARD_KEY, keepClipboard, keptClipboard } from './clipboardStorage'

import type { ClipboardStorage } from './clipboardStorage'
import type { ClipboardContent } from '@europe-historical-atlas/core/editor/clipboard'

/** A tab's storage, in memory. */
function memory(): ClipboardStorage & { held: Map<string, string> } {
  const held = new Map<string, string>()
  return {
    held,
    getItem: (key) => held.get(key) ?? null,
    setItem: (key, value) => {
      held.set(key, value)
    },
  }
}

/**
 * France copied from the shared-border fixture.
 * @returns the copy
 */
function france(): ClipboardContent {
  const copy = copyPolities(sharedBorderDocument(), ['fr-couronne'], '1100')
  if (copy === null) throw new Error('the fixture holds France')
  return copy
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('the clipboard kept in the tab', () => {
  describe('happy path', () => {
    it('gives back what was kept', () => {
      const storage = memory()
      keepClipboard(storage, france())

      expect(keptClipboard(storage)).toEqual(france())
    })
  })

  describe('variants', () => {
    it('gives it back at every reading, for as many maps as the author pastes into', () => {
      const storage = memory()
      keepClipboard(storage, france())
      keptClipboard(storage)

      expect(keptClipboard(storage)).toEqual(france())
    })

    it('holds nothing when nothing was copied', () => {
      expect(keptClipboard(memory())).toBeNull()
    })
  })

  describe('managed errors', () => {
    it('answers false, and says it, when the storage refuses the copy', () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const full: ClipboardStorage = {
        ...memory(),
        setItem: () => {
          throw new Error('QuotaExceededError')
        },
      }

      expect(keepClipboard(full, france())).toBe(false)
      expect(error).toHaveBeenCalledOnce()
    })

    it('holds nothing, said in the console, when what was kept is not a clipboard', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const storage = memory()
      storage.held.set(
        CLIPBOARD_KEY,
        JSON.stringify({ kind: 'polities', map: '1100', polities: [] })
      )

      expect(keptClipboard(storage)).toBeNull()
      expect(warn).toHaveBeenCalledOnce()
    })
  })

  describe('unmanaged errors', () => {
    it('holds nothing, said in the console, when what was kept is not even JSON', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const storage = memory()
      storage.held.set(CLIPBOARD_KEY, '{ not json')

      expect(keptClipboard(storage)).toBeNull()
      expect(warn).toHaveBeenCalledOnce()
    })
  })

  describe('edge cases', () => {
    it('keeps what it held when a later copy is refused', () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const storage = memory()
      keepClipboard(storage, france())
      const refusing: ClipboardStorage = {
        ...storage,
        setItem: () => {
          throw new Error('blocked')
        },
      }
      keepClipboard(refusing, france())

      expect(keptClipboard(storage)).toEqual(france())
    })
  })
})
