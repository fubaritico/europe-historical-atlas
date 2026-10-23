import { describe, expect, it, vi } from 'vitest'

import { createAlarmBoard } from './alarmBoard'
import { routeNotices } from './noticeRouter'

/** A router over a real board and recorded toasts. */
function router() {
  const alarms = createAlarmBoard()
  const show = vi.fn()
  const report = routeNotices({ toasts: { show }, alarms })
  return { alarms, show, report }
}

describe('routeNotices', () => {
  describe('happy path', () => {
    it('shows a success as a toast whose id is its topic', () => {
      const { show, alarms, report } = router()
      report({ tone: 'success', topic: 'year', text: 'saved 1100' })

      expect(show).toHaveBeenCalledWith('success', 'saved 1100', 'year')
      expect(alarms.current()).toEqual([])
    })

    it('raises an alarm in the dialogue, and shows no toast', () => {
      const { show, alarms, report } = router()
      report({ tone: 'alarm', topic: 'year', text: 'not saved' })

      expect(alarms.current()).toEqual([{ topic: 'year', text: 'not saved' }])
      expect(show).not.toHaveBeenCalled()
    })
  })

  describe('variants', () => {
    it('closes the alarm of a topic when that topic succeeds — a save confirmed after its doubt', () => {
      const { alarms, report } = router()
      report({ tone: 'alarm', topic: 'year', text: 'no confirmation yet' })
      report({ tone: 'alarm', topic: 'draft', text: 'the draft is not kept' })
      report({ tone: 'success', topic: 'year', text: 'saved 1100' })

      expect(alarms.current()).toEqual([{ topic: 'draft', text: 'the draft is not kept' }])
    })

    it.each(['info', 'warning'] as const)('leaves the alarms alone on %s, a toast', (tone) => {
      const { show, alarms, report } = router()
      report({ tone: 'alarm', topic: 'year', text: 'not saved' })
      report({ tone, topic: 'year', text: 'the previous save is still running' })

      expect(alarms.current()).toEqual([{ topic: 'year', text: 'not saved' }])
      expect(show).toHaveBeenCalledWith(tone, 'the previous save is still running', 'year')
    })
  })

  // L3–L5: N/A — a switch over the tone; the board and the toasts have their own suites.
})
