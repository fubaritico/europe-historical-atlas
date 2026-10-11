import { useEffect, useRef, useState } from 'react'

import { HOLD_TO_OPEN_MS, RAIL_TOOLS } from './railTools'
import { ToolFlyout } from './ToolFlyout'
import { ToolIcon } from './toolIcons'

import type { RailTool } from './railTools'
import type { EditorTool } from '../state/toolSlice'
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'

/** What the rail shows and reports. Never the store: `ToolRailPanel` reads it and hands literals. */
export interface ToolRailProps {
  /** The tool in hand. */
  tool: EditorTool
  /** A tool was chosen — a click, or a variant of its group. */
  onSelect: (tool: EditorTool) => void
  /** The polity the tools act on and the colour it is painted in, or `null` when nobody is aimed at. */
  swatch: { name: string; colour: string } | null
  /** A group to show open from the start — the workbench's plate of the flyout. Closed otherwise. */
  initiallyOpen?: EditorTool
}

/**
 * Move the focus along the toolbar on ↑ and ↓ — the WAI-ARIA toolbar pattern, vertical.
 * @param event - the key event, on the toolbar
 */
function moveAlongToolbar(event: KeyboardEvent<HTMLDivElement>): void {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
  const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('.tool-rail__tool')]
  const at = buttons.findIndex((button) => button === document.activeElement)
  if (at < 0) return
  event.preventDefault()
  const step = event.key === 'ArrowDown' ? 1 : -1
  buttons[(at + step + buttons.length) % buttons.length]?.focus()
}

/**
 * The active polity's swatch, at the foot of the rail — where Illustrator keeps its fill and stroke.
 * @param props - the swatch, or `null`
 * @param props.swatch - the polity's name and colour
 * @returns the swatch
 */
function ActiveSwatch({ swatch }: { swatch: ToolRailProps['swatch'] }) {
  const name = swatch === null ? 'Active polity — none selected' : `Active polity — ${swatch.name}`
  return (
    <span
      className="tool-rail__swatch"
      role="img"
      aria-label={name}
      title={name}
      data-empty={swatch === null}
      style={swatch === null ? undefined : { background: swatch.colour }}
    />
  )
}

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
}

/**
 * Illustrator's press-and-hold: a press kept down for {@link HOLD_TO_OPEN_MS} opens the group, and that
 * press is then not also a click on the tool.
 *
 * **The "it opened" flag is consumed by the click that follows the hold, once** (ARCH-015 / A11Y-001 /
 * QUAL-001, found in review): left set, it swallowed every later activation that comes with no
 * pointerdown — Enter or Space on the button — so after one hold the keyboard could no longer take the
 * Pen. The timer is cleared on release, on leave, on cancel and on unmount.
 * @param enabled - whether the button heads a group at all
 * @param open - what to do when the hold completes
 * @returns the pointer handlers, and `consumeHold`, which tells the click whether it ends a hold
 */
function useHoldToOpen(enabled: boolean, open: () => void) {
  const hold = useRef<{ timer: number; opened: boolean } | null>(null)
  const stop = () => {
    if (hold.current !== null) window.clearTimeout(hold.current.timer)
  }
  useEffect(() => stop, [])
  return {
    onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (!enabled || event.button !== 0) return
      stop()
      const state = { timer: 0, opened: false }
      state.timer = window.setTimeout(() => {
        state.opened = true
        open()
      }, HOLD_TO_OPEN_MS)
      hold.current = state
    },
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    consumeHold: () => {
      const opened = hold.current?.opened === true
      hold.current = null
      return opened
    },
  }
}

/**
 * The two other ways into a group: a right click, and → for the keyboard.
 * @param enabled - whether the button heads a group
 * @param open - open the group
 * @returns the handlers to spread on the button
 */
function groupOpeners(enabled: boolean, open: () => void) {
  if (!enabled) return {}
  return {
    'aria-haspopup': 'menu' as const,
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
 * One tool, and — when it heads a group — the three ways Illustrator opens it: holding the press, a
 * right click, and here also →, so the keyboard has a way in.
 * @param props - the tool, its state, and the callbacks
 * @returns the button, and its flyout when open
 */
function ToolButton({ entry, pressed, open, setOpen, onSelect }: ToolButtonProps) {
  const button = useRef<HTMLButtonElement | null>(null)
  const group = entry.variants
  const openGroup = () => {
    setOpen(true)
  }
  const { consumeHold, ...hold } = useHoldToOpen(group !== undefined, openGroup)
  const close = () => {
    setOpen(false)
    button.current?.focus()
  }
  return (
    <div className="tool-rail__group">
      <button
        ref={button}
        type="button"
        className={`tool-rail__tool${group === undefined ? '' : ' tool-rail__tool--group'}`}
        aria-pressed={pressed}
        aria-label={entry.label}
        title={`${entry.label} (${entry.key})`}
        tabIndex={pressed ? 0 : -1}
        {...(group === undefined ? {} : { 'aria-expanded': open })}
        {...hold}
        {...groupOpeners(group !== undefined, openGroup)}
        onClick={() => {
          if (!consumeHold()) onSelect(entry.tool)
        }}
      >
        <ToolIcon name={entry.icon} />
      </button>
      {open && group !== undefined ? (
        <ToolFlyout
          label={`${entry.label} tools`}
          variants={group}
          // The group's head: the only variant usable today, so the only one that can be in use.
          current={group[0].id}
          onChoose={() => {
            onSelect(entry.tool)
            close()
          }}
          onDismiss={close}
        />
      ) : null}
    </div>
  )
}

/**
 * The tool rail — Illustrator's Tools panel, narrowed to this editor's three tools.
 *
 * **A vertical toolbar** (`role="toolbar"`): one Tab stop, the tool in hand, and ↑ ↓ move between the
 * tools. Each tool is a toggle (`aria-pressed`) named by its label, with its key in the tooltip. A tool
 * that heads a group carries the small triangle and `aria-haspopup="menu"`.
 * @param props - the tool in hand, the swatch, and the choice
 * @returns the rail
 */
export function ToolRail({ tool, onSelect, swatch, initiallyOpen }: ToolRailProps) {
  const [openGroup, setOpenGroup] = useState<EditorTool | null>(initiallyOpen ?? null)
  return (
    <div className="tool-rail">
      <div
        className="tool-rail__tools"
        role="toolbar"
        aria-orientation="vertical"
        aria-label="Tools"
        onKeyDown={moveAlongToolbar}
      >
        {RAIL_TOOLS.map((entry) => (
          <ToolButton
            key={entry.tool}
            entry={entry}
            pressed={entry.tool === tool}
            open={openGroup === entry.tool}
            setOpen={(open) => {
              setOpenGroup(open ? entry.tool : null)
            }}
            onSelect={onSelect}
          />
        ))}
      </div>
      <div className="tool-rail__foot">
        <ActiveSwatch swatch={swatch} />
      </div>
    </div>
  )
}
