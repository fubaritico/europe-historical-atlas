/**
 * How the seas' names are put on the map (ATLAS-440): each one drawn in the reader's language, placed from its longitude
 * and latitude, laid flat on its sea — once, at startup. Neither the relief's frame nor the language changes during a
 * session today; the day one does, its change calls the rebuild again.
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

import { landTexturesOf } from '../../landMask'
import { disposeHandle } from '../../layers/disposeHandle'
import { meshWorldDepth } from '../../relief/reliefMesh'
import { WORLD_WIDTH } from '../../world'

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
 * @param isCurrent - whether this call may still lay its names once drawn: `false` when a newer call started or the
 *   layers were torn down while the face loaded (reviews ARCH-001 · QUAL-002) — the newest call wins, nothing laid
 * @returns once laid, or once given up
 */
export async function rebuildSeaNames(
  context: LayerContext,
  draw: DrawSeaLabel,
  lift: number,
  isCurrent: () => boolean
): Promise<void> {
  const meta = context.sources.heightmap?.meta
  if (meta === undefined) return
  const frame = meta.bbox
  const placed: PlacedSeaName[] = await Promise.all(
    SEA_NAMES.map(async (sea) => {
      const label = await draw(seaNameText(sea, context.locale))
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
  // Checked after the drawing, before anything is built or freed: a stale call leaves the names laid as they are.
  if (!isCurrent()) return
  const { scene, handles } = context
  disposeHandle(scene, handles.seaNames)
  // The land the letters stop at, the fills' own: no name reaches the land, wherever its arc is laid.
  handles.seaNames = createSeaNameLayer(placed, {
    opacity: SEA_NAME_OPACITY,
    land: landTexturesOf(context),
    plane: [WORLD_WIDTH, meshWorldDepth(meta, WORLD_WIDTH)],
  })
  scene.add(handles.seaNames.object)
}

/**
 * Lay the seas' names and let the map go on without them if their face cannot load — a decor: said in the console,
 * the map shown whole otherwise (ATLAS-440).
 * @param context - the layers and what they read, the sea labels' drawer and the rose's lift among them
 * @param isCurrent - whether this call may still lay its names once drawn — see {@link rebuildSeaNames}
 */
export function laySeaNames(context: LayerContext, isCurrent: () => boolean): void {
  rebuildSeaNames(context, context.seaLabels, context.dev.rose.lift, isCurrent).catch(
    (error: unknown) => {
      console.error('[Atlas] the seas’ names could not be drawn', error)
    }
  )
}
