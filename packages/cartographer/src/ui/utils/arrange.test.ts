import { afterEach, describe, expect, it, vi } from 'vitest'

import { cloneYearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

import { openEmptyYear } from '../../state/openEmptyYear'
import { createCartographerStore } from '../../state/store'
import { UNFRAMED } from '../../viewport/viewport'

import { arrangePolity, arrangeSelected, arrangeWords } from './arrange'

/** The commands' words, in English — the language these sentences were written against. */
const WORDS = arrangeWords('en')

const polity = (id: string, name: string) => ({
  id,
  name,
  rank: null,
  status: null,
  suzerain: null,
  existsFrom: null,
  existsTo: null,
  colour: null,
  wikidata: null,
})

/** France at the back, the Empire in front. */
function twoPolities() {
  const store = createCartographerStore({
    edition: { document: openEmptyYear(1100), clone: cloneYearDocument },
    viewport: { viewport: UNFRAMED },
  })
  store.getState().createPolity(polity('fr', 'Reaume de France'), { kind: 'c', label: 'c' })
  store.getState().createPolity(polity('hre', 'Sacrum Imperium'), { kind: 'c', label: 'c' })
  return store
}

const order = (store: ReturnType<typeof twoPolities>) =>
  store.getState().document.polities.map((held) => held.id)

afterEach(() => {
  vi.restoreAllMocks()
})

describe('arrangeSelected', () => {
  describe('happy path', () => {
    it('brings the selected polity forward as one named step, and says so', () => {
      const store = twoPolities()
      store.getState().chooseTarget('fr')
      const said: string[] = []
      arrangeSelected(store.getState(), 'forward', (message) => said.push(message), WORDS)
      expect(order(store)).toEqual(['hre', 'fr'])
      expect(store.getState().undoLabel).toBe('bring forward — Reaume de France')
      expect(said).toEqual(['Bring Forward — Reaume de France'])
    })
  })

  describe('variants', () => {
    it('sends the selected polity to the back', () => {
      const store = twoPolities()
      store.getState().chooseTarget('hre')
      arrangeSelected(store.getState(), 'back', vi.fn(), WORDS)
      expect(order(store)).toEqual(['hre', 'fr'])
    })

    it('names the step and says it in French on a French page', () => {
      const store = twoPolities()
      store.getState().chooseTarget('fr')
      const said: string[] = []
      arrangeSelected(
        store.getState(),
        'front',
        (message) => said.push(message),
        arrangeWords('fr')
      )
      expect(store.getState().undoLabel).toBe('premier plan — Reaume de France')
      expect(said).toEqual(['Premier plan — Reaume de France'])
    })
  })

  describe('managed errors', () => {
    it('says to select a polity when none is, and records nothing', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const store = twoPolities()
      const said: string[] = []
      arrangeSelected(store.getState(), 'front', (message) => said.push(message), WORDS)
      expect(said).toEqual(['Select a polity to bring to front'])
      expect(order(store)).toEqual(['fr', 'hre'])
      expect(warn).toHaveBeenCalled()
    })

    it('says a polity already at the front stays there, and records nothing', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const store = twoPolities()
      store.getState().chooseTarget('hre')
      const label = store.getState().undoLabel
      const said: string[] = []
      arrangeSelected(store.getState(), 'front', (message) => said.push(message), WORDS)
      expect(said).toEqual(['Bring to Front — Sacrum Imperium: already in place'])
      expect(store.getState().undoLabel).toBe(label)
      expect(warn).toHaveBeenCalled()
    })
  })

  describe('unmanaged errors', () => {
    it('says loudly when the document refuses a move it was offered', () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const said: string[] = []
      const moved = arrangePolity(
        () => false,
        { id: 'fr', name: 'France' },
        'back',
        (message) => said.push(message),
        WORDS
      )
      expect(moved).toBe(false)
      expect(said).toEqual([])
      expect(error).toHaveBeenCalledWith(
        '[Cartographer] the document refused the move "back" of France.'
      )
    })
  })

  describe('edge cases', () => {
    it('treats a selection naming a polity no longer in the year as no selection', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const store = twoPolities()
      store.getState().chooseTarget('gone')
      const said: string[] = []
      arrangeSelected(store.getState(), 'back', (message) => said.push(message), WORDS)
      expect(said).toEqual(['Select a polity to send to back'])
    })
  })
})
