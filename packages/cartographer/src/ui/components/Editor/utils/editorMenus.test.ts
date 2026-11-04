import { describe, expect, it, vi } from 'vitest'

import { createTranslator } from '@europe-historical-atlas/core/i18n/catalogue'

import { shortcutText } from '../../../../i18n/commandKeys'
import { ACTION_MESSAGES } from '../../../i18n/actions'

import { editorMenus } from './editorMenus'

import type { MenuCommand, MenuDefinition } from '../../MenuBar'
import type { EditorMenuGestures, EditorMenuState } from '../editorMenusProps'

/** The French words, on a Mac. */
const WORDS = {
  action: createTranslator(ACTION_MESSAGES, 'fr'),
  shortcut: (command: Parameters<typeof shortcutText>[0]) => shortcutText(command, 'mac', 'fr'),
}

/**
 * Gestures that record nothing.
 * @returns the gestures
 */
function gestures(): EditorMenuGestures {
  return {
    onOpen: vi.fn(),
    onSave: vi.fn(),
    onSaveAs: vi.fn(),
    onSaveCopy: vi.fn(),
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onCopy: vi.fn(),
  }
}

/**
 * The menus for a state, nothing in the history and nothing selected unless said.
 * @param over - what to change
 * @param to - the gestures
 * @returns the menus
 */
function menus(over: Partial<EditorMenuState> = {}, to = gestures()): MenuDefinition[] {
  return editorMenus(
    { undoLabel: null, redoLabel: null, selected: null, canCopy: false, ...over },
    to,
    WORDS
  )
}

/**
 * A command of a menu, by its id.
 * @param all - the menus
 * @param id - the command
 * @returns the command
 */
function find(all: MenuDefinition[], id: string): MenuCommand {
  const found = all.flatMap((menu) => menu.entries).find((entry) => entry.id === id)
  if (found?.kind !== 'command') throw new Error(`no command ${id}`)
  return found
}

describe('editorMenus', () => {
  describe('happy path', () => {
    it('gives Fichier and Édition, left to right', () => {
      expect(menus().map((menu) => menu.label)).toEqual(['Fichier', 'Édition'])
    })

    it('shows each command of Fichier with its keys, Save a copy with none', () => {
      const file = menus()[0]?.entries.map((entry) =>
        entry.kind === 'command' ? [entry.label, entry.keys?.shown ?? null] : null
      )

      expect(file).toEqual([
        ['Ouvrir…', '⌘O'],
        ['Enregistrer', '⌘S'],
        ['Enregistrer sous…', '⇧⌘S'],
        ['Enregistrer une copie', null],
      ])
    })
  })

  describe('variants', () => {
    it('names undo and redo after the steps they would take back or apply', () => {
      const all = menus({ undoLabel: 'Créer France', redoLabel: 'Déplacer 3 ancres' })

      expect([find(all, 'undo').label, find(all, 'redo').label]).toEqual([
        'Annuler Créer France',
        'Rétablir Déplacer 3 ancres',
      ])
    })

    it('runs the gesture a command is chosen for', () => {
      const to = gestures()
      find(menus({ canCopy: true }, to), 'copy').onChoose()

      expect(to.onCopy).toHaveBeenCalledOnce()
    })

    it('names the polity selected in the pastes onto a polity', () => {
      expect(find(menus({ selected: 'Kingdom of Poland' }), 'pasteSheet').label).toBe(
        'Coller la fiche sur Kingdom of Poland…'
      )
    })

    it('shows the pastes with their keys, ⌘V, ⇧⌘V and ⌥⌘V', () => {
      const all = menus()

      expect(
        ['pastePolities', 'pasteSheet', 'pasteOutline'].map((id) => find(all, id).keys?.shown)
      ).toEqual(['⌘V', '⇧⌘V', '⌥⌘V'])
    })
  })

  describe('managed errors', () => {
    it('greys undo and redo with nothing to undo or redo, named by the bare verb', () => {
      const all = menus()

      expect(
        [find(all, 'undo'), find(all, 'redo')].map((each) => [each.label, each.enabled])
      ).toEqual([
        ['Annuler', false],
        ['Rétablir', false],
      ])
    })

    it('greys Copier with nothing selected', () => {
      expect(find(menus(), 'copy').enabled).toBe(false)
    })

    it('greys every paste, not built yet, and names the selection when none is', () => {
      const all = menus()
      const pastes = ['pastePolities', 'pasteStretch', 'pasteSheet', 'pasteOutline'].map((id) =>
        find(all, id)
      )

      expect(pastes.every((each) => !each.enabled)).toBe(true)
      expect(find(all, 'pasteStretch').label).toBe('Coller le tronçon sur l’entité sélectionnée')
    })
  })

  // L4: N/A — built from literals; the words are tested by their catalogue.

  describe('edge cases', () => {
    it('parts the history from the clipboard by a separator', () => {
      const kinds = menus()[1]?.entries.map((entry) => entry.kind)

      expect(kinds?.slice(0, 4)).toEqual(['command', 'command', 'separator', 'command'])
    })
  })
})
