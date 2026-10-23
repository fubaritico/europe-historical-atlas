import { act, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { createAlarmBoard } from '../../../persistence/alarmBoard'
import { renderInEnglish } from '../../testing/renderInEnglish'

import { AlarmDialog } from './AlarmDialog'

import type { Alarm } from '../../../persistence/alarmBoard'

/** The dialogue element, open or not — the design system's Modal is a native `<dialog>`. */
const dialog = () => document.querySelector('dialog')

/** The open dialogue's contents. */
function open() {
  const node = document.querySelector<HTMLElement>('dialog[open]')
  if (node === null) throw new Error('no open dialogue')
  return within(node)
}

/** Mount the dialogue over a fresh board, the alarms already raised. */
function mounted(...raised: Alarm[]) {
  const alarms = createAlarmBoard()
  renderInEnglish(<AlarmDialog alarms={alarms} />)
  act(() => {
    for (const alarm of raised) alarms.raise(alarm)
  })
  return { alarms, user: userEvent.setup() }
}

describe('AlarmDialog', () => {
  describe('happy path', () => {
    it('opens on an alarm, titled after its topic, with its sentence', () => {
      mounted({ topic: 'year', text: 'not saved (details in the console)' })

      expect(dialog()?.hasAttribute('open')).toBe(true)
      expect(dialog()?.getAttribute('aria-label')).toBe('The year on disk')
      expect(open().getByText('not saved (details in the console)')).toBeTruthy()
    })

    it('closes on [OK], every alarm read', async () => {
      const { alarms, user } = mounted({ topic: 'year', text: 'not saved' })

      await user.click(open().getByRole('button', { name: 'OK' }))

      expect(dialog()?.hasAttribute('open')).toBe(false)
      expect(alarms.current()).toEqual([])
    })
  })

  describe('variants', () => {
    it('shows every alarm waiting, under the topic of the newest', () => {
      mounted(
        { topic: 'year', text: 'no confirmation yet' },
        { topic: 'draft', text: 'the draft is not kept' }
      )

      expect(dialog()?.getAttribute('aria-label')).toBe('The automatic draft')
      expect(open().getByText('no confirmation yet')).toBeTruthy()
      expect(open().getByText('the draft is not kept')).toBeTruthy()
    })

    it('closes by itself when its only alarm is withdrawn — a save confirmed after its doubt', () => {
      const { alarms } = mounted({ topic: 'year', text: 'no confirmation yet' })

      act(() => {
        alarms.withdraw('year')
      })

      expect(dialog()?.hasAttribute('open')).toBe(false)
    })

    it('closes on ‹escape›, as on [OK]', () => {
      const { alarms } = mounted({ topic: 'snapshot', text: 'not opened' })

      // jsdom has no dialogue: in the browser ‹escape› closes it and `close` fires, the Modal's event.
      act(() => {
        dialog()?.dispatchEvent(new Event('close'))
      })

      expect(alarms.current()).toEqual([])
    })
  })

  describe('edge cases', () => {
    it('is closed while no alarm waits', () => {
      mounted()

      expect(dialog()?.hasAttribute('open')).toBe(false)
    })
  })

  // L3/L4: N/A — it renders what the board holds; the board has its own suite.
})
