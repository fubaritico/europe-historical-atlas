import { LAYER_IDS } from '../../../../state/layersSlice'
import { useTranslation } from '../../../hooks/useTranslation'
import { LAYERS_PANEL_MESSAGES } from '../i18n'

import { LayerRow } from './LayerRow'

import type { LayerListProps } from '../layerListProps'

/**
 * The layers, in painting order.
 * @param props - the settings and the two callbacks
 * @returns the list
 */
export function LayerList(props: LayerListProps) {
  // Context
  const t = useTranslation(LAYERS_PANEL_MESSAGES)

  // Render
  return (
    <ul className="layer-list" aria-label={t('title')}>
      {LAYER_IDS.map((id) => (
        <LayerRow key={id} id={id} {...props} />
      ))}
    </ul>
  )
}
