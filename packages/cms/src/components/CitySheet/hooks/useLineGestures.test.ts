// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useLineGestures } from './useLineGestures'

import type { PendingLine } from '../utils/pendingLine'

/**
 * A line in the base, its suzerain the title 20.
 * @param key - its key and link
 * @param link - its link; absent for a line being entered
 * @returns the line
 */
function line(key: string, link?: string): PendingLine {
  return {
    key,
    ...(link === undefined ? {} : { link }),
    suzerain: 20,
    source: null,
    status: { kind: 'filling' },
    sovereign: false,
    wasSovereign: false,
  }
}

/**
 * The gestures over these lines, keeping what they set.
 * @param lines - the block's lines
 * @param busy - whether a save is running
 * @returns the gestures, and the lines and links as set
 */
function setUp(lines: readonly PendingLine[], busy = false) {
  const kept = { lines, removed: [] as readonly string[] }
  const setLines = vi.fn((change: (current: readonly PendingLine[]) => readonly PendingLine[]) => {
    kept.lines = change(kept.lines)
  })
  const setRemoved = vi.fn((change: (current: readonly string[]) => readonly string[]) => {
    kept.removed = change(kept.removed)
  })
  const { result } = renderHook(() =>
    useLineGestures({ lines, setLines, setRemoved, busy: () => busy })
  )
  return { gestures: result.current, kept, setLines }
}

describe('useLineGestures', () => {
  describe('happy path', () => {
    it('adds an empty line above the last', () => {
      const { gestures, kept } = setUp([line('a', '7')])
      gestures.add()
      expect(kept.lines).toHaveLength(2)
      expect(kept.lines[1]?.suzerain).toBeNull()
    })
  })

  describe('variants', () => {
    it('closes a line and those above it, its link to remove at « Enregistrer »', () => {
      const { gestures, kept } = setUp([line('a', '7'), line('b', '8')])
      gestures.remove('a')
      expect(kept.lines).toEqual([])
      expect(kept.removed).toEqual(['7'])
    })

    it('closes a line being entered with no link to remove', () => {
      const { gestures, kept } = setUp([line('a', '7'), line('b')])
      gestures.remove('b')
      expect(kept.lines.map((one) => one.key)).toEqual(['a'])
      expect(kept.removed).toEqual([])
    })

    it('chooses a line’s suzerain', () => {
      const { gestures, kept } = setUp([line('a', '7')])
      gestures.choose('a', 'suzerain', 30)
      expect(kept.lines[0]?.suzerain).toBe(30)
    })

    it('ticks a line’s suzerain « souverain »', () => {
      const { gestures, kept } = setUp([line('a', '7')])
      gestures.markSovereign('a', 20, true)
      expect(kept.lines[0]?.sovereign).toBe(true)
    })
  })

  describe('managed errors', () => {
    // Review QUAL-001, 2026-11-16: a ✕ during a save replaced the lines the save was writing to
    it.each(['add', 'remove', 'choose', 'markSovereign'] as const)(
      'ignores %s while the chain is being saved, and says so in the console',
      (gesture) => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
        const { gestures, setLines } = setUp([line('a', '7')], true)
        if (gesture === 'add') gestures.add()
        if (gesture === 'remove') gestures.remove('a')
        if (gesture === 'choose') gestures.choose('a', 'suzerain', 30)
        if (gesture === 'markSovereign') gestures.markSovereign('a', 20, true)
        expect(setLines).not.toHaveBeenCalled()
        expect(warn).toHaveBeenCalledOnce()
        warn.mockRestore()
      }
    )
  })

  // L4: N/A — no write, no throw: the gestures only set the block's state

  describe('edge cases', () => {
    it('does nothing for a key no line holds', () => {
      const { gestures, setLines } = setUp([line('a', '7')])
      gestures.remove('z')
      expect(setLines).not.toHaveBeenCalled()
    })
  })
})
