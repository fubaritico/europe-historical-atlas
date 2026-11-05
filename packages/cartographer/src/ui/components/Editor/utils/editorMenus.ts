import type { MenuDefinition, MenuEntry } from '../../MenuBar'
import type { EditorMenuGestures, EditorMenuState, EditorMenuWords } from '../editorMenusProps'

/**
 * The *Fichier* menu: the four gestures of the maps on disk (`s19`).
 * @param gestures - what they do
 * @param words - the words and the keys
 * @returns the menu
 */
function fileMenu(gestures: EditorMenuGestures, words: EditorMenuWords): MenuDefinition {
  const { action, shortcut } = words
  return {
    id: 'file',
    label: action('menuFile'),
    entries: [
      {
        kind: 'command',
        id: 'open',
        label: action('open'),
        keys: shortcut('open'),
        enabled: true,
        onChoose: gestures.onOpen,
      },
      {
        kind: 'command',
        id: 'save',
        label: action('save'),
        keys: shortcut('save'),
        enabled: true,
        onChoose: gestures.onSave,
      },
      {
        kind: 'command',
        id: 'saveAs',
        label: action('saveAs'),
        keys: shortcut('saveAs'),
        enabled: true,
        onChoose: gestures.onSaveAs,
      },
      {
        kind: 'command',
        id: 'saveCopy',
        label: action('saveCopy'),
        keys: null,
        enabled: true,
        onChoose: gestures.onSaveCopy,
      },
    ],
  }
}

/**
 * The copies of the *Édition* menu (the dev, 2026-11-05): « Copier », the polity whole or the points selected, under
 * ‹cmd+C›; « Copier la fiche », the polity selected's sheet alone, under ‹shift+cmd+C›.
 * @param state - what is selected
 * @param gestures - what they do
 * @param words - the words and the keys
 * @returns the two copies
 */
function copyEntries(
  state: EditorMenuState,
  gestures: EditorMenuGestures,
  words: EditorMenuWords
): MenuEntry[] {
  const { action, shortcut } = words
  return [
    {
      kind: 'command',
      id: 'copy',
      label: action('copy'),
      keys: shortcut('copy'),
      enabled: state.canCopy,
      onChoose: gestures.onCopy,
    },
    {
      kind: 'command',
      id: 'copySheet',
      label: action('copySheet'),
      keys: shortcut('copySheet'),
      enabled: state.selected !== null,
      onChoose: gestures.onCopySheet,
    },
  ]
}

/**
 * « Tout sélectionner » — its scope the polity selected, named, so the author sees whose points it takes (the dev,
 * 2026-11-05, `open-outlines.md`); greyed with none selected.
 * @param selected - the polity selected's name, or `null`
 * @param onSelectAll - what it does
 * @param words - the words and the keys
 * @returns the entry
 */
function selectAllEntry(
  selected: string | null,
  onSelectAll: () => void,
  words: EditorMenuWords
): MenuEntry {
  const { action, shortcut } = words
  return {
    kind: 'command',
    id: 'selectAll',
    label: selected === null ? action('selectAll') : action('selectAllOf', { name: selected }),
    keys: shortcut('selectAll'),
    enabled: selected !== null,
    onChoose: onSelectAll,
  }
}

/**
 * The *Édition* menu: the history, copying, and the pastes.
 * @param state - the history, the selection
 * @param gestures - what they do
 * @param words - the words and the keys
 * @returns the menu
 */
function editMenu(
  state: EditorMenuState,
  gestures: EditorMenuGestures,
  words: EditorMenuWords
): MenuDefinition {
  const { action, shortcut } = words
  const undo =
    state.undoLabel === null ? action('undo') : action('undoStep', { step: state.undoLabel })
  const redo =
    state.redoLabel === null ? action('redo') : action('redoStep', { step: state.redoLabel })
  return {
    id: 'edit',
    label: action('menuEdit'),
    entries: [
      {
        kind: 'command',
        id: 'undo',
        label: undo,
        keys: shortcut('undo'),
        enabled: state.undoLabel !== null,
        onChoose: gestures.onUndo,
      },
      {
        kind: 'command',
        id: 'redo',
        label: redo,
        keys: shortcut('redo'),
        enabled: state.redoLabel !== null,
        onChoose: gestures.onRedo,
      },
      { kind: 'separator', id: 'history' },
      ...copyEntries(state, gestures, words),
      selectAllEntry(state.selected, gestures.onSelectAll, words),
      { kind: 'separator', id: 'clipboard' },
      // One paste, named after what the clipboard holds (the dev, 2026-11-05: « le menu Edit s'adapte »).
      {
        kind: 'command',
        id: 'paste',
        label: state.paste.label,
        keys: shortcut('paste'),
        enabled: state.paste.enabled,
        onChoose: gestures.onPaste,
      },
    ],
  }
}

/**
 * The Cartographer's menus, left to right — *Fichier*, *Édition* (CARTO-345, `files/plans/cartographer/
 * copy-paste-between-maps.md`, « The menu bar »).
 * @param state - what the menus read of the editor
 * @param gestures - what their commands do
 * @param words - the words and the keys
 * @returns the menus
 */
export function editorMenus(
  state: EditorMenuState,
  gestures: EditorMenuGestures,
  words: EditorMenuWords
): MenuDefinition[] {
  return [fileMenu(gestures, words), editMenu(state, gestures, words)]
}
