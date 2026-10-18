import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { createDraftOffers } from '../../persistence/draft/draftOffers'

import { DraftRecoveryDialog } from './DraftRecoveryDialog'

/** The question asked in every test. */
const OFFER = { year: 1100, when: 'today at 15:42' }

/** The dialogue element, open or not — the design system's Modal is a native `<dialog>`. */
const dialog = () => document.querySelector('dialog')

/** Mount the dialogue over a fresh relay, a question already asked. */
function mounted() {
  const offers = createDraftOffers()
  render(<DraftRecoveryDialog offers={offers} />)
  let answer: Promise<boolean> = Promise.resolve(false)
  act(() => {
    answer = offers.ask(OFFER)
  })
  return { offers, answer, user: userEvent.setup() }
}

/** The open dialogue's contents. */
function open() {
  const node = document.querySelector<HTMLElement>('dialog[open]')
  if (node === null) throw new Error('no open dialogue')
  return within(node)
}

describe('DraftRecoveryDialog', () => {
  describe('happy path', () => {
    it('opens on a question, naming the year and the time', () => {
      mounted()

      expect(dialog()?.hasAttribute('open')).toBe(true)
      expect(
        open().getByText(
          'A draft of 1100 was kept today at 15:42, with work that was never saved. Resume it?'
        )
      ).toBeTruthy()
    })

    it('answers resume on [Resume], and closes', async () => {
      const { answer, user } = mounted()

      await user.click(open().getByRole('button', { name: 'Resume' }))

      expect(await answer).toBe(true)
      expect(dialog()?.hasAttribute('open')).toBe(false)
    })
  })

  describe('variants', () => {
    it('answers set aside on [Set it aside]', async () => {
      const { answer, user } = mounted()

      await user.click(open().getByRole('button', { name: 'Set it aside' }))

      expect(await answer).toBe(false)
    })

    it('answers set aside on ‹escape›, which keeps the draft on disk', async () => {
      const { answer } = mounted()

      // jsdom has no dialogue. In the browser ‹escape› cancels it, the dialogue closes, and `close` fires —
      // the event the design system's Modal listens to; sent here directly.
      act(() => {
        dialog()?.dispatchEvent(new Event('close'))
      })

      expect(await answer).toBe(false)
    })

    it('marks [Resume] to take the focus when the dialogue opens', () => {
      mounted()

      expect(open().getByRole('button', { name: 'Resume' }).hasAttribute('autofocus')).toBe(true)
    })
  })

  // L3/L4: N/A — the dialogue only relays an answer; every failure is the opening's, tested in draftRecovery.

  describe('edge cases', () => {
    it('stays closed while nothing is asked', () => {
      render(<DraftRecoveryDialog offers={createDraftOffers()} />)

      expect(dialog()?.hasAttribute('open')).toBe(false)
      expect(screen.queryByText(/Resume it\?/)).toBeNull()
    })
  })
})
