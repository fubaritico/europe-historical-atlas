import { afterEach, describe, expect, it, vi } from 'vitest'

import { sharedBorderDocument } from '@europe-historical-atlas/core/editor/documentFixtures'

import { clipboardWords, copySelection, heldSentence } from './copySelection'

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

    it('copies two anchors that follow one another as a stretch, rather than the polity', () => {
      const to = deps()
      copySelection(selection({ selectedAnchors: [1, 2] }), to)

      expect(to.kept.map((each) => each.kind)).toEqual(['stretch'])
      expect(to.said).toEqual([
        'Copié : un tronçon de Reaume de France, 2 points, de 1100-backup-2026-11-02 — sélectionnez une entité, puis ⌘V',
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
      expect(to.said).toEqual(['Sélectionnez une entité politique ou un tronçon à copier'])
    })

    it('copies nothing when the polity aimed at is no longer in the map', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const to = deps()

      expect(copySelection(selection({ target: 'gone' }), to)).toBeNull()
      expect(to.said).toEqual(['Sélectionnez une entité politique ou un tronçon à copier'])
    })

    it('copies nothing and says so when the anchors do not follow one another', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined)
      const to = deps()

      expect(copySelection(selection({ selectedAnchors: [0, 2] }), to)).toBeNull()
      expect(to.said).toEqual([
        'Ces points ne se suivent pas sur un même contour : rien n’est copié',
      ])
    })

    it('copies the whole outline as a closed stretch, a whole outline being a stretch like any other', () => {
      const to = deps()
      const copy = copySelection(selection({ selectedAnchors: [0, 1, 2, 3] }), to)

      expect(copy).toMatchObject({ kind: 'stretch', closed: true })
      expect(to.said[0]).toMatch(/^Copié : un tronçon de Reaume de France, 4 points/)
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
})
