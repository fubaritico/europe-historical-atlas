import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { createQuestionRelay } from '../../persistence/questionRelay'

import { OverwriteDialog } from './OverwriteDialog'

import type { OverwriteQuestion } from '../../persistence/yearSession'

/** The question asked in most tests. */
const QUESTION: OverwriteQuestion = { year: 1100, when: 'today at 14:02' }

/** The dialogue element, open or not — the design system's Modal is a native `<dialog>`. */
const dialog = () => document.querySelector('dialog')

/** Mount the dialogue over a fresh relay, a question already asked. */
function mounted(question: OverwriteQuestion = QUESTION) {
  const questions = createQuestionRelay<OverwriteQuestion>('a save is already asking')
  render(<OverwriteDialog questions={questions} />)
  let answer: Promise<boolean> = Promise.resolve(true)
  act(() => {
    answer = questions.ask(question)
  })
  return { questions, answer, user: userEvent.setup() }
}

/** The open dialogue's contents. */
function open() {
  const node = document.querySelector<HTMLElement>('dialog[open]')
  if (node === null) throw new Error('no open dialogue')
  return within(node)
}

describe('OverwriteDialog', () => {
  describe('happy path', () => {
    it('opens on a question, naming the year and when it changed on disk', () => {
      mounted()

      expect(dialog()?.hasAttribute('open')).toBe(true)
      expect(
        open().getByText(
          '1100 was changed on disk today at 14:02, since it was opened. Overwrite it with this page?'
        )
      ).toBeTruthy()
    })

    it('answers true on [Overwrite], and closes', async () => {
      const { answer, user } = mounted()

      await user.click(open().getByRole('button', { name: 'Overwrite' }))

      expect(await answer).toBe(true)
      expect(dialog()?.hasAttribute('open')).toBe(false)
    })
  })

  describe('variants', () => {
    it('answers false on [Cancel]', async () => {
      const { answer, user } = mounted()

      await user.click(open().getByRole('button', { name: 'Cancel' }))

      expect(await answer).toBe(false)
    })

    it('answers false on ‹escape›, which leaves the year on disk as it is', async () => {
      const { answer } = mounted()

      // jsdom has no dialogue. In the browser ‹escape› cancels it, the dialogue closes, and `close` fires —
      // the event the design system's Modal listens to; sent here directly.
      act(() => {
        dialog()?.dispatchEvent(new Event('close'))
      })

      expect(await answer).toBe(false)
    })

    it('marks [Cancel] to take the focus when the dialogue opens, and not [Overwrite]', () => {
      mounted()

      expect(open().getByRole('button', { name: 'Cancel' }).hasAttribute('autofocus')).toBe(true)
      expect(open().getByRole('button', { name: 'Overwrite' }).hasAttribute('autofocus')).toBe(
        false
      )
    })

    it('says the year is no longer on disk as it was opened when the time is unknown', () => {
      mounted({ year: 1100, when: null })

      expect(
        open().getByText('1100 is no longer on disk as it was opened. Overwrite it with this page?')
      ).toBeTruthy()
    })
  })

  // L3/L4: N/A — the dialogue only relays an answer; every failure is the session's, tested in yearSession.

  describe('edge cases', () => {
    it('stays closed while nothing is asked', () => {
      render(
        <OverwriteDialog
          questions={createQuestionRelay<OverwriteQuestion>('a save is already asking')}
        />
      )

      expect(dialog()?.hasAttribute('open')).toBe(false)
      expect(screen.queryByText(/Overwrite it with this page\?/)).toBeNull()
    })
  })
})
