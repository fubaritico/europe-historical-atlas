import { useTranslation } from '../../hooks/useTranslation'
import { describeDrawingTarget } from '../../state/drawingTarget'
import { isPenMode } from '../../state/toolSlice'
import { pickedColour, recolouring } from '../../utils/polityColourValue'
import { ToolRail } from '../ToolRail'

import { TOOL_RAIL_PANEL_MESSAGES } from './i18n'

import type { PolityColourSource } from '../../state/polityColourSource'
import type { CartographerStoreHook } from '../../state/store'
import type { HsvaColor } from '@fubaritico/behaviors'

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
 * @param props.store - the store the tool, the target and the colour are read from and chosen through
 * @param props.colours - where the swatch's colour comes from, the source the canvas reads too
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
  const editPolity = store((state) => state.editPolity)

  // Context
  const t = useTranslation(TOOL_RAIL_PANEL_MESSAGES)

  // Derived
  const { document, target } = store.getState()
  const aimed = describeDrawingTarget(document, target)
  const colour = aimed === null ? undefined : colours.coloursOf(document, version).get(aimed.id)
  const polity = aimed === null ? undefined : document.polities.find((p) => p.id === aimed.id)

  // Handlers
  const handlePenMode = (id: string) => {
    if (isPenMode(id)) choosePenMode(id)
    else
      console.error(`[Cartographer] the Pen has no mode "${id}"; the rail and the store disagree.`)
  }

  const handleColour = (picked: HsvaColor | null) => {
    if (polity === undefined) return
    const change = recolouring(polity, picked, t('colourStep', { name: polity.name }))
    if (change === null) return
    if (!editPolity(change.polity, change.step))
      console.error(`[Cartographer] the colour of "${polity.id}" was refused by the document.`)
  }

  // Render
  return (
    <ToolRail
      tool={tool}
      onSelect={selectTool}
      penMode={penMode}
      onPenMode={handlePenMode}
      swatch={
        polity === undefined || colour === undefined
          ? null
          : { name: polity.name, colour, picked: pickedColour(polity) }
      }
      onColour={handleColour}
    />
  )
}
