import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderInEnglish } from '../../testing/renderInEnglish'
import { createDialogueOpener } from '../../utils/dialogueOpener'

import { MapDialog } from './MapDialog'

/** The open dialogue's contents. */
function open() {
  const node = document.querySelector<HTMLElement>('dialog[open]')
  if (node === null) throw new Error('no open dialogue')
  return within(node)
}

/** The maps of `years/` in most tests (`s19`). */
const MAPS = ['1100', '1100-backup-2026-11-02', '1200']

/**
 * Mount the dialogue over a closed picker, the list answering as told, then open it.
 * @param listMaps - what the list answers
 * @param currentMap - the map open, read at each opening
 * @returns the picker, the source, the spy on opening, a user
 */
function mounted(
  listMaps: () => Promise<readonly string[]> = () => Promise.resolve(MAPS),
  currentMap: () => string = () => '1100'
) {
  const picker = createDialogueOpener()
  const source = { listMaps: vi.fn(listMaps) }
  const onOpen = vi.fn()
  renderInEnglish(
    <MapDialog picker={picker} source={source} currentMap={currentMap} onOpen={onOpen} />
  )
  act(() => {
    picker.open()
  })
  return { picker, source, onOpen, user: userEvent.setup() }
}

/**
 * The row of a map in the list, found by the name it writes.
 * @param name - the map's name, whole
 * @returns the option
 */
async function row(name: string) {
  const options = await open().findAllByRole('option')
  const found = options.find(
    (option) => option.querySelector('.map-list__name')?.textContent === name
  )
  if (found === undefined) throw new Error(`no row for ${name}`)
  return found
}

describe('MapDialog', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('happy path', () => {
    it('selects a map on a click and opens it on [Open], closing the dialogue first', async () => {
      const { onOpen, picker, user } = mounted()
      await user.click(await row('1100-backup-2026-11-02'))
      expect(onOpen).not.toHaveBeenCalled()
      await user.click(open().getByRole('button', { name: 'Open' }))
      expect(onOpen).toHaveBeenCalledWith('1100-backup-2026-11-02')
      expect(picker.isOpen()).toBe(false)
    })
  })

  describe('variants', () => {
    it('lists every map, in the order the list gives them, in a framed list', async () => {
      mounted()
      const list = await open().findByRole('listbox', { name: 'The maps' })
      expect(list.classList.contains('map-list')).toBe(true)
      expect(
        within(list)
          .getAllByRole('option')
          .map((item) => item.textContent)
      ).toEqual(['1100open', '1100-backup-2026-11-02', '1200'])
    })

    it('opens a map on a double click, as in a file dialogue', async () => {
      const { onOpen, user } = mounted()
      await user.dblClick(await row('1200'))
      expect(onOpen).toHaveBeenCalledWith('1200')
    })

    it('draws an automatic save with its own icon, and says what it is', async () => {
      mounted(() => Promise.resolve(['1100', '1100.autosave.2026-11-02T19-05-12']))
      const autosave = await row('1100.autosave.2026-11-02T19-05-12')
      const map = await row('1100')
      expect([
        autosave.querySelector('svg')?.getAttribute('data-kind'),
        map.querySelector('svg')?.getAttribute('data-kind'),
      ]).toEqual(['autosave', 'map'])
      expect(autosave.textContent).toContain('automatic save')
    })

    it('moves the selection with the arrows, skipping the map open, and opens on ‹enter›', async () => {
      const { onOpen, user } = mounted()
      const list = await open().findByRole('listbox')
      list.focus()
      await user.keyboard('{ArrowDown}')
      expect((await row('1100-backup-2026-11-02')).getAttribute('aria-selected')).toBe('true')
      await user.keyboard('{ArrowDown}{Enter}')
      expect(onOpen).toHaveBeenCalledWith('1200')
    })

    it('keeps the row the arrows moved to in sight', async () => {
      const scrolled: string[] = []
      vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(function (this: Element) {
        scrolled.push(this.id)
      })
      const { user } = mounted()
      ;(await open().findByRole('listbox')).focus()
      await user.keyboard('{End}')
      expect(scrolled.at(-1)).toBe((await row('1200')).id)
    })

    it('says the maps are being read, as a status, before the list answers', () => {
      mounted(() => new Promise(() => undefined))
      expect(open().getByRole('status').textContent).toBe('Reading the maps…')
    })

    it('greys the map open, marks it open, and lets nobody select it', async () => {
      const { user } = mounted()
      const current = await row('1100')
      expect(current.getAttribute('aria-disabled')).toBe('true')
      await user.click(current).catch(() => undefined)
      expect(open().getByRole('button', { name: 'Open' }).hasAttribute('disabled')).toBe(true)
    })

    // Save as… changes the map open without a reload: the list reads it at each opening.
    it('marks as open the map the page has become since it was mounted', async () => {
      let current = '1100'
      const { picker } = mounted(
        () => Promise.resolve(MAPS),
        () => current
      )
      await row('1100')
      act(() => {
        picker.close()
      })
      current = '1200'
      act(() => {
        picker.open()
      })
      expect((await row('1200')).getAttribute('aria-disabled')).toBe('true')
      expect((await row('1100-backup-2026-11-02')).getAttribute('aria-disabled')).toBe('false')
    })

    it('says what happens to the map open, every time it opens', () => {
      mounted()
      expect(open().getByText(/asked whether to save it first/)).toBeDefined()
    })

    it('reads the list afresh at each opening', async () => {
      const { picker, source } = mounted()
      await row('1200')
      act(() => {
        picker.close()
      })
      act(() => {
        picker.open()
      })
      await waitFor(() => {
        expect(source.listMaps).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('managed errors', () => {
    it('says the maps could not be listed, and offers none, when the list fails', async () => {
      mounted(() => Promise.reject(new Error('404')))
      expect((await open().findByRole('alert')).textContent).toMatch(/could not be listed/)
      expect(open().queryByRole('listbox')).toBeNull()
      expect(open().getByRole('button', { name: 'Open' }).hasAttribute('disabled')).toBe(true)
      expect(console.error).toHaveBeenCalledOnce()
    })
  })

  // L4: the list's rejection is the managed error above; nothing else is awaited.

  describe('edge cases', () => {
    it('says there is no map when the list is empty', async () => {
      mounted(() => Promise.resolve([]))
      expect((await open().findByRole('status')).textContent).toBe('No map yet.')
    })

    it('opens nothing on [Open] before a map is selected', async () => {
      const { onOpen } = mounted()
      await row('1200')
      expect(open().getByRole('button', { name: 'Open' }).hasAttribute('disabled')).toBe(true)
      expect(onOpen).not.toHaveBeenCalled()
    })

    it('cancels without opening anything', async () => {
      const { onOpen, picker, user } = mounted()
      await user.click(await row('1200'))
      await user.click(open().getByRole('button', { name: 'Cancel' }))
      expect(onOpen).not.toHaveBeenCalled()
      expect(picker.isOpen()).toBe(false)
      expect(screen.queryByRole('dialog')).toBeNull()
    })
  })
})
