import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { openEmptyYear } from '../state/openEmptyYear'

import { persistenceWords } from './persistenceWords'
import { changeYear } from './yearChange'

import type { Draft } from './draft/draftStore'
import type { YearChangeDeps } from './yearChange'

/** The present every test is set in. */
const NOW = new Date(2026, 10, 2, 5, 0)

/** Run a change of year from 1100, every call recorded in one ordered log. */
async function changing(
  to: number,
  keep: (draft: Draft) => Promise<void> = () => Promise.resolve(),
  search = '',
  drawWhileKeeping = false
) {
  const order: string[] = []
  const reports: string[] = []
  const state = { document: openEmptyYear(1100), version: 0, open: vi.fn() }
  const deps: YearChangeDeps = {
    store: { getState: () => state },
    snapshots: {
      snapshot: vi.fn((draft: Draft) => {
        order.push(`keep the page of ${String(draft.year)}`)
        // The author draws while the page is on its way to the snapshots.
        if (drawWhileKeeping) state.version += 1
        return keep(draft)
      }),
      listSnapshots: vi.fn(() => Promise.resolve([])),
      readSnapshot: vi.fn(),
    },
    year: 1100,
    now: () => NOW,
    report: (notice) => {
      reports.push(`${notice.tone}: ${notice.text}`)
    },
    words: () => persistenceWords('en'),
    search,
    go: (address) => {
      order.push(`go to ${address}`)
    },
  }
  const outcome = await changeYear(deps, to)
  return { outcome, order, reports }
}

describe('changeYear', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('happy path', () => {
    it('keeps the page of 1100, then goes to ?year=1200', async () => {
      const { outcome, order } = await changing(1200)
      expect(outcome).toBe(true)
      expect(order).toEqual(['keep the page of 1100', 'go to ?year=1200'])
    })
  })

  describe('variants', () => {
    it('keeps the other parameters of the address', async () => {
      const { order } = await changing(1200, undefined, '?break=polities-panel')
      expect(order.at(-1)).toBe('go to ?break=polities-panel&year=1200')
    })
  })

  describe('managed errors', () => {
    // The naive change — go first, or go whatever the keeping said — would throw the page away unkept.
    it('stays on 1100, says why, and goes nowhere when the page cannot be kept', async () => {
      const { outcome, order, reports } = await changing(1200, () =>
        Promise.reject(new Error('disk full'))
      )
      expect(outcome).toBe(false)
      expect(order).toEqual(['keep the page of 1100'])
      expect(reports).toHaveLength(1)
      expect(reports[0]).toMatch(/^alarm: /)
    })
  })

  describe('managed errors — a gesture in no copy', () => {
    // The naive change — keep, then go — would reload over a gesture drawn while the page was being kept.
    it('stays on 1100 and warns when the page changed while it was being kept', async () => {
      const { outcome, order, reports } = await changing(1200, undefined, '', true)
      expect(outcome).toBe(false)
      expect(order).toEqual(['keep the page of 1100'])
      expect(reports).toEqual([
        'warning: not opened — the page changed while it was being kept; choose the year again',
      ])
    })
  })

  // L4: the keeping's own failure is the managed error above; nothing else is awaited.

  describe('edge cases', () => {
    it('does nothing for the year already open, and says so on the console', async () => {
      const { outcome, order } = await changing(1100)
      expect(outcome).toBe(false)
      expect(order).toEqual([])
      expect(console.warn).toHaveBeenCalledOnce()
    })
  })
})
