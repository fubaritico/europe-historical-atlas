import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { cloneYearDocument } from '@europe-historical-atlas/core/data/yearDocument'
import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'

import { UNFRAMED } from '../viewport/viewport'

import { createCartographerStore } from './store'

import type { HistoryStep } from '@europe-historical-atlas/core/editor/history'

const PLACE: HistoryStep = { kind: 'place-ring', label: 'place a ring' }
const REPLACE: HistoryStep = { kind: 'replace-run', label: 'replace a run' }

/**
 * A store on the shared border, with a county vassal of the Empire not drawn yet.
 * @returns the store
 */
function openStore() {
  const document = sharedBorderDocument()
  document.polities.push({
    id: 'county',
    name: 'County',
    rank: 'county',
    status: 'country',
    suzerain: 'hre',
    existsFrom: null,
    existsTo: null,
    colour: null,
    wikidata: null,
  })
  return createCartographerStore({
    edition: { document, clone: cloneYearDocument },
    viewport: { viewport: UNFRAMED },
  })
}

const INSIDE_EMPIRE: [number, number][] = [
  [2.5, 47.5],
  [3.5, 47.5],
  [3.5, 46.5],
  [2.5, 46.5],
]

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('scriptedActions', () => {
  describe('happy path', () => {
    it('places a ring as one step, carved out of the suzerain, and one undo takes it all back', () => {
      const store = openStore()
      const anchors = store.getState().document.anchors.length

      const answer = store.getState().placeRing('county', INSIDE_EMPIRE, PLACE)

      expect(answer).toMatchObject({ ok: true, carved: 'hre', created: 4 })
      expect(store.getState().undoLabel).toBe('place a ring')
      store.getState().undo()
      const { document } = store.getState()
      expect(document.claims.find((claim) => claim.polity === 'county')).toBeUndefined()
      expect(document.claims.find((claim) => claim.polity === 'hre')?.rings).toHaveLength(1)
      expect(document.anchors).toHaveLength(anchors)
    })

    it('replaces a shared run as one step, both neighbours following, and one undo puts it back', () => {
      const store = openStore()

      const answer = store.getState().replaceRun(1, 2, [[2.5, 47]], REPLACE)

      expect(answer.ok).toBe(true)
      expect(store.getState().undoLabel).toBe('replace a run')
      store.getState().undo()
      for (const claim of store.getState().document.claims)
        expect(claim.rings[0]).not.toContain(answer.ring[1])
    })
  })

  describe('managed errors', () => {
    it('records nothing for a refused ring, and says why in the console', () => {
      const store = openStore()

      const answer = store.getState().placeRing('nobody', INSIDE_EMPIRE, PLACE)

      expect(answer.ok).toBe(false)
      expect(store.getState().canUndo).toBe(false)
      expect(console.warn).toHaveBeenCalledWith(
        '[Cartographer] placeRing refused: no polity "nobody" on this map'
      )
    })

    it('records nothing for a refused run, and says why in the console', () => {
      const store = openStore()

      const answer = store.getState().replaceRun(1, 1, [], REPLACE)

      expect(answer.ok).toBe(false)
      expect(store.getState().canUndo).toBe(false)
      expect(console.warn).toHaveBeenCalledWith(
        '[Cartographer] replaceRun refused: the two ends are one anchor'
      )
    })
  })

  describe('edge cases', () => {
    it('says nothing in the console for a gesture done', () => {
      const store = openStore()

      store.getState().placeRing('county', INSIDE_EMPIRE, PLACE)

      expect(console.warn).not.toHaveBeenCalled()
      expect(console.error).not.toHaveBeenCalled()
    })
  })

  // L4: N/A — no async; a copier's throw propagates as every recorded action's (`recorder`).
})
