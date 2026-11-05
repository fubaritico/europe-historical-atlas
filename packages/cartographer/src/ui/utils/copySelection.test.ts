import { afterEach, describe, expect, it, vi } from 'vitest'

import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'

import {
  answerCopyRequest,
  clipboardWords,
  copySelection,
  copySheetOfSelection,
  heldSentence,
} from './copySelection'

import type { CopyDeps, CopySelection } from './copySelection'
import type { ClipboardContent } from '@europe-historical-atlas/core/editor/clipboard'

/**
 * What a copy reads, France aimed at and nothing else selected unless said.
 * @param over - what to change
 * @returns the selection
 */
function selection(over: Partial<CopySelection> = {}): CopySelection {
  return { document: sharedBorderDocument(), target: 'fr-couronne', selectedAnchors: [], ...over }
}

/**
 * Where a copy goes: a keeper that records, a status bar that records, the French words.
 * @param keeps - whether the storage accepts the copy
 * @returns the deps, and what they recorded
 */
function deps(keeps = true): CopyDeps & { kept: ClipboardContent[]; said: string[] } {
  const kept: ClipboardContent[] = []
  const said: string[] = []
  return {
    kept,
    said,
    map: '1100-backup-2026-11-02',
    keep: (content) => {
      if (keeps) kept.push(content)
      return keeps
    },
    say: (message) => {
      said.push(message)
    },
    words: clipboardWords('fr', '⌘V'),
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('copySelection', () => {
  describe('happy path', () => {
    it('copies the polity selected and says it, with the map and the paste key', () => {
      const to = deps()
      copySelection(selection(), to)

      expect(to.kept.map((each) => each.kind)).toEqual(['polities'])
      expect(to.said).toEqual([
        'Copié : Reaume de France, de 1100-backup-2026-11-02 — ⌘V dans une autre carte pour coller',
      ])
    })

    it('copies two anchors that follow one another as points, rather than the polity', () => {
      const to = deps()
      copySelection(selection({ selectedAnchors: [1, 2] }), to)

      expect(to.kept.map((each) => each.kind)).toEqual(['points'])
      expect(to.said).toEqual([
        'Copié : 2 points de Reaume de France, de 1100-backup-2026-11-02 — sélectionnez une entité, puis ⌘V',
      ])
    })

    // The dev, 2026-11-05: "it's the points we want" — whatever they make.
    it('copies the points of a whole outline and of part of another, and counts them all', () => {
      const to = deps()
      copySelection(selection({ selectedAnchors: [0, 1, 2, 3, 4, 5] }), to)

      expect(to.said).toEqual([
        'Copié : 6 points de Reaume de France, de 1100-backup-2026-11-02 — sélectionnez une entité, puis ⌘V',
      ])
    })
  })

  describe('variants', () => {
    it('copies the polity when a single anchor is selected, one point being no stretch', () => {
      const to = deps()
      copySelection(selection({ selectedAnchors: [1] }), to)

      expect(to.kept.map((each) => each.kind)).toEqual(['polities'])
    })

    it('says in English what was copied, with the other system’s key', () => {
      const to = { ...deps(), words: clipboardWords('en', 'Ctrl+V') }
      copySelection(selection(), to)

      expect(to.said).toEqual([
        'Copied: Reaume de France, from 1100-backup-2026-11-02 — Ctrl+V in another map to paste',
      ])
    })

    it('says what an opened map’s clipboard holds', () => {
      const to = deps()
      const copy = copySelection(selection(), to)
      if (copy === null) throw new Error('France is copied')

      expect(heldSentence(copy, clipboardWords('fr', '⌘V'))).toBe(
        'Dans le presse-papier : Reaume de France, de 1100-backup-2026-11-02'
      )
    })
  })

  describe('managed errors', () => {
    it('copies nothing and says so when nothing is selected', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const to = deps()

      expect(copySelection(selection({ target: null }), to)).toBeNull()
      expect(to.kept).toEqual([])
      expect(to.said).toEqual(['Sélectionnez une entité politique ou des points à copier'])
    })

    it('copies nothing when the polity aimed at is no longer in the map', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const to = deps()

      expect(copySelection(selection({ target: 'gone' }), to)).toBeNull()
      expect(to.said).toEqual(['Sélectionnez une entité politique ou des points à copier'])
    })

    it('copies nothing and says so when no selected point has a selected neighbour', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const to = deps()

      expect(copySelection(selection({ selectedAnchors: [0, 2] }), to)).toBeNull()
      expect(to.said).toEqual([
        'Aucun de ces points n’a de voisin sélectionné sur un tracé : rien n’est copié',
      ])
    })

    it('copies the pieces and says the point left out alone', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const to = deps()
      const copy = copySelection(selection({ selectedAnchors: [1, 2, 5] }), to)

      expect(copy).toMatchObject({ kind: 'points' })
      expect(to.said[0]).toMatch(/ · un point seul laissé de côté : aucun voisin sélectionné$/)
      expect(warn).toHaveBeenCalledOnce()
    })

    it('copies a whole outline as a closed piece', () => {
      const to = deps()
      const copy = copySelection(selection({ selectedAnchors: [0, 1, 2, 3] }), to)

      expect(copy).toMatchObject({ kind: 'points', pieces: [{ closed: true }] })
      expect(to.said[0]).toMatch(/^Copié : 4 points de Reaume de France/)
    })

    it('says the copy was not kept when the tab’s storage refuses it', () => {
      const to = deps(false)

      expect(copySelection(selection(), to)).toBeNull()
      expect(to.said).toEqual(['La copie n’a pas pu être gardée : rien n’est copié'])
    })
  })

  describe('unmanaged errors', () => {
    it('lets a document whose anchor has no source throw, rather than copy without it', () => {
      const document = sharedBorderDocument()
      document.anchorSource[0] = 9

      expect(() => copySelection(selection({ document }), deps())).toThrow(/cannot be copied/)
    })
  })

  describe('edge cases', () => {
    it('leaves the map as it was', () => {
      const document = sharedBorderDocument()
      const before = JSON.stringify(document)
      copySelection(selection({ document, selectedAnchors: [1, 2] }), deps())

      expect(JSON.stringify(document)).toBe(before)
    })
  })

  // The dev, 2026-11-05: ‹shift+cmd+C› copies the polity selected's sheet alone.
  describe('the sheet alone', () => {
    it('copies the sheet of the polity selected, says it, and an opened map says it held', () => {
      const to = deps()
      const copy = copySheetOfSelection(selection({ selectedAnchors: [1, 2] }), to)
      if (copy === null) throw new Error('France’s sheet is copied')

      expect(copy.kind).toBe('sheet')
      expect(to.said).toEqual([
        'Copié : la fiche de Reaume de France, de 1100-backup-2026-11-02 — sélectionnez une entité, puis ⌘V',
      ])
      expect(heldSentence(copy, clipboardWords('fr', '⌘V'))).toBe(
        'Dans le presse-papier : la fiche de Reaume de France, de 1100-backup-2026-11-02'
      )
    })

    it('copies nothing with no polity selected, and says so', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const to = deps()

      expect(copySheetOfSelection(selection({ target: null }), to)).toBeNull()
      expect(to.said).toEqual(['Sélectionnez une entité politique ou des points à copier'])
    })
  })

  // Review ARCH-002, 2026-11-05: a polity's menu copies the polity whole, even with points selected.
  describe('a polity’s menu', () => {
    it('copies the polity whole with points selected, which ‹cmd+C› would copy instead', () => {
      const to = deps()

      expect(answerCopyRequest(selection({ selectedAnchors: [1, 2] }), 'all', to)?.kind).toBe(
        'polities'
      )
    })

    it('copies the sheet alone', () => {
      expect(answerCopyRequest(selection(), 'sheet', deps())?.kind).toBe('sheet')
    })
  })
})
