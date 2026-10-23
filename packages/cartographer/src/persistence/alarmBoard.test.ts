import { describe, expect, it, vi } from 'vitest'

import { createAlarmBoard } from './alarmBoard'

describe('createAlarmBoard', () => {
  describe('happy path', () => {
    it('holds an alarm until the author dismisses it', () => {
      const board = createAlarmBoard()
      board.raise({ topic: 'year', text: 'not saved' })

      expect(board.current()).toEqual([{ topic: 'year', text: 'not saved' }])
      board.dismiss()
      expect(board.current()).toEqual([])
    })
  })

  describe('variants', () => {
    it('replaces the alarm of the same topic, and keeps the others, oldest first', () => {
      const board = createAlarmBoard()
      board.raise({ topic: 'year', text: 'no confirmation yet' })
      board.raise({ topic: 'draft', text: 'the draft is not kept' })
      board.raise({ topic: 'year', text: 'not saved' })

      expect(board.current()).toEqual([
        { topic: 'draft', text: 'the draft is not kept' },
        { topic: 'year', text: 'not saved' },
      ])
    })

    it('withdraws the alarm of a topic, and only that one', () => {
      const board = createAlarmBoard()
      board.raise({ topic: 'year', text: 'no confirmation yet' })
      board.raise({ topic: 'draft', text: 'the draft is not kept' })
      board.withdraw('year')

      expect(board.current()).toEqual([{ topic: 'draft', text: 'the draft is not kept' }])
    })

    it('tells its listeners of each change, and stops when asked', () => {
      const board = createAlarmBoard()
      const listener = vi.fn()
      const stop = board.subscribe(listener)
      board.raise({ topic: 'year', text: 'not saved' })
      board.dismiss()
      stop()
      board.raise({ topic: 'year', text: 'not saved' })

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
