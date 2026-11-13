import { describe, expect, it } from 'vitest'

import { isRefusalEntry, refusalLine } from './refusalLine'

/** 13 November 2026, 15:43:07, local time. */
const AT = new Date(2026, 10, 13, 15, 43, 7)

describe('refusalLine', () => {
  describe('happy path', () => {
    it('writes the local time, the level and the sentence on one line', () => {
      expect(refusalLine({ level: 'warn', message: '[Cartographer] nothing to undo.' }, AT)).toBe(
        '2026-11-13 15:43:07 WARN [Cartographer] nothing to undo.\n'
      )
    })
  })

  describe('variants', () => {
    it('writes an error as ERROR', () => {
      expect(refusalLine({ level: 'error', message: 'x' }, AT)).toBe(
        '2026-11-13 15:43:07 ERROR x\n'
      )
    })
  })

  describe('managed errors', () => {
    it('takes a refusal, and refuses what is not one — another level, no sentence, nothing', () => {
      expect([
        isRefusalEntry({ level: 'warn', message: 'x' }),
        isRefusalEntry({ level: 'info', message: 'x' }),
        isRefusalEntry({ level: 'error' }),
        isRefusalEntry(null),
        isRefusalEntry('x'),
      ]).toEqual([true, false, false, false, false])
    })
  })

  // L4: N/A — a pure formatter; what reaches it is checked by isRefusalEntry first.

  describe('edge cases', () => {
    it('folds a sentence on several lines into one, so one refusal is one line', () => {
      expect(refusalLine({ level: 'warn', message: 'first\n  second' }, AT)).toBe(
        '2026-11-13 15:43:07 WARN first ⏎ second\n'
      )
    })
  })
})
