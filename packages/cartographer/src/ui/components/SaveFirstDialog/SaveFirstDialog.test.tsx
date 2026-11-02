import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { createLocaleStore } from '../../../i18n/localeStore'
import { createQuestionRelay } from '../../../persistence/questionRelay'
import { renderInEnglish } from '../../testing/renderInEnglish'
import { LocaleProvider } from '../LocaleProvider'

import { SaveFirstDialog } from './SaveFirstDialog'

import type { SaveFirstAnswer } from '../../../persistence/mapChange'
import type { ReactElement } from 'react'

/**
 * Render in French, through the provider the page uses.
 * @param ui - what to render
 * @returns the render's result
 */
const renderInFrench = (ui: ReactElement) =>
  render(<LocaleProvider store={createLocaleStore('fr')}>{ui}</LocaleProvider>)

/** The dialogue element, open or not — the design system's Modal is a native `<dialog>`. */
const dialog = () => document.querySelector('dialog')

/**
 * Mount the dialogue over a fresh relay, the question asked for a map.
 * @param map - the map about to be opened
 * @param mount - the language to render in
 * @returns the relay, the answer awaited, a user
 */
function mounted(map = '1200', mount = renderInEnglish) {
  const questions = createQuestionRelay<string, SaveFirstAnswer>('opening a map is already asking')
  mount(<SaveFirstDialog questions={questions} />)
  let answer: Promise<SaveFirstAnswer> = Promise.resolve('cancel')
  act(() => {
    answer = questions.ask(map)
  })
  return { questions, answer, user: userEvent.setup() }
}

/** The open dialogue's contents. */
function open() {
  const node = document.querySelector<HTMLElement>('dialog[open]')
  if (node === null) throw new Error('no open dialogue')
  return within(node)
}

describe('SaveFirstDialog', () => {
  describe('happy path', () => {
    // s19, the dev's words.
    it('asks, naming the map about to be opened', () => {
      mounted()

      expect(dialog()?.hasAttribute('open')).toBe(true)
      expect(open().getByText('You are about to open 1200. Save the current map?')).toBeTruthy()
    })

    it('answers yes on [Yes], and closes', async () => {
      const { answer, user } = mounted()

      await user.click(open().getByRole('button', { name: 'Yes' }))

      expect(await answer).toBe('yes')
      expect(dialog()?.hasAttribute('open')).toBe(false)
    })
  })

  describe('variants', () => {
    it('answers no on [No]', async () => {
      const { answer, user } = mounted()

      await user.click(open().getByRole('button', { name: 'No' }))

      expect(await answer).toBe('no')
    })

    it('marks [Yes] to take the focus, so ‹enter› by reflex keeps the work', () => {
      mounted()

      expect(open().getByRole('button', { name: 'Yes' }).hasAttribute('autofocus')).toBe(true)
      expect(open().getByRole('button', { name: 'No' }).hasAttribute('autofocus')).toBe(false)
    })

    it('asks in French in a French page', () => {
      mounted('1200', renderInFrench)

      expect(dialog()?.textContent).toContain(
        'Vous allez ouvrir 1200. Voulez-vous enregistrer la carte en cours'
      )
      expect(open().getByRole('button', { name: 'Oui' })).toBeTruthy()
    })
  })

  describe('managed errors', () => {
    it('answers cancel on ‹escape›, so nothing is opened', async () => {
      const { answer } = mounted()

      // jsdom has no dialogue: in the browser ‹escape› closes it and `close` fires, which the Modal listens to.
      act(() => {
        dialog()?.dispatchEvent(new Event('close'))
      })

      expect(await answer).toBe('cancel')
    })
  })

  // L4: N/A — the relay refuses a second question itself (questionRelay.test.ts); the dialogue only answers.

  describe('edge cases', () => {
    it('shows nothing while no question is asked', () => {
      const questions = createQuestionRelay<string, SaveFirstAnswer>('busy')
      renderInEnglish(<SaveFirstDialog questions={questions} />)

      expect(dialog()?.hasAttribute('open')).toBe(false)
      expect(screen.queryByRole('button', { name: 'Yes' })).toBeNull()
    })
  })
})
