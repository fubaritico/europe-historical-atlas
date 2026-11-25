import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { renderInEnglish } from '../../testing/renderInEnglish'

import { StartScreen } from './StartScreen'

import type { DatedMap } from '../../../persistence/yearArchive'

/** 20:00 on 25 November 2026, local time — the clock the dates are worded against. */
const NOW = new Date(2026, 10, 25, 20, 0)

/**
 * Mount the screen over a listing.
 * @param listDatedMaps - what the archive answers
 * @returns the gestures' spies and a user
 */
function mounted(
  listDatedMaps: () => Promise<readonly DatedMap[]> = () =>
    Promise.resolve([
      { name: '1100', changedAt: new Date(2026, 10, 25, 19, 41).getTime() },
      { name: '1200', changedAt: new Date(2026, 10, 20, 9, 5).getTime() },
      { name: '1100.autosave.2026-11-25T19-05-12', changedAt: NOW.getTime() },
    ])
) {
  const maps = { listDatedMaps: vi.fn(listDatedMaps) }
  const onNewMap = vi.fn()
  const onOpen = vi.fn()
  const onOpenMap = vi.fn()
  renderInEnglish(
    <StartScreen
      maps={maps}
      now={() => NOW}
      onNewMap={onNewMap}
      onOpen={onOpen}
      onOpenMap={onOpenMap}
    />
  )
  return { maps, onNewMap, onOpen, onOpenMap, user: userEvent.setup() }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('StartScreen', () => {
  describe('happy path', () => {
    it('welcomes, then lists the last maps newest first, each with when it was last written', async () => {
      mounted()

      expect(screen.getByRole('heading', { name: 'Welcome to the Cartographer' })).toBeTruthy()
      const list = await screen.findByRole('list', { name: 'Recent maps' })
      expect([...list.querySelectorAll('li')].map((row) => row.textContent)).toEqual([
        '1100changed today at 19:41',
        '1200changed on 20 November 2026 at 09:05',
      ])
    })

    it('opens a map with one click on its row', async () => {
      const { onOpenMap, user } = mounted()

      await user.click(await screen.findByRole('button', { name: /^1200/ }))

      expect(onOpenMap).toHaveBeenCalledWith('1200')
    })
  })

  describe('variants', () => {
    it('offers « New map… » and « Open… », each through its gesture', async () => {
      const { onNewMap, onOpen, user } = mounted()

      await user.click(screen.getByRole('button', { name: 'New map…' }))
      await user.click(screen.getByRole('button', { name: 'Open…' }))

      expect([onNewMap.mock.calls.length, onOpen.mock.calls.length]).toEqual([1, 1])
    })

    it('says the maps are being read, until they are', () => {
      mounted(() => new Promise(() => undefined))

      expect(screen.getByRole('status').textContent).toBe('Reading the maps…')
    })
  })

  describe('managed errors', () => {
    it('says when there is no map yet, and how to make one', async () => {
      mounted(() => Promise.resolve([]))

      expect(await screen.findByText('No map yet: create one with « New map ».')).toBeTruthy()
    })
  })

  describe('unmanaged errors', () => {
    it('says a failed reading in place and in the console, and « Retry » reads again', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      let failing = true
      const { maps, user } = mounted(() =>
        failing ? Promise.reject(new Error('HTTP 500')) : Promise.resolve([])
      )

      expect((await screen.findByRole('alert')).textContent).toContain('could not be listed')
      expect(error).toHaveBeenCalled()
      failing = false
      await user.click(screen.getByRole('button', { name: 'Retry' }))

      await waitFor(() => {
        expect(maps.listDatedMaps).toHaveBeenCalledTimes(2)
      })
      expect(await screen.findByText(/^No map yet/)).toBeTruthy()
    })
  })

  describe('edge cases', () => {
    it('lists only automatic saves as no map at all', async () => {
      mounted(() =>
        Promise.resolve([{ name: '1100.autosave.2026-11-25T19-05-12', changedAt: NOW.getTime() }])
      )

      expect(await screen.findByText(/^No map yet/)).toBeTruthy()
    })
  })
})
