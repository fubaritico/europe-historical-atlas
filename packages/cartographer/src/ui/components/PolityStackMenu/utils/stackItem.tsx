import { Menu } from '@fubaritico/react/Menu'

import type { Command, ShortcutText } from '../../../../i18n/commandKeys'
import type { ActionMessageKey } from '../../../i18n/actions'
import type { PasteCommand } from '../../../utils/pasteCommand'
import type { StackingMove } from '@europe-historical-atlas/core/editor/stacking'
import type { Translate } from '@europe-historical-atlas/core/i18n/catalogue'

/**
 * One stacking command: its name, and its keys at the row's end — announced through `aria-keyshortcuts`,
 * the glyphs being hidden from a screen reader, which would spell them out.
 * @param move - the command
 * @param label - its name, in the page's language
 * @param index - its place in the keyboard order
 * @param enabled - whether it would change anything
 * @param keys - its shortcut, as this system writes it
 * @returns the item
 */
export function stackItem(
  move: StackingMove,
  label: string,
  index: number,
  enabled: boolean,
  keys: ShortcutText
) {
  return commandItem(move, label, index, enabled, keys)
}

/**
 * One command of a polity's menu with its keys at the row's end — a stacking move, « Copier », « Coller la fiche… ».
 * @param value - what the menu reports when it is chosen
 * @param label - its name, in the page's language
 * @param index - its place in the keyboard order
 * @param enabled - whether it can act
 * @param keys - its shortcut, as this system writes it
 * @returns the item
 */
export function commandItem(
  value: string,
  label: string,
  index: number,
  enabled: boolean,
  keys: ShortcutText
) {
  return (
    <Menu.Item
      key={value}
      index={index}
      value={value}
      disabled={!enabled}
      aria-keyshortcuts={keys.aria}
    >
      <span className="polity-stack-menu__label">{label}</span>
      <kbd className="polity-stack-menu__keys" aria-hidden="true">
        {keys.shown}
      </kbd>
    </Menu.Item>
  )
}

/** The value of the menu's first item, *Edit properties…* — `s07`'s gesture, above the clipboard and the moves. */
export const EDIT = 'edit'

/** The value of « Copier » — the polity, sheet and outline, as ‹cmd+C› (CARTO-345, the dev, 2026-11-05). */
export const COPY = 'copy'

/** The value of « Copier la fiche » — the polity's sheet alone, as ‹shift+cmd+C›. */
export const COPY_SHEET = 'copy-sheet'

/** The value of the paste — what the clipboard holds, onto this polity, as ‹cmd+V› (`ui/utils/pasteCommand`). */
export const PASTE = 'paste'

/**
 * The head of a polity's menu: *Edit properties…*, then the clipboard's three commands — « Copier », « Copier la
 * fiche », and the paste named after what the clipboard holds.
 * @param paste - the paste onto this polity
 * @param action - the shared actions' labels
 * @param shortcut - a command's shortcut, as this system writes it
 * @returns the four items, at places 0 to 3
 */
export function headItems(
  paste: PasteCommand,
  action: Translate<ActionMessageKey>,
  shortcut: (command: Command) => ShortcutText
) {
  return [
    <Menu.Item key={EDIT} index={0} value={EDIT}>
      {action('editProperties')}
    </Menu.Item>,
    commandItem(COPY, action('copy'), 1, true, shortcut('copy')),
    commandItem(COPY_SHEET, action('copySheet'), 2, true, shortcut('copySheet')),
    commandItem(PASTE, paste.label, 3, paste.enabled, shortcut('paste')),
  ]
}
