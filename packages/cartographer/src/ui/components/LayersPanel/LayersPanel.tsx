import { useTranslation } from '../../hooks/useTranslation'
import { Panel } from '../Panel'

import { LAYERS_PANEL_MESSAGES } from './i18n'
import { LayerList } from './internal/LayerList'

import type { CartographerStoreHook } from '../../../state/store'

/**
 * `{Layers}` — what the canvas shows, layer by layer: an eye and an opacity per row, after the mockup's
 * panel (`design/mock-data.js`, `renderLayers`; the dev's call D4, 2026-10-13).
 *
 * The shell/view/binding split (`react-canvas-and-panels`): {@link LayerList} takes the settings and two
 * callbacks, {@link LayersPanel} is the one place that knows there is a store.
 */

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

  // Context
  const t = useTranslation(LAYERS_PANEL_MESSAGES)

  // Render
  return (
    <Panel title={t('title')} zone="layers-panel">
      <LayerList layers={layers} onVisible={setLayerVisible} onOpacity={setLayerOpacity} />
    </Panel>
  )
}
