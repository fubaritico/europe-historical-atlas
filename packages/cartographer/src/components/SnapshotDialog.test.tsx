import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SnapshotDialog } from './SnapshotDialog'
import { createSnapshotPicker } from './snapshotPicker'

import type { SnapshotEntry } from '../persistence/draftStore'

/** The present every test is set in: the afternoon of 2026-10-18, local time. */
const NOW = new Date(2026, 9, 18, 16, 30)

/** Two snapshots kept today, newest first, as the store lists them. */
const ENTRIES: SnapshotEntry[] = [
  { name: '1100.2026-10-18T15-00-00Z.json', takenAt: new Date(2026, 9, 18, 15, 0).toISOString() },
  { name: '1100.2026-10-18T14-00-00Z.json', takenAt: new Date(2026, 9, 18, 14, 0).toISOString() },
]

/** The warning the dialogue opens with, every time. */
const WARNING =
  'Opening a snapshot replaces the page you are working on. Your page is kept first as a snapshot: you will find it in this list.'

/** The dialogue element, open or not — the design system's Modal is a native `<dialog>`. */
const dialog = () => document.querySelector('dialog')

/** The open dialogue's contents. */
function open() {
  const node = document.querySelector<HTMLElement>('dialog[open]')
  if (node === null) throw new Error('no open dialogue')
  return within(node)
}

/** Mount the dialogue over a closed picker, the list answering as told. */
function mounted(
  listSnapshots: (year: number) => Promise<SnapshotEntry[]> = () => Promise.resolve(ENTRIES)
) {
  const picker = createSnapshotPicker()
  const source = { listSnapshots: vi.fn(listSnapshots) }
  const onOpen = vi.fn()
  render(
    <SnapshotDialog picker={picker} source={source} year={1100} now={() => NOW} onOpen={onOpen} />
  )
  return { picker, source, onOpen, user: userEvent.setup() }
}

/** Open the picker, as the top bar's button does. */
function press(picker: ReturnType<typeof createSnapshotPicker>): void {
  act(() => {
    picker.open()
  })
}

/** The worded rows, in the order the dialogue lists them. */
const rowLabels = () =>
  open()
    .getAllByRole('radio')
    .map((radio) => radio.closest('label')?.textContent)

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('SnapshotDialog', () => {
  describe('happy path', () => {
    it('opens with the warning, then the snapshots worded by their time, newest first', async () => {
      const { picker, source } = mounted()

      press(picker)

      expect(dialog()?.hasAttribute('open')).toBe(true)
      expect(open().getByText(WARNING)).toBeTruthy()
      await waitFor(() => {
        expect(rowLabels()).toEqual(['today at 15:00:00', 'today at 14:00:00'])
      })
      expect(source.listSnapshots).toHaveBeenCalledWith(1100)
    })

    it('opens the snapshot chosen on [Open], closing first', async () => {
      const { picker, onOpen, user } = mounted()
      press(picker)
      await user.click(await open().findByLabelText('today at 14:00:00'))

      await user.click(open().getByRole('button', { name: 'Open' }))

      expect(onOpen).toHaveBeenCalledExactlyOnceWith(ENTRIES[1])
      expect(picker.isOpen()).toBe(false)
      expect(dialog()?.hasAttribute('open')).toBe(false)
    })
  })

  describe('variants', () => {
    it('keeps [Open] unavailable until a snapshot is chosen', async () => {
      const { picker, user } = mounted()
      press(picker)
      await open().findByLabelText('today at 15:00:00')

      expect(open().getByRole('button', { name: 'Open' }).hasAttribute('disabled')).toBe(true)
      await user.click(open().getByLabelText('today at 15:00:00'))
      expect(open().getByRole('button', { name: 'Open' }).hasAttribute('disabled')).toBe(false)
    })

    it('closes on [Cancel], opening nothing', async () => {
      const { picker, onOpen, user } = mounted()
      press(picker)
      await user.click(await open().findByLabelText('today at 14:00:00'))

      await user.click(open().getByRole('button', { name: 'Cancel' }))

      expect(onOpen).not.toHaveBeenCalled()
      expect(picker.isOpen()).toBe(false)
    })

    it('closes on ‹escape›, opening nothing', async () => {
      const { picker, onOpen } = mounted()
      press(picker)
      await open().findByLabelText('today at 14:00:00')

      // jsdom has no dialogue. In the browser ‹escape› cancels it, the dialogue closes, and `close` fires —
      // the event the design system's Modal listens to; sent here directly.
      act(() => {
        dialog()?.dispatchEvent(new Event('close'))
      })

      expect(onOpen).not.toHaveBeenCalled()
      expect(picker.isOpen()).toBe(false)
    })

    it('marks [Cancel] to take the focus when the dialogue opens, and not [Open]', () => {
      const { picker } = mounted()

      press(picker)

      expect(open().getByRole('button', { name: 'Cancel' }).hasAttribute('autofocus')).toBe(true)
      expect(open().getByRole('button', { name: 'Open' }).hasAttribute('autofocus')).toBe(false)
    })

    it('says no snapshot was kept yet when the list is empty, [Open] unavailable', async () => {
      const { picker } = mounted(() => Promise.resolve([]))

      press(picker)

      expect(
        await open().findByText('No snapshot of 1100 yet — one is kept every hour of drawing.')
      ).toBeTruthy()
      expect(open().queryAllByRole('radio')).toEqual([])
      expect(open().getByRole('button', { name: 'Open' }).hasAttribute('disabled')).toBe(true)
    })
  })

  describe('managed errors', () => {
    it('says why the list could not be read, and logs it as an error', async () => {
      const { picker } = mounted(() => Promise.reject(new Error('the dev server is not running')))

      press(picker)

      expect(
        await open().findByText(
          'The snapshots could not be listed (the dev server is not running).'
        )
      ).toBeTruthy()
      expect(open().getByRole('button', { name: 'Open' }).hasAttribute('disabled')).toBe(true)
      expect(console.error).toHaveBeenCalledTimes(1)
      expect(console.error).toHaveBeenCalledWith(
        '[Cartographer] the snapshots of 1100 could not be listed',
        expect.any(Error)
      )
    })
  })

  describe('unmanaged errors', () => {
    it('says a non-Error refusal of the list as text', async () => {
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- the case under test
      const { picker } = mounted(() => Promise.reject('offline'))

      press(picker)

      expect(await open().findByText('The snapshots could not be listed (offline).')).toBeTruthy()
    })

    it('stays closed, listing nothing, when the list arrives after the dialogue was closed', async () => {
      let answer: (entries: SnapshotEntry[]) => void = () => undefined
      const { picker } = mounted(
        () =>
          new Promise((resolve) => {
            answer = resolve
          })
      )
      press(picker)
      act(() => {
        picker.close()
      })

      await act(async () => {
        answer(ENTRIES)
        await Promise.resolve()
      })

      expect(dialog()?.hasAttribute('open')).toBe(false)
      expect(screen.queryAllByRole('radio', { hidden: true })).toEqual([])
    })
  })

  describe('edge cases', () => {
    it('stays closed, reading nothing, while the picker is closed', () => {
      const { source } = mounted()

      expect(dialog()?.hasAttribute('open')).toBe(false)
      expect(screen.queryByText(WARNING)).toBeNull()
      expect(source.listSnapshots).not.toHaveBeenCalled()
    })

    it('reads the list again on reopening, and starts with nothing chosen', async () => {
      const { picker, source, user } = mounted()
      press(picker)
      await user.click(await open().findByLabelText('today at 14:00:00'))
      await user.click(open().getByRole('button', { name: 'Cancel' }))

      press(picker)

      await open().findByLabelText('today at 14:00:00')
      expect(source.listSnapshots).toHaveBeenCalledTimes(2)
      expect(
        open()
          .getAllByRole('radio')
          .some((radio) => (radio as HTMLInputElement).checked)
      ).toBe(false)
      expect(open().getByRole('button', { name: 'Open' }).hasAttribute('disabled')).toBe(true)
    })

    it('shows the list being read until it arrives', () => {
      const { picker } = mounted(() => new Promise(() => undefined))

      press(picker)

      expect(open().getByText('Reading the snapshots…')).toBeTruthy()
    })
  })
})
