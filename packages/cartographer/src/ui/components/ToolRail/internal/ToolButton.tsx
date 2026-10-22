import { useRef } from 'react'

import { ToolIcon } from '../../ToolIcon'
import { useHoldToOpen } from '../hooks/useHoldToOpen'
import { useToolTitle } from '../hooks/useToolTitle'
import { groupOpeners } from '../utils/groupOpeners'
import { headIcon } from '../utils/headIcon'
import { headNames } from '../utils/headNames'

import { GroupFlyout } from './GroupFlyout'

import type { EditorTool } from '../../../../state/toolSlice'
import type { RailTool } from '../utils/railTools'

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
 * One tool, and — when it heads a group — the three ways Illustrator opens it: holding the press, a
 * right click, and here also →, so the keyboard has a way in.
 * @param props - the tool, its state, and the callbacks
 * @param props.entry - the button's tool, and its group's variants when it heads one
 * @param props.pressed - whether it is the tool in hand
 * @param props.open - whether its group's flyout is open
 * @param props.setOpen - opens or closes its group's flyout
 * @param props.onSelect - takes the tool, on a click that was not a hold
 * @param props.current - the variant in use, when the tool heads a group
 * @param props.onVariant - takes a variant of its group, given its id
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
  // Context
  const title = useToolTitle()

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
        {...headNames(entry, current, pressed, title)}
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
