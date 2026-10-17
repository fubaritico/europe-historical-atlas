import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'

import { openEmptyYear } from '../state/openEmptyYear'

import { createYearSession, describeYearContents } from './yearSession'

import type { YearArchive } from './yearArchive'
import type { SessionStore } from './yearSession'
import type { YearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

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

/** A session over a memory store and a stub archive, recording what it reports. */
function session(archive: YearArchive = stubArchive()) {
  const { store, state } = memoryStore()
  const reports: string[] = []
  const yearSession = createYearSession({
    store,
    archive,
    year: 1100,
    report: (message) => reports.push(message),
  })
  return { yearSession, state, reports, archive }
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

      expect(archive.save).toHaveBeenCalledWith(state.document)
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
        '1100 could not be read, so saving is blocked: yearPolities (schema) …: anchors[3]: expected number',
        '1100 could not be read, so saving is blocked: yearPolities (schema) …: anchors[3]: expected number',
      ])
      expect(console.error).toHaveBeenCalled()
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

    it('says a refused save was not saved, with the server’s reason', async () => {
      const { yearSession, reports } = session(
        stubArchive({
          save: () =>
            Promise.reject(new Error('the files say year 1100, the save was addressed to 1110')),
        })
      )
      await yearSession.openOnStartup()
      const saved = await yearSession.save()

      expect(saved).toBe(false)
      expect(reports.at(-1)).toBe(
        'not saved: the files say year 1100, the save was addressed to 1110'
      )
      expect(console.error).toHaveBeenCalled()
    })

    it('answers false to a save refused before it starts, so the draft is kept', async () => {
      const { yearSession } = session()

      expect(await yearSession.save()).toBe(false)
    })
  })

  describe('unmanaged errors', () => {
    it('reports a thrown value that is not an Error, rather than losing it', async () => {
      const { yearSession, reports } = session(
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- the case under test
        stubArchive({ save: () => Promise.reject('Failed to fetch') })
      )
      await yearSession.openOnStartup()
      await yearSession.save()

      expect(reports.at(-1)).toBe('not saved: Failed to fetch')
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

describe('describeYearContents', () => {
  it('names the counts in the singular for one, and groups thousands', () => {
    expect(describeYearContents({ polities: 1, vertices: 1 })).toBe('1 polity · 1 vertex')
    expect(describeYearContents({ polities: 52, vertices: 17104 })).toBe(
      '52 polities · 17,104 vertices'
    )
  })
})
