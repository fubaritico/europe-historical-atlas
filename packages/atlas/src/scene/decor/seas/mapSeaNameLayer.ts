/**
 * How the seas' names are put on the map (ATLAS-440): each one drawn, placed from its longitude and latitude, laid flat
 * on its sea — once, at startup, and again only if the relief's frame changes.
 */

import {
  SEA_NAMES,
  SEA_NAME_OPACITY,
  seaArcAt,
  seaNameText,
} from '@europe-historical-atlas/core/data/seaNames'
import {
  latitudeToVertical,
  longitudeToHorizontal,
} from '@europe-historical-atlas/core/geo/mercator'

import { disposeHandle } from '../../layers/disposeHandle'

import { createSeaNameLayer } from './seaNameLayer'

import type { DrawSeaLabel } from './seaLabel'
import type { PlacedSeaName } from './seaNameLayer'
import type { LayerContext } from '../../layers/layerContext'

/** How many pieces an arc is cut into: enough for the ribbon to bend smoothly. */
const ARC_SAMPLES = 32

/**
 * Lay the seas' names, replacing any laid before. Before the relief's frame is known there is nowhere to place them:
 * nothing is laid, and the startup calls this after the relief.
 * @param context - the layers and what they read
 * @param draw - a sea's name to an image
 * @param lift - the height above the sea the names lie at, as the compass rose's
 * @returns once laid
 */
export async function rebuildSeaNames(
  context: LayerContext,
  draw: DrawSeaLabel,
  lift: number
): Promise<void> {
  const frame = context.sources.heightmap?.meta.bbox
  if (frame === undefined) return
  const placed: PlacedSeaName[] = await Promise.all(
    SEA_NAMES.map(async (sea) => {
      const label = await draw(seaNameText(sea))
      // The arc sampled finely enough that the ribbon reads as a curve, each point projected as the map's.
      const arc = Array.from({ length: ARC_SAMPLES + 1 }, (_, k) => {
        const at = seaArcAt(sea, k / ARC_SAMPLES)
        const [x, , z] = context.projection.toWorld(
          longitudeToHorizontal(at.lon, frame),
          latitudeToVertical(at.lat, frame)
        )
        return [x, z] as const
      })
      return { label, arc, y: lift }
    })
  )
  const { scene, handles } = context
  disposeHandle(scene, handles.seaNames)
  handles.seaNames = createSeaNameLayer(placed, SEA_NAME_OPACITY)
  scene.add(handles.seaNames.object)
}

/**
 * Lay the seas' names and let the map go on without them if their face cannot load — a decor: said in the console,
 * the map shown whole otherwise (ATLAS-440).
 * @param context - the layers and what they read, the sea labels' drawer and the rose's lift among them
 */
export function laySeaNames(context: LayerContext): void {
  rebuildSeaNames(context, context.seaLabels, context.dev.rose.lift).catch((error: unknown) => {
    console.error('[Atlas] the seas’ names could not be drawn', error)
  })
}
