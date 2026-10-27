/**
 * How the portolan rhumb web is put on the map.
 */

import { disposeHandle } from '../../layers/disposeHandle'
import { createLineLayer } from '../../lines/lineLayer'

import { generateRhumbSegments } from './rhumbNetwork'

import type { LayerContext } from '../../layers/layerContext'

/**
 * Regenerate and redraw the rhumb web.
 *
 * Only the rhumb decor: it used to tear down the rivers and the borders as well without rebuilding
 * either, so moving any rhumb slider made the rivers vanish for good and left the border handle pointing
 * at freed GPU resources.
 * @param context - the layers and what they read
 * @returns nothing
 */
export function rebuildRhumb(context: LayerContext): void {
  const { scene, dev, sources, handles, projection } = context
  // No relief, no web: the lines are clipped against it. Otherwise the previous web is freed first.
  if (!sources.heightmap) return
  disposeHandle(scene, handles.rhumb)
  // The sea-only segments, in map coordinates, from the live rhumb tunables.
  const segments = generateRhumbSegments(
    sources.heightmap,
    {
      center: { u: dev.rhumb.centerU, v: dev.rhumb.centerV },
      circleRadius: dev.rhumb.circleRadius,
      nodeCount: dev.rhumb.nodeCount,
      includeCenter: true,
      directions: dev.rhumb.directions,
      seaLevel: dev.texture.seaLevel,
      step: dev.rhumb.clipStep,
    },
    sources.landMask ?? undefined
  )
  // Projected into the world as one line layer, then added to the scene.
  handles.rhumb = createLineLayer(segments, {
    project: projection.toWorld,
    color: dev.rhumb.color,
    opacity: dev.rhumb.opacity,
  })
  scene.add(handles.rhumb.object)
}
