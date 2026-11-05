import type { Command, ShortcutText } from '../../../i18n/commandKeys'
import type { ActionMessageKey } from '../../i18n/actions'
import type { Translate } from '@europe-historical-atlas/core/i18n/catalogue'

/** What the menus read of the editor: the history, the selection, the clipboard. */
export interface EditorMenuState {
  /** The gesture an undo would take back, or `null`. */
  undoLabel: string | null
  /** The gesture a redo would apply again, or `null`. */
  redoLabel: string | null
  /** The name of the polity selected, or `null` when none is. */
  selected: string | null
  /** Whether something is selected that ‹cmd+C› copies — a polity, or two anchors and more. */
  canCopy: boolean
  /** Whether the clipboard holds polities, which « Coller les entités » pastes. */
  canPastePolities: boolean
  /** Whether the clipboard holds points and a polity is selected, which « Coller les points sur … » pastes onto. */
  canPastePoints: boolean
}

/** What the menus' commands do. */
export interface EditorMenuGestures {
  /** *Open…*. */
  onOpen: () => void
  /** *Save*. */
  onSave: () => void
  /** *Save as…*. */
  onSaveAs: () => void
  /** *Save a copy*. */
  onSaveCopy: () => void
  /** Undo, the gesture in progress first. */
  onUndo: () => void
  /** Redo. */
  onRedo: () => void
  /** Copy what is selected. */
  onCopy: () => void
  /** Paste what the clipboard holds. */
  onPaste: () => void
  /** Select every point of the polity selected. */
  onSelectAll: () => void
}

/** The words and the keys the menus are written with. */
export interface EditorMenuWords {
  /** The shared actions' labels. */
  action: Translate<ActionMessageKey>
  /** A command's shortcut, as this system writes it. */
  shortcut: (command: Command) => ShortcutText
}
