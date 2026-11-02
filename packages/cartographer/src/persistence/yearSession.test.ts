import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'

import { openEmptyYear } from '../state/openEmptyYear'

import { persistenceWords } from './persistenceWords'
import { YearChangedOnDisk } from './yearArchive'
import { createYearSession, describeYearContents } from './yearSession'

import type { ConfirmationTimers } from './awaitConfirmation'
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
    listMaps: vi.fn(() => Promise.resolve(['1100'])),
    open: vi.fn(() => Promise.resolve(sharedBorderDocument())),
    save: vi.fn((document: YearDocument, map: string) =>
      Promise.resolve({ map, polities: document.polities.length, vertices: 6 })
    ),
    ...overrides,
  }
}

/** Timers run by hand: `elapse` fires whatever is due. */
function manualTimers() {
  let clock = 0
  let next = 1
  const due = new Map<number, { at: number; run: () => void }>()
  const timers: ConfirmationTimers = {
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
  return { timers, elapse }
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
  ),
  map = '1100'
) {
  const { store, state } = memoryStore()
  const reports: string[] = []
  // How each was shown: `tone/topic`, in order.
  const tones: string[] = []
  const { timers, elapse } = manualTimers()
  const onMapChanged = vi.fn()
  const yearSession = createYearSession({
    store,
    archive,
    map,
    onMapChanged,
    report: (notice) => {
      reports.push(notice.text)
      tones.push(`${notice.tone}/${notice.topic}`)
    },
    words: () => EN_WORDS,
    confirmOverwrite,
    now: () => NOW,
    timers,
  })
  return { yearSession, state, reports, tones, archive, confirmOverwrite, elapse, onMapChanged }
}

/** An archive save refused once as changed on disk (at `changedAt`), then writing what it is given. */
function changedOnDiskOnce(changedAt: number | null = CHANGED_AT) {
  return vi
    .fn<YearArchive['save']>()
    .mockRejectedValueOnce(new YearChangedOnDisk('1100', changedAt))
    .mockImplementation((document, map) =>
      Promise.resolve({ map, polities: document.polities.length, vertices: 6 })
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
      const { yearSession, state, reports, tones } = session()
      await yearSession.openOnStartup()

      expect(state.document.polities.map((polity) => polity.id)).toEqual(['fr-couronne', 'hre'])
      expect(yearSession.phase()).toBe('ready')
      expect(reports).toEqual(['opened 1100 · 2 polities · 6 vertices'])
      expect(tones).toEqual(['success/year'])
    })

    it('saves the working document, and says what it saved', async () => {
      const { yearSession, state, reports, tones, archive } = session()
      await yearSession.openOnStartup()
      await yearSession.save()

      expect(archive.save).toHaveBeenCalledWith(state.document, '1100', { overwrite: false })
      expect(reports.at(-1)).toBe('saved 1100 · 2 polities · 6 vertices')
      expect(tones.at(-1)).toBe('success/year')
    })

    it('answers true when the year was written — what lets the draft keeper remove the draft', async () => {
      const { yearSession } = session()
      await yearSession.openOnStartup()

      expect(await yearSession.save()).toBe(true)
    })
  })

  describe('variants', () => {
    // `s19`: a map is a folder; an address naming none opens nothing rather than an empty map saved under its name.
    it('opens nothing and blocks saving when no map of that name is on disk, and says so', async () => {
      const { yearSession, state, reports, tones, archive } = session(
        stubArchive({ listMaps: () => Promise.resolve(['1100']) }),
        undefined,
        '1300'
      )
      await yearSession.openOnStartup()

      expect(archive.open).not.toHaveBeenCalled()
      expect(state.document.polities).toEqual([])
      expect(reports).toEqual(['no map named 1300 — Open… lists the maps there are'])
      expect(tones).toEqual(['alarm/year'])
      expect(yearSession.phase()).toBe('blocked')
    })

    // The dev's rule (REPO-275): a save is never cut, but one the server has not confirmed in time is said.
    it('says a save the server has not confirmed within ten seconds, then what it saved when it comes', async () => {
      let confirm:
        ((summary: { map: string; polities: number; vertices: number }) => void) | undefined
      const { yearSession, reports, tones, elapse } = session(
        stubArchive({
          save: () =>
            new Promise((resolve) => {
              confirm = resolve
            }),
        })
      )
      await yearSession.openOnStartup()
      const saving = yearSession.save()
      await Promise.resolve()
      elapse(10_000)
      expect(reports.at(-1)).toBe(
        '1100: still no confirmation from the server — the save may not have happened (details in the console)'
      )
      // The doubt is a dialogue; the confirmation, a toast of the same topic, which closes it.
      expect(tones.at(-1)).toBe('alarm/year')
      confirm?.({ map: '1100', polities: 2, vertices: 6 })
      expect(await saving).toBe(true)
      expect(reports.at(-1)).toBe('saved 1100 · 2 polities · 6 vertices')
      expect(tones.at(-1)).toBe('success/year')
    })

    it('says nothing more when the save is confirmed in time', async () => {
      const { yearSession, reports, elapse } = session()
      await yearSession.openOnStartup()
      await yearSession.save()
      elapse(10_000)
      expect(reports.at(-1)).toBe('saved 1100 · 2 polities · 6 vertices')
    })
  })

  describe('managed errors', () => {
    it('blocks saving when a listed year fails to open, so an empty map never overwrites it', async () => {
      // The plausible session starts empty and lets ‹ctrl+s› through: good files replaced by nothing.
      const { yearSession, reports, tones, archive } = session(
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
      // Blocked is an alarm, at the opening and again at every ‹ctrl+S›.
      expect(tones).toEqual(['alarm/year', 'alarm/year'])
      // The reader's own words are English whatever the page: the console has them, not the bar.
      expect(console.error).toHaveBeenCalledWith(
        '[Cartographer] 1100 could not be read from disk',
        new Error('yearPolities (schema) …: anchors[3]: expected number')
      )
    })

    it('blocks saving when the manifest cannot be read', async () => {
      const { yearSession, archive } = session(
        stubArchive({ listMaps: () => Promise.reject(new Error('HTTP 500')) })
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
      const { yearSession, reports, tones, archive } = session(
        stubArchive({ listMaps: () => new Promise(() => undefined) })
      )
      void yearSession.openOnStartup()
      await yearSession.save()

      expect(archive.save).not.toHaveBeenCalled()
      expect(reports).toEqual(['still reading 1100 from disk — save again in a moment'])
      // Nothing is lost, a gesture is to be made again: a warning.
      expect(tones).toEqual(['warning/year'])
    })

    it('says a refused save was not saved, and leaves the server’s reason to the console', async () => {
      const { yearSession, reports, tones } = session(
        stubArchive({
          save: () =>
            Promise.reject(new Error('the files say year 1100, the save was addressed to 1110')),
        })
      )
      await yearSession.openOnStartup()
      const saved = await yearSession.save()

      expect(saved).toBe(false)
      expect(reports.at(-1)).toBe('not saved (details in the console)')
      expect(tones.at(-1)).toBe('alarm/year')
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
        .mockResolvedValueOnce({ map: '1100', polities: 2, vertices: 6 })
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
          new Promise<{ map: string; polities: number; vertices: number }>((resolve) => {
            finish = () => {
              resolve({ map: '1100', polities: 2, vertices: 6 })
            }
          })
      )
      const { yearSession, reports, tones } = session(stubArchive({ save }))
      await yearSession.openOnStartup()
      const first = yearSession.save()
      await yearSession.save()
      finish()
      await first

      expect(save).toHaveBeenCalledTimes(1)
      expect(reports).toContain('the previous save is still running')
      expect(tones[reports.indexOf('the previous save is still running')]).toBe('warning/year')
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
        map: '1100',
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
      expect(save).toHaveBeenLastCalledWith(state.document, '1100', { overwrite: true })
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

      expect(confirmOverwrite).toHaveBeenCalledWith({ map: '1100', changedAt: null })
    })
  })

  describe('managed errors', () => {
    it('on [Cancel], writes nothing more, reports when the year changed and answers false', async () => {
      const save = changedOnDiskOnce()
      const { yearSession, reports, tones } = session(stubArchive({ save }))
      await yearSession.openOnStartup()
      const saved = await yearSession.save()

      expect(save).toHaveBeenCalledTimes(1)
      expect(reports.at(-1)).toBe(
        'not saved — 1100 was changed on disk today at 14:02; ‹ctrl+S› again to choose'
      )
      // The author's own answer: a warning, not an alarm.
      expect(tones.at(-1)).toBe('warning/year')
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
        .mockRejectedValueOnce(new YearChangedOnDisk('1100', CHANGED_AT))
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
        .mockRejectedValue(new YearChangedOnDisk('1100', CHANGED_AT))
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
        .mockRejectedValue(new YearChangedOnDisk('1100', CHANGED_AT))
      const { yearSession, confirmOverwrite } = session(stubArchive({ save }))
      await yearSession.openOnStartup()
      await yearSession.save()
      await yearSession.save()

      expect(confirmOverwrite).toHaveBeenCalledTimes(2)
    })
  })
})

// `s19`: Save as… and Save a copy, and whether the page holds changes.
describe('createYearSession, a map saved as another', () => {
  describe('happy path', () => {
    it('saves the map open first, then writes the copy, and makes the page the new map', async () => {
      const { yearSession, archive, onMapChanged, reports } = session()
      await yearSession.openOnStartup()

      expect(await yearSession.saveAs('1100-essai')).toEqual({ done: true })
      const saved = vi.mocked(archive.save).mock.calls.map(([, map]) => map)
      expect(saved).toEqual(['1100', '1100-essai'])
      expect([yearSession.map(), onMapChanged.mock.calls]).toEqual(['1100-essai', [['1100-essai']]])
      expect(reports.at(-1)).toBe('saved 1100-essai · 2 polities · 6 vertices')
    })

    it('saves the next ‹ctrl+S› as the new map, never as the one it started from', async () => {
      const { yearSession, archive } = session()
      await yearSession.openOnStartup()
      await yearSession.saveAs('1100-essai')
      await yearSession.save()

      expect(vi.mocked(archive.save).mock.calls.at(-1)?.[1]).toBe('1100-essai')
    })

    it('writes a copy as <map>.copy.<time>, the page staying its map and still modified', async () => {
      const { yearSession, archive, state, reports } = session()
      await yearSession.openOnStartup()
      state.version += 1

      expect(await yearSession.saveCopy()).toBe(true)
      expect(vi.mocked(archive.save).mock.calls.map(([, map]) => map)).toEqual([
        `1100.copy.${NOW.toISOString().slice(0, 19).replaceAll(':', '-')}`,
      ])
      expect([yearSession.map(), yearSession.isModified()]).toEqual(['1100', true])
      expect(reports.at(-1)).toMatch(/^copy saved as 1100\.copy\./)
    })
  })

  describe('variants', () => {
    it('holds no change once opened, a change after a gesture, none again once saved', async () => {
      const { yearSession, state } = session()
      await yearSession.openOnStartup()
      const opened = yearSession.isModified()
      state.version += 1
      const drawn = yearSession.isModified()
      await yearSession.save()

      expect([opened, drawn, yearSession.isModified()]).toEqual([false, true, false])
    })

    // Review QUAL-002: a blocked page can save nothing, so Open… must not ask « save first? ».
    it('holds no change while saving is blocked, a gesture drawn or not', async () => {
      const { yearSession, state } = session(stubArchive({ listMaps: () => Promise.resolve([]) }))
      await yearSession.openOnStartup()
      state.version += 1

      expect([yearSession.phase(), yearSession.isModified()]).toEqual(['blocked', false])
    })

    // Review ARCH-002: the autosave of a name past 99 characters would not be a name.
    it('refuses a name too long for its autosave to be a name', async () => {
      const { yearSession, archive } = session()
      await yearSession.openOnStartup()
      const outcome = await yearSession.saveAs(`a${'b'.repeat(99)}`)

      expect(outcome).toEqual({ done: false, refusal: EN_WORDS.t('saveAsBadName') })
      expect(archive.save).not.toHaveBeenCalled()
    })

    it('holds no change once saved as another map', async () => {
      const { yearSession, state } = session()
      await yearSession.openOnStartup()
      state.version += 1
      await yearSession.saveAs('1100-essai')

      expect(yearSession.isModified()).toBe(false)
    })
  })

  describe('managed errors', () => {
    it('refuses the name of the map open, pointing to Save, and writes nothing', async () => {
      const { yearSession, archive } = session()
      await yearSession.openOnStartup()

      expect(await yearSession.saveAs('1100')).toEqual({
        done: false,
        refusal: 'This is the name of the map open — to save it under the same name, use Save',
      })
      expect(archive.save).not.toHaveBeenCalled()
    })

    it('refuses a name that cannot be a folder’s, and writes nothing', async () => {
      const { yearSession, archive } = session()
      await yearSession.openOnStartup()

      const outcome = await yearSession.saveAs('1100/essai')
      expect(outcome.done).toBe(false)
      expect(outcome.done ? null : outcome.refusal).toMatch(/^A map's name is/)
      expect(archive.save).not.toHaveBeenCalled()
    })

    // A folder named 1200 is the atlas's map of 1200: a copy of 1100 must not take that name.
    it('refuses the name of another year, and writes nothing', async () => {
      const { yearSession, archive } = session()
      await yearSession.openOnStartup()

      expect(await yearSession.saveAs('1200')).toEqual({
        done: false,
        refusal:
          'A map named 1200 is the map of the year 1200, which the atlas publishes — this map is 1100. Choose another name',
      })
      expect(archive.save).not.toHaveBeenCalled()
    })

    it('refuses a name another map holds, the page staying the map it was', async () => {
      const save = vi
        .fn<YearArchive['save']>()
        .mockImplementationOnce((document, map) =>
          Promise.resolve({ map, polities: document.polities.length, vertices: 6 })
        )
        .mockRejectedValueOnce(new YearChangedOnDisk('1200-essai', CHANGED_AT))
      const { yearSession, onMapChanged } = session(stubArchive({ save }))
      await yearSession.openOnStartup()

      expect(await yearSession.saveAs('1200-essai')).toEqual({
        done: false,
        refusal: 'A map named 1200-essai exists already — choose another name',
      })
      expect(yearSession.map()).toBe('1100')
      expect(onMapChanged).not.toHaveBeenCalled()
    })
  })

  describe('unmanaged errors', () => {
    it('writes no copy when the map open could not be saved first, its alarm saying why', async () => {
      const save = vi.fn<YearArchive['save']>(() => Promise.reject(new Error('disk full')))
      const { yearSession, reports } = session(stubArchive({ save }))
      await yearSession.openOnStartup()

      expect(await yearSession.saveAs('1100-essai')).toEqual({ done: false, refusal: null })
      expect(save).toHaveBeenCalledOnce()
      expect([yearSession.map(), reports.at(-1)]).toEqual([
        '1100',
        'not saved (details in the console)',
      ])
    })

    it('says a copy that could not be written, the page as it was', async () => {
      const save = vi.fn<YearArchive['save']>(() => Promise.reject(new Error('disk full')))
      const { yearSession, reports, tones } = session(stubArchive({ save }))
      await yearSession.openOnStartup()

      expect(await yearSession.saveCopy()).toBe(false)
      expect([reports.at(-1), tones.at(-1)]).toEqual([
        'the copy was not saved (details in the console)',
        'alarm/year',
      ])
    })
  })

  describe('edge cases', () => {
    it('saves as and copies nothing while the map is still being read', async () => {
      const { yearSession, archive } = session(
        stubArchive({ listMaps: () => new Promise(() => undefined) })
      )
      void yearSession.openOnStartup()

      expect(await yearSession.saveCopy()).toBe(false)
      expect((await yearSession.saveAs('1100-essai')).done).toBe(false)
      expect(archive.save).not.toHaveBeenCalled()
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
      '52 entités politiques · 17\u202f104 sommets'
    )
  })
})
