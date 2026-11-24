import { YearSwitch } from '../YearSwitch'

import type { InterfaceSide } from '../../../state/atlasStore'

/** What the interface needs. */
export interface AtlasInterfaceProps {
  /** The atlas's store, as the interface may use it. */
  side: InterfaceSide
  /** The year switch's accessible name, in the reader's language. */
  yearSwitchLabel: string
}

/**
 * The atlas's interface over the map (ATLAS-519, the dev, 2026-11-24: everything but the canvas is React) — the layer
 * every screen of the interface is laid in, beside the canvas, never around it. Its first element is the temporary year
 * switch; the top row, the button bar and the frieze's place come with ATLAS-521.
 *
 * The layer lets the pointer through to the map where it holds nothing (`interface.css`), so the canvas keeps its
 * gestures under the interface's empty space.
 * @param props - the store's interface side and the texts
 * @param props.side - the store, read and asked
 * @param props.yearSwitchLabel - the year switch's accessible name
 * @returns the interface
 */
export function AtlasInterface({ side, yearSwitchLabel }: AtlasInterfaceProps) {
  // Render
  return (
    <div className="atlas-interface">
      <YearSwitch side={side} label={yearSwitchLabel} />
    </div>
  )
}
