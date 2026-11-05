import { describe, expect, it, vi } from 'vitest'

import { createAlarmBoard } from './alarmBoard'

describe('createAlarmBoard', () => {
  describe('happy path', () => {
    it('holds an alarm until the author dismisses it', () => {
      const board = createAlarmBoard()
      board.raise({ topic: 'year', text: 'not saved', sign: 'warning' })

      expect(board.current()).toEqual([{ topic: 'year', text: 'not saved', sign: 'warning' }])
      board.dismiss()
      expect(board.current()).toEqual([])
    })
  })

  describe('variants', () => {
    it('replaces the alarm of the same topic, and keeps the others, oldest first', () => {
      const board = createAlarmBoard()
      board.raise({ topic: 'year', text: 'no confirmation yet', sign: 'warning' })
      board.raise({ topic: 'autosave', text: 'the draft is not kept', sign: 'warning' })
      board.raise({ topic: 'year', text: 'not saved', sign: 'warning' })

      expect(board.current()).toEqual([
        { topic: 'autosave', text: 'the draft is not kept', sign: 'warning' },
        { topic: 'year', text: 'not saved', sign: 'warning' },
      ])
    })

    it('withdraws the alarm of a topic, and only that one', () => {
      const board = createAlarmBoard()
      board.raise({ topic: 'year', text: 'no confirmation yet', sign: 'warning' })
      board.raise({ topic: 'autosave', text: 'the draft is not kept', sign: 'warning' })
      board.withdraw('year')

      expect(board.current()).toEqual([
        { topic: 'autosave', text: 'the draft is not kept', sign: 'warning' },
      ])
    })

    it('tells its listeners of each change, and stops when asked', () => {
      const board = createAlarmBoard()
      const listener = vi.fn()
      const stop = board.subscribe(listener)
      board.raise({ topic: 'year', text: 'not saved', sign: 'warning' })
      board.dismiss()
      stop()
      board.raise({ topic: 'year', text: 'not saved', sign: 'warning' })

      expect(listener).toHaveBeenCalledTimes(2)
    })
  })

  describe('edge cases', () => {
    it('keeps the same array, and tells nobody, when a withdrawal or a dismissal changes nothing', () => {
      // `useSyncExternalStore` re-renders on a new array: an empty change must not make one.
      const board = createAlarmBoard()
      const listener = vi.fn()
      board.subscribe(listener)
      const before = board.current()
      board.withdraw('year')
      board.dismiss()

      expect(board.current()).toBe(before)
      expect(listener).not.toHaveBeenCalled()
    })
  })

  // L3/L4: N/A — nothing here can fail: it holds a list in memory.
})
