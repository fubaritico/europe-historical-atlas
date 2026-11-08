import { describe, expect, it, vi } from 'vitest'

import {
  cloneYearDocument,
  createYearDocument,
} from '@europe-historical-atlas/core/data/yearDocument'

import { createCartographerStore } from '../state/store'
import { UNFRAMED } from '../viewport/viewport'

import { canvasWords } from './canvasWords'
import { overlapsToPaint, refusalText, sayRefusals } from './overlapsOnCanvas'

import type { OverlapAnswer, OverlapCache } from './overlapCache'
import type { YearDocument } from '@europe-historical-atlas/core/data/yearDocument'

// CARTO-364 — the dev, 2026-11-06: a refused overlap is said in the console *and* in an error dialogue, from the
// author's side: the polities by their names, what to do.

/**
 * A 1100 with France and the Empire in its registry, nothing drawn.
 * @returns the document
 */
function franceAndEmpire(): YearDocument {
  const document = createYearDocument(1100)
  for (const [id, name] of [
    ['france', 'Kingdom of France'],
    ['empire', 'Holy Roman Empire'],
  ] as const) {
    document.polities.push({
      id,
      name,
      rank: 'kingdom',
      status: 'country',
      suzerain: null,
      existsFrom: null,
      existsTo: null,
      colour: null,
      wikidata: null,
    })
  }
  return document
}

/**
 * The attachment's parts the overlaps read, over a store holding a document.
 * @param answer - what the cache answers
 * @returns the attachment
 */
function attachment(answer: OverlapAnswer) {
  const store = createCartographerStore({
    edition: { document: franceAndEmpire(), clone: cloneYearDocument },
    viewport: { viewport: UNFRAMED },
  })
  const cache: OverlapCache = { overlapsOf: vi.fn(() => answer) }
  return {
    deps: { store, words: () => canvasWords('en') },
    overlaps: { cache, said: null as OverlapAnswer | null },
  }
}

const REFUSED: OverlapAnswer = { pieces: [], refused: [{ a: 'france', b: 'empire' }] }

describe('overlapsOnCanvas', () => {
  describe('happy path', () => {
    it('names the polities of a refused pair, and what to do', () => {
      const text = refusalText(REFUSED, franceAndEmpire(), canvasWords('en').t)

      expect(text).toContain('Kingdom of France and Holy Roman Empire')
      expect(text).toContain('Touch up the outline')
    })

    it('raises the sentence as an error for the dialogue', () => {
      const it_ = attachment(REFUSED)
      sayRefusals(it_, REFUSED)

      expect(it_.deps.store.getState().error?.text).toContain(
        'Kingdom of France and Holy Roman Empire'
      )
    })

    it('hands the pieces to the painter, and says the refusals on the way', () => {
      const piece = { polities: ['france', 'empire'], rings: [] }
      const it_ = attachment({ pieces: [piece], refused: REFUSED.refused })

      expect(overlapsToPaint(it_)).toEqual([piece])
      expect(it_.deps.store.getState().error).not.toBeNull()
    })
  })

  describe('variants', () => {
    it('names a polity whose own shape was refused, alone', () => {
      const text = refusalText(
        { pieces: [], refused: [{ a: 'france', b: null }] },
        franceAndEmpire(),
        canvasWords('en').t
      )

      expect(text).toContain('between Kingdom of France cannot')
    })

    it('lists every refused pair in one sentence', () => {
      const answer: OverlapAnswer = {
        pieces: [],
        refused: [
          { a: 'france', b: 'empire' },
          { a: 'empire', b: null },
        ],
      }

      expect(refusalText(answer, franceAndEmpire(), canvasWords('en').t)).toContain(
        'Kingdom of France and Holy Roman Empire ; Holy Roman Empire'
      )
    })

    it('speaks French on a French page', () => {
      expect(refusalText(REFUSED, franceAndEmpire(), canvasWords('fr').t)).toContain(
        'Kingdom of France et Holy Roman Empire'
      )
    })
  })

  describe('managed errors', () => {
    it('says nothing when nothing was refused', () => {
      const it_ = attachment({ pieces: [], refused: [] })
      sayRefusals(it_, { pieces: [], refused: [] })

      expect(it_.deps.store.getState().error).toBeNull()
    })

    it('says one version’s refusals once, however many repaints read it', () => {
      const it_ = attachment(REFUSED)
      sayRefusals(it_, REFUSED)
      const first = it_.deps.store.getState().error
      sayRefusals(it_, REFUSED)

      expect(it_.deps.store.getState().error).toBe(first)
    })
  })

  describe('unmanaged errors', () => {
    it('falls back on the id of a polity gone from the registry', () => {
      const answer: OverlapAnswer = { pieces: [], refused: [{ a: 'gone', b: null }] }

      expect(refusalText(answer, franceAndEmpire(), canvasWords('en').t)).toContain(
        'between gone cannot'
      )
    })
  })

  describe('edge cases', () => {
    it('gives no sentence for an answer with nothing refused', () => {
      expect(
        refusalText({ pieces: [], refused: [] }, franceAndEmpire(), canvasWords('en').t)
      ).toBeNull()
    })
  })
})
