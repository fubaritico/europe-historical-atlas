import { Menu } from '@fubaritico/react/Menu'

import type { ShortcutText } from '../../../../i18n/commandKeys'
import type { StackingMove } from '@europe-historical-atlas/core/editor/stacking'

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
  return (
    <Menu.Item
      key={move}
      index={index}
      value={move}
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
