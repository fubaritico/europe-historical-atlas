import { Slider } from '@fubaritico/react/Slider'

import { ChromeIcon } from '../../../icons/chromeIcons'

import type { LayerId } from '../../../state/layersSlice'
import type { LayerListProps } from '../layerListProps'

/**
 * One row: the eye, the name, the opacity slider and its figure.
 * @param props - the layer, its setting and the two callbacks
 * @param props.id - the layer
 * @param props.layers - every layer's setting
 * @param props.onVisible - the eye was toggled
 * @param props.onOpacity - the opacity was moved
 * @returns the row
 */
export function LayerRow({ id, layers, onVisible, onOpacity }: LayerListProps & { id: LayerId }) {
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
