import { useState } from 'react'

import { TOOL_MESSAGES } from '../../../i18n/tools'
import { useTranslation } from '../../hooks/useTranslation'

import { TOOL_RAIL_MESSAGES } from './i18n'
import { ActiveSwatch } from './internal/ActiveSwatch'
import { ToolButton } from './internal/ToolButton'
import { moveAlongToolbar } from './utils/moveAlongToolbar'
import { railTools } from './utils/railTools'
import { unwiredGroup } from './utils/unwiredGroup'

import type { SwatchPolity } from './internal/SwatchPicker'
import type { RailTool } from './utils/railTools'
import type { EditorTool } from '../../../state/toolSlice'
import type { HsvaColor } from '@fubaritico/behaviors'

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
  /** The tools listed, top to bottom — {@link railTools} unless a test or the workbench hands others. */
  tools?: readonly RailTool[]
}

/**
 * The tool rail — Illustrator's Tools panel, narrowed to this editor's three tools.
 *
 * **A vertical toolbar** (`role="toolbar"`): one Tab stop, the tool in hand, and ↑ ↓ move between the
 * tools. Each tool is a toggle (`aria-pressed`) named by its label, with its key in the tooltip. A tool
 * that heads a group carries the small triangle and `aria-haspopup="menu"`.
 * @param props - the tool in hand, the swatch, and the choice
 * @param props.tool - the tool in hand, shown pressed
 * @param props.onSelect - takes a tool — a click, or a variant of its group
 * @param props.swatch - the polity the tools act on and its colour, or `null` when nobody is aimed at
 * @param props.onColour - applies a colour picked from the swatch, `null` for "automatic"
 * @param props.initiallyOpen - a group to show open from the start, as the workbench does; closed otherwise
 * @param props.penMode - the Pen's variant in use, marked in its group
 * @param props.onPenMode - takes a variant of the Pen's group, given its id
 * @param props.tools - the tools listed, top to bottom; {@link railTools} by default
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
  tools,
}: ToolRailProps) {
  // Context
  const t = useTranslation(TOOL_RAIL_MESSAGES)
  const toolNames = useTranslation(TOOL_MESSAGES)

  // State
  const [openGroup, setOpenGroup] = useState<EditorTool | null>(initiallyOpen ?? null)

  // Derived
  const listed = tools ?? railTools(toolNames)

  // Render
  return (
    <div className="tool-rail">
      <div
        className="tool-rail__tools"
        role="toolbar"
        aria-orientation="vertical"
        aria-label={t('toolsLabel')}
        onKeyDown={moveAlongToolbar}
      >
        {listed.map((entry) => (
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
