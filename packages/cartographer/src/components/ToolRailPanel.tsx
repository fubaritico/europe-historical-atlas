import { describeDrawingTarget } from '../state/drawingTarget'
import { isPenMode } from '../state/toolSlice'

import { ToolRail } from './ToolRail'

import type { PolityColourSource } from '../state/polityColourSource'
import type { CartographerStoreHook } from '../state/store'

/** What the binding needs. */
export interface ToolRailPanelProps {
  /** The store the tool is read from and chosen through. */
  store: CartographerStoreHook
  /** Where the polities' colours come from — the canvas reads the same source. */
  colours: PolityColourSource
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
export function ToolRailPanel({ store, colours }: ToolRailPanelProps) {
  // Store
  const tool = store((state) => state.tool)
  const penMode = store((state) => state.penMode)
  store((state) => state.target)
  const version = store((state) => state.version)

  // Store actions
  const selectTool = store((state) => state.selectTool)
  const choosePenMode = store((state) => state.choosePenMode)

  // Derived
  const { document, target } = store.getState()
  const aimed = describeDrawingTarget(document, target)
  const colour = aimed === null ? undefined : colours.coloursOf(document, version).get(aimed.id)

  // Handlers
  const handlePenMode = (id: string) => {
    if (isPenMode(id)) choosePenMode(id)
    else
      console.error(`[Cartographer] the Pen has no mode "${id}"; the rail and the store disagree.`)
  }

  // Render
  return (
    <ToolRail
      tool={tool}
      onSelect={selectTool}
      penMode={penMode}
      onPenMode={handlePenMode}
      swatch={aimed === null || colour === undefined ? null : { name: aimed.name, colour }}
    />
  )
}
