import { AUTOMATIC_PALETTE } from '@europe-historical-atlas/core/data/regionPalette'
import { polityColours } from '@europe-historical-atlas/core/editor/polityColours'

import { describeDrawingTarget } from '../state/drawingTarget'
import { isPenMode } from '../state/toolSlice'

import { ToolRail } from './ToolRail'

import type { CartographerStoreHook } from '../state/store'

/** What the binding needs. */
export interface ToolRailPanelProps {
  /** The store the tool is read from and chosen through. */
  store: CartographerStoreHook
}

/**
 * The rail's binding — the one place that knows there is a store.
 *
 * It selects the tool, the target and the version (the document is mutated in place, so the version is
 * what changes), and resolves the swatch during the render, never in a selector: `describeDrawingTarget`
 * and `polityColours` build new objects, which a selector would hand React as a fresh snapshot each time.
 * @param props - the store
 * @returns the rail
 */
export function ToolRailPanel({ store }: ToolRailPanelProps) {
  const tool = store((state) => state.tool)
  const selectTool = store((state) => state.selectTool)
  const penMode = store((state) => state.penMode)
  const choosePenMode = store((state) => state.choosePenMode)
  store((state) => state.target)
  store((state) => state.version)
  const { document, target } = store.getState()
  const aimed = describeDrawingTarget(document, target)
  const colour =
    aimed === null ? undefined : polityColours(document, AUTOMATIC_PALETTE).get(aimed.id)
  return (
    <ToolRail
      tool={tool}
      onSelect={selectTool}
      penMode={penMode}
      onPenMode={(id) => {
        if (isPenMode(id)) choosePenMode(id)
        else
          console.error(
            `[Cartographer] the Pen has no mode "${id}"; the rail and the store disagree.`
          )
      }}
      swatch={aimed === null || colour === undefined ? null : { name: aimed.name, colour }}
    />
  )
}
