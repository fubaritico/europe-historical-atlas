import type { MenuDefinition, MenuEntry } from '../../MenuBar'
import type { EditorMenuGestures, EditorMenuState, EditorMenuWords } from '../editorMenusProps'

/**
 * A paste not built yet (CARTO-345, steps 3 to 6). **Never reached while its command is greyed** — the menu bar runs no
 * greyed command (`MenuBar/utils/commandToRun`); it is here so the day a paste is enabled without being wired, the
 * console says so rather than nothing.
 */
function notYet(): void {
  console.warn('[Cartographer] this paste is not built yet.')
}

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
 * The pastes of the *Édition* menu — greyed until each is built (CARTO-345, steps 3 to 6).
 * @param name - the polity a paste onto a polity names
 * @param words - the words and the keys
 * @returns the four pastes
 */
function pasteEntries(name: string, words: EditorMenuWords): MenuEntry[] {
  const { action, shortcut } = words
  return [
    {
      kind: 'command',
      id: 'pastePolities',
      label: action('pastePolities'),
      keys: shortcut('paste'),
      enabled: false,
      onChoose: notYet,
    },
    {
      kind: 'command',
      id: 'pasteStretch',
      label: action('pasteStretch', { name }),
      keys: shortcut('paste'),
      enabled: false,
      onChoose: notYet,
    },
    {
      kind: 'command',
      id: 'pasteSheet',
      label: action('pasteSheet', { name }),
      keys: shortcut('pasteSheet'),
      enabled: false,
      onChoose: notYet,
    },
    {
      kind: 'command',
      id: 'pasteOutline',
      label: action('pasteOutline', { name }),
      keys: shortcut('pasteOutline'),
      enabled: false,
      onChoose: notYet,
    },
  ]
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
      {
        kind: 'command',
        id: 'copy',
        label: action('copy'),
        keys: shortcut('copy'),
        enabled: state.canCopy,
        onChoose: gestures.onCopy,
      },
      { kind: 'separator', id: 'clipboard' },
      ...pasteEntries(state.selected ?? action('theSelection'), words),
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
