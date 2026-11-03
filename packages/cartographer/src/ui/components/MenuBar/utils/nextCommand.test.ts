import { describe, expect, it } from 'vitest'

import { nextCommand } from './nextCommand'

import type { MenuEntry } from '../menuBarProps'

/**
 * A command line.
 * @param id - its id
 * @param enabled - whether it can act
 * @returns the line
 */
function command(id: string, enabled = true): MenuEntry {
  return { kind: 'command', id, label: id, keys: null, enabled, onChoose: () => undefined }
}

const MENU: readonly MenuEntry[] = [
  command('undo'),
  command('redo', false),
  { kind: 'separator', id: 'history' },
  command('copy'),
  command('paste'),
]

describe('nextCommand', () => {
  describe('happy path', () => {
    it('moves down to the next command that can act, over a greyed one and a separator', () => {
      expect(nextCommand(MENU, 'undo', 1)).toBe('copy')
    })
  })

  describe('variants', () => {
    it('moves up', () => {
      expect(nextCommand(MENU, 'paste', -1)).toBe('copy')
    })

    it('goes round from the last to the first', () => {
      expect(nextCommand(MENU, 'paste', 1)).toBe('undo')
    })

    it('goes round from the first to the last', () => {
      expect(nextCommand(MENU, 'undo', -1)).toBe('paste')
    })

    it('goes to the first and to the last', () => {
      expect([nextCommand(MENU, 'copy', 'first'), nextCommand(MENU, 'copy', 'last')]).toEqual([
        'undo',
        'paste',
      ])
    })

    it('starts at the first going down and at the last going up when none is focused', () => {
      expect([nextCommand(MENU, null, 1), nextCommand(MENU, null, -1)]).toEqual(['undo', 'paste'])
    })
  })

  describe('managed errors', () => {
    it('answers nothing for a menu where nothing can act', () => {
      expect(nextCommand([command('a', false), { kind: 'separator', id: 's' }], null, 1)).toBeNull()
    })

    it('starts over when the line focused is a greyed one', () => {
      expect(nextCommand(MENU, 'redo', 1)).toBe('undo')
    })
  })

  // L4: N/A — a pure function over a literal list.

  describe('edge cases', () => {
    it('stays on the one command of a menu holding one', () => {
      expect(nextCommand([command('only')], 'only', 1)).toBe('only')
    })
  })
})
