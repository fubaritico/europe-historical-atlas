import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'

import { persistenceWords } from '../persistenceWords'

import { DRAFT_DELAY_MS, SNAPSHOT_EVERY_MS, createDraftKeeper } from './draftKeeper'

import type { KeeperStore, KeeperTimers } from './draftKeeper'
import type { Draft, DraftStore, SnapshotSink } from './draftStore'

/** What the year on disk says, in English — the language these suites were written against. */
const EN_WORDS = persistenceWords('en')

/** The clock every draft is stamped with. */
const NOW = new Date('2026-10-17T15:42:05.000Z')

/** A store in memory: a document, a version, and a way to make a change. */
function memoryStore() {
  const listeners = new Set<() => void>()
  const state = { document: sharedBorderDocument(), version: 0 }
  const store: KeeperStore = {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
  const change = (): void => {
    state.version += 1
    for (const listener of listeners) listener()
  }
  return { store, state, change, listeners }
}

/** Timers run by hand: `elapse` fires whatever is due. */
function manualTimers() {
  let clock = 0
  let next = 1
  const due = new Map<number, { at: number; run: () => void }>()
  const timers: KeeperTimers = {
    set: (run, delayMs) => {
      const handle = next++
      due.set(handle, { at: clock + delayMs, run })
      return handle
    },
    clear: (handle) => {
      due.delete(handle)
    },
  }
  const elapse = (ms: number): void => {
    clock += ms
    for (const [handle, timer] of [...due]) {
      if (timer.at > clock) continue
      due.delete(handle)
      timer.run()
    }
  }
  return { timers, elapse, pending: () => due.size }
}

/** A draft store in memory that records every call. */
function memoryDrafts(overrides: Partial<DraftStore & SnapshotSink> = {}) {
  const written: Draft[] = []
  const snapshots: Draft[] = []
  const calls: string[] = []
  const drafts: DraftStore & SnapshotSink = {
    write: vi.fn((draft: Draft) => {
      calls.push('write')
      written.push(draft)
      return Promise.resolve()
    }),
    read: vi.fn(() => Promise.resolve(null)),
    remove: vi.fn(() => {
      calls.push('remove')
      return Promise.resolve()
    }),
    setAside: vi.fn(() => Promise.resolve()),
    snapshot: vi.fn((draft: Draft) => {
      calls.push('snapshot')
      snapshots.push(draft)
      return Promise.resolve()
    }),
    ...overrides,
  }
  return { drafts, written, calls, snapshots }
}

/** A keeper over memory stores, recording what it reports. */
function keeper(
  drafts: DraftStore & SnapshotSink = memoryDrafts().drafts,
  now: () => Date = () => NOW
) {
  const memory = memoryStore()
  const clock = manualTimers()
  const reports: string[] = []
  const draftKeeper = createDraftKeeper({
    store: memory.store,
    drafts,
    year: 1100,
    delayMs: DRAFT_DELAY_MS,
    snapshotEveryMs: SNAPSHOT_EVERY_MS,
    snapshots: drafts,
    now,
    timers: clock.timers,
    report: (message) => reports.push(message),
    words: () => EN_WORDS,
  })
  return { draftKeeper, ...memory, ...clock, reports }
}

/** Let every queued promise settle. */
async function settle(): Promise<void> {
  for (let i = 0; i < 10; i++) await Promise.resolve()
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('createDraftKeeper', () => {
  describe('happy path', () => {
    it('writes the draft once the author has paused for the delay', async () => {
      const { drafts, written } = memoryDrafts()
      const { draftKeeper, change, elapse } = keeper(drafts)
      draftKeeper.start()

      change()
      elapse(DRAFT_DELAY_MS)
      await settle()

      expect(written).toHaveLength(1)
      expect(written[0]?.year).toBe(1100)
      expect(written[0]?.savedAt).toBe('2026-10-17T15:42:05.000Z')
    })

    it('writes the three files a save would write', async () => {
      const { drafts, written } = memoryDrafts()
      const { draftKeeper, change, elapse } = keeper(drafts)
      draftKeeper.start()

      change()
      elapse(DRAFT_DELAY_MS)
      await settle()

      expect(Object.keys(written[0]?.files ?? {}).sort()).toEqual([
        'borders',
        'polities',
        'registry',
      ])
    })

    it('removes the draft after a save when nothing changed since', async () => {
      const { drafts, calls } = memoryDrafts()
      const { draftKeeper, state } = keeper(drafts)
      draftKeeper.start()

      await draftKeeper.saved(state.version)

      expect(calls).toEqual(['remove'])
    })
  })

  describe('variants', () => {
    it('writes once for a burst of changes, the delay restarting at each', async () => {
      const { drafts, written } = memoryDrafts()
      const { draftKeeper, change, elapse } = keeper(drafts)
      draftKeeper.start()

      change()
      elapse(1500)
      change()
      elapse(1500)
      change()
      elapse(DRAFT_DELAY_MS)
      await settle()

      expect(written).toHaveLength(1)
    })

    it('writes nothing before start, so the previous draft can still be offered', () => {
      const { drafts, written } = memoryDrafts()
      const { change, elapse, pending } = keeper(drafts)

      change()
      elapse(DRAFT_DELAY_MS)

      expect(pending()).toBe(0)
      expect(written).toHaveLength(0)
    })

    it('writes nothing when the store notifies without a new version', () => {
      const { draftKeeper, listeners, pending } = keeper()
      draftKeeper.start()

      for (const listener of listeners) listener()

      expect(pending()).toBe(0)
    })

    it('stops writing after stop, a pending write cancelled', async () => {
      const { drafts, written } = memoryDrafts()
      const { draftKeeper, change, elapse } = keeper(drafts)
      draftKeeper.start()

      change()
      draftKeeper.stop()
      change()
      elapse(DRAFT_DELAY_MS)
      await settle()

      expect(written).toHaveLength(0)
    })

    it('starts once, however many times start is called', () => {
      const { draftKeeper, listeners } = keeper()

      draftKeeper.start()
      draftKeeper.start()

      expect(listeners.size).toBe(1)
    })

    it('cancels the pending write when the save makes it pointless', async () => {
      const { drafts, calls } = memoryDrafts()
      const { draftKeeper, change, state, elapse } = keeper(drafts)
      draftKeeper.start()

      change()
      await draftKeeper.saved(state.version)
      elapse(DRAFT_DELAY_MS)
      await settle()

      expect(calls).toEqual(['remove'])
    })
  })

  describe('managed errors', () => {
    it('reports a failed draft once, however many writes fail', async () => {
      const { drafts } = memoryDrafts({
        write: () => Promise.reject(new Error('the dev server is down')),
      })
      const { draftKeeper, change, elapse, reports } = keeper(drafts)
      draftKeeper.start()

      change()
      elapse(DRAFT_DELAY_MS)
      await settle()
      change()
      elapse(DRAFT_DELAY_MS)
      await settle()

      expect(reports).toEqual([
        'the draft is not kept — save with ‹ctrl+S› not to lose your work (details in the console)',
      ])
      expect(console.error).toHaveBeenCalledTimes(1)
    })

    it('says so when drafts are kept again after failing', async () => {
      let fail = true
      const { drafts } = memoryDrafts({
        write: () => (fail ? Promise.reject(new Error('down')) : Promise.resolve()),
      })
      const { draftKeeper, change, elapse, reports } = keeper(drafts)
      draftKeeper.start()

      change()
      elapse(DRAFT_DELAY_MS)
      await settle()
      fail = false
      change()
      elapse(DRAFT_DELAY_MS)
      await settle()

      expect(reports.at(-1)).toBe('the draft of 1100 is kept again')
    })

    it('reports a draft that could not be removed after a save, the save still a success', async () => {
      const { drafts } = memoryDrafts({ remove: () => Promise.reject(new Error('EACCES')) })
      const { draftKeeper, state, reports } = keeper(drafts)
      draftKeeper.start()

      await draftKeeper.saved(state.version)

      expect(reports).toEqual([
        'saved, but the old draft could not be removed — it may be offered at the next opening (details in the console)',
      ])
    })
  })

  describe('unmanaged errors', () => {
    it('reports a document that cannot be serialised instead of throwing', async () => {
      const { drafts } = memoryDrafts()
      const { draftKeeper, change, elapse, reports, state } = keeper(drafts)
      draftKeeper.start()
      // Serialising throws — whatever the cause, the keeper must say so, not reject into the void.
      Object.defineProperty(state, 'document', {
        get: () => {
          throw new Error('the document cannot be read')
        },
      })

      change()
      elapse(DRAFT_DELAY_MS)
      await settle()

      expect(reports).toHaveLength(1)
      expect(reports[0]).toBe(
        'the draft is not kept — save with ‹ctrl+S› not to lose your work (details in the console)'
      )
    })
  })

  describe('edge cases', () => {
    it('keeps the draft when the author drew between the save and its answer', async () => {
      // The trap: removing the draft on any successful save would lose what was drawn while it ran.
      const { drafts, calls } = memoryDrafts()
      const { draftKeeper, change, state } = keeper(drafts)
      draftKeeper.start()
      const versionSaved = state.version

      change()
      await draftKeeper.saved(versionSaved)

      expect(calls).not.toContain('remove')
    })

    it('still writes the work drawn after the save, once the delay passes', async () => {
      const { drafts, written } = memoryDrafts()
      const { draftKeeper, change, state, elapse } = keeper(drafts)
      draftKeeper.start()
      const versionSaved = state.version

      change()
      await draftKeeper.saved(versionSaved)
      elapse(DRAFT_DELAY_MS)
      await settle()

      expect(written).toHaveLength(1)
    })

    it('never lets a slow write land after a newer one', async () => {
      const order: string[] = []
      let releaseFirst: () => void = () => undefined
      let call = 0
      const { drafts } = memoryDrafts({
        write: () => {
          call += 1
          const mine = call
          if (mine === 1)
            return new Promise<void>((resolve) => {
              releaseFirst = () => {
                order.push('first')
                resolve()
              }
            })
          order.push('second')
          return Promise.resolve()
        },
      })
      const { draftKeeper, change, elapse } = keeper(drafts)
      draftKeeper.start()

      change()
      elapse(DRAFT_DELAY_MS)
      change()
      elapse(DRAFT_DELAY_MS)
      await settle()
      releaseFirst()
      await settle()

      expect(order).toEqual(['first', 'second'])
    })
  })
})

/** A clock the test moves: minutes after the moment drafting starts. */
function movingClock() {
  let minutes = 0
  return {
    now: () => new Date(NOW.getTime() + minutes * 60 * 1000),
    at: (next: number) => {
      minutes = next
    },
  }
}

describe('createDraftKeeper, the hourly snapshot (CARTO-238, rung 2a)', () => {
  describe('happy path', () => {
    it('keeps the draft written after an hour of drawing as a snapshot too', async () => {
      const memory = memoryDrafts()
      const clock = movingClock()
      const { draftKeeper, change, elapse, reports } = keeper(memory.drafts, clock.now)
      draftKeeper.start()
      clock.at(61)
      change()
      elapse(DRAFT_DELAY_MS)
      await settle()

      expect(reports).toEqual([])
      expect(memory.snapshots).toHaveLength(1)
      expect(memory.snapshots[0]).toEqual(memory.written[0])
      expect(memory.calls).toEqual(['write', 'snapshot'])
    })
  })

  describe('variants', () => {
    it('takes none before an hour of drawing has passed', async () => {
      const memory = memoryDrafts()
      const clock = movingClock()
      const { draftKeeper, change, elapse } = keeper(memory.drafts, clock.now)
      draftKeeper.start()
      clock.at(59)
      change()
      elapse(DRAFT_DELAY_MS)
      await settle()

      expect(memory.written).toHaveLength(1)
      expect(memory.snapshots).toEqual([])
    })

    it('takes the next one an hour after the last, not at every draft', async () => {
      const memory = memoryDrafts()
      const clock = movingClock()
      const { draftKeeper, change, elapse } = keeper(memory.drafts, clock.now)
      draftKeeper.start()
      for (const minute of [61, 90, 120, 122]) {
        clock.at(minute)
        change()
        elapse(DRAFT_DELAY_MS)
        await settle()
      }

      expect(memory.snapshots).toHaveLength(2)
    })
  })

  describe('managed errors', () => {
    it('says a snapshot that was not kept, logs it, and keeps the draft', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const memory = memoryDrafts({ snapshot: vi.fn(() => Promise.reject(new Error('disk full'))) })
      const clock = movingClock()
      const { draftKeeper, change, elapse, reports } = keeper(memory.drafts, clock.now)
      draftKeeper.start()
      clock.at(61)
      change()
      elapse(DRAFT_DELAY_MS)
      await settle()

      expect(memory.written).toHaveLength(1)
      expect(reports.at(-1)).toBe(
        'the hourly snapshot of 1100 was not kept (details in the console)'
      )
      expect(error).toHaveBeenCalledOnce()
    })

    it('tries again an hour after a failed snapshot, not at the next draft', async () => {
      const snapshot = vi.fn(() => Promise.reject(new Error('disk full')))
      const memory = memoryDrafts({ snapshot })
      const clock = movingClock()
      const { draftKeeper, change, elapse } = keeper(memory.drafts, clock.now)
      draftKeeper.start()
      for (const minute of [61, 62, 122]) {
        clock.at(minute)
        change()
        elapse(DRAFT_DELAY_MS)
        await settle()
      }

      expect(snapshot).toHaveBeenCalledTimes(2)
    })
  })

  describe('unmanaged errors', () => {
    // A draft that could not be written is not the work on disk: no snapshot is taken of it.
    it('takes no snapshot when the draft itself failed', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const memory = memoryDrafts({ write: vi.fn(() => Promise.reject(new Error('server down'))) })
      const clock = movingClock()
      const { draftKeeper, change, elapse } = keeper(memory.drafts, clock.now)
      draftKeeper.start()
      clock.at(61)
      change()
      elapse(DRAFT_DELAY_MS)
      await settle()

      expect(memory.snapshots).toEqual([])
    })
  })

  describe('edge cases', () => {
    // Nothing drawn, nothing written: the snapshot rides on the draft, so an idle hour takes none.
    it('takes none in an hour with no gesture', async () => {
      const memory = memoryDrafts()
      const clock = movingClock()
      const { draftKeeper, elapse } = keeper(memory.drafts, clock.now)
      draftKeeper.start()
      clock.at(120)
      elapse(DRAFT_DELAY_MS)
      await settle()

      expect(memory.snapshots).toEqual([])
    })
  })
})
