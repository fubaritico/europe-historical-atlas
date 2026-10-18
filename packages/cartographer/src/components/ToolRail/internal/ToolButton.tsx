import { useRef } from 'react'

import { ToolIcon } from '../../ToolIcon'
import { useHoldToOpen } from '../hooks/useHoldToOpen'

import { GroupFlyout } from './GroupFlyout'

import type { EditorTool } from '../../../state/toolSlice'
import type { ToolIconName } from '../../ToolIcon'
import type { RailTool } from '../railTools'
import type { KeyboardEvent } from 'react'

/** What one button needs from the rail. */
interface ToolButtonProps {
  /** The button's tool. */
  entry: RailTool
  /** Whether it is the tool in hand. */
  pressed: boolean
  /** Whether its group is open. */
  open: boolean
  /** Open or close its group. */
  setOpen: (open: boolean) => void
  /** Take the tool. */
  onSelect: (tool: EditorTool) => void
  /** The variant in use, when the tool heads a group. */
  current: string
  /** A variant of its group was chosen. */
  onVariant: (id: string) => void
}

/**
 * A group head's popup state, and the two other ways into its group: a right click, and → for the
 * keyboard.
 * @param enabled - whether the button heads a group
 * @param expanded - whether the group is open
 * @param open - open the group
 * @returns the attributes and handlers to spread on the button
 */
function groupOpeners(enabled: boolean, expanded: boolean, open: () => void) {
  if (!enabled) return {}
  return {
    'aria-haspopup': 'menu' as const,
    'aria-expanded': expanded,
    onContextMenu: (event: { preventDefault: () => void }) => {
      event.preventDefault()
      open()
    },
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key !== 'ArrowRight') return
      event.preventDefault()
      open()
    },
  }
}

/**
 * A tool's name — for a group head, the name of the variant in use, so the toolbar says which Pen is in
 * hand without opening the flyout (A11Y-002). The binding only ever hands a variant of the group; a tool
 * heading none keeps its own name.
 * @param entry - the tool
 * @param current - the variant in use
 * @returns the accessible name and the tooltip's first half
 */
function headLabel(entry: RailTool, current: string): string {
  return entry.variants?.find((variant) => variant.id === current)?.label ?? entry.label
}

/**
 * A tool's glyph — for a group head, the glyph of the variant in use, as Illustrator's button shows the
 * Pencil once it is chosen. A tool heading no group keeps its own.
 * @param entry - the tool
 * @param current - the variant in use
 * @returns the glyph's name
 */
function headIcon(entry: RailTool, current: string): ToolIconName {
  return entry.variants?.find((variant) => variant.id === current)?.icon ?? entry.icon
}

/**
 * The keys that reach a tool, for assistive tech (A11Y-005): its own key, and → for a group's hidden
 * tools — which only the `title` said, and keyboard focus does not show a title.
 * @param entry - the tool
 * @returns the `aria-keyshortcuts` value
 */
function keyShortcuts(entry: RailTool): string {
  return entry.variants === undefined ? entry.key : `${entry.key} ArrowRight`
}

/**
 * What a tool's button says and how it is reached: pressed or not, its name (the variant in use for a
 * group head), its key in the tooltip and for assistive tech, and the one Tab stop on the tool in hand.
 * @param entry - the tool
 * @param current - the variant in use
 * @param pressed - whether it is the tool in hand
 * @returns the button's attributes
 */
function headNames(entry: RailTool, current: string, pressed: boolean) {
  const label = headLabel(entry, current)
  return {
    'aria-pressed': pressed,
    'aria-label': label,
    title: `${label} (${entry.key})`,
    'aria-keyshortcuts': keyShortcuts(entry),
    tabIndex: pressed ? 0 : -1,
  }
}

/**
 * One tool, and — when it heads a group — the three ways Illustrator opens it: holding the press, a
 * right click, and here also →, so the keyboard has a way in.
 * @param props - the tool, its state, and the callbacks
 * @returns the button, and its flyout when open
 */
export function ToolButton({
  entry,
  pressed,
  open,
  setOpen,
  onSelect,
  current,
  onVariant,
}: ToolButtonProps) {
  // Refs
  const button = useRef<HTMLButtonElement | null>(null)

  // Derived
  const group = entry.variants

  // Handlers
  const openGroup = () => {
    setOpen(true)
  }
  const { consumeHold, ...hold } = useHoldToOpen(group !== undefined, openGroup)
  const close = () => {
    setOpen(false)
    button.current?.focus()
  }
  const handleClick = () => {
    if (!consumeHold()) onSelect(entry.tool)
  }

  // Render
  return (
    <div className="tool-rail__group">
      <button
        ref={button}
        type="button"
        className={`tool-rail__tool${group === undefined ? '' : ' tool-rail__tool--group'}`}
        {...headNames(entry, current, pressed)}
        {...hold}
        {...groupOpeners(group !== undefined, open, openGroup)}
        onClick={handleClick}
      >
        <ToolIcon name={headIcon(entry, current)} />
      </button>
      {open && group !== undefined ? (
        <GroupFlyout
          label={entry.label}
          variants={group}
          current={current}
          onVariant={onVariant}
          close={close}
        />
      ) : null}
    </div>
  )
}
