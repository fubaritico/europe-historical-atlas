import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderInEnglish } from '../../testing/renderInEnglish'
import { createDialogueOpener } from '../../utils/dialogueOpener'

import { YearDialog } from './YearDialog'

/** The open dialogue's contents. */
function open() {
  const node = document.querySelector<HTMLElement>('dialog[open]')
  if (node === null) throw new Error('no open dialogue')
  return within(node)
}

/** Mount the dialogue over a closed picker, on 1100, the list answering as told. */
function mounted(
  listedYears: () => Promise<readonly number[]> = () => Promise.resolve([1100, 1200])
) {
  const picker = createDialogueOpener()
  const source = { listedYears: vi.fn(listedYears) }
  const onOpen = vi.fn()
  renderInEnglish(<YearDialog picker={picker} source={source} year={1100} onOpen={onOpen} />)
  act(() => {
    picker.open()
  })
  return { picker, source, onOpen, user: userEvent.setup() }
}

describe('YearDialog', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('happy path', () => {
    it('offers 1200 and opens it, closing the dialogue first', async () => {
      const { onOpen, picker, user } = mounted()
      await user.click(await open().findByRole('button', { name: 'Open 1200' }))
      expect(onOpen).toHaveBeenCalledWith(1200)
      expect(picker.isOpen()).toBe(false)
    })
  })

  describe('variants', () => {
    it('says the years are being read, as a status, before the list answers', () => {
      mounted(() => new Promise(() => undefined))
      expect(open().getByRole('status').textContent).toBe('Reading the years…')
    })

    it('writes the open year as open, never as a button to press', async () => {
      mounted()
      expect(await open().findByText('1100 — open')).toBeDefined()
      expect(open().queryByRole('button', { name: 'Open 1100' })).toBeNull()
    })

    it('warns what happens, every time it opens', () => {
      mounted()
      expect(open().getByText(/Opening another year reloads the Cartographer on it/)).toBeDefined()
    })

    it('reads the list afresh at each opening', async () => {
      const { picker, source } = mounted()
      await open().findByRole('button', { name: 'Open 1200' })
      act(() => {
        picker.close()
      })
      act(() => {
        picker.open()
      })
      await waitFor(() => {
        expect(source.listedYears).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('managed errors', () => {
    it('says the years could not be listed, and offers none, when the list fails', async () => {
      mounted(() => Promise.reject(new Error('404')))
      expect((await open().findByRole('alert')).textContent).toMatch(/could not be listed/)
      expect(
        open()
          .getAllByRole('button')
          .map((button) => button.textContent)
      ).toEqual(['Cancel'])
      expect(console.error).toHaveBeenCalledOnce()
    })
  })

  // L4: the list's rejection is the managed error above; nothing else is awaited.

  describe('edge cases', () => {
    it('says no year is saved when the manifest lists none', async () => {
      mounted(() => Promise.resolve([]))
      expect((await open().findByRole('status')).textContent).toBe('No year saved yet.')
    })

    it('cancels without opening anything', async () => {
      const { onOpen, picker, user } = mounted()
      await user.click(open().getByRole('button', { name: 'Cancel' }))
      expect(onOpen).not.toHaveBeenCalled()
      expect(picker.isOpen()).toBe(false)
      expect(screen.queryByRole('dialog')).toBeNull()
    })
  })
})
