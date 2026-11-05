import { Menu } from '@fubaritico/react/Menu'

import { STACKING_MOVES } from '@europe-historical-atlas/core/editor/stacking'

import { useShortcut } from '../../hooks/useShortcut'
import { useTranslation } from '../../hooks/useTranslation'
import { ACTION_MESSAGES } from '../../i18n/actions'

import { useDismiss } from './hooks/useDismiss'
import { useInsideWindow } from './hooks/useInsideWindow'
import { POLITY_STACK_MENU_MESSAGES } from './i18n'
import { COPY, COPY_SHEET, EDIT, PASTE, headItems, stackItem } from './utils/stackItem'

import type { ViewportPoint } from '../../../viewport/viewport'
import type { PasteCommand } from '../../utils/pasteCommand'
import type { StackingMove } from '@europe-historical-atlas/core/editor/stacking'

/** How many items come before the four moves: *Edit properties…*, « Copier », « Copier la fiche », the paste. */
const BEFORE_MOVES = 4

/** What the menu shows and reports. Never the store: `PolitiesPanel` reads it and hands literals. */
export interface PolityStackMenuProps {
  /** The polity the commands act on, verbatim — the menu's accessible name. */
  name: string
  /** Where it opens, in viewport pixels — the right-click, or the row for the keyboard. */
  at: ViewportPoint
  /** Which commands would change anything; the others are disabled (`s16`). */
  moves: Record<StackingMove, boolean>
  /** A stacking command was chosen. The menu closes itself afterwards through `onClose`. */
  onChoose: (move: StackingMove) => void
  /** *Edit properties…* was chosen — the polity's dialogue (`s07`). The menu closes itself afterwards. */
  onEdit: () => void
  /** « Copier » was chosen — this polity copied whole, as ‹cmd+C›. */
  onCopy: () => void
  /** « Copier la fiche » was chosen — this polity's sheet alone, as ‹shift+cmd+C›. */
  onCopySheet: () => void
  /** The paste onto this polity, named after what the clipboard holds. */
  paste: PasteCommand
  /** The paste was chosen — onto this polity, as ‹cmd+V›. */
  onPaste: () => void
  /** ‹escape›, a press outside, or a command chosen. */
  onClose: () => void
}

/**
 * The stacking commands of a row of `{Polities}` — `s16`'s context menu.
 *
 * **The design system's `Menu` for the list** — it owns the keyboard (↑ ↓ Home End, ‹enter›, ‹escape›)
 * and skips the disabled commands. It does not place itself (its README: *"N/A — positioning"*), so this
 * shell does, at the point given, and closes on a press outside. Substituting a design-system context
 * menu later is an import change: the props are the contract.
 *
 * Focus goes to the list on opening, so the keyboard works at once; the caller gives it back.
 * @param props - the polity, the point, the enabled moves and the callbacks
 * @param props.name - the polity the commands act on, verbatim — the menu's accessible name
 * @param props.at - where the menu opens, in viewport pixels, kept inside the window
 * @param props.moves - which stacking commands would change anything; the others are disabled
 * @param props.onChoose - applies the stacking command chosen
 * @param props.onEdit - opens the polity's dialogue, after the menu has closed
 * @param props.onCopy - copies this polity whole, after the menu has closed
 * @param props.onCopySheet - copies this polity's sheet alone, after the menu has closed
 * @param props.paste - the paste onto this polity, named after what the clipboard holds
 * @param props.onPaste - pastes onto this polity, after the menu has closed
 * @param props.onClose - closes the menu — ‹escape›, a press outside, or a command chosen
 * @returns the menu
 */
export function PolityStackMenu({
  name,
  at,
  moves,
  onChoose,
  onEdit,
  onCopy,
  onCopySheet,
  paste,
  onPaste,
  onClose,
}: PolityStackMenuProps) {
  // Context
  const t = useTranslation(POLITY_STACK_MENU_MESSAGES)
  const action = useTranslation(ACTION_MESSAGES)
  const shortcut = useShortcut()

  // Refs
  const shell = useInsideWindow(at)

  // Handlers
  const handleSelect = (value: string) => {
    const command = { [EDIT]: onEdit, [COPY]: onCopy, [COPY_SHEET]: onCopySheet, [PASTE]: onPaste }[
      value
    ]
    if (command !== undefined) {
      onClose()
      command()
      return
    }
    const move = STACKING_MOVES.find((candidate) => candidate === value)
    if (move === undefined) {
      console.error(`[Cartographer] the stacking menu chose "${value}", which is no command.`)
      return
    }
    onChoose(move)
    onClose()
  }

  // Effects
  useDismiss(shell, onClose)

  // Render
  return (
    <div ref={shell} className="polity-stack-menu" style={{ left: at.x, top: at.y }}>
      <Menu
        variant="dark"
        aria-label={t('menuLabel', { name })}
        onClose={onClose}
        onSelect={handleSelect}
      >
        {headItems(paste, action, shortcut)}
        {STACKING_MOVES.map((move, index) =>
          stackItem(move, action(move), index + BEFORE_MOVES, moves[move], shortcut(move))
        )}
      </Menu>
    </div>
  )
}
