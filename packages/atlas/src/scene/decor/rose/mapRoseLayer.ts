/**
 * How the compass rose is put on the map.
 */

import { disposeHandle } from '../../layers/disposeHandle'

import { createCompassRose } from './compassRose'

import type { LayerContext } from '../../layers/layerContext'

/**
 * Rebuild the compass rose.
 * @param context - the layers and what they read
 * @returns nothing
 */
export function rebuildRose(context: LayerContext): void {
  const { scene, dev, handles, projection } = context
  disposeHandle(scene, handles.compass)
  // The rose's centre, from map coordinates to the world; its height is the lift, not the relief's.
  const [x, , z] = projection.toWorld(dev.rose.centerU, dev.rose.centerV)
  handles.compass = createCompassRose({
    colors: { ink: dev.rose.ink, halfWind: dev.rose.halfWind, quarterWind: dev.rose.quarterWind },
    labels: dev.rose.showLabels,
    size: dev.rose.size,
    opacity: dev.rose.opacity,
    position: [x, dev.rose.lift, z],
  })
  scene.add(handles.compass.object)
}
