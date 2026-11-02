import { act, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { renderInEnglish } from '../../testing/renderInEnglish'
import { createDialogueOpener } from '../../utils/dialogueOpener'

import { SaveAsDialog } from './SaveAsDialog'

import type { SaveAsOutcome } from '../../../persistence/yearSession'

/** The open dialogue's contents. */
function open() {
  const node = document.querySelector<HTMLElement>('dialog[open]')
  if (node === null) throw new Error('no open dialogue')
  return within(node)
}

/**
 * Mount the dialogue, the session's *Save as…* answering as told, then open it.
 * @param answer - what *Save as…* answers
 * @returns the opener, the spy, a user
 */
function mounted(
  answer: (name: string) => Promise<SaveAsOutcome> = () => Promise.resolve({ done: true })
) {
  const picker = createDialogueOpener()
  const saveAs = vi.fn(answer)
  renderInEnglish(<SaveAsDialog picker={picker} saveAs={saveAs} />)
  act(() => {
    picker.open()
  })
  return { picker, saveAs, user: userEvent.setup() }
}

const field = () => open().getByRole('textbox', { name: 'Name of the new map' })
const save = () => open().getByRole('button', { name: 'Save' })

describe('SaveAsDialog', () => {
  describe('happy path', () => {
    it('saves under the name typed, trimmed, and closes once done', async () => {
      const { picker, saveAs, user } = mounted()

      await user.type(field(), '  1100-essai ')
      await user.click(save())

      expect(saveAs).toHaveBeenCalledWith('1100-essai')
      await waitFor(() => {
        expect(picker.isOpen()).toBe(false)
      })
    })
  })

  describe('variants', () => {
    it('opens on an empty field, its hint under it, [Save] unavailable until a name is typed', async () => {
      const { user } = mounted()

      expect((field() as HTMLInputElement).value).toBe('')
      expect(open().getByText('Letters, digits, "-", "_" and "."')).toBeTruthy()
      expect(save().hasAttribute('disabled')).toBe(true)
      await user.type(field(), 'x')
      expect(save().hasAttribute('disabled')).toBe(false)
    })

    it('saves on ‹enter› in the field', async () => {
      const { saveAs, user } = mounted()

      await user.type(field(), '1100-essai{Enter}')

      expect(saveAs).toHaveBeenCalledWith('1100-essai')
    })

    it('starts empty again at the next opening', async () => {
      const { picker, user } = mounted(() => Promise.resolve({ done: false, refusal: 'no' }))
      await user.type(field(), 'abc')
      act(() => {
        picker.close()
      })
      act(() => {
        picker.open()
      })

      expect((field() as HTMLInputElement).value).toBe('')
    })
  })

  describe('managed errors', () => {
    // s19: a refused name is said under the field, and nothing closes.
    it('says a refusal under the field, as an error, and stays open', async () => {
      const { picker, user } = mounted(() =>
        Promise.resolve({
          done: false,
          refusal: 'This is the name of the map open — to save it under the same name, use Save',
        })
      )

      await user.type(field(), '1100')
      await user.click(save())

      const alert = await open().findByRole('alert')
      expect(alert.textContent).toContain('use Save')
      expect(field().getAttribute('aria-invalid')).toBe('true')
      expect(picker.isOpen()).toBe(true)
    })

    it('clears the refusal as soon as the name is changed', async () => {
      const { user } = mounted(() => Promise.resolve({ done: false, refusal: 'taken' }))
      await user.type(field(), '1200')
      await user.click(save())
      await open().findByRole('alert')

      await user.type(field(), 'x')

      expect(open().queryByRole('alert')).toBeNull()
    })
  })

  describe('unmanaged errors', () => {
    // The map open could not be saved first: its own alarm is up, so the form steps aside.
    it('closes when the failure was said elsewhere', async () => {
      const { picker, user } = mounted(() => Promise.resolve({ done: false, refusal: null }))

      await user.type(field(), '1100-essai')
      await user.click(save())

      await waitFor(() => {
        expect(picker.isOpen()).toBe(false)
      })
    })
  })

  describe('edge cases', () => {
    it('asks only once while a save runs', async () => {
      const { saveAs, user } = mounted(() => new Promise(() => undefined))

      await user.type(field(), '1100-essai')
      await user.click(save())
      await user.type(field(), '{Enter}')

      expect(saveAs).toHaveBeenCalledOnce()
      expect(open().getByRole('button', { name: 'Saving…' })).toBeTruthy()
    })

    it('cancels without saving', async () => {
      const { picker, saveAs, user } = mounted()

      await user.click(open().getByRole('button', { name: 'Cancel' }))

      expect(saveAs).not.toHaveBeenCalled()
      expect(picker.isOpen()).toBe(false)
    })
  })
})
