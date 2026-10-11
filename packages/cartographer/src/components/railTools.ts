import type { ToolVariant } from './ToolFlyout'
import type { ToolIconName } from './toolIcons'
import type { EditorTool } from '../state/toolSlice'

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
 * The Pen's group. Only the Pen itself can be chosen today: following the coast and following a river
 * are listed, disabled, because they are the next rung (`s02`) — the group shows its shape before it is
 * full, and nothing in it pretends to work.
 */
export const PEN_VARIANTS: readonly [ToolVariant, ...ToolVariant[]] = [
  { id: 'free', label: 'Pen', shortcut: 'P', icon: 'draw', enabled: true },
  { id: 'coast', label: 'Pen — follow the coast', shortcut: null, icon: 'draw', enabled: false },
  { id: 'river', label: 'Pen — follow a river', shortcut: null, icon: 'draw', enabled: false },
]

/**
 * The rail, top to bottom, in Illustrator's order: the white arrow, the Pen, then the hand — selection
 * first, drawing next, navigation last, as its Tools panel lays them out. The dev's call, 2026-10-11:
 * *"la plume, la flèche, c'est les uns en dessous des autres."*
 */
export const RAIL_TOOLS: readonly RailTool[] = [
  { tool: 'edit', label: 'Direct Selection', key: 'A', icon: 'edit' },
  { tool: 'draw', label: 'Pen', key: 'P', icon: 'draw', variants: PEN_VARIANTS },
  { tool: 'navigate', label: 'Hand', key: 'Space', icon: 'navigate' },
]

/**
 * How long a press must be held before the group opens — Illustrator's press-and-hold.
 *
 * Long enough that an ordinary click, which takes about a tenth of a second, never opens it; short
 * enough not to feel like waiting.
 */
export const HOLD_TO_OPEN_MS = 400
