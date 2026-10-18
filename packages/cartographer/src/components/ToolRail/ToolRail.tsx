import { useState } from 'react'

import { ActiveSwatch } from './internal/ActiveSwatch'
import { ToolButton } from './internal/ToolButton'
import { RAIL_TOOLS } from './railTools'

import type { SwatchPolity } from './internal/SwatchPicker'
import type { RailTool } from './railTools'
import type { EditorTool } from '../../state/toolSlice'
import type { HsvaColor } from '@fubaritico/behaviors'
import type { KeyboardEvent } from 'react'

/** What the rail shows and reports. Never the store: `ToolRailPanel` reads it and hands literals. */
export interface ToolRailProps {
  /** The tool in hand. */
  tool: EditorTool
  /** A tool was chosen — a click, or a variant of its group. */
  onSelect: (tool: EditorTool) => void
  /** The polity the tools act on and the colour it is painted in, or `null` when nobody is aimed at. */
  swatch: SwatchPolity | null
  /** A colour was chosen from the swatch's picker, or "automatic" (`null`). */
  onColour: (picked: HsvaColor | null) => void
  /** A group to show open from the start — the workbench's plate of the flyout. Closed otherwise. */
  initiallyOpen?: EditorTool
  /** The Pen's variant in use — the row its group marks. */
  penMode: string
  /** A variant of the Pen's group was chosen. */
  onPenMode: (id: string) => void
  /** The tools listed, top to bottom — {@link RAIL_TOOLS} unless a test or the workbench hands others. */
  tools?: readonly RailTool[]
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
 * What a group with no binding does when a variant is chosen: say so. Only the Pen heads a group today;
 * a second one that reached this without being wired would otherwise do nothing, silently.
 * @param id - the variant chosen
 */
function unwiredGroup(id: string): void {
  console.error(`[Cartographer] the tool rail has no binding for the variant "${id}".`)
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
export function ToolRail({
  tool,
  onSelect,
  swatch,
  onColour,
  initiallyOpen,
  penMode,
  onPenMode,
  tools = RAIL_TOOLS,
}: ToolRailProps) {
  // State
  const [openGroup, setOpenGroup] = useState<EditorTool | null>(initiallyOpen ?? null)

  // Render
  return (
    <div className="tool-rail">
      <div
        className="tool-rail__tools"
        role="toolbar"
        aria-orientation="vertical"
        aria-label="Tools"
        onKeyDown={moveAlongToolbar}
      >
        {tools.map((entry) => (
          <ToolButton
            key={entry.tool}
            entry={entry}
            pressed={entry.tool === tool}
            open={openGroup === entry.tool}
            setOpen={(open) => {
              setOpenGroup(open ? entry.tool : null)
            }}
            onSelect={onSelect}
            // Only the Pen heads a group today; a second group gets its own entry here.
            current={entry.tool === 'draw' ? penMode : entry.tool}
            onVariant={entry.tool === 'draw' ? onPenMode : unwiredGroup}
          />
        ))}
      </div>
      <div className="tool-rail__foot">
        <ActiveSwatch polity={swatch} onColour={onColour} />
      </div>
    </div>
  )
}
