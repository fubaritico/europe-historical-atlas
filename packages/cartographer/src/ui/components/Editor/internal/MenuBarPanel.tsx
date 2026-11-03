import { useShortcut } from '../../../hooks/useShortcut'
import { useTranslation } from '../../../hooks/useTranslation'
import { ACTION_MESSAGES } from '../../../i18n/actions'
import { MenuBar } from '../../MenuBar'
import { EDITOR_MESSAGES } from '../i18n'
import { editorMenus } from '../utils/editorMenus'

import type { HistoryRelay } from '../../../../canvas/history/historyRelay'
import type { CartographerStoreHook } from '../../../../state/store'
import type { EditorMenuGestures } from '../editorMenusProps'

/** What the menu bar's binding needs: the store, the canvas's history, and the gestures of the maps and the copy. */
export interface MenuBarPanelProps extends Omit<EditorMenuGestures, 'onUndo' | 'onRedo'> {
  /** The store the history's state and the selection are read from. */
  store: CartographerStoreHook
  /** The canvas's undo and redo, gesture first — never `store.undo()` straight (ARCH-101). */
  history: HistoryRelay
}

/**
 * The menu bar, bound to the store (CARTO-345): the one place it knows there is a store. `MenuBar` takes menus; this
 * reads the history and the selection and builds them (`utils/editorMenus`).
 * @param props - the store, the relay and the gestures
 * @param props.store - the store
 * @param props.history - the canvas's undo and redo
 * @returns the menu bar
 */
export function MenuBarPanel({ store, history, ...gestures }: MenuBarPanelProps) {
  // Store
  const undoLabel = store((state) => state.undoLabel)
  const redoLabel = store((state) => state.redoLabel)
  const anchors = store((state) => state.selectedAnchors.length)
  // A string, compared by value: run again at every change of the store, so a renamed polity is seen at once.
  const selected = store(
    (state) => state.document.polities.find((each) => each.id === state.target)?.name ?? null
  )

  // Context
  const t = useTranslation(EDITOR_MESSAGES)
  const action = useTranslation(ACTION_MESSAGES)
  const shortcut = useShortcut()

  // Handlers
  const handleUndo = () => {
    history.run('undo')
  }
  const handleRedo = () => {
    history.run('redo')
  }

  // Derived
  const menus = editorMenus(
    { undoLabel, redoLabel, selected, canCopy: selected !== null || anchors >= 2 },
    { ...gestures, onUndo: handleUndo, onRedo: handleRedo },
    { action, shortcut }
  )

  // Render
  return <MenuBar label={t('menuBar')} menus={menus} />
}
