import { PEN_MODE_LABELS, TOOL_LABELS } from '../../state/toolSlice'

import type { ToolIconName } from '../toolIcons'
import type { ToolVariant } from './internal/ToolFlyout'
import type { EditorTool } from '../../state/toolSlice'

/** One button of the rail. */
export interface RailTool {
  /** The tool it takes. */
  tool: EditorTool
  /** Its accessible name and the first half of its tooltip. */
  label: string
  /** The key that takes it, for the tooltip. */
  key: string
  /** Its glyph. */
  icon: ToolIconName
  /** Its hidden tools, when it heads a group — Illustrator's small triangle. Never empty: the head is the first. */
  variants?: readonly [ToolVariant, ...ToolVariant[]]
}

/**
 * The Pen's group: the free Pen, the Pen that follows the coast, the Pen that follows a river (`s02`),
 * and the Pencil, which lays a point every 200 ms of a drag (the dev, 2026-10-11).
 */
export const PEN_VARIANTS: readonly [ToolVariant, ...ToolVariant[]] = [
  { id: 'free', label: PEN_MODE_LABELS.free, shortcut: 'P', icon: 'draw', enabled: true },
  { id: 'coast', label: PEN_MODE_LABELS.coast, shortcut: null, icon: 'draw', enabled: true },
  { id: 'river', label: PEN_MODE_LABELS.river, shortcut: null, icon: 'draw', enabled: true },
  { id: 'pencil', label: PEN_MODE_LABELS.pencil, shortcut: null, icon: 'pencil', enabled: true },
]

/**
 * The rail, top to bottom, in Illustrator's order: the white arrow, the Pen, then the hand — selection
 * first, drawing next, navigation last, as its Tools panel lays them out. The dev's call, 2026-10-11:
 * *"la plume, la flèche, c'est les uns en dessous des autres."*
 */
export const RAIL_TOOLS: readonly RailTool[] = [
  { tool: 'edit', label: TOOL_LABELS.edit, key: 'A', icon: 'edit' },
  { tool: 'draw', label: TOOL_LABELS.draw, key: 'P', icon: 'draw', variants: PEN_VARIANTS },
  // The correction tool, under the Pen it borrows its gestures from (`H-46`, the dev, 2026-10-14).
  { tool: 'retrace', label: TOOL_LABELS.retrace, key: 'R', icon: 'retrace' },
  { tool: 'navigate', label: TOOL_LABELS.navigate, key: 'Space', icon: 'navigate' },
]

/**
 * How long a press must be held before the group opens — Illustrator's press-and-hold.
 *
 * Long enough that an ordinary click, which takes about a tenth of a second, never opens it; short
 * enough not to feel like waiting.
 */
export const HOLD_TO_OPEN_MS = 400
