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
    onPaste: vi.fn(),
    onSelectAll: vi.fn(),
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
    {
      undoLabel: null,
      redoLabel: null,
      selected: null,
      canCopy: false,
      canPastePolities: false,
      canPastePoints: false,
      ...over,
    },
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

    it('shows the pastes with their keys, ⌘V and ⇧⌘V', () => {
      const all = menus()

      expect(
        ['pastePolities', 'pastePoints', 'pasteSheet'].map((id) => find(all, id).keys?.shown)
      ).toEqual(['⌘V', '⌘V', '⇧⌘V'])
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

    it('lights « Coller les entités » when the clipboard holds polities, and pastes through the gesture', () => {
      const to = gestures()
      const paste = find(menus({ canPastePolities: true }, to), 'pastePolities')
      paste.onChoose()

      expect(paste.enabled).toBe(true)
      expect(to.onPaste).toHaveBeenCalledOnce()
    })

    it('keeps the paste of points and the sheet greyed while the clipboard holds polities', () => {
      const all = menus({ canPastePolities: true, selected: 'Kingdom of Poland' })

      expect(['pastePoints', 'pasteSheet'].map((id) => find(all, id).enabled)).toEqual([
        false,
        false,
      ])
    })

    it('lights « Coller les points sur … » for points held, the polity selected named', () => {
      const to = gestures()
      const paste = find(
        menus({ canPastePoints: true, selected: 'Kingdom of Poland' }, to),
        'pastePoints'
      )
      paste.onChoose()

      expect([paste.enabled, paste.label]).toEqual([
        true,
        'Coller les points sur Kingdom of Poland',
      ])
      expect(to.onPaste).toHaveBeenCalledOnce()
    })

    // open-outlines.md, the dev, 2026-11-05: ‹cmd+A›, its scope the polity selected, named in the menu.
    it('offers « Tout sélectionner » with the polity selected named, under ⌘A', () => {
      const to = gestures()
      const all = find(menus({ selected: 'Republic of Venice' }, to), 'selectAll')
      all.onChoose()

      expect([all.enabled, all.label, all.keys?.shown]).toEqual([
        true,
        'Tout sélectionner : Republic of Venice',
        '⌘A',
      ])
      expect(to.onSelectAll).toHaveBeenCalledOnce()
    })

    it('greys « Tout sélectionner » with no polity selected', () => {
      const all = find(menus({ selected: null }, gestures()), 'selectAll')

      expect([all.enabled, all.label]).toEqual([false, 'Tout sélectionner'])
    })

    it('no longer offers « Coller le tracé », struck by the dev', () => {
      expect(menus()[1]?.entries.some((entry) => entry.id === 'pasteOutline')).toBe(false)
    })

    it('greys every paste with an empty clipboard, and names the selection when none is', () => {
      const all = menus()
      const pastes = ['pastePolities', 'pastePoints', 'pasteSheet'].map((id) => find(all, id))

      expect(pastes.every((each) => !each.enabled)).toBe(true)
      expect(find(all, 'pastePoints').label).toBe('Coller les points sur l’entité sélectionnée')
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
