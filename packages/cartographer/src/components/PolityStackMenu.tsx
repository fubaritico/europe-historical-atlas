import { Menu } from '@fubaritico/react/Menu'
import { useEffect, useRef } from 'react'

import { STACKING_MOVES } from '@europe-historical-atlas/core/editor/stacking'

import { STACKING_LABELS } from './stackingLabels'

import type { StackingMove } from '@europe-historical-atlas/core/editor/stacking'

/** A point of the viewport, in CSS pixels — where a menu opens. */
export interface ViewportPoint {
  /** From the viewport's left edge. */
  x: number
  /** From its top edge. */
  y: number
}

/** What the menu shows and reports. Never the store: `PolitiesPanel` reads it and hands literals. */
export interface PolityStackMenuProps {
  /** The polity the commands act on, verbatim — the menu's accessible name. */
  name: string
  /** Where it opens, in viewport pixels — the right-click, or the row for the keyboard. */
  at: ViewportPoint
  /** Which commands would change anything; the others are disabled (`s16`). */
  moves: Record<StackingMove, boolean>
  /** A command was chosen. The menu closes itself afterwards through `onClose`. */
  onChoose: (move: StackingMove) => void
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
 * @returns the menu
 */
export function PolityStackMenu({ name, at, moves, onChoose, onClose }: PolityStackMenuProps) {
  const shell = useRef<HTMLDivElement | null>(null)
  // The latest close, read by the listener: the caller passes a fresh closure on every render, and an
  // effect keyed on it would re-run — and re-take the focus — each time the panel re-renders (QUAL-002).
  const close = useRef(onClose)
  useEffect(() => {
    close.current = onClose
  }, [onClose])
  useEffect(() => {
    shell.current?.querySelector<HTMLElement>('[role="listbox"]')?.focus()
    const outside = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || !shell.current?.contains(event.target)) close.current()
    }
    document.addEventListener('pointerdown', outside)
    return () => {
      document.removeEventListener('pointerdown', outside)
    }
  }, [])
  return (
    <div ref={shell} className="polity-stack-menu" style={{ left: at.x, top: at.y }}>
      <Menu
        variant="dark"
        aria-label={`Arrange ${name}`}
        onClose={onClose}
        onSelect={(value) => {
          const move = STACKING_MOVES.find((candidate) => candidate === value)
          if (move === undefined) {
            console.error(`[Cartographer] the stacking menu chose "${value}", which is no command.`)
            return
          }
          onChoose(move)
          onClose()
        }}
      >
        {STACKING_MOVES.map((move, index) => (
          <Menu.Item key={move} index={index} value={move} disabled={!moves[move]}>
            {STACKING_LABELS[move]}
          </Menu.Item>
        ))}
      </Menu>
    </div>
  )
}
