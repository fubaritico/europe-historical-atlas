import { describe, expect, it } from 'vitest'

import { NO_SOVEREIGNTY, closeLine, emptyLine, sovereigntyOf, waitingOf } from './pendingLine'

import type { PendingLine } from './pendingLine'
import type { ChainReading } from './readVassalChain'

const COUNT = { id: 10, name: 'Mathias II — comté de Nantes' }
const DUKE = { id: 20, name: 'Alain IV — duché de Bretagne' }

/**
 * A line already in the base, as left.
 * @param key - its key and link
 * @param sovereign - whether its suzerain is ticked, in the base and on the screen
 * @returns the line
 */
function stored(key: string, sovereign = false): PendingLine {
  return {
    key,
    link: key,
    original: { suzerain: 20, source: null },
    suzerain: 20,
    source: null,
    status: { kind: 'filling' },
    sovereign,
    wasSovereign: sovereign,
  }
}

describe('sovereigntyOf', () => {
  describe('happy path', () => {
    it('reads the holder sovereign when the first reading stops on it alone', () => {
      const readings: ChainReading[] = [{ titles: [COUNT], steps: [], end: 'sovereign' }]
      expect(sovereigntyOf(readings)).toEqual({ sovereign: true, was: true, links: [] })
    })
  })

  describe('variants', () => {
    it('keeps the holder’s own link of every reading, once each', () => {
      const readings: ChainReading[] = [
        { titles: [COUNT, DUKE], steps: [{ link: '7', source: null }], end: 'sovereign' },
        { titles: [COUNT, DUKE], steps: [{ link: '7', source: null }], end: 'unknown' },
        { titles: [COUNT, DUKE], steps: [{ link: '8', source: null }], end: 'sovereign' },
      ]
      expect(sovereigntyOf(readings)).toEqual({ sovereign: false, was: false, links: ['7', '8'] })
    })
  })

  describe('edge cases', () => {
    it('reads no sovereignty from no reading', () => {
      expect(sovereigntyOf([])).toEqual(NO_SOVEREIGNTY)
    })

    it('does not read the holder sovereign when the chain ends on a sovereign above it', () => {
      const readings: ChainReading[] = [
        { titles: [COUNT, DUKE], steps: [{ link: '7', source: null }], end: 'sovereign' },
      ]
      expect(sovereigntyOf(readings).was).toBe(false)
    })
  })

  // L3, L4: N/A — a pure reading of data `core` already shaped
})

describe('waitingOf', () => {
  describe('happy path', () => {
    it('counts nothing for a block left as the base holds it', () => {
      expect(waitingOf([stored('7')], [], NO_SOVEREIGNTY)).toBe(0)
    })
  })

  describe('variants', () => {
    it('counts a new line, a link closed by ✕ and a box ticked', () => {
      const ticked = { ...stored('7'), sovereign: true }
      expect(waitingOf([ticked, emptyLine()], ['9'], NO_SOVEREIGNTY)).toBe(3)
    })

    it('counts, the holder ticked, its links to remove and its tick — not the lines', () => {
      const holder = { sovereign: true, was: false, links: ['7', '8'] }
      expect(waitingOf([stored('7'), emptyLine()], ['7'], holder)).toBe(3)
    })

    it('counts the holder unticked', () => {
      expect(waitingOf([], [], { sovereign: false, was: true, links: [] })).toBe(1)
    })
  })

  describe('edge cases', () => {
    it('counts nothing for a holder sovereign in the base and left so', () => {
      expect(waitingOf([], [], { sovereign: true, was: true, links: [] })).toBe(0)
    })
  })

  // L3, L4: N/A — a count over values
})

describe('closeLine', () => {
  describe('happy path', () => {
    it('closes a line and those above it, and gives its link to remove', () => {
      const lines = [stored('7'), stored('8'), emptyLine()]
      expect(closeLine(lines, '8')).toEqual({ kept: [lines[0]], link: '8' })
    })
  })

  describe('variants', () => {
    it('gives no link for a line not yet in the base', () => {
      const fresh = emptyLine()
      expect(closeLine([fresh], fresh.key)).toEqual({ kept: [], link: undefined })
    })
  })

  describe('edge cases', () => {
    it('answers null for a key no line has', () => {
      expect(closeLine([stored('7')], 'nowhere')).toBeNull()
    })
  })

  // L3, L4: N/A — a pure function over the lines
})
