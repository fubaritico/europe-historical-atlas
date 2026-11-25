import { act, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { renderInEnglish } from '../../testing/renderInEnglish'
import { createDialogueOpener } from '../../utils/dialogueOpener'

import { NewMapDialog } from './NewMapDialog'

import type { NewMapOutcome, NewMapRequest } from '../../../persistence/newMap'

/** The open dialogue's contents. */
function open() {
  const node = document.querySelector<HTMLElement>('dialog[open]')
  if (node === null) throw new Error('no open dialogue')
  return within(node)
}

/**
 * Mount the dialogue, « Nouvelle carte » answering as told, then open it.
 * @param answer - what creating answers
 * @returns the opener, the spy, a user
 */
function mounted(
  answer: (request: NewMapRequest) => Promise<NewMapOutcome> = () => Promise.resolve({ done: true })
) {
  const picker = createDialogueOpener()
  const create = vi.fn(answer)
  renderInEnglish(<NewMapDialog picker={picker} create={create} />)
  act(() => {
    picker.open()
  })
  return { picker, create, user: userEvent.setup() }
}

const year = () => open().getByRole('textbox', { name: 'Year' })
const name = () => open().getByRole('textbox', { name: 'Map name' })
const create = () => open().getByRole('button', { name: 'Create' })

describe('NewMapDialog', () => {
  describe('happy path', () => {
    it('creates the map of the year and the name typed, and closes once done', async () => {
      const { picker, create: created, user } = mounted()

      await user.type(year(), '1110')
      await user.type(name(), '1110-essai')
      await user.click(create())

      expect(created).toHaveBeenCalledWith({ year: '1110', name: '1110-essai' })
      await waitFor(() => {
        expect(picker.isOpen()).toBe(false)
      })
    })
  })

  describe('variants', () => {
    it('opens on empty fields, the year focused, [Create] unavailable until both are typed', async () => {
      const { user } = mounted()

      expect(document.activeElement).toBe(year())
      expect(create().hasAttribute('disabled')).toBe(true)
      await user.type(year(), '1110')
      expect(create().hasAttribute('disabled')).toBe(true)
      await user.type(name(), 'x')
      expect(create().hasAttribute('disabled')).toBe(false)
    })

    it('creates on ‹enter› in the name', async () => {
      const { create: created, user } = mounted()

      await user.type(year(), '1110')
      await user.type(name(), '1110{Enter}')

      expect(created).toHaveBeenCalledWith({ year: '1110', name: '1110' })
    })
  })

  describe('managed errors', () => {
    it('says a refusal of the year under the year, and keeps the dialogue open', async () => {
      const { picker, user } = mounted(() =>
        Promise.resolve({ done: false, refusal: { field: 'year', text: 'A year is digits' } })
      )

      await user.type(year(), 'mil')
      await user.type(name(), 'essai')
      await user.click(create())

      expect(await open().findByText('A year is digits')).toBeTruthy()
      expect(year().getAttribute('aria-invalid')).toBe('true')
      expect(name().getAttribute('aria-invalid')).not.toBe('true')
      expect(picker.isOpen()).toBe(true)
    })

    it('clears a refusal of the name as the name is typed in again, not as the year is', async () => {
      const { user } = mounted(() =>
        Promise.resolve({ done: false, refusal: { field: 'name', text: 'Taken' } })
      )
      await user.type(year(), '1100')
      await user.type(name(), '1100')
      await user.click(create())
      await open().findByText('Taken')

      await user.type(year(), '0')
      expect(open().queryByText('Taken')).not.toBeNull()
      await user.type(name(), 'b')
      expect(open().queryByText('Taken')).toBeNull()
    })
  })

  describe('unmanaged errors', () => {
    it('closes when the refusal was said elsewhere — the question dismissed, a save’s alarm', async () => {
      const { picker, user } = mounted(() => Promise.resolve({ done: false, refusal: null }))

      await user.type(year(), '1110')
      await user.type(name(), '1110')
      await user.click(create())

      await waitFor(() => {
        expect(picker.isOpen()).toBe(false)
      })
    })
  })

  describe('edge cases', () => {
    it('starts empty again at the next opening', async () => {
      const { picker, user } = mounted()
      await user.type(year(), '1110')
      act(() => {
        picker.close()
      })
      act(() => {
        picker.open()
      })

      expect((year() as HTMLInputElement).value).toBe('')
    })

    it('sends one creation while the first is running', async () => {
      const { create: created, user } = mounted(() => new Promise(() => undefined))
      await user.type(year(), '1110')
      await user.type(name(), '1110')
      await user.click(create())
      await user.type(name(), '{Enter}')

      expect(created).toHaveBeenCalledTimes(1)
      expect(open().getByRole('button', { name: 'Creating…' })).toBeTruthy()
    })
  })
})
