import { describe, expect, it, vi } from 'vitest'

import { NO_SOVEREIGNTY, emptyLine } from './pendingLine'
import { saveLines } from './saveLines'

import type { HolderSovereignty, PendingLine, PendingWiring } from './pendingLine'
import type { LinesState, LinesTargets } from './saveLines'
import type { ChangedVassalLink, LinkAnswer, NewVassalLink } from './saveVassalLink'

const SAVED: LinkAnswer = { kind: 'saved' }
const REFUSED: LinkAnswer = { kind: 'refused', message: 'Refusé.' }

/**
 * The writes stood in for, each saving unless told otherwise, every call written in one log in order.
 * @param answers - a write's answer, by its name
 * @returns the wiring and the log
 */
function wiringOf(
  answers: Partial<
    Record<'saveLink' | 'updateLink' | 'deleteLink' | 'saveSovereign', LinkAnswer>
  > = {}
) {
  const log: string[] = []
  const answer = (name: keyof typeof answers, entry: string) => {
    log.push(entry)
    return Promise.resolve(answers[name] ?? SAVED)
  }
  const wiring: PendingWiring = {
    saveLink: vi.fn((link: NewVassalLink) =>
      answer('saveLink', `saveLink ${String(link.vassal)}→${String(link.suzerain)}`)
    ),
    updateLink: vi.fn((change: ChangedVassalLink) =>
      answer('updateLink', `updateLink ${change.link}`)
    ),
    deleteLink: vi.fn((link: string) => answer('deleteLink', `deleteLink ${link}`)),
    saveSovereign: vi.fn((title: number | string, sovereign: boolean) =>
      answer('saveSovereign', `saveSovereign ${String(title)} ${String(sovereign)}`)
    ),
    onSaved: vi.fn(),
    onFailed: vi.fn(),
    onRemovalStopped: vi.fn(),
  }
  return { wiring, log }
}

/**
 * The targets of a save, keeping the lines and the holder's error as the block would.
 * @param wiring - the writes
 * @param lines - the block's lines
 * @returns the targets, and what they were set to
 */
function targetsOf(wiring: PendingWiring, lines: readonly PendingLine[]) {
  const kept = { lines, error: null as unknown }
  const targets: LinesTargets = {
    wiring,
    setLines: (change) => {
      kept.lines = change(kept.lines)
    },
    setRemoved: () => undefined,
    setSovereigntyError: (error) => {
      kept.error = error
    },
  }
  return { targets, kept }
}

/**
 * A line in the base, its suzerain the title 20.
 * @param key - its key and link
 * @returns the line
 */
function stored(key: string): PendingLine {
  return {
    key,
    link: key,
    original: { suzerain: 20, source: null },
    suzerain: 20,
    source: null,
    status: { kind: 'filling' },
    sovereign: false,
    wasSovereign: false,
  }
}

/**
 * A block's state at « Enregistrer ».
 * @param lines - its lines
 * @param more - the links closed, the holder's sovereignty
 * @returns the state
 */
function stateOf(
  lines: readonly PendingLine[],
  more: { removed?: string[]; sovereignty?: HolderSovereignty } = {}
): LinesState {
  return {
    lines,
    removed: more.removed ?? [],
    holder: 10,
    sovereignty: more.sovereignty ?? NO_SOVEREIGNTY,
    year: 1100,
  }
}

describe('saveLines', () => {
  describe('happy path', () => {
    it('removes, changes, adds, ticks, then unticks the holder — in that order', async () => {
      const { wiring, log } = wiringOf()
      const changed = { ...stored('7'), suzerain: 30 }
      const added = { ...emptyLine(), suzerain: 40, sovereign: true }
      const { targets } = targetsOf(wiring, [changed, added])
      const state = stateOf([changed, added], {
        removed: ['9'],
        sovereignty: { sovereign: false, was: true, links: [] },
      })
      expect(await saveLines(state, targets)).toBe('saved')
      expect(log).toEqual([
        'deleteLink 9',
        'updateLink 7',
        'saveLink 30→40',
        'saveSovereign 40 true',
        'saveSovereign 10 false',
      ])
      expect(wiring.onSaved).toHaveBeenCalledOnce()
    })
  })

  describe('variants', () => {
    it('ticks the holder sovereign first, then removes its links — those closed by ✕ once', async () => {
      const { wiring, log } = wiringOf()
      const { targets } = targetsOf(wiring, [stored('7'), emptyLine()])
      const state = stateOf([stored('7'), emptyLine()], {
        removed: ['7'],
        sovereignty: { sovereign: true, was: false, links: ['7', '8'] },
      })
      expect(await saveLines(state, targets)).toBe('saved')
      expect(log).toEqual(['saveSovereign 10 true', 'deleteLink 7', 'deleteLink 8'])
    })

    it('only removes the links of a holder already sovereign in the base', async () => {
      const { wiring, log } = wiringOf()
      const { targets } = targetsOf(wiring, [])
      const state = stateOf([], { sovereignty: { sovereign: true, was: true, links: ['8'] } })
      expect(await saveLines(state, targets)).toBe('saved')
      expect(log).toEqual(['deleteLink 8'])
    })
  })

  describe('managed errors', () => {
    it('removes no link when the holder’s tick is refused, and says it under the box', async () => {
      const { wiring, log } = wiringOf({ saveSovereign: REFUSED })
      const { targets, kept } = targetsOf(wiring, [])
      const state = stateOf([], { sovereignty: { sovereign: true, was: false, links: ['8'] } })
      expect(await saveLines(state, targets)).toBe('holder')
      expect(log).toEqual(['saveSovereign 10 true'])
      expect(kept.error).toEqual({ kind: 'refused', message: 'Refusé.' })
      expect(wiring.onSaved).not.toHaveBeenCalled()
    })

    it('keeps the holder sovereign when a link cannot be removed, says it, and reads the chain again', async () => {
      const { wiring, log } = wiringOf({ deleteLink: REFUSED })
      const { targets, kept } = targetsOf(wiring, [])
      const state = stateOf([], { sovereignty: { sovereign: true, was: false, links: ['8'] } })
      expect(await saveLines(state, targets)).toBe('holder')
      expect(log).toEqual(['saveSovereign 10 true', 'deleteLink 8'])
      expect(kept.error).toEqual({ kind: 'refused', message: 'Refusé.' })
      expect(wiring.onSaved).toHaveBeenCalledOnce()
    })

    it('stops at a refused line: no box, no untick after it', async () => {
      const { wiring, log } = wiringOf({ saveLink: REFUSED })
      const added = { ...emptyLine(), suzerain: 40, sovereign: true }
      const { targets, kept } = targetsOf(wiring, [added])
      const state = stateOf([added], { sovereignty: { sovereign: false, was: true, links: [] } })
      expect(await saveLines(state, targets)).toBe('line')
      expect(log).toEqual(['saveLink 10→40'])
      expect(kept.lines[0]?.status).toEqual({ kind: 'refused', message: 'Refusé.' })
    })

    it('sends nothing while a line misses its suzerain, and says it on the line', async () => {
      const { wiring, log } = wiringOf()
      const { targets, kept } = targetsOf(wiring, [emptyLine()])
      expect(await saveLines(stateOf(kept.lines), targets)).toBe('line')
      expect(log).toEqual([])
      expect(kept.lines[0]?.status).toEqual({ kind: 'missing' })
    })

    it('stops at a link the server keeps, hands it with its sentence to the toast, and sends nothing after it', async () => {
      const { wiring, log } = wiringOf({ deleteLink: REFUSED })
      const changed = { ...stored('7'), suzerain: 30 }
      const { targets } = targetsOf(wiring, [changed])
      expect(await saveLines(stateOf([changed], { removed: ['9'] }), targets)).toBe('removal')
      expect(log).toEqual(['deleteLink 9'])
      expect(wiring.onRemovalStopped).toHaveBeenCalledWith('9', 'Refusé.')
      expect(wiring.onFailed).not.toHaveBeenCalled()
    })

    it('sends nothing for a sheet with no year, and says it', async () => {
      const { wiring, log } = wiringOf()
      const changed = { ...stored('7'), suzerain: 30 }
      const { targets } = targetsOf(wiring, [changed])
      expect(await saveLines({ ...stateOf([changed]), year: null }, targets)).toBe('no-year')
      expect(log).toEqual([])
    })

    it('sends nothing for a sheet with no holder, and says it', async () => {
      const { wiring, log } = wiringOf()
      const changed = { ...stored('7'), suzerain: 30 }
      const { targets } = targetsOf(wiring, [changed])
      expect(await saveLines({ ...stateOf([changed]), holder: null }, targets)).toBe('no-holder')
      expect(log).toEqual([])
    })
  })

  describe('unmanaged errors', () => {
    it('says a thrown tick as a failure under the box, and to the screen', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { wiring: saving } = wiringOf()
      const wiring: PendingWiring = {
        ...saving,
        saveSovereign: vi.fn(() => Promise.reject(new TypeError('offline'))),
      }
      const { targets, kept } = targetsOf(wiring, [])
      const state = stateOf([], { sovereignty: { sovereign: true, was: false, links: [] } })
      expect(await saveLines(state, targets)).toBe('holder')
      expect(kept.error).toEqual({ kind: 'failed' })
      expect(wiring.onFailed).toHaveBeenCalledOnce()
    })

    it('says a thrown removal in the toast of the link alone, not in the toast of a line', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { wiring: saving } = wiringOf()
      const wiring: PendingWiring = {
        ...saving,
        deleteLink: vi.fn(() => Promise.reject(new TypeError('offline'))),
      }
      const { targets } = targetsOf(wiring, [])
      expect(await saveLines(stateOf([], { removed: ['9'] }), targets)).toBe('removal')
      expect(wiring.onRemovalStopped).toHaveBeenCalledWith('9', null)
      expect(wiring.onFailed).not.toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    it('saves nothing and reads nothing again for a block left as the base holds it', async () => {
      const { wiring, log } = wiringOf()
      const { targets } = targetsOf(wiring, [stored('7')])
      expect(await saveLines(stateOf([stored('7')]), targets)).toBe('saved')
      expect(log).toEqual([])
      expect(wiring.onSaved).not.toHaveBeenCalled()
    })
  })
})
