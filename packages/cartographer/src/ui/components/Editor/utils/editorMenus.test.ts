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
    onCopySheet: vi.fn(),
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
      paste: { label: 'Coller', enabled: false },
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

    // The dev, 2026-11-05: one paste, named after what the clipboard holds (`ui/utils/pasteCommand`).
    it('shows the one paste as the state names it, under ⌘V, and pastes through the gesture', () => {
      const to = gestures()
      const paste = find(
        menus({ paste: { label: 'Coller la fiche de Venise sur Venise…', enabled: true } }, to),
        'paste'
      )
      paste.onChoose()

      expect([paste.label, paste.enabled, paste.keys?.shown]).toEqual([
        'Coller la fiche de Venise sur Venise…',
        true,
        '⌘V',
      ])
      expect(to.onPaste).toHaveBeenCalledOnce()
    })

    it('offers « Copier la fiche » under ⇧⌘C for the polity selected', () => {
      const to = gestures()
      const copy = find(menus({ selected: 'Republic of Venice' }, to), 'copySheet')
      copy.onChoose()

      expect([copy.label, copy.enabled, copy.keys?.shown]).toEqual(['Copier la fiche', true, '⇧⌘C'])
      expect(to.onCopySheet).toHaveBeenCalledOnce()
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

    it('greys « Copier la fiche » with no polity selected', () => {
      expect(find(menus(), 'copySheet').enabled).toBe(false)
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

    it('greys the paste with an empty clipboard', () => {
      expect([find(menus(), 'paste').label, find(menus(), 'paste').enabled]).toEqual([
        'Coller',
        false,
      ])
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
