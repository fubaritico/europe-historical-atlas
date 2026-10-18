import { Menu } from '@fubaritico/react/Menu'

import { STACKING_MOVES } from '@europe-historical-atlas/core/editor/stacking'

import { STACKING_LABELS } from '../shared/stackingLabels'
import { STACKING_SHORTCUTS } from '../shared/stackingShortcut'

import { useDismiss } from './hooks/useDismiss'
import { useInsideWindow } from './hooks/useInsideWindow'

import type { ViewportPoint } from '../../view/viewport'
import type { StackingMove } from '@europe-historical-atlas/core/editor/stacking'

/** The value of the menu's first item, *Edit properties…* — `s07`'s gesture, above the four moves. */
const EDIT = 'edit'

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
  /** ‹escape›, a press outside, or a command chosen. */
  onClose: () => void
}

/**
 * One stacking command: its name, and its keys at the row's end — announced through `aria-keyshortcuts`,
 * the glyphs being hidden from a screen reader, which would spell them out.
 * @param move - the command
 * @param index - its place in the keyboard order
 * @param enabled - whether it would change anything
 * @returns the item
 */
function stackItem(move: StackingMove, index: number, enabled: boolean) {
  return (
    <Menu.Item
      key={move}
      index={index}
      value={move}
      disabled={!enabled}
      aria-keyshortcuts={STACKING_SHORTCUTS[move].aria}
    >
      <span className="polity-stack-menu__label">{STACKING_LABELS[move]}</span>
      <kbd className="polity-stack-menu__keys" aria-hidden="true">
        {STACKING_SHORTCUTS[move].shown}
      </kbd>
    </Menu.Item>
  )
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
 * @returns the menu
 */
export function PolityStackMenu({
  name,
  at,
  moves,
  onChoose,
  onEdit,
  onClose,
}: PolityStackMenuProps) {
  // Refs
  const shell = useInsideWindow(at)

  // Handlers
  const handleSelect = (value: string) => {
    if (value === EDIT) {
      onClose()
      onEdit()
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
        aria-label={`Actions for ${name}`}
        onClose={onClose}
        onSelect={handleSelect}
      >
        <Menu.Item index={0} value={EDIT}>
          Edit properties…
        </Menu.Item>
        {STACKING_MOVES.map((move, index) => stackItem(move, index + 1, moves[move]))}
      </Menu>
    </div>
  )
}
