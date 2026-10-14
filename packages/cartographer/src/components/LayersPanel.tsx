import { Slider } from '@fubaritico/react/Slider'

import { ChromeIcon } from '../icons/chromeIcons'
import { LAYER_IDS } from '../state/layersSlice'

import { Panel } from './Panel'

import type { LayerId, LayerSettings } from '../state/layersSlice'
import type { CartographerStoreHook } from '../state/store'

/**
 * `{Layers}` — what the canvas shows, layer by layer: an eye and an opacity per row, after the mockup's
 * panel (`design/mock-data.js`, `renderLayers`; the dev's call D4, 2026-10-13).
 *
 * The shell/view/binding split (`react-canvas-and-panels`): {@link LayerList} takes the settings and two
 * callbacks, {@link LayersPanel} is the one place that knows there is a store.
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

/**
 * One row: the eye, the name, the opacity slider and its figure.
 * @param props - the layer, its setting and the two callbacks
 * @param props.id - the layer
 * @param props.layers - every layer's setting
 * @param props.onVisible - the eye was toggled
 * @param props.onOpacity - the opacity was moved
 * @returns the row
 */
function LayerRow({ id, layers, onVisible, onOpacity }: LayerListProps & { id: LayerId }) {
  // Derived
  const { visible, opacity } = layers[id]
  const verb = visible ? 'Hide' : 'Show'

  // Handlers
  const handleEye = () => {
    onVisible(id, !visible)
  }
  const handleOpacity = (value: number) => {
    onOpacity(id, value)
  }

  // Render
  return (
    <li className="layer-row" data-visible={visible}>
      <button
        type="button"
        className="layer-row__eye"
        aria-pressed={visible}
        aria-label={`${verb} ${id}`}
        title={`${verb} ${id}`}
        onClick={handleEye}
      >
        <ChromeIcon name={visible ? 'eyeOpen' : 'eyeShut'} size={15} />
      </button>
      <span className="layer-row__name">{id}</span>
      <Slider
        className="layer-row__opacity"
        aria-label={`${id} opacity`}
        min={0}
        max={100}
        value={opacity}
        onChange={handleOpacity}
        size="sm"
      />
      <span className="layer-row__figure">{opacity}%</span>
    </li>
  )
}

/**
 * The layers, in painting order.
 * @param props - the settings and the two callbacks
 * @returns the list
 */
export function LayerList(props: LayerListProps) {
  // Render
  return (
    <ul className="layer-list" aria-label="Layers">
      {LAYER_IDS.map((id) => (
        <LayerRow key={id} id={id} {...props} />
      ))}
    </ul>
  )
}

/**
 * `{Layers}`, bound to the store.
 * @param props - the store
 * @param props.store - the store the layers' settings live in
 * @returns the panel
 */
export function LayersPanel({ store }: { store: CartographerStoreHook }) {
  // Store
  const layers = store((state) => state.layers)

  // Store actions
  const setLayerVisible = store((state) => state.setLayerVisible)
  const setLayerOpacity = store((state) => state.setLayerOpacity)

  // Render
  return (
    <Panel title="Layers">
      <LayerList layers={layers} onVisible={setLayerVisible} onOpacity={setLayerOpacity} />
    </Panel>
  )
}
