import type { LayerId, LayerSettings } from '../../../state/layersSlice'

/*
 * The list's props, apart from both its components — the list and its row read the same shape, and a type
 * imported between them would run in a circle.
 */

/** What the list shows and reports. */
export interface LayerListProps {
  /** Every layer's setting. */
  layers: LayerSettings
  /** A layer's eye was toggled. */
  onVisible: (id: LayerId, visible: boolean) => void
  /** A layer's opacity was moved. */
  onOpacity: (id: LayerId, opacity: number) => void
}
