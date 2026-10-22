import type { ToolMessageKey } from '../../../../i18n/tools'
import type { EditorTool, PenMode } from '../../../../state/toolSlice'
import type { ToolIconName } from '../../ToolIcon'
import type { ToolVariant } from '../internal/FlyoutItem'
import type { Translate } from '@europe-historical-atlas/core/i18n/catalogue'

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
 * @param t - the tools' names, in the page's language
 * @returns the group's rows, the head first
 */
export function penVariants(
  t: Translate<ToolMessageKey>
): readonly [ToolVariant, ...ToolVariant[]] {
  const variant = (id: PenMode, shortcut: string | null, icon: ToolIconName): ToolVariant => ({
    id,
    label: t('penMode', { mode: id }),
    shortcut,
    icon,
    enabled: true,
  })
  return [
    variant('free', 'P', 'draw'),
    variant('coast', null, 'draw'),
    variant('river', null, 'draw'),
    variant('pencil', null, 'pencil'),
  ]
}

/**
 * The rail, top to bottom, in Illustrator's order: the white arrow, the Pen, then the hand — selection
 * first, drawing next, navigation last, as its Tools panel lays them out. The dev's call, 2026-10-11:
 * *"la plume, la flèche, c'est les uns en dessous des autres."*
 * @param t - the tools' names, in the page's language
 * @returns the rail's tools
 */
export function railTools(t: Translate<ToolMessageKey>): readonly RailTool[] {
  const name = (tool: EditorTool) => t('toolName', { tool })
  return [
    { tool: 'edit', label: name('edit'), key: 'A', icon: 'edit' },
    { tool: 'draw', label: name('draw'), key: 'P', icon: 'draw', variants: penVariants(t) },
    // The correction tool, under the Pen it borrows its gestures from (`H-46`, the dev, 2026-10-14).
    { tool: 'retrace', label: name('retrace'), key: 'R', icon: 'retrace' },
    { tool: 'navigate', label: name('navigate'), key: 'Space', icon: 'navigate' },
  ]
}

/**
 * How long a press must be held before the group opens — Illustrator's press-and-hold.
 *
 * Long enough that an ordinary click, which takes about a tenth of a second, never opens it; short
 * enough not to feel like waiting.
 */
export const HOLD_TO_OPEN_MS = 400
