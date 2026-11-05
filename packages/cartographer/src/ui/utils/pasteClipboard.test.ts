import { describe, expect, it, vi } from 'vitest'

import { MAX_HOMAGE_DEPTH } from '@europe-historical-atlas/core/data/paintOrder'
import { copyPolities, copyStretch } from '@europe-historical-atlas/core/editor/clipboard'
import {
  AQUITAINE_IDENTITY,
  sharedBorderDocument,
} from '@europe-historical-atlas/core/editor/documentFixtures'
import {
  cloneYearDocument,
  createYearDocument,
} from '@europe-historical-atlas/core/editor/yearDocument'

import { createCartographerStore } from '../../state/store'
import { UNFRAMED } from '../../viewport/viewport'

import { clipboardWords } from './copySelection'
import { pasteClipboard } from './pasteClipboard'

import type { ClipboardContent } from '@europe-historical-atlas/core/editor/clipboard'
import type { YearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

// s22-copy-paste.md, « # 1 — a whole polity ».

const WORDS = clipboardWords('fr', '⌘V')

/**
 * A store open on a map.
 * @param document - the map
 * @returns the store
 */
function storeOn(document: YearDocument) {
  return createCartographerStore({
    edition: { document, clone: cloneYearDocument },
    viewport: { viewport: UNFRAMED },
  })
}

/**
 * The Empire, copied from the fixture map.
 * @returns the copy
 */
function copiedEmpire(): ClipboardContent {
  const copied = copyPolities(sharedBorderDocument(), ['hre'], '1100-backup')
  if (copied === null) throw new Error('fixture: nothing copied')
  return copied
}

/**
 * Paste into a store, recording what the status bar is told.
 * @param store - the store
 * @param content - what the clipboard holds
 * @returns the pasted ids and the sentences said
 */
function paste(store: ReturnType<typeof storeOn>, content: ClipboardContent | null) {
  const said: string[] = []
  const { pastePolities, chooseTarget } = store.getState()
  const ids = pasteClipboard({
    content,
    pastePolities,
    chooseTarget,
    say: (message) => said.push(message),
    words: WORDS,
  })
  return { ids, said }
}

describe('pasteClipboard', () => {
  describe('happy path', () => {
    it('pastes the polity into the map open, selects it and says what was done', () => {
      const store = storeOn(createYearDocument(1200))
      const { ids, said } = paste(store, copiedEmpire())

      expect(ids).toEqual(['hre'])
      expect(store.getState().target).toBe('hre')
      expect(store.getState().document.polities.map((polity) => polity.name)).toEqual([
        'Sacrum Imperium',
      ])
      expect(said).toEqual([
        'Collé : Sacrum Imperium, de 1100-backup — 4 points, dont 0 soudés aux voisins',
      ])
    })

    it('records the paste as one step, which one undo takes back whole', () => {
      const store = storeOn(createYearDocument(1200))
      paste(store, copiedEmpire())

      expect(store.getState().undoLabel).toBe('Coller Sacrum Imperium')
      store.getState().undo()
      expect(store.getState().document.polities).toEqual([])
      expect(store.getState().document.claims).toEqual([])
    })
  })

  describe('variants', () => {
    it('says a vassal was pasted sovereign when its suzerain is not in the map', () => {
      const source = sharedBorderDocument()
      source.polities.push(AQUITAINE_IDENTITY)
      source.claims.push({ polity: 'aquitaine', rings: [[0, 1, 2]] })
      const copied = copyPolities(source, ['aquitaine'], '1100')
      const { said } = paste(storeOn(createYearDocument(1200)), copied)

      expect(said[0]).toContain(
        ' · Collé souverain : son suzerain, Reaume de France, n’est pas dans cette carte'
      )
    })

    it('pastes two polities as one step, the second welded to the first, the last one selected', () => {
      const store = storeOn(createYearDocument(1200))
      const both = copyPolities(sharedBorderDocument(), ['fr-couronne', 'hre'], '1100-backup')
      const { ids, said } = paste(store, both)

      expect(ids).toEqual(['fr-couronne', 'hre'])
      expect(store.getState().target).toBe('hre')
      expect(said).toEqual([
        'Collé : 2 entités politiques, de 1100-backup — 8 points, dont 2 soudés aux voisins',
      ])
      store.getState().undo()
      expect(store.getState().document.polities).toEqual([])
    })

    it('pastes what it can and says what it refused, selecting the one pasted', () => {
      const target = sharedBorderDocument()
      target.polities = target.polities.filter((polity) => polity.id !== 'hre')
      target.claims = target.claims.filter((claim) => claim.polity !== 'hre')
      const store = storeOn(target)
      const both = copyPolities(sharedBorderDocument(), ['fr-couronne', 'hre'], '1100-backup')
      const { ids, said } = paste(store, both)

      expect(ids).toEqual(['hre'])
      expect(store.getState().target).toBe('hre')
      expect(said).toEqual([
        'Collé : Sacrum Imperium, de 1100-backup — 4 points, dont 2 soudés aux voisins · Reaume de France est déjà dans cette carte : deux entités politiques ne peuvent pas porter le même nom — rien n’est collé',
      ])
    })
  })

  describe('managed errors', () => {
    it('refuses a polity whose name is already in the map, records nothing and says why', () => {
      const store = storeOn(sharedBorderDocument())
      const { ids, said } = paste(store, copiedEmpire())

      expect(ids).toEqual([])
      expect(store.getState().canUndo).toBe(false)
      expect(said).toEqual([
        'Sacrum Imperium est déjà dans cette carte : deux entités politiques ne peuvent pas porter le même nom — rien n’est collé',
      ])
    })

    it('refuses a vassal its suzerain would seat too deep, and says so with the suzerain’s name', () => {
      const target = createYearDocument(1200)
      for (let depth = 0; depth <= MAX_HOMAGE_DEPTH; depth += 1) {
        target.polities.push({
          ...AQUITAINE_IDENTITY,
          id: `link-${String(depth)}`,
          name: `Link ${String(depth)}`,
          suzerain: depth === 0 ? null : `link-${String(depth - 1)}`,
        })
      }
      const deepest = `Link ${String(MAX_HOMAGE_DEPTH)}`
      const { ids, said } = paste(storeOn(target), {
        kind: 'polities',
        map: '1100',
        polities: [
          {
            polity: { ...AQUITAINE_IDENTITY, suzerain: 'elsewhere' },
            suzerainName: deepest,
            rings: [],
          },
        ],
      })

      expect(ids).toEqual([])
      expect(said).toEqual([
        `Duché d’Aquitaine n’est pas collé : son suzerain, ${deepest}, le placerait trop bas dans la chaîne d’hommage`,
      ])
    })

    it('says the clipboard is empty, and records nothing', () => {
      const store = storeOn(createYearDocument(1200))
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const { said } = paste(store, null)

      expect(said).toEqual(['Le presse-papier est vide : copiez d’abord une entité politique'])
      expect(store.getState().canUndo).toBe(false)
      expect(warn).toHaveBeenCalledOnce()
      warn.mockRestore()
    })

    it('says a stretch cannot be pasted yet, and records nothing', () => {
      const stretch = copyStretch(sharedBorderDocument(), [1, 2], '1100', 'hre')
      if (typeof stretch === 'string') throw new Error('fixture: no stretch')
      const store = storeOn(createYearDocument(1200))
      const { said } = paste(store, stretch)

      expect(said).toEqual([
        'Coller un tronçon n’est pas encore possible : copiez une entité politique',
      ])
      expect(store.getState().canUndo).toBe(false)
    })
  })

  describe('unmanaged errors', () => {
    it('throws when the store answers fewer polities than were pasted', () => {
      expect(() =>
        pasteClipboard({
          content: copiedEmpire(),
          pastePolities: () => [],
          chooseTarget: vi.fn(),
          say: vi.fn(),
          words: WORDS,
        })
      ).toThrow(/gave no answer/)
    })

    it('puts the map back, records nothing and throws again when a paste fails after writing', () => {
      // The second polity's ring of two points is a defect `pastePolity` throws on — after the first was written.
      const store = storeOn(createYearDocument(1200))
      const empire = copyPolities(sharedBorderDocument(), ['hre'], '1100')?.polities[0]
      if (empire === undefined) throw new Error('fixture: nothing copied')
      const broken = {
        ...empire,
        polity: { ...empire.polity, id: 'broken', name: 'Broken' },
        rings: [empire.rings[0]?.slice(0, 2) ?? []],
      }
      const { pastePolities } = store.getState()

      expect(() => pastePolities([empire, broken], { kind: 'paste-polities', label: 'x' })).toThrow(
        /fewer than 3 points/
      )
      expect(store.getState().document.polities).toEqual([])
      expect(store.getState().document.anchors).toEqual([])
      expect(store.getState().canUndo).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('refuses the second paste of one polity into the same map', () => {
      const store = storeOn(createYearDocument(1200))
      paste(store, copiedEmpire())
      const { ids } = paste(store, copiedEmpire())

      expect(ids).toEqual([])
      expect(store.getState().document.polities).toHaveLength(1)
    })
  })
})
