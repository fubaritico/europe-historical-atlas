import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'
import { saveYearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

import { openEmptyYear } from '../../state/openEmptyYear'

import { offerDraft } from './draftRecovery'

import type { DraftOffer } from './draftOffers'
import type { DraftRecoveryDeps } from './draftRecovery'
import type { Draft, DraftStore } from './draftStore'
import type { YearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

/** Where the drafts are kept, as the author is told. */
const DRAFTS_FOLDER = 'packages/cartographer/.autosave/drafts'

/** The present every test is set in: the afternoon of 2026-10-17, local time. */
const NOW = new Date(2026, 9, 17, 16, 30)

/** A draft of 1100 written at 15:42 the same day, holding the fixture year. */
function draftOf(overrides: Partial<Draft> = {}): Draft {
  return {
    year: 1100,
    savedAt: new Date(2026, 9, 17, 15, 42).toISOString(),
    files: saveYearDocument(sharedBorderDocument()),
    ...overrides,
  }
}

/** A draft store whose calls answer as told, recording the set-asides. */
function stubDrafts(overrides: Partial<DraftStore> = {}): DraftStore {
  return {
    write: vi.fn(() => Promise.resolve()),
    read: vi.fn(() => Promise.resolve(draftOf())),
    remove: vi.fn(() => Promise.resolve()),
    setAside: vi.fn(() => Promise.resolve()),
    ...overrides,
  }
}

/** Run the offer over a memory store, the author answering `answer`. */
async function offer(
  drafts: DraftStore,
  answer: boolean | ((state: { version: number }) => Promise<boolean>)
) {
  const state = {
    version: 3,
    document: openEmptyYear(1100),
    open: vi.fn((document: YearDocument) => {
      state.document = document
      state.version += 1
    }),
  }
  const reports: string[] = []
  const asked: DraftOffer[] = []
  const deps: DraftRecoveryDeps = {
    drafts,
    year: 1100,
    store: { getState: () => state },
    ask:
      typeof answer === 'function'
        ? () => answer(state)
        : (question) => {
            asked.push(question)
            return Promise.resolve(answer)
          },
    now: () => NOW,
    report: (message) => reports.push(message),
    draftsFolder: DRAFTS_FOLDER,
  }
  const outcome = await offerDraft(deps)
  return { state, reports, asked, outcome }
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('offerDraft', () => {
  describe('happy path', () => {
    it('opens the draft when the author resumes it, and says so', async () => {
      const { state, reports, asked, outcome } = await offer(stubDrafts(), true)

      expect(outcome).toBe('clear')

      expect(asked).toEqual([{ year: 1100, when: 'today at 15:42' }])
      expect(state.open).toHaveBeenCalledTimes(1)
      expect(state.document.polities.length).toBe(sharedBorderDocument().polities.length)
      expect(reports).toEqual(['resumed the draft of 1100 today at 15:42 — ‹ctrl+S› to save it'])
    })
  })

  describe('variants', () => {
    it('sets the draft aside when the author declines, opening nothing', async () => {
      const drafts = stubDrafts()

      const { state, reports } = await offer(drafts, false)

      expect(state.open).not.toHaveBeenCalled()
      expect(drafts.setAside).toHaveBeenCalledWith(1100)
      expect(reports).toEqual([
        `the draft of 1100 today at 15:42 was not resumed — it is set aside in ${DRAFTS_FOLDER}`,
      ])
    })

    it('asks nothing and says nothing when there is no draft', async () => {
      const { reports, asked } = await offer(
        stubDrafts({ read: () => Promise.resolve(null) }),
        true
      )

      expect(asked).toEqual([])
      expect(reports).toEqual([])
    })
  })

  describe('managed errors', () => {
    it('sets aside a draft that cannot be opened, asking nothing', async () => {
      const drafts = stubDrafts({
        read: () => Promise.resolve(draftOf({ files: { registry: 'broken' } })),
      })

      const { state, reports, asked } = await offer(drafts, true)

      expect(asked).toEqual([])
      expect(state.open).not.toHaveBeenCalled()
      expect(drafts.setAside).toHaveBeenCalledWith(1100)
      expect(reports[0]).toMatch(
        /^the draft of 1100 today at 15:42 cannot be opened \(.+\) — it is set aside in /
      )
    })

    it('sets aside a draft that cannot be read, so the first gesture cannot write over it', async () => {
      // The trap: leaving it where it is, the keeper's first write would replace the only copy.
      const drafts = stubDrafts({ read: () => Promise.reject(new Error('not a draft')) })

      const { reports } = await offer(drafts, true)

      expect(drafts.setAside).toHaveBeenCalledWith(1100)
      expect(reports).toEqual([
        `a draft of 1100 could not be read (not a draft) — it is set aside in ${DRAFTS_FOLDER}`,
      ])
    })

    it('turns drafts off and says so when the draft can be neither read nor set aside', async () => {
      const drafts = stubDrafts({
        read: () => Promise.reject(new Error('HTTP 500')),
        setAside: () => Promise.reject(new Error('EACCES')),
      })

      const { reports, outcome } = await offer(drafts, true)

      expect(outcome).toBe('draft-left')
      expect(reports).toEqual([
        `a draft of 1100 could not be read (HTTP 500), and it could not be set aside (EACCES) — automatic drafts are off: move it out of ${DRAFTS_FOLDER}, then reload`,
      ])
    })
  })

  describe('unmanaged errors', () => {
    it('sets the draft aside when the question itself throws, and answers clear', async () => {
      // Found in review (ARCH-001): an unguarded question left the keeper unstarted, in silence.
      const drafts = stubDrafts()

      const { state, outcome, reports } = await offer(drafts, () =>
        Promise.reject(new Error('a draft is already being offered'))
      )

      expect(state.open).not.toHaveBeenCalled()
      expect(drafts.setAside).toHaveBeenCalledWith(1100)
      expect(outcome).toBe('clear')
      expect(reports.at(-1)).toBe(
        `the draft of 1100 today at 15:42 could not be offered (a draft is already being offered) — it is set aside in ${DRAFTS_FOLDER}`
      )
    })

    it('sets the draft aside when opening it in the store throws', async () => {
      const drafts = stubDrafts()
      const { outcome } = await offer(drafts, (store) => {
        Object.assign(store, {
          open: () => {
            throw new Error('the store refused')
          },
        })
        return Promise.resolve(true)
      })

      expect(drafts.setAside).toHaveBeenCalledWith(1100)
      expect(outcome).toBe('clear')
    })

    it('never rejects, even when nothing works', async () => {
      const drafts = stubDrafts({
        read: () => Promise.reject(new Error('down')),
        setAside: () => Promise.reject(new Error('down')),
      })

      await expect(offer(drafts, true)).resolves.toMatchObject({ outcome: 'draft-left' })
    })

    it('logs every failure as an error', async () => {
      await offer(stubDrafts({ read: () => Promise.reject(new Error('down')) }), true)

      expect(console.error).toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    it('does not open the draft when the map changed while the question was open', async () => {
      const { state, reports } = await offer(stubDrafts(), (store) => {
        // A gesture the dialogue did not catch, landing before the answer.
        store.version += 1
        return Promise.resolve(true)
      })

      expect(state.open).not.toHaveBeenCalled()
      expect(reports.at(-1)).toBe(
        `the map changed while the draft of 1100 was offered, so it was not resumed — it is set aside in ${DRAFTS_FOLDER}`
      )
    })
  })
})
