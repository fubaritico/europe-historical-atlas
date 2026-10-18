import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'
import { saveYearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

import { openEmptyYear } from '../state/openEmptyYear'

import { openSnapshot } from './snapshotOpening'

import type { Draft, SnapshotSink, SnapshotSource } from './draftStore'
import type { SnapshotOpeningDeps } from './snapshotOpening'
import type { YearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

/** The present every test is set in: the afternoon of 2026-10-18, local time. */
const NOW = new Date(2026, 9, 18, 16, 30)

/** The snapshot chosen in most tests: kept today at 14:00:00, local time. */
const CHOSEN = {
  name: '1100.2026-10-18T14-00-00Z.json',
  takenAt: new Date(2026, 9, 18, 14, 0).toISOString(),
}

/** The snapshot of 14:00 as the store reads it back, holding the fixture year. */
function snapshotOf(overrides: Partial<Draft> = {}): Draft {
  return {
    year: 1100,
    savedAt: CHOSEN.takenAt,
    files: saveYearDocument(sharedBorderDocument()),
    ...overrides,
  }
}

/** Run the opening over a page holding an empty 1100, every call recorded in one ordered log. */
async function opening(
  overrides: Partial<SnapshotSink & SnapshotSource> = {},
  drawWhileKeeping = false
) {
  const order: string[] = []
  const page = openEmptyYear(1100)
  const state = {
    document: page,
    version: 0,
    open: vi.fn((document: YearDocument) => {
      order.push('open')
      state.document = document
    }),
  }
  const snapshots = {
    snapshot: vi.fn((draft: Draft) => {
      order.push(`keep the page of ${String(draft.year)}`)
      // The author draws while the page is on its way to the snapshots.
      if (drawWhileKeeping) state.version += 1
      return Promise.resolve()
    }),
    listSnapshots: vi.fn(() => Promise.resolve([])),
    readSnapshot: vi.fn((_year: number, name: string) => {
      order.push(`read ${name}`)
      return Promise.resolve(snapshotOf())
    }),
    ...overrides,
  }
  const reports: string[] = []
  const deps: SnapshotOpeningDeps = {
    store: { getState: () => state },
    snapshots,
    year: 1100,
    now: () => NOW,
    report: (message) => reports.push(message),
  }
  const outcome = await openSnapshot(deps, CHOSEN)
  return { order, page, state, snapshots, reports, outcome }
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('openSnapshot, a gesture made while the page is being kept (QUAL-001)', () => {
  it('opens nothing when the page changed during its copy, and says to open it again', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const { state, page, reports, outcome } = await opening({}, true)

    expect(outcome).toBe(false)
    expect(state.open).not.toHaveBeenCalled()
    expect(state.document).toBe(page)
    expect(reports.at(-1)).toBe(
      'not opened — the page changed while it was being kept; open the snapshot again'
    )
    expect(warn).toHaveBeenCalledOnce()
  })
})

describe('openSnapshot', () => {
  describe('happy path', () => {
    it('keeps the page first, then reads the snapshot chosen and opens it', async () => {
      const { order, state, outcome } = await opening()

      expect(outcome).toBe(true)
      expect(order).toEqual([
        'keep the page of 1100',
        'read 1100.2026-10-18T14-00-00Z.json',
        'open',
      ])
      expect(state.open).toHaveBeenCalledTimes(1)
      expect(state.document.polities.length).toBe(sharedBorderDocument().polities.length)
    })

    it('keeps the page as it is, with its files and the present as its time', async () => {
      const { page, snapshots } = await opening()

      expect(snapshots.snapshot).toHaveBeenCalledWith({
        year: 1100,
        savedAt: NOW.toISOString(),
        files: saveYearDocument(page),
      })
    })

    it('says the snapshot is open and the page was kept first', async () => {
      const { reports } = await opening()

      expect(reports).toEqual([
        'opened the snapshot of today at 14:00:00 — your page was kept first, in the snapshots',
      ])
      expect(console.error).not.toHaveBeenCalled()
    })
  })

  describe('variants', () => {
    it('reads the snapshot of the year being edited, by the name the list gave', async () => {
      const { snapshots } = await opening()

      expect(snapshots.readSnapshot).toHaveBeenCalledWith(1100, '1100.2026-10-18T14-00-00Z.json')
    })
  })

  describe('managed errors', () => {
    it('opens nothing and reads nothing when the page cannot be kept first, and says why', async () => {
      const { state, snapshots, reports, outcome } = await opening({
        snapshot: () =>
          Promise.reject(new Error('only the Cartographer served by this machine may keep drafts')),
      })

      expect(outcome).toBe(false)
      expect(snapshots.readSnapshot).not.toHaveBeenCalled()
      expect(state.open).not.toHaveBeenCalled()
      expect(reports).toEqual([
        'not opened — your page could not be kept first (only the Cartographer served by this machine may keep drafts)',
      ])
      expect(console.error).toHaveBeenCalledTimes(1)
    })

    it('leaves the page untouched when the snapshot cannot be read, and says why', async () => {
      const { page, state, reports, outcome } = await opening({
        readSnapshot: () =>
          Promise.reject(
            new Error('there is no snapshot "1100.2026-10-18T14-00-00Z.json" of 1100')
          ),
      })

      expect(outcome).toBe(false)
      expect(state.open).not.toHaveBeenCalled()
      expect(state.document).toBe(page)
      expect(reports).toEqual([
        'the snapshot of today at 14:00:00 could not be opened (there is no snapshot "1100.2026-10-18T14-00-00Z.json" of 1100) — your page is as it was',
      ])
      expect(console.error).toHaveBeenCalledTimes(1)
    })
  })

  describe('unmanaged errors', () => {
    it('leaves the page untouched when core refuses the snapshot’s files, and says so', async () => {
      const { page, state, reports, outcome } = await opening({
        readSnapshot: () => Promise.resolve(snapshotOf({ files: { registry: 'not a registry' } })),
      })

      expect(outcome).toBe(false)
      expect(state.open).not.toHaveBeenCalled()
      expect(state.document).toBe(page)
      expect(reports).toHaveLength(1)
      expect(reports[0]).toMatch(
        /^the snapshot of today at 14:00:00 could not be opened \(.+\) — your page is as it was$/
      )
      expect(console.error).toHaveBeenCalledTimes(1)
    })

    it('says a non-Error refusal of the page’s copy as text', async () => {
      const { reports } = await opening({
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- the case under test
        snapshot: () => Promise.reject('the server is down'),
      })

      expect(reports).toEqual([
        'not opened — your page could not be kept first (the server is down)',
      ])
    })
  })

  describe('edge cases', () => {
    it('words a snapshot of yesterday by its day', async () => {
      const reports: string[] = []
      const state = { document: openEmptyYear(1100), version: 0, open: vi.fn() }
      await openSnapshot(
        {
          store: { getState: () => state },
          snapshots: {
            snapshot: () => Promise.resolve(),
            listSnapshots: () => Promise.resolve([]),
            readSnapshot: () => Promise.resolve(snapshotOf()),
          },
          year: 1100,
          now: () => NOW,
          report: (message) => reports.push(message),
        },
        {
          name: '1100.2026-10-17T23-10-00Z.json',
          takenAt: new Date(2026, 9, 17, 23, 10).toISOString(),
        }
      )

      expect(reports).toEqual([
        'opened the snapshot of yesterday at 23:10:00 — your page was kept first, in the snapshots',
      ])
    })
  })
})
