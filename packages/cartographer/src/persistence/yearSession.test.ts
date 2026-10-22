import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'

import { openEmptyYear } from '../state/openEmptyYear'

import { persistenceWords } from './persistenceWords'
import { YearChangedOnDisk } from './yearArchive'
import { createYearSession, describeYearContents } from './yearSession'

import type { YearArchive } from './yearArchive'
import type { OverwriteQuestion, SessionStore } from './yearSession'
import type { YearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

/** What the year on disk says, in English — the language these suites were written against. */
const EN_WORDS = persistenceWords('en')

/** A store in memory: one document, a version, and `open` replacing both. */
function memoryStore() {
  const state = {
    document: openEmptyYear(1100),
    version: 0,
    open: (document: YearDocument) => {
      state.document = document
      state.version += 1
    },
  }
  const store: SessionStore = { getState: () => state }
  return { store, state }
}

/** An archive stub whose three calls each answer as told. */
function stubArchive(overrides: Partial<YearArchive> = {}): YearArchive {
  return {
    listedYears: vi.fn(() => Promise.resolve([1100])),
    open: vi.fn(() => Promise.resolve(sharedBorderDocument())),
    save: vi.fn((document: YearDocument) =>
      Promise.resolve({ year: document.year, polities: document.polities.length, vertices: 6 })
    ),
    ...overrides,
  }
}

/** The clock every session reads: 18 October 2026, 16:00, local time. */
const NOW = new Date(2026, 9, 18, 16, 0)

/** When another writer changed 1100 on disk, in the tests that need it: the same day, 14:02. */
const CHANGED_AT = new Date(2026, 9, 18, 14, 2).getTime()

/**
 * A session over a memory store and a stub archive, recording what it reports. The overwrite question is
 * answered by `confirmOverwrite`, which says no unless told otherwise.
 */
function session(
  archive: YearArchive = stubArchive(),
  confirmOverwrite: (question: OverwriteQuestion) => Promise<boolean> = vi.fn(() =>
    Promise.resolve(false)
  )
) {
  const { store, state } = memoryStore()
  const reports: string[] = []
  const yearSession = createYearSession({
    store,
    archive,
    year: 1100,
    report: (message) => reports.push(message),
    words: () => EN_WORDS,
    confirmOverwrite,
    now: () => NOW,
  })
  return { yearSession, state, reports, archive, confirmOverwrite }
}

/** An archive save refused once as changed on disk (at `changedAt`), then writing what it is given. */
function changedOnDiskOnce(changedAt: number | null = CHANGED_AT) {
  return vi
    .fn<YearArchive['save']>()
    .mockRejectedValueOnce(new YearChangedOnDisk(1100, changedAt))
    .mockImplementation((document) =>
      Promise.resolve({ year: document.year, polities: document.polities.length, vertices: 6 })
    )
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('createYearSession', () => {
  describe('happy path', () => {
    it('opens the year at start-up when the manifest lists it, and says so', async () => {
      const { yearSession, state, reports } = session()
      await yearSession.openOnStartup()

      expect(state.document.polities.map((polity) => polity.id)).toEqual(['fr-couronne', 'hre'])
      expect(yearSession.phase()).toBe('ready')
      expect(reports).toEqual(['opened 1100 · 2 polities · 6 vertices'])
    })

    it('saves the working document, and says what it saved', async () => {
      const { yearSession, state, reports, archive } = session()
      await yearSession.openOnStartup()
      await yearSession.save()

      expect(archive.save).toHaveBeenCalledWith(state.document, { overwrite: false })
      expect(reports.at(-1)).toBe('saved 1100 · 2 polities · 6 vertices')
    })

    it('answers true when the year was written — what lets the draft keeper remove the draft', async () => {
      const { yearSession } = session()
      await yearSession.openOnStartup()

      expect(await yearSession.save()).toBe(true)
    })
  })

  describe('variants', () => {
    it('starts from the empty map when the year was never saved, and allows saving it', async () => {
      const { yearSession, state, reports, archive } = session(
        stubArchive({ listedYears: () => Promise.resolve([]) })
      )
      await yearSession.openOnStartup()

      expect(archive.open).not.toHaveBeenCalled()
      expect(state.document.polities).toEqual([])
      expect(reports).toEqual(['1100 has never been saved — starting from an empty map'])
      expect(yearSession.phase()).toBe('ready')
    })
  })

  describe('managed errors', () => {
    it('blocks saving when a listed year fails to open, so an empty map never overwrites it', async () => {
      // The plausible session starts empty and lets ‹ctrl+s› through: good files replaced by nothing.
      const { yearSession, reports, archive } = session(
        stubArchive({
          open: () =>
            Promise.reject(new Error('yearPolities (schema) …: anchors[3]: expected number')),
        })
      )
      await yearSession.openOnStartup()
      await yearSession.save()

      expect(archive.save).not.toHaveBeenCalled()
      expect(yearSession.phase()).toBe('blocked')
      expect(reports).toEqual([
        '1100 could not be read, so saving is blocked (details in the console)',
        '1100 could not be read, so saving is blocked (details in the console)',
      ])
      // The reader's own words are English whatever the page: the console has them, not the bar.
      expect(console.error).toHaveBeenCalledWith(
        '[Cartographer] 1100 could not be read from disk',
        new Error('yearPolities (schema) …: anchors[3]: expected number')
      )
    })

    it('blocks saving when the manifest cannot be read', async () => {
      const { yearSession, archive } = session(
        stubArchive({ listedYears: () => Promise.reject(new Error('HTTP 500')) })
      )
      await yearSession.openOnStartup()
      await yearSession.save()

      expect(archive.save).not.toHaveBeenCalled()
    })

    it('does not open a year that arrives after the author started drawing, and blocks saving', async () => {
      let land: (document: YearDocument) => void = () => undefined
      const { yearSession, state, reports, archive } = session(
        stubArchive({ open: () => new Promise((resolve) => (land = resolve)) })
      )
      const opening = yearSession.openOnStartup()
      await Promise.resolve()
      const drawn = state.document
      state.version += 1 // the author drew something meanwhile
      land(sharedBorderDocument())
      await opening
      await yearSession.save()

      expect(state.document).toBe(drawn)
      expect(archive.save).not.toHaveBeenCalled()
      expect(reports[0]).toContain('was read after you started drawing')
    })

    it('does not open a folder holding another year', async () => {
      const other = sharedBorderDocument()
      other.year = 1110
      const { yearSession, state } = session(stubArchive({ open: () => Promise.resolve(other) }))
      await yearSession.openOnStartup()

      expect(state.document.year).toBe(1100)
      expect(yearSession.phase()).toBe('blocked')
    })

    it('refuses to save while the start-up read is still in flight', async () => {
      const { yearSession, reports, archive } = session(
        stubArchive({ listedYears: () => new Promise(() => undefined) })
      )
      void yearSession.openOnStartup()
      await yearSession.save()

      expect(archive.save).not.toHaveBeenCalled()
      expect(reports).toEqual(['still reading 1100 from disk — save again in a moment'])
    })

    it('says a refused save was not saved, and leaves the server’s reason to the console', async () => {
      const { yearSession, reports } = session(
        stubArchive({
          save: () =>
            Promise.reject(new Error('the files say year 1100, the save was addressed to 1110')),
        })
      )
      await yearSession.openOnStartup()
      const saved = await yearSession.save()

      expect(saved).toBe(false)
      expect(reports.at(-1)).toBe('not saved (details in the console)')
      expect(console.error).toHaveBeenCalledWith(
        '[Cartographer] 1100 was not saved',
        new Error('the files say year 1100, the save was addressed to 1110')
      )
    })

    it('answers false to a save refused before it starts, so the draft is kept', async () => {
      const { yearSession } = session()

      expect(await yearSession.save()).toBe(false)
    })
  })

  describe('unmanaged errors', () => {
    it('logs a thrown value that is not an Error, rather than losing it', async () => {
      const { yearSession, reports } = session(
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- the case under test
        stubArchive({ save: () => Promise.reject('Failed to fetch') })
      )
      await yearSession.openOnStartup()
      await yearSession.save()

      expect(reports.at(-1)).toBe('not saved (details in the console)')
      expect(console.error).toHaveBeenCalledWith(
        '[Cartographer] 1100 was not saved',
        'Failed to fetch'
      )
    })

    it('allows another save after a failed one', async () => {
      const save = vi
        .fn<YearArchive['save']>()
        .mockRejectedValueOnce(new Error('down'))
        .mockResolvedValueOnce({ year: 1100, polities: 2, vertices: 6 })
      const { yearSession, reports } = session(stubArchive({ save }))
      await yearSession.openOnStartup()
      await yearSession.save()
      await yearSession.save()

      expect(reports.at(-1)).toBe('saved 1100 · 2 polities · 6 vertices')
    })
  })

  describe('edge cases', () => {
    it('refuses a second save while the first is running', async () => {
      let finish: () => void = () => undefined
      const save = vi.fn(
        () =>
          new Promise<{ year: number; polities: number; vertices: number }>((resolve) => {
            finish = () => {
              resolve({ year: 1100, polities: 2, vertices: 6 })
            }
          })
      )
      const { yearSession, reports } = session(stubArchive({ save }))
      await yearSession.openOnStartup()
      const first = yearSession.save()
      await yearSession.save()
      finish()
      await first

      expect(save).toHaveBeenCalledTimes(1)
      expect(reports).toContain('the previous save is still running')
    })
  })
})

describe('createYearSession, a save over a year changed on disk (CARTO-238, rung 3)', () => {
  describe('happy path', () => {
    it('asks whether to overwrite, naming the year and when it changed', async () => {
      const { yearSession, confirmOverwrite } = session(stubArchive({ save: changedOnDiskOnce() }))
      await yearSession.openOnStartup()
      await yearSession.save()

      expect(confirmOverwrite).toHaveBeenCalledWith({
        year: 1100,
        changedAt: new Date(CHANGED_AT).toISOString(),
      })
    })

    it('on [Overwrite], saves again with overwrite, reports the save and answers true', async () => {
      const save = changedOnDiskOnce()
      const { yearSession, state, reports } = session(
        stubArchive({ save }),
        vi.fn(() => Promise.resolve(true))
      )
      await yearSession.openOnStartup()
      const saved = await yearSession.save()

      expect(save).toHaveBeenCalledTimes(2)
      expect(save).toHaveBeenLastCalledWith(state.document, { overwrite: true })
      expect(reports.at(-1)).toBe('saved 1100 · 2 polities · 6 vertices')
      expect(saved).toBe(true)
    })
  })

  describe('variants', () => {
    it('on [Overwrite], writes the document as it is when answered, not as it was at ‹ctrl+S›', async () => {
      const save = changedOnDiskOnce()
      let answer: (yes: boolean) => void = () => undefined
      const asked = vi.fn(() => new Promise<boolean>((resolve) => (answer = resolve)))
      const { yearSession, state } = session(stubArchive({ save }), asked)
      await yearSession.openOnStartup()
      const saving = yearSession.save()
      await vi.waitFor(() => {
        expect(asked).toHaveBeenCalled()
      })
      const later = sharedBorderDocument()
      state.document = later // the author drew on while the dialogue was open
      answer(true)
      await saving

      expect(save.mock.calls[1]?.[0]).toBe(later)
    })

    it('asks with when null when the server could not say when the year changed', async () => {
      const { yearSession, confirmOverwrite } = session(
        stubArchive({ save: changedOnDiskOnce(null) })
      )
      await yearSession.openOnStartup()
      await yearSession.save()

      expect(confirmOverwrite).toHaveBeenCalledWith({ year: 1100, changedAt: null })
    })
  })

  describe('managed errors', () => {
    it('on [Cancel], writes nothing more, reports when the year changed and answers false', async () => {
      const save = changedOnDiskOnce()
      const { yearSession, reports } = session(stubArchive({ save }))
      await yearSession.openOnStartup()
      const saved = await yearSession.save()

      expect(save).toHaveBeenCalledTimes(1)
      expect(reports.at(-1)).toBe(
        'not saved — 1100 was changed on disk today at 14:02; ‹ctrl+S› again to choose'
      )
      expect(saved).toBe(false)
    })

    it('on [Cancel], logs the cancelled save once in the console', async () => {
      const { yearSession } = session(stubArchive({ save: changedOnDiskOnce() }))
      await yearSession.openOnStartup()
      await yearSession.save()

      expect(console.warn).toHaveBeenCalledTimes(1)
      expect(console.warn).toHaveBeenCalledWith(
        `[Cartographer] save cancelled: 1100 was changed on disk at ${new Date(CHANGED_AT).toISOString()}.`
      )
    })

    it('on [Cancel] with no time known, reports the year changed since it was opened', async () => {
      const { yearSession, reports } = session(stubArchive({ save: changedOnDiskOnce(null) }))
      await yearSession.openOnStartup()
      await yearSession.save()

      expect(reports.at(-1)).toBe(
        'not saved — 1100 was changed on disk since it was opened; ‹ctrl+S› again to choose'
      )
    })
  })

  describe('unmanaged errors', () => {
    // save() resolves either way, as its contract says — even when the question itself fails.
    it('reports a question that fails as not saved, and resolves false rather than throwing', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { yearSession, reports } = session(
        stubArchive({ save: changedOnDiskOnce() }),
        vi.fn(() => Promise.reject(new Error('a save is already asking')))
      )
      await yearSession.openOnStartup()

      await expect(yearSession.save()).resolves.toBe(false)
      expect(reports.at(-1)).toBe('not saved (details in the console)')
      expect(error).toHaveBeenCalledOnce()
      expect(error).toHaveBeenCalledWith(
        '[Cartographer] 1100 was not saved',
        new Error('a save is already asking')
      )
    })

    it('reports a failure of the overwrite save itself as not saved, without asking again', async () => {
      const save = vi
        .fn<YearArchive['save']>()
        .mockRejectedValueOnce(new YearChangedOnDisk(1100, CHANGED_AT))
        .mockRejectedValueOnce(new Error('the save failed on disk (ENOSPC)'))
      const confirmOverwrite = vi.fn(() => Promise.resolve(true))
      const { yearSession, reports } = session(stubArchive({ save }), confirmOverwrite)
      await yearSession.openOnStartup()
      const saved = await yearSession.save()

      expect(confirmOverwrite).toHaveBeenCalledTimes(1)
      expect(reports.at(-1)).toBe('not saved (details in the console)')
      expect(console.error).toHaveBeenCalledWith(
        '[Cartographer] 1100 was not saved',
        new Error('the save failed on disk (ENOSPC)')
      )
      expect(saved).toBe(false)
    })

    it('reports a second YearChangedOnDisk on the overwrite save as not saved, without asking again', async () => {
      const save = vi
        .fn<YearArchive['save']>()
        .mockRejectedValue(new YearChangedOnDisk(1100, CHANGED_AT))
      const confirmOverwrite = vi.fn(() => Promise.resolve(true))
      const { yearSession, reports } = session(stubArchive({ save }), confirmOverwrite)
      await yearSession.openOnStartup()

      expect(await yearSession.save()).toBe(false)
      expect(confirmOverwrite).toHaveBeenCalledTimes(1)
      expect(reports.at(-1)).toBe('not saved (details in the console)')
      expect(console.error).toHaveBeenCalledWith(
        '[Cartographer] 1100 was not saved',
        expect.any(YearChangedOnDisk)
      )
    })
  })

  describe('edge cases', () => {
    it('refuses a second ‹ctrl+S› while the overwrite dialogue is open', async () => {
      const save = changedOnDiskOnce()
      let answer: (yes: boolean) => void = () => undefined
      const asked = vi.fn(() => new Promise<boolean>((resolve) => (answer = resolve)))
      const { yearSession, reports } = session(stubArchive({ save }), asked)
      await yearSession.openOnStartup()
      const first = yearSession.save()
      await vi.waitFor(() => {
        expect(asked).toHaveBeenCalled()
      })
      const second = await yearSession.save()
      answer(false)
      await first

      expect(second).toBe(false)
      expect(save).toHaveBeenCalledTimes(1)
      expect(reports).toContain('the previous save is still running')
    })

    it('asks again at the next ‹ctrl+S› after a cancel', async () => {
      const save = vi
        .fn<YearArchive['save']>()
        .mockRejectedValue(new YearChangedOnDisk(1100, CHANGED_AT))
      const { yearSession, confirmOverwrite } = session(stubArchive({ save }))
      await yearSession.openOnStartup()
      await yearSession.save()
      await yearSession.save()

      expect(confirmOverwrite).toHaveBeenCalledTimes(2)
    })
  })
})

describe('describeYearContents', () => {
  it('names the counts in the singular for one, and groups thousands', () => {
    expect(describeYearContents({ polities: 1, vertices: 1 }, EN_WORDS)).toBe('1 polity · 1 vertex')
    expect(describeYearContents({ polities: 52, vertices: 17104 }, EN_WORDS)).toBe(
      '52 polities · 17,104 vertices'
    )
  })

  it('writes the counts the French way on a French page', () => {
    expect(describeYearContents({ polities: 52, vertices: 17104 }, persistenceWords('fr'))).toBe(
      '52 pays · 17\u202f104 sommets'
    )
  })
})
