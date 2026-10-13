import { describe, expect, it, vi } from 'vitest'

import { joinedReports } from './liveCanvas'

describe('joinedReports', () => {
  describe('happy path', () => {
    it('writes one message as it is', () => {
      const onResult = vi.fn()
      joinedReports(onResult)('Pen — follow the coast')
      expect(onResult).toHaveBeenLastCalledWith('Pen — follow the coast')
    })
  })

  describe('variants', () => {
    // Seen on 2026-10-13: the follow's result was erased by the Pen's change of mode in the same click.
    it('keeps what a gesture laid when it then changes the Pen’s mode', () => {
      const onResult = vi.fn()
      const report = joinedReports(onResult)
      report('followed 32 anchors of a shared border')
      report('Pen')
      expect(onResult).toHaveBeenLastCalledWith('followed 32 anchors of a shared border · Pen')
    })
  })

  // L3: N/A — nothing to refuse; a message is a string.
  // L4: N/A — the result zone's own failures are the status bar's.

  describe('edge cases', () => {
    it('starts afresh for the next gesture', () => {
      const onResult = vi.fn()
      joinedReports(onResult)('inserted 26 vertices from the Schelde')
      joinedReports(onResult)('Pen')
      expect(onResult).toHaveBeenLastCalledWith('Pen')
    })
  })
})
