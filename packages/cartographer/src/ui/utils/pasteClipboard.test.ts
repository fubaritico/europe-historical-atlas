import { describe, expect, it, vi } from 'vitest'

import { MAX_HOMAGE_DEPTH } from '@europe-historical-atlas/core/data/paintOrder'
import { copyPolities, copySheet } from '@europe-historical-atlas/core/editor/clipboard'
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

import type {
  ClipboardContent,
  ClipboardPoint,
  CopiedPoints,
} from '@europe-historical-atlas/core/editor/clipboard'
import type { YearDocument } from '@europe-historical-atlas/core/editor/yearDocument'

// s22-copy-paste.md, « # 1 — a whole polity ».

const WORDS = clipboardWords('fr', '⌘V')

const EYE = { name: 'reported by eye', licence: 'fact' }

/**
 * Points copied as one piece.
 * @param points - the piece's points
 * @param closed - whether it is a whole closed outline
 * @returns the copy
 */
function onePiece(points: ClipboardPoint[], closed = false): CopiedPoints {
  return {
    kind: 'points',
    map: '1100-backup',
    polity: 'Kingdom of Poland',
    pieces: [{ closed, points }],
  }
}

/** France's western edge bent out to 0.5° W, its ends 0.37 km from France's anchors 0 and 3. */
const WEST_BULGE = onePiece([
  { at: [0.005, 48], provenance: EYE },
  { at: [-0.5, 47], provenance: EYE },
  { at: [0.005, 46], provenance: EYE },
])

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
  const {
    document,
    target,
    pastePolities,
    pastePoints,
    chooseTarget,
    raiseWarning,
    askSheetPaste,
  } = store.getState()
  const ids = pasteClipboard({
    content,
    document,
    target,
    pastePolities,
    pastePoints,
    chooseTarget,
    raiseWarning,
    askSheetPaste,
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
    it('merges a piece into the polity selected, one step, and says it', () => {
      const store = storeOn(sharedBorderDocument())
      store.getState().chooseTarget('fr-couronne')
      const { ids, said } = paste(store, WEST_BULGE)

      expect(ids).toEqual(['fr-couronne'])
      expect(said).toEqual([
        'Collé sur Reaume de France : 3 points, dont 0 soudés aux voisins — une partie fondue dans le tracé',
      ])
      expect(store.getState().undoLabel).toBe('Coller des points sur Reaume de France')
      store.getState().undo()
      expect(store.getState().document.claims[0]?.rings[0]).toEqual([0, 1, 2, 3])
    })

    it('names the neighbour who follows the piece', () => {
      const store = storeOn(sharedBorderDocument())
      store.getState().chooseTarget('fr-couronne')
      const { said } = paste(
        store,
        onePiece([
          { at: [2.005, 48], provenance: EYE },
          { at: [2.3, 47], provenance: EYE },
          { at: [2.005, 46], provenance: EYE },
        ])
      )

      expect(said).toEqual([
        'Collé sur Reaume de France : 3 points, dont 0 soudés aux voisins — une partie fondue dans le tracé · Sacrum Imperium le suit aussi',
      ])
    })

    it('adds a whole outline to the polity selected and says how much was welded', () => {
      const store = storeOn(sharedBorderDocument())
      store.getState().chooseTarget('fr-couronne')
      const { said } = paste(
        store,
        onePiece(
          [
            { at: [0.005, 48], provenance: EYE },
            { at: [-1, 48], provenance: EYE },
            { at: [-1, 47], provenance: EYE },
          ],
          true
        )
      )

      expect(said).toEqual([
        'Collé sur Reaume de France : 3 points, dont 1 soudés aux voisins — un tracé ajouté',
      ])
    })

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

      expect(said).toEqual([
        'Le presse-papier est vide : copiez d’abord une entité politique ou des points',
      ])
      expect(store.getState().canUndo).toBe(false)
      expect(warn).toHaveBeenCalledOnce()
      warn.mockRestore()
    })

    it('asks for a polity when points are pasted with none selected, and records nothing', () => {
      const store = storeOn(sharedBorderDocument())
      const { said } = paste(store, WEST_BULGE)

      expect(said).toEqual(['Sélectionnez l’entité sur laquelle coller les points, puis ⌘V'])
      expect(store.getState().canUndo).toBe(false)
    })

    // The dev, 2026-11-05: "you take the nearest point to merge it with" — however far.
    it('merges a piece whose end lies far from the outline, hooked onto the nearest point', () => {
      const store = storeOn(sharedBorderDocument())
      store.getState().chooseTarget('fr-couronne')
      const far = onePiece([
        { at: [-0.5, 48], provenance: EYE },
        { at: [-0.5, 47], provenance: EYE },
        { at: [0.005, 46], provenance: EYE },
      ])
      const { ids, said } = paste(store, far)

      expect(ids).toEqual(['fr-couronne'])
      expect(said[0]).toContain('une partie fondue dans le tracé')
    })

    it('refuses in ⟨retracer⟩’s own words where it would refuse', () => {
      const document = sharedBorderDocument()
      document.runs.push({ run: [0, 1], hand: 'dotted', source: null, note: null })
      const store = storeOn(document)
      store.getState().chooseTarget('fr-couronne')
      // Hooked onto anchors 1 and 3, the smaller side replaces anchor 0, which the dressed run covers.
      const { ids, said } = paste(
        store,
        onePiece([
          { at: [2.001, 48], provenance: EYE },
          { at: [0.5, 47], provenance: EYE },
          { at: [0.005, 46], provenance: EYE },
        ])
      )

      expect(ids).toEqual([])
      expect(store.getState().canUndo).toBe(false)
      expect(said).toEqual([
        'Rien n’est collé sur Reaume de France · Une partie non collée : une frontière réglée à la main longe ce tronçon — effacez-la d’abord dans le panneau Surcharges',
      ])
    })
  })

  // The dev, 2026-11-05: ‹cmd+V› with a sheet on the clipboard opens its dialogue onto the polity selected.
  describe('a sheet', () => {
    it('opens the sheet’s paste onto the polity selected, recording nothing yet', () => {
      const store = storeOn(sharedBorderDocument())
      store.getState().chooseTarget('fr-couronne')
      const { ids } = paste(store, copySheet(sharedBorderDocument(), 'hre', '1100'))

      expect(ids).toEqual([])
      expect(store.getState().sheetPasteFor).toBe('fr-couronne')
      expect(store.getState().canUndo).toBe(false)
    })

    it('asks for a polity when a sheet is pasted with none selected', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const store = storeOn(sharedBorderDocument())
      const { said } = paste(store, copySheet(sharedBorderDocument(), 'hre', '1100'))

      expect(said).toEqual(['Sélectionnez l’entité sur laquelle coller la fiche, puis ⌘V'])
      expect(store.getState().sheetPasteFor).toBeNull()
    })
  })

  describe('unmanaged errors', () => {
    it('throws when the store answers fewer polities than were pasted', () => {
      expect(() =>
        pasteClipboard({
          content: copiedEmpire(),
          document: createYearDocument(1200),
          target: null,
          pastePolities: () => [],
          pastePoints: vi.fn(),
          raiseWarning: vi.fn(),
          askSheetPaste: vi.fn(),
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
        /a ring under its floor of points/
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
