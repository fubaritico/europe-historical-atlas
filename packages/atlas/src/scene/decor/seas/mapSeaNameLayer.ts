/**
 * How the seas' names are put on the map (ATLAS-440): each one drawn, placed from its longitude and latitude, laid flat
 * on its sea — once, at startup, and again only if the relief's frame changes.
 */

import {
  SEA_NAMES,
  SEA_NAME_OPACITY,
  seaNameText,
} from '@europe-historical-atlas/core/data/seaNames'
import {
  latitudeToVertical,
  longitudeToHorizontal,
} from '@europe-historical-atlas/core/geo/mercator'

import { disposeHandle } from '../../layers/disposeHandle'
import { WORLD_WIDTH } from '../../world'

import { createSeaNameLayer } from './seaNameLayer'

import type { DrawSeaLabel } from './seaLabel'
import type { PlacedSeaName } from './seaNameLayer'
import type { LayerContext } from '../../layers/layerContext'

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
  const worldPerDegree = WORLD_WIDTH / (frame.east - frame.west)
  const placed: PlacedSeaName[] = await Promise.all(
    SEA_NAMES.map(async (sea) => {
      const label = await draw(seaNameText(sea))
      const [x, , z] = context.projection.toWorld(
        longitudeToHorizontal(sea.lon, frame),
        latitudeToVertical(sea.lat, frame)
      )
      return {
        label,
        position: [x, lift, z] as const,
        angle: (sea.angleDeg * Math.PI) / 180,
        length: sea.lengthDeg * worldPerDegree,
      }
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
