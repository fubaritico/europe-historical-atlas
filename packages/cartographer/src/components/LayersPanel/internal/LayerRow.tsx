import { Slider } from '@fubaritico/react/Slider'

import { useTranslation } from '../../../hooks/useTranslation'
import { ChromeIcon } from '../../../icons/chromeIcons'
import { LAYERS_PANEL_MESSAGES } from '../i18n'

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
  // Context
  const t = useTranslation(LAYERS_PANEL_MESSAGES)

  // Derived
  const { visible, opacity } = layers[id]
  const layer = t('layerName', { id })
  const eye = t(visible ? 'hide' : 'show', { layer })

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
        aria-label={eye}
        title={eye}
        onClick={handleEye}
      >
        <ChromeIcon name={visible ? 'eyeOpen' : 'eyeShut'} size={15} />
      </button>
      <span className="layer-row__name">{layer}</span>
      <Slider
        className="layer-row__opacity"
        aria-label={t('opacity', { layer })}
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
